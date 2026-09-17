import os
import uuid as uuid_module
import mammoth

from django.conf import settings
from django.db.models import Count, Q
from django.db.models.functions import TruncMonth
from django.http import HttpResponse, FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Passport, Spravka, PassportTemplate, TemplateField, TemplateRow
from .serializers import (
    PassportListSerializer, PassportWriteSerializer, PassportDetailSerializer,
    PassportPendingApprovalSerializer,
    SpravkaListSerializer, SpravkaWriteSerializer, SpravkaDetailSerializer,
    SpravkaPendingApprovalSerializer,
    PassportTemplateListSerializer, PassportTemplateDetailSerializer, PassportTemplateWriteSerializer,
    TemplateFieldSerializer, TemplateRowSerializer,
)
from .generators import generate_spravka_document
from .approval import (
    resolve_signer, SignerResolutionError, can_act_on_step, resolve_next_status,
    can_user_submit_spravka, resolve_next_spravka_status,
)
from base.views import ensure_can_modify
from users.models import UserRole, get_effective_user_role


# ─── Spravka ──────────────────────────────────────────────────────────────────

class SpravkaListCreateView(generics.ListCreateAPIView):
    queryset = Spravka.objects.all()

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return SpravkaWriteSerializer
        return SpravkaListSerializer

    def create(self, request, *args, **kwargs):
        # Mirrors `canCreateSpravka` in SpravkiPage.tsx — Админ and Начальник смены only,
        # same rule as PassportListCreateView. Enforced here because hiding the
        # "Добавить справку" button was the only thing keeping other roles out.
        # GET is deliberately left open: every authenticated role may read the list.
        if get_effective_user_role(request.user) not in (UserRole.ADMIN, UserRole.SHIFT_HEAD):
            return Response(
                {"error": "Создавать справку может только начальник смены."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)


class SpravkaDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Spravka.objects.all()

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return SpravkaWriteSerializer
        return SpravkaDetailSerializer

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_locked:
            return Response(
                {"error": "Справка заблокирована на время согласования и не может быть изменена."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().update(request, *args, **kwargs)


class SpravkaDownloadView(APIView):
    def get(self, request, pk):
        try:
            spravka = Spravka.objects.get(pk=pk)
        except Spravka.DoesNotExist:
            return Response({'detail': 'Не найдено'}, status=status.HTTP_404_NOT_FOUND)
        buf = generate_spravka_document(spravka)
        filename = f'spravka_{spravka.spravka_number}.docx'.replace('/', '-').replace(' ', '_')
        response = HttpResponse(
            buf.read(),
            content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class SpravkaSubmitView(APIView):
    @staticmethod
    def post(request, pk, *args, **kwargs):
        permission_error = ensure_can_modify(request)
        if permission_error:
            return permission_error

        spravka = get_object_or_404(Spravka, pk=pk)
        if spravka.approval_status not in (Spravka.STATUS_DRAFT, Spravka.STATUS_REJECTED):
            return Response(
                {"error": "Справка уже в процессе согласования или утверждена."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if get_effective_user_role(request.user) != UserRole.ADMIN:
            try:
                shift_head_user, _ = resolve_signer(spravka.shift_head, 'Начальник смены')
            except SignerResolutionError as exc:
                return Response({"error": exc.message}, status=status.HTTP_400_BAD_REQUEST)
            if shift_head_user != request.user:
                return Response(
                    {"error": "Вы не назначены начальником смены для этой справки."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        try:
            sttl_slug = ''
            if spravka.sttl_head.strip():
                _, sttl_slug = resolve_signer(spravka.sttl_head, 'Начальник СТТЛ')
            czl_slug = ''
            if spravka.czl_head.strip():
                _, czl_slug = resolve_signer(spravka.czl_head, 'Начальник ЦЗЛ')
            # Guarded like the two above: Диспетчер is optional on the form, and an unassigned
            # step is skipped by resolve_next_spravka_status. Calling resolve_signer with a blank
            # name would reject the whole submission instead.
            dispatcher_slug = ''
            if spravka.dispatcher_head.strip():
                _, dispatcher_slug = resolve_signer(spravka.dispatcher_head, 'Диспетчер')
        except SignerResolutionError as exc:
            return Response({"error": exc.message}, status=status.HTTP_400_BAD_REQUEST)

        spravka.sttl_employee_slug = sttl_slug
        spravka.czl_employee_slug = czl_slug
        spravka.dispatcher_employee_slug = dispatcher_slug
        spravka.sttl_approved_by = None
        spravka.sttl_approved_at = None
        spravka.czl_approved_by = None
        spravka.czl_approved_at = None
        spravka.dispatcher_approved_by = None
        spravka.dispatcher_approved_at = None
        spravka.rejected_step = ''
        spravka.rejected_by = None
        spravka.rejected_at = None
        spravka.rejection_comment = ''
        spravka.approval_status = resolve_next_spravka_status(spravka)
        spravka.submitted_by = request.user
        spravka.submitted_at = timezone.now()
        spravka.save()

        return Response(SpravkaDetailSerializer(spravka, context={'request': request}).data, status=status.HTTP_200_OK)


class SpravkaApproveView(APIView):
    @staticmethod
    def post(request, pk, *args, **kwargs):
        spravka = get_object_or_404(Spravka, pk=pk)
        step = spravka.current_step
        if not step:
            return Response({"error": "Нет активного шага согласования."}, status=status.HTTP_400_BAD_REQUEST)

        if not can_act_on_step(request.user, spravka, step):
            return Response(
                {"error": "Вы не назначены подписантом на этом шаге."},
                status=status.HTTP_403_FORBIDDEN,
            )

        setattr(spravka, _get_approver_step_field(step, 'approved_by'), request.user)
        setattr(spravka, _get_approver_step_field(step, 'approved_at'), timezone.now())

        spravka.approval_status = resolve_next_spravka_status(spravka, after_step=step)
        spravka.save()

        return Response(SpravkaDetailSerializer(spravka, context={'request': request}).data, status=status.HTTP_200_OK)


class SpravkaRejectView(APIView):
    @staticmethod
    def post(request, pk, *args, **kwargs):
        spravka = get_object_or_404(Spravka, pk=pk)
        step = spravka.current_step
        if not step:
            return Response({"error": "Нет активного шага согласования."}, status=status.HTTP_400_BAD_REQUEST)

        comment = str(request.data.get('comment', '')).strip()

        if not can_act_on_step(request.user, spravka, step):
            return Response(
                {"error": "Вы не назначены подписантом на этом шаге."},
                status=status.HTTP_403_FORBIDDEN,
            )

        spravka.approval_status = Spravka.STATUS_REJECTED
        spravka.rejected_step = step
        spravka.rejected_by = request.user
        spravka.rejected_at = timezone.now()
        spravka.rejection_comment = comment
        spravka.save()

        return Response(SpravkaDetailSerializer(spravka, context={'request': request}).data, status=status.HTTP_200_OK)


class SpravkaPendingApprovalsView(APIView):
    @staticmethod
    def get(request, *args, **kwargs):
        role = get_effective_user_role(request.user)
        pending_statuses = [
            Spravka.STATUS_PENDING_STTL,
            Spravka.STATUS_PENDING_CZL,
            Spravka.STATUS_PENDING_DISPATCHER,
        ]

        if role == UserRole.ADMIN:
            queryset = Spravka.objects.filter(approval_status__in=pending_statuses)
        else:
            my_slug = UserRole.objects.filter(user=request.user).values_list('employee_slug', flat=True).first()
            if not my_slug:
                queryset = Spravka.objects.none()
            else:
                queryset = Spravka.objects.filter(
                    Q(approval_status=Spravka.STATUS_PENDING_STTL, sttl_employee_slug=my_slug)
                    | Q(approval_status=Spravka.STATUS_PENDING_CZL, czl_employee_slug=my_slug)
                    | Q(approval_status=Spravka.STATUS_PENDING_DISPATCHER, dispatcher_employee_slug=my_slug)
                )

        serializer = SpravkaPendingApprovalSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ─── Spravka approval verification (public, for QR code scanning) ─────────────

class SpravkaVerifyApiView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @staticmethod
    def get(request, token, *args, **kwargs):
        spravka = (
            Spravka.objects
            .select_related('sttl_approved_by', 'czl_approved_by', 'dispatcher_approved_by')
            .filter(qr_token=token, approval_status=Spravka.STATUS_APPROVED)
            .first()
        )
        if not spravka:
            return Response({'error': 'Справка не найдена или ещё не утверждена.'}, status=status.HTTP_404_NOT_FOUND)

        steps = [
            {
                'role': 'Начальник СТТЛ',
                'full_name': spravka.sttl_head,
                'approved_by_username': spravka.sttl_approved_by.username if spravka.sttl_approved_by else None,
                'approved_at': spravka.sttl_approved_at,
            },
            {
                'role': 'Начальник ЦЗЛ',
                'full_name': spravka.czl_head,
                'approved_by_username': spravka.czl_approved_by.username if spravka.czl_approved_by else None,
                'approved_at': spravka.czl_approved_at,
            },
            {
                'role': 'Диспетчер',
                'full_name': spravka.dispatcher_head,
                'approved_by_username': spravka.dispatcher_approved_by.username if spravka.dispatcher_approved_by else None,
                'approved_at': spravka.dispatcher_approved_at,
            },
        ]

        return Response({
            'spravka_number': spravka.spravka_number,
            'approval_status_display': spravka.get_approval_status_display(),
            'submitted_by_username': spravka.submitted_by.username if spravka.submitted_by else None,
            'submitted_at': spravka.submitted_at,
            'steps': steps,
        }, status=status.HTTP_200_OK)


# ─── PassportTemplate ─────────────────────────────────────────────────────────

class PassportTemplateListCreateView(generics.ListCreateAPIView):
    queryset = PassportTemplate.objects.all()

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return PassportTemplateWriteSerializer
        return PassportTemplateListSerializer


class PassportTemplateDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = PassportTemplate.objects.all()

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return PassportTemplateWriteSerializer
        return PassportTemplateDetailSerializer


# ─── TemplateField ────────────────────────────────────────────────────────────

class TemplateFieldListCreateView(generics.ListCreateAPIView):
    serializer_class = TemplateFieldSerializer

    def get_queryset(self):
        return TemplateField.objects.filter(template_id=self.kwargs['pk'])

    def perform_create(self, serializer):
        template = PassportTemplate.objects.get(pk=self.kwargs['pk'])
        serializer.save(template=template)


class TemplateFieldDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = TemplateField.objects.all()
    serializer_class = TemplateFieldSerializer


class TemplateFieldBulkView(APIView):
    """Barcha fields ni bir vaqtda saqlash"""

    def put(self, request, pk):
        template = PassportTemplate.objects.get(pk=pk)
        fields_data = request.data  # list of field objects
        if not isinstance(fields_data, list):
            return Response({'detail': 'list expected'}, status=400)

        # Delete existing, recreate
        TemplateField.objects.filter(template=template).delete()
        created = []
        for item in fields_data:
            item.pop('id', None)
            s = TemplateFieldSerializer(data=item)
            s.is_valid(raise_exception=True)
            created.append(s.save(template=template))

        return Response(TemplateFieldSerializer(created, many=True).data)


# ─── TemplateRow ──────────────────────────────────────────────────────────────

class TemplateRowListCreateView(generics.ListCreateAPIView):
    serializer_class = TemplateRowSerializer

    def get_queryset(self):
        return TemplateRow.objects.filter(template_id=self.kwargs['pk'])

    def perform_create(self, serializer):
        template = PassportTemplate.objects.get(pk=self.kwargs['pk'])
        serializer.save(template=template)


class TemplateRowDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = TemplateRow.objects.all()
    serializer_class = TemplateRowSerializer


class TemplateRowBulkView(APIView):
    """Barcha rows ni bir vaqtda saqlash"""

    def put(self, request, pk):
        template = PassportTemplate.objects.get(pk=pk)
        rows_data = request.data
        if not isinstance(rows_data, list):
            return Response({'detail': 'list expected'}, status=400)

        TemplateRow.objects.filter(template=template).delete()
        created = []
        for item in rows_data:
            item.pop('id', None)
            s = TemplateRowSerializer(data=item)
            s.is_valid(raise_exception=True)
            created.append(s.save(template=template))

        return Response(TemplateRowSerializer(created, many=True).data)


# ─── PassportTemplate — Word (.docx) → HTML upload ───────────────────────────

class PassportTemplateUploadDocxView(APIView):
    """
    POST /passport-templates/{pk}/upload-docx/
    Fayl: multipart field nomi "file" (.docx)
    Natija: Word hujjatini HTML ga konvertatsiya qiladi,
            media/passport_templates/template_{pk}.html faylga saqlaydi,
            template.header_html ni yangilaydi.
    """
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        try:
            template = PassportTemplate.objects.get(pk=pk)
        except PassportTemplate.DoesNotExist:
            return Response({'detail': 'Шаблон не найден'}, status=status.HTTP_404_NOT_FOUND)

        docx_file = request.FILES.get('file')
        if not docx_file:
            return Response({'detail': 'Файл не загружен'}, status=status.HTTP_400_BAD_REQUEST)

        if not docx_file.name.lower().endswith('.docx'):
            return Response({'detail': 'Только .docx файлы разрешены'}, status=status.HTTP_400_BAD_REQUEST)

        # Word → HTML (mammoth)
        result = mammoth.convert_to_html(docx_file)
        html_content = result.value

        # media/passport_templates/template_{pk}.html faylga saqlash
        html_dir = os.path.join(settings.MEDIA_ROOT, 'passport_templates')
        os.makedirs(html_dir, exist_ok=True)
        html_filename = f'template_{pk}.html'
        html_path = os.path.join(html_dir, html_filename)
        with open(html_path, 'w', encoding='utf-8') as fh:
            fh.write(html_content)

        # template.header_html ni yangilash
        template.header_html = html_content
        template.save(update_fields=['header_html', 'updated_at'])

        html_url = f'/media/passport_templates/{html_filename}'
        warnings = [str(m) for m in result.messages]

        return Response({
            'html': html_content,
            'html_url': html_url,
            'warnings': warnings,
        }, status=status.HTTP_200_OK)


# ─── Passport ─────────────────────────────────────────────────────────────────

class PassportListCreateView(generics.ListCreateAPIView):
    queryset = Passport.objects.select_related('template').filter(is_delete=False)

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return PassportWriteSerializer
        return PassportListSerializer

    def create(self, request, *args, **kwargs):
        # Mirrors `canCreatePassport` in PasportaPage.tsx — Админ and Начальник смены only.
        # Enforced here because neither this endpoint nor the /pasporta/create route carried
        # a role check, so hiding the button was the only thing keeping other roles out.
        # GET is deliberately left open: every authenticated role may read the passport list.
        if get_effective_user_role(request.user) not in (UserRole.ADMIN, UserRole.SHIFT_HEAD):
            return Response(
                {"error": "У вас нет прав на создание паспорта."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)


class PassportDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Passport.objects.select_related('template').prefetch_related(
        'template__fields', 'template__rows'
    ).all()

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return PassportWriteSerializer
        return PassportDetailSerializer

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_locked:
            return Response(
                {"error": "Паспорт заблокирован на время согласования и не может быть изменён."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        role = get_effective_user_role(request.user)
        if role != UserRole.ADMIN:
            return Response(
                {"error": "У вас нет прав на удаление паспорта."},
                status=status.HTTP_403_FORBIDDEN,
            )
        instance = self.get_object()
        if instance.is_locked:
            return Response(
                {"error": "Паспорт заблокирован на время согласования и не может быть удалён."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        instance.is_delete = True
        instance.save(update_fields=['is_delete'])
        return Response(status=status.HTTP_204_NO_CONTENT)


def _get_approver_step_field(step, suffix):
    return f'{step}_{suffix}'


class PassportSubmitView(APIView):
    @staticmethod
    def post(request, pk, *args, **kwargs):
        permission_error = ensure_can_modify(request)
        if permission_error:
            return permission_error

        passport = get_object_or_404(Passport, pk=pk)
        if passport.approval_status not in (Passport.STATUS_DRAFT, Passport.STATUS_REJECTED):
            return Response(
                {"error": "Паспорт уже в процессе согласования или утверждён."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        field_values = passport.field_values or {}

        if get_effective_user_role(request.user) != UserRole.ADMIN:
            try:
                shift_head_user, _ = resolve_signer(field_values.get('shift_head'), 'Начальник смены')
            except SignerResolutionError as exc:
                return Response({"error": exc.message}, status=status.HTTP_400_BAD_REQUEST)
            if shift_head_user != request.user:
                return Response(
                    {"error": "Вы не назначены начальником смены для этого паспорта."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        try:
            sttl_slug = ''
            if (field_values.get('sttl_head') or '').strip():
                _, sttl_slug = resolve_signer(field_values.get('sttl_head'), 'Начальник СТТЛ')
            czl_slug = ''
            if (field_values.get('czl_head') or '').strip():
                _, czl_slug = resolve_signer(field_values.get('czl_head'), 'Начальник ЦЗЛ')
            # Guarded like the two above: Диспетчер is optional on the form, and an unassigned
            # step is skipped by resolve_next_status. Calling resolve_signer with a blank name
            # would reject the whole submission instead.
            dispatcher_slug = ''
            if (field_values.get('dispatcher_head') or '').strip():
                _, dispatcher_slug = resolve_signer(field_values.get('dispatcher_head'), 'Диспетчер')
        except SignerResolutionError as exc:
            return Response({"error": exc.message}, status=status.HTTP_400_BAD_REQUEST)

        passport.sttl_employee_slug = sttl_slug
        passport.czl_employee_slug = czl_slug
        passport.dispatcher_employee_slug = dispatcher_slug
        passport.sttl_approved_by = None
        passport.sttl_approved_at = None
        passport.czl_approved_by = None
        passport.czl_approved_at = None
        passport.dispatcher_approved_by = None
        passport.dispatcher_approved_at = None
        passport.rejected_step = ''
        passport.rejected_by = None
        passport.rejected_at = None
        passport.rejection_comment = ''
        passport.approval_status = resolve_next_status(passport)
        passport.submitted_by = request.user
        passport.submitted_at = timezone.now()
        passport.save()

        return Response(PassportDetailSerializer(passport, context={'request': request}).data, status=status.HTTP_200_OK)


class PassportApproveView(APIView):
    @staticmethod
    def post(request, pk, *args, **kwargs):
        passport = get_object_or_404(Passport, pk=pk)
        step = passport.current_step
        if not step:
            return Response({"error": "Нет активного шага согласования."}, status=status.HTTP_400_BAD_REQUEST)

        if not can_act_on_step(request.user, passport, step):
            return Response(
                {"error": "Вы не назначены подписантом на этом шаге."},
                status=status.HTTP_403_FORBIDDEN,
            )

        setattr(passport, _get_approver_step_field(step, 'approved_by'), request.user)
        setattr(passport, _get_approver_step_field(step, 'approved_at'), timezone.now())

        passport.approval_status = resolve_next_status(passport, after_step=step)
        passport.save()

        return Response(PassportDetailSerializer(passport, context={'request': request}).data, status=status.HTTP_200_OK)


class PassportRejectView(APIView):
    @staticmethod
    def post(request, pk, *args, **kwargs):
        passport = get_object_or_404(Passport, pk=pk)
        step = passport.current_step
        if not step:
            return Response({"error": "Нет активного шага согласования."}, status=status.HTTP_400_BAD_REQUEST)

        comment = str(request.data.get('comment', '')).strip()

        if not can_act_on_step(request.user, passport, step):
            return Response(
                {"error": "Вы не назначены подписантом на этом шаге."},
                status=status.HTTP_403_FORBIDDEN,
            )

        passport.approval_status = Passport.STATUS_REJECTED
        passport.rejected_step = step
        passport.rejected_by = request.user
        passport.rejected_at = timezone.now()
        passport.rejection_comment = comment
        passport.save()

        return Response(PassportDetailSerializer(passport, context={'request': request}).data, status=status.HTTP_200_OK)


class PassportPendingApprovalsView(APIView):
    @staticmethod
    def get(request, *args, **kwargs):
        role = get_effective_user_role(request.user)
        pending_statuses = [
            Passport.STATUS_PENDING_STTL,
            Passport.STATUS_PENDING_CZL,
            Passport.STATUS_PENDING_DISPATCHER,
        ]

        if role == UserRole.ADMIN:
            queryset = Passport.objects.select_related('template').filter(approval_status__in=pending_statuses)
        else:
            my_slug = UserRole.objects.filter(user=request.user).values_list('employee_slug', flat=True).first()
            if not my_slug:
                queryset = Passport.objects.none()
            else:
                queryset = Passport.objects.select_related('template').filter(
                    Q(approval_status=Passport.STATUS_PENDING_STTL, sttl_employee_slug=my_slug)
                    | Q(approval_status=Passport.STATUS_PENDING_CZL, czl_employee_slug=my_slug)
                    | Q(approval_status=Passport.STATUS_PENDING_DISPATCHER, dispatcher_employee_slug=my_slug)
                )

        serializer = PassportPendingApprovalSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ─── Passport approval verification (public, for QR code scanning) ────────────

class PassportVerifyApiView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @staticmethod
    def get(request, token, *args, **kwargs):
        passport = (
            Passport.objects
            .select_related('template', 'sttl_approved_by', 'czl_approved_by', 'dispatcher_approved_by')
            .filter(qr_token=token, approval_status=Passport.STATUS_APPROVED)
            .first()
        )
        if not passport:
            return Response({'error': 'Паспорт не найден или ещё не утверждён.'}, status=status.HTTP_404_NOT_FOUND)

        field_values = passport.field_values or {}
        steps = [
            {
                'role': 'Начальник СТТЛ',
                'full_name': field_values.get('sttl_head', ''),
                'approved_by_username': passport.sttl_approved_by.username if passport.sttl_approved_by else None,
                'approved_at': passport.sttl_approved_at,
            },
            {
                'role': 'Начальник ЦЗЛ',
                'full_name': field_values.get('czl_head', ''),
                'approved_by_username': passport.czl_approved_by.username if passport.czl_approved_by else None,
                'approved_at': passport.czl_approved_at,
            },
            {
                'role': 'Диспетчер',
                'full_name': field_values.get('dispatcher_head', ''),
                'approved_by_username': passport.dispatcher_approved_by.username if passport.dispatcher_approved_by else None,
                'approved_at': passport.dispatcher_approved_at,
            },
        ]

        return Response({
            'passport_number': passport.passport_number,
            'template_name': passport.template_name,
            'template_category': passport.template_category,
            'approval_status_display': passport.get_approval_status_display(),
            'submitted_by_username': passport.submitted_by.username if passport.submitted_by else None,
            'submitted_at': passport.submitted_at,
            'steps': steps,
        }, status=status.HTTP_200_OK)


# ─── Passport PDF store / serve (public, for QR code download) ────────────────

class PassportPdfUploadView(APIView):
    """Accept a generated PDF blob keyed by UUID token and store it in media."""
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, token):
        try:
            uuid_module.UUID(str(token))
        except ValueError:
            return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)

        pdf_file = request.FILES.get('pdf')
        if not pdf_file:
            return Response({'error': 'No PDF file provided'}, status=status.HTTP_400_BAD_REQUEST)

        save_dir = os.path.join(settings.MEDIA_ROOT, 'passport_pdfs')
        os.makedirs(save_dir, exist_ok=True)
        save_path = os.path.join(save_dir, f'{token}.pdf')

        with open(save_path, 'wb') as f:
            for chunk in pdf_file.chunks():
                f.write(chunk)

        return Response({'url': f'/media/passport_pdfs/{token}.pdf'}, status=status.HTTP_201_CREATED)


class PassportPdfDownloadView(APIView):
    """Serve a stored PDF by its token. Public — no auth required."""
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            uuid_module.UUID(str(token))
        except ValueError:
            return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)

        file_path = os.path.join(settings.MEDIA_ROOT, 'passport_pdfs', f'{token}.pdf')
        if not os.path.exists(file_path):
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        return FileResponse(
            open(file_path, 'rb'),
            content_type='application/pdf',
            as_attachment=True,
            filename=f'passport_{token[:8]}.pdf',
        )


# ─── Dashboard summary ─────────────────────────────────────────────────────────

class DocumentsSummaryView(APIView):
    """Паспорта и Справки bo'yicha umumlashtirilgan статистика — Главная страница uchun."""

    @staticmethod
    def get(request, *args, **kwargs):
        passports_total = Passport.objects.count()
        spravki_total = Spravka.objects.count()

        passports_by_category = list(
            Passport.objects.exclude(template__isnull=True)
            .values('template__category')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        passports_by_category = [
            {'category': row['template__category'] or 'Без категории', 'count': row['count']}
            for row in passports_by_category
        ]

        recent_passports = [
            {
                'id': p.id,
                'passport_number': p.passport_number,
                'template_name': p.template_name,
                'template_category': p.template_category,
                'created_at': p.created_at,
            }
            for p in Passport.objects.select_related('template').order_by('-created_at')[:5]
        ]

        recent_spravki = [
            {
                'id': s.id,
                'spravka_number': s.spravka_number,
                'issue_date': s.issue_date,
                'created_at': s.created_at,
            }
            for s in Spravka.objects.order_by('-created_at')[:5]
        ]

        now = timezone.now()
        months = []
        for i in range(5, -1, -1):
            month_index = now.month - 1 - i
            year = now.year + month_index // 12
            month = month_index % 12 + 1
            months.append((year, month))

        passports_by_month = {
            (row['month'].year, row['month'].month): row['count']
            for row in Passport.objects.annotate(month=TruncMonth('created_at'))
            .values('month').annotate(count=Count('id'))
        }
        spravki_by_month = {
            (row['month'].year, row['month'].month): row['count']
            for row in Spravka.objects.annotate(month=TruncMonth('created_at'))
            .values('month').annotate(count=Count('id'))
        }

        monthly = [
            {
                'month': f'{year:04d}-{month:02d}',
                'passports': passports_by_month.get((year, month), 0),
                'spravki': spravki_by_month.get((year, month), 0),
            }
            for year, month in months
        ]

        return Response({
            'passports': {
                'total': passports_total,
                'by_category': passports_by_category,
                'recent': recent_passports,
            },
            'spravki': {
                'total': spravki_total,
                'recent': recent_spravki,
            },
            'monthly': monthly,
        })
