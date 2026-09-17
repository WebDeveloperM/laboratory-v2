import json
import os
import re
import zipfile
from datetime import date, datetime, timedelta

from django.contrib.auth.models import User as AuthUser
from django.core.files.base import ContentFile
from django.db import models, transaction
from django.utils.crypto import get_random_string
from django.utils.text import slugify
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination

from .models import Department, Employee, Section, UserProfile, ROLE_ADMIN, ROLE_HR, ROLE_USER
from .serializers import DepartmentSerializer, EmployeeSerializer, SectionSerializer, UserProfileSerializer


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class UserManagementAccessMixin:
    def ensure_user_management_access(self):
        profile = getattr(self.request.user, 'profile', None)
        if profile is None or profile.role not in {ROLE_ADMIN, ROLE_HR}:
            raise PermissionDenied('У вас нет доступа к управлению пользователями.')

    def ensure_admin_user_management_access(self):
        profile = getattr(self.request.user, 'profile', None)
        if profile is None or profile.role != ROLE_ADMIN:
            raise PermissionDenied('У вас нет доступа к управлению доступом пользователей.')


class DepartmentListCreateTemplateView(generics.ListCreateAPIView):
    """
    Шаблонное представление для CRUD-операций с цехами.
    GET: список всех цехов.
    POST: создание нового цеха.
    """
    queryset = Department.objects.all().order_by('sort_order', 'name')
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return Response({
                'success': True,
                'message': 'Цеха успешно получены',
                'data': serializer.data,
                'count': self.paginator.page.paginator.count,
                'next': self.paginator.get_next_link(),
                'previous': self.paginator.get_previous_link(),
            })

        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'success': True,
            'message': 'Цеха успешно получены',
            'data': serializer.data
        })

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response({
            'success': True,
            'message': 'Цех успешно создан',
            'data': serializer.data
        }, status=status.HTTP_201_CREATED, headers=headers)


class DepartmentDetailTemplateView(generics.RetrieveUpdateDestroyAPIView):
    """
    Шаблонное представление для операций с отдельным цехом.
    GET: получить цех по ID.
    PUT/PATCH: обновить цех.
    DELETE: удалить цех.
    """
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            'success': True,
            'message': 'Цех успешно получен',
            'data': serializer.data
        })

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}

        return Response({
            'success': True,
            'message': 'Цех успешно обновлён',
            'data': serializer.data
        })

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({
            'success': True,
            'message': 'Цех успешно удалён'
        }, status=status.HTTP_204_NO_CONTENT)


class SectionListCreateTemplateView(generics.ListCreateAPIView):
    """
    Шаблонное представление для CRUD-операций с отделами.
    GET: список всех отделов.
    POST: создание нового отдела.
    """
    queryset = Section.objects.select_related('department').all().order_by('department__sort_order', 'department__name', 'name')
    serializer_class = SectionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = super().get_queryset()

        search = str(self.request.query_params.get('search', '') or '').strip()
        department_id = str(self.request.query_params.get('department_id', '') or '').strip()

        if department_id.isdigit():
            queryset = queryset.filter(department_id=int(department_id))

        if search:
            queryset = queryset.filter(
                models.Q(name__icontains=search) |
                models.Q(department__name__icontains=search)
            )

        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return Response({
                'success': True,
                'message': 'Отделы успешно получены',
                'data': serializer.data,
                'count': self.paginator.page.paginator.count,
                'next': self.paginator.get_next_link(),
                'previous': self.paginator.get_previous_link(),
            })

        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'success': True,
            'message': 'Отделы успешно получены',
            'data': serializer.data
        })

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response({
            'success': True,
            'message': 'Отдел успешно создан',
            'data': serializer.data
        }, status=status.HTTP_201_CREATED, headers=headers)


class SectionDetailTemplateView(generics.RetrieveUpdateDestroyAPIView):
    """
    Шаблонное представление для операций с отдельным отделом.
    GET: получить отдел по ID.
    PUT/PATCH: обновить отдел.
    DELETE: удалить отдел.
    """
    queryset = Section.objects.select_related('department').all()
    serializer_class = SectionSerializer
    permission_classes = [IsAuthenticated]

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            'success': True,
            'message': 'Отдел успешно получен',
            'data': serializer.data
        })

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}

        return Response({
            'success': True,
            'message': 'Отдел успешно обновлён',
            'data': serializer.data
        })

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({
            'success': True,
            'message': 'Отдел успешно удалён'
        }, status=status.HTTP_204_NO_CONTENT)


class EmployeeListCreateTemplateView(generics.ListCreateAPIView):
    """
    Шаблонное представление для CRUD-операций с сотрудниками.
    GET: список всех сотрудников.
    POST: создание нового сотрудника.
    """
    serializer_class = EmployeeSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = Employee.objects.select_related(
            'department', 'section', 'section__department'
        ).filter(is_deleted=False).annotate(
            department_sort_missing=models.Case(
                models.When(department__isnull=True, then=models.Value(1)),
                default=models.Value(0),
                output_field=models.IntegerField(),
            ),
        ).order_by(
            'department_sort_missing',
            'department__sort_order',
            'department__name',
            'section__name',
            'last_name',
            'first_name',
            'surname',
            'tabel_number',
        )

        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                models.Q(first_name__icontains=search) |
                models.Q(last_name__icontains=search) |
                models.Q(surname__icontains=search) |
                models.Q(tabel_number__icontains=search) |
                models.Q(position__icontains=search)
            )

        tabel_number = self.request.query_params.get('tabel_number', '').strip()
        if tabel_number:
            queryset = queryset.filter(tabel_number__icontains=tabel_number)

        name = self.request.query_params.get('name', '').strip()
        if name:
            queryset = queryset.filter(
                models.Q(first_name__icontains=name)
                | models.Q(last_name__icontains=name)
                | models.Q(surname__icontains=name)
            )

        position = self.request.query_params.get('position', '').strip()
        if position:
            queryset = queryset.filter(position__icontains=position)

        employment_date = self.request.query_params.get('employment_date', '').strip()
        if employment_date:
            queryset = queryset.filter(date_of_employment=employment_date)

        status_filter = self.request.query_params.get('status', '').strip().lower()
        if status_filter == 'active':
            queryset = queryset.filter(is_active=True)
        elif status_filter == 'inactive':
            queryset = queryset.filter(is_active=False)

        department_id = self.request.query_params.get('department_id')
        if department_id:
            queryset = queryset.filter(department_id=department_id)

        section_id = self.request.query_params.get('section_id')
        if section_id:
            queryset = queryset.filter(section_id=section_id)

        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return Response({
                'success': True,
                'message': 'Сотрудники успешно получены',
                'data': serializer.data,
                'count': self.paginator.page.paginator.count,
                'next': self.paginator.get_next_link(),
                'previous': self.paginator.get_previous_link(),
            })

        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'success': True,
            'message': 'Сотрудники успешно получены',
            'data': serializer.data
        })

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response({
            'success': True,
            'message': 'Сотрудник успешно создан',
            'data': serializer.data
        }, status=status.HTTP_201_CREATED, headers=headers)


class EmployeeDetailTemplateView(generics.RetrieveUpdateDestroyAPIView):
    """
    Шаблонное представление для операций с отдельным сотрудником.
    GET: получить сотрудника по ID.
    PUT/PATCH: обновить сотрудника.
    DELETE: полностью удалить сотрудника.
    """
    queryset = Employee.objects.select_related(
        'department', 'section', 'section__department'
    ).filter(is_deleted=False)
    serializer_class = EmployeeSerializer
    permission_classes = [IsAuthenticated]

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            'success': True,
            'message': 'Сотрудник успешно получен',
            'data': serializer.data
        })

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}

        return Response({
            'success': True,
            'message': 'Сотрудник успешно обновлён',
            'data': serializer.data
        })

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        linked_user = instance.user
        linked_profile = getattr(linked_user, 'profile', None) if linked_user is not None else None

        with transaction.atomic():
            if instance.base_image:
                instance.base_image.delete(save=False)
            if linked_profile is not None and linked_profile.face_image:
                linked_profile.face_image.delete(save=False)
            instance.delete()
            if linked_user is not None:
                linked_user.delete()

        return Response({
            'success': True,
            'message': 'Сотрудник успешно удалён'
        }, status=status.HTTP_204_NO_CONTENT)


class EmployeeStatsTemplateView(APIView):
    """
    Шаблонное представление для статистики по сотрудникам.
    GET: получить статистику.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        total_employees = Employee.objects.filter(is_deleted=False).count()
        active_employees = Employee.objects.filter(is_deleted=False, is_active=True).count()
        total_departments = Department.objects.count()
        total_sections = Section.objects.count()
        
        return Response({
            'success': True,
            'message': 'Статистика успешно получена',
            'data': {
                'total_employees': total_employees,
                'active_employees': active_employees,
                'total_departments': total_departments,
                'total_sections': total_sections,
                'inactive_employees': total_employees - active_employees
            }
        })


class EmployeeImportExcelTemplateView(APIView):
    permission_classes = [IsAuthenticated]
    max_import_rows = 1000
    supported_image_extensions = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'}
    header_aliases = {
        'first_name': 'first_name',
        'имя': 'first_name',
        'last_name': 'last_name',
        'фамилия': 'last_name',
        'surname': 'surname',
        'отчество': 'surname',
        'tabel_number': 'tabel_number',
        'табельный_номер': 'tabel_number',
        'табельный': 'tabel_number',
        'gender': 'gender',
        'пол': 'gender',
        'date_of_birth': 'date_of_birth',
        'дата_рождения': 'date_of_birth',
        'special_clothing_size': 'special_clothing_size',
        'спецодежда': 'special_clothing_size',
        'size_special_clothing': 'special_clothing_size',
        'clothe_size': 'clothe_size',
        'размер_одежды': 'clothe_size',
        'халат': 'clothe_size',
        'shoe_size': 'shoe_size',
        'обувь': 'shoe_size',
        'размер_обуви': 'shoe_size',
        'jacket_size': 'jacket_size',
        'куртка': 'jacket_size',
        'tshirt_size': 'tshirt_size',
        'футболка': 'tshirt_size',
        'phone_number_1': 'phone_number_1',
        'телефон_1': 'phone_number_1',
        'телефон1': 'phone_number_1',
        'phone_number_2': 'phone_number_2',
        'телефон_2': 'phone_number_2',
        'телефон2': 'phone_number_2',
        'login': 'login',
        'логин': 'login',
        'password': 'password',
        'пароль': 'password',
        'password_confirm': 'password_confirm',
        'подтверждение_пароля': 'password_confirm',
        'role': 'role',
        'роль': 'role',
        'department_name': 'department_name',
        'цех': 'department_name',
        'boss_full_name': 'boss_full_name',
        'руководитель_цеха': 'boss_full_name',
        'section_name': 'section_name',
        'отдел': 'section_name',
        'position': 'position',
        'должность': 'position',
        'date_of_employment': 'date_of_employment',
        'дата_приема_на_работу': 'date_of_employment',
        'date_of_change_position': 'date_of_change_position',
        'дата_изменения_должности': 'date_of_change_position',
        'requires_face_id_checkout': 'requires_face_id_checkout',
        'требует_face_id': 'requires_face_id_checkout',
    }
    required_fields = ('tabel_number', 'first_name', 'last_name')
    date_fields = {'date_of_birth', 'date_of_employment', 'date_of_change_position'}
    boolean_fields = {'requires_face_id_checkout'}
    string_fields = {
        'first_name', 'last_name', 'surname', 'tabel_number', 'special_clothing_size', 'clothe_size',
        'shoe_size', 'jacket_size', 'tshirt_size', 'phone_number_1', 'phone_number_2', 'login',
        'password', 'password_confirm', 'department_name',
        'section_name', 'boss_full_name', 'position',
    }

    def post(self, request, *args, **kwargs):
        rows = request.data.get('rows')
        if isinstance(rows, str):
            try:
                rows = json.loads(rows)
            except json.JSONDecodeError:
                return Response({
                    'success': False,
                    'message': 'Не удалось прочитать строки Excel. Повторите импорт файла.',
                }, status=status.HTTP_400_BAD_REQUEST)

        if not isinstance(rows, list):
            return Response({
                'success': False,
                'message': 'Ожидается массив строк Excel для импорта.',
            }, status=status.HTTP_400_BAD_REQUEST)

        if not rows:
            return Response({
                'success': False,
                'message': 'Файл пустой. Добавьте хотя бы одну строку с данными.',
            }, status=status.HTTP_400_BAD_REQUEST)

        if len(rows) > self.max_import_rows:
            return Response({
                'success': False,
                'message': f'За один импорт можно загрузить не более {self.max_import_rows} строк.',
            }, status=status.HTTP_400_BAD_REQUEST)

        uploaded_images, image_errors = self._collect_uploaded_images(request)
        if image_errors:
            return Response({
                'success': False,
                'message': 'Импорт фотографий не выполнен. Исправьте ошибки в именах файлов и повторите попытку.',
                'error_count': len(image_errors),
                'errors': image_errors,
            }, status=status.HTTP_400_BAD_REQUEST)

        row_errors = []
        prepared_rows = []
        seen_tabel_numbers = {}
        used_generated_logins = set()
        unsupported_only_rows = []

        for row_number, raw_row in enumerate(rows, start=2):
            if not isinstance(raw_row, dict):
                row_errors.append({
                    'row': row_number,
                    'message': 'Строка должна содержать набор колонок и значений.',
                })
                continue

            normalized_row = self._normalize_row(raw_row)
            if normalized_row is None:
                continue

            if not normalized_row:
                if self._has_only_unsupported_values(raw_row):
                    unsupported_only_rows.append(row_number)
                    continue
                row_errors.append({
                    'row': row_number,
                    'message': 'Не удалось распознать колонки. Используйте заголовки из инструкции по импорту.',
                })
                continue

            missing_fields = [field for field in self.required_fields if not str(normalized_row.get(field, '')).strip()]
            if missing_fields:
                row_errors.append({
                    'row': row_number,
                    'message': 'Не заполнены обязательные поля.',
                    'fields': missing_fields,
                })
                continue

            normalized_row, generated_password = self._prepare_system_fields(normalized_row, used_generated_logins)

            tabel_number = str(normalized_row.get('tabel_number', '')).strip()
            if tabel_number:
                seen_tabel_numbers.setdefault(tabel_number, []).append(row_number)

            prepared_rows.append((row_number, normalized_row, generated_password))

        duplicate_rows = [
            {
                'row': row_numbers[0],
                'message': f'Табельный номер {tabel_number} повторяется в файле.',
                'tabel_number': tabel_number,
                'rows': row_numbers,
            }
            for tabel_number, row_numbers in seen_tabel_numbers.items()
            if len(row_numbers) > 1
        ]
        row_errors.extend(duplicate_rows)

        if not prepared_rows and unsupported_only_rows and not row_errors:
            row_errors.append({
                'row': unsupported_only_rows[0],
                'message': 'Не удалось распознать колонки. Используйте заголовки из инструкции по импорту.',
            })

        if row_errors:
            return Response({
                'success': False,
                'message': 'Импорт не выполнен. Исправьте ошибки и повторите попытку.',
                'error_count': len(row_errors),
                'errors': row_errors,
            }, status=status.HTTP_400_BAD_REQUEST)

        created_employees = []
        serializer_errors = []
        imported_with_images = 0

        with transaction.atomic():
            for row_number, row_data, generated_password in prepared_rows:
                serializer_input = dict(row_data)
                tabel_number = str(row_data.get('tabel_number', '')).strip()
                image_entry = uploaded_images.get(tabel_number)
                if image_entry is not None:
                    serializer_input['base_image'] = ContentFile(image_entry['bytes'], name=image_entry['name'])

                serializer = EmployeeSerializer(data=serializer_input, context={'request': request})
                if not serializer.is_valid():
                    serializer_errors.append({
                        'row': row_number,
                        'tabel_number': row_data.get('tabel_number', ''),
                        'errors': serializer.errors,
                    })
                    continue

                employee = serializer.save()
                if image_entry is not None and employee.base_image:
                    imported_with_images += 1
                created_employees.append({
                    'id': employee.id,
                    'slug': employee.slug,
                    'tabel_number': employee.tabel_number,
                    'full_name': str(employee),
                    'login': employee.login,
                    'generated_password': generated_password,
                    'role': ROLE_USER,
                })

            if serializer_errors:
                transaction.set_rollback(True)
                return Response({
                    'success': False,
                    'message': 'Импорт отменён. Часть строк не прошла проверку.',
                    'error_count': len(serializer_errors),
                    'errors': serializer_errors,
                }, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'success': True,
            'message': f'Импорт завершён. Добавлено сотрудников: {len(created_employees)}.',
            'created_count': len(created_employees),
            'imported_with_images': imported_with_images,
            'total_rows': len(prepared_rows),
            'employees': created_employees,
        }, status=status.HTTP_201_CREATED)

    def _collect_uploaded_images(self, request):
        uploaded_images = {}
        image_errors = []

        for uploaded_file in request.FILES.getlist('images'):
            file_name = str(getattr(uploaded_file, 'name', '') or '').strip()
            if not file_name:
                continue

            if os.path.splitext(file_name)[1].lower() == '.zip':
                image_errors.extend(self._extract_images_from_archive(uploaded_file, uploaded_images))
                continue

            error = self._store_uploaded_image(uploaded_images, file_name, uploaded_file.read(), getattr(uploaded_file, 'content_type', ''))
            if error:
                image_errors.append(error)

        return uploaded_images, image_errors

    def _extract_images_from_archive(self, uploaded_file, uploaded_images):
        image_errors = []
        try:
            uploaded_file.seek(0)
            with zipfile.ZipFile(uploaded_file) as archive:
                for archive_item in archive.infolist():
                    if archive_item.is_dir():
                        continue

                    original_name = str(archive_item.filename or '').strip()
                    if not original_name:
                        continue

                    with archive.open(archive_item) as archived_file:
                        error = self._store_uploaded_image(uploaded_images, original_name, archived_file.read(), '')
                        if error:
                            image_errors.append(error)
        except zipfile.BadZipFile:
            image_errors.append({
                'message': f'Файл {getattr(uploaded_file, "name", "архив")} не является корректным ZIP-архивом.',
            })

        return image_errors

    def _store_uploaded_image(self, uploaded_images, original_name, image_bytes, content_type):
        image_key, normalized_name = self._build_image_mapping_key(original_name)
        if image_key is None:
            return {
                'message': f'Файл {original_name} не поддерживается. Используйте изображения JPG, PNG, WEBP, BMP или GIF, где имя файла равно табельному номеру.',
            }

        if image_key in uploaded_images:
            return {
                'message': f'Фотография с именем {image_key} загружена несколько раз.',
            }

        uploaded_images[image_key] = {
            'bytes': image_bytes,
            'name': normalized_name,
            'content_type': content_type,
        }
        return None

    def _build_image_mapping_key(self, file_name):
        normalized_file_name = os.path.basename(str(file_name or '').replace('\\', '/'))
        image_name, extension = os.path.splitext(normalized_file_name)
        if extension.lower() not in self.supported_image_extensions:
            return None, None

        image_key = image_name.strip()
        if not image_key:
            return None, None

        return image_key, f'{image_key}{extension.lower()}'

    def _normalize_row(self, raw_row):
        if not any(self._has_value(value) for value in raw_row.values()):
            return None

        normalized_row = {}
        for raw_header, raw_value in raw_row.items():
            field_name = self.header_aliases.get(self._normalize_header(raw_header))
            if not field_name:
                continue

            parsed_value = self._normalize_value(field_name, raw_value)
            if parsed_value is None:
                continue
            normalized_row[field_name] = parsed_value

        return normalized_row

    def _has_only_unsupported_values(self, raw_row):
        has_unsupported_value = False
        for raw_header, raw_value in raw_row.items():
            if not self._has_value(raw_value):
                continue

            field_name = self.header_aliases.get(self._normalize_header(raw_header))
            if field_name:
                return False

            has_unsupported_value = True

        return has_unsupported_value

    def _prepare_system_fields(self, normalized_row, used_generated_logins):
        generated_password = self._generate_password()
        normalized_row['login'] = self._generate_login(normalized_row, used_generated_logins)
        normalized_row['password'] = generated_password
        normalized_row['password_confirm'] = generated_password
        normalized_row['role'] = ROLE_USER
        return normalized_row, generated_password

    def _normalize_header(self, value):
        normalized = str(value or '').strip().lower().replace('ё', 'е')
        normalized = re.sub(r'[^a-z0-9а-я]+', '_', normalized)
        return normalized.strip('_')

    def _normalize_value(self, field_name, value):
        if field_name in self.string_fields:
            text_value = str(value or '').strip()
            return text_value or None

        if field_name in self.date_fields:
            return self._normalize_date(value)

        if field_name in self.boolean_fields:
            return self._normalize_bool(value)

        if field_name == 'gender':
            return self._normalize_gender(value)

        if field_name == 'role':
            return self._normalize_role(value)

        if field_name == 'metadata':
            return self._normalize_metadata(value)

        text_value = str(value or '').strip()
        return text_value or None

    def _normalize_date(self, value):
        if value in (None, ''):
            return None

        if isinstance(value, datetime):
            return value.date().isoformat()

        if isinstance(value, date):
            return value.isoformat()

        if isinstance(value, (int, float)):
            excel_epoch = date(1899, 12, 30)
            return (excel_epoch + timedelta(days=int(value))).isoformat()

        text_value = str(value).strip()
        if not text_value:
            return None

        if re.fullmatch(r'\d+(?:\.\d+)?', text_value):
            excel_epoch = date(1899, 12, 30)
            return (excel_epoch + timedelta(days=int(float(text_value)))).isoformat()

        candidate_values = [text_value]
        for separator in ('T', ' '):
            if separator in text_value:
                trimmed_value = text_value.split(separator, 1)[0].strip()
                if trimmed_value and trimmed_value not in candidate_values:
                    candidate_values.append(trimmed_value)

        for candidate_value in candidate_values:
            try:
                return datetime.fromisoformat(candidate_value).date().isoformat()
            except ValueError:
                pass

            for date_format in (
                '%Y-%m-%d',
                '%Y/%m/%d',
                '%Y.%m.%d',
                '%d.%m.%Y',
                '%d.%m.%y',
                '%d/%m/%Y',
                '%d/%m/%y',
                '%d-%m-%Y',
                '%d-%m-%y',
                '%m/%d/%Y',
                '%m/%d/%y',
            ):
                try:
                    return datetime.strptime(candidate_value, date_format).date().isoformat()
                except ValueError:
                    continue

        return text_value

    def _normalize_bool(self, value):
        if value in (None, ''):
            return None

        if isinstance(value, bool):
            return value

        if isinstance(value, (int, float)):
            return bool(value)

        normalized = str(value).strip().lower().replace('ё', 'е')
        truthy_values = {'1', 'true', 'yes', 'y', 'да', 'активный', 'активен'}
        falsy_values = {'0', 'false', 'no', 'n', 'нет', 'неактивный', 'не активный'}
        if normalized in truthy_values:
            return True
        if normalized in falsy_values:
            return False
        return None

    def _normalize_gender(self, value):
        normalized = str(value or '').strip().lower().replace('ё', 'е')
        if not normalized:
            return None
        if normalized in {'m', 'male', 'м', 'муж', 'мужской'}:
            return 'M'
        if normalized in {'f', 'female', 'ж', 'жен', 'женский'}:
            return 'F'
        return str(value).strip()

    def _normalize_role(self, value):
        return ROLE_USER

    def _normalize_login_segment(self, value):
        normalized = slugify(str(value or '').strip(), allow_unicode=True).replace('-', '.')
        normalized = re.sub(r'[^\w.@+-]+', '.', normalized, flags=re.UNICODE)
        normalized = re.sub(r'\.+', '.', normalized).strip('.').lower()
        return normalized

    def _login_exists(self, login, used_generated_logins):
        if not login:
            return True
        if login in used_generated_logins:
            return True
        if Employee.objects.filter(login=login).exists():
            return True
        return AuthUser.objects.filter(username=login).exists()

    def _generate_login(self, normalized_row, used_generated_logins):
        first_name_part = self._normalize_login_segment(normalized_row.get('first_name'))
        last_name_part = self._normalize_login_segment(normalized_row.get('last_name'))
        tabel_part = self._normalize_login_segment(normalized_row.get('tabel_number'))

        base_login = '.'.join(part for part in (first_name_part, last_name_part) if part)
        if not base_login:
            base_login = tabel_part or 'user'

        candidate = base_login
        unique_base = base_login
        if self._login_exists(candidate, used_generated_logins):
            unique_base = f'{base_login}.{tabel_part}' if tabel_part else base_login
            candidate = unique_base

        counter = 2
        while self._login_exists(candidate, used_generated_logins):
            candidate = f'{unique_base}.{counter}'
            counter += 1

        used_generated_logins.add(candidate)
        return candidate

    def _generate_password(self):
        allowed_chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
        while True:
            password = get_random_string(10, allowed_chars=allowed_chars)
            if any(char.isalpha() for char in password) and any(char.isdigit() for char in password):
                return password

    def _normalize_metadata(self, value):
        if value in (None, ''):
            return None
        if isinstance(value, dict):
            return value

        text_value = str(value).strip()
        if not text_value:
            return None

        try:
            return json.loads(text_value)
        except json.JSONDecodeError:
            return {'raw': text_value}

    def _has_value(self, value):
        if value is None:
            return False
        if isinstance(value, str):
            return bool(value.strip())
        return True


class UserListCreateTemplateView(UserManagementAccessMixin, generics.ListCreateAPIView):
    """
    Шаблонное представление для CRUD-операций с пользователями.
    GET: список всех пользователей.
    POST: создание нового пользователя.
    """
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        self.ensure_user_management_access()
        return UserProfile.objects.select_related('user').order_by('user__username')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                models.Q(user__username__icontains=search)
                | models.Q(user__first_name__icontains=search)
                | models.Q(user__last_name__icontains=search)
            )
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return Response({
                'success': True,
                'message': 'Пользователи успешно получены',
                'data': serializer.data,
                'count': self.paginator.page.paginator.count,
            })

        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'success': True,
            'message': 'Пользователи успешно получены',
            'data': serializer.data,
        })

    def create(self, request, *args, **kwargs):
        self.ensure_user_management_access()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            'success': True,
            'message': 'Пользователь успешно создан',
            'data': serializer.data,
        }, status=status.HTTP_201_CREATED)


class UserAccessListTemplateView(UserManagementAccessMixin, generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get(self, request, *args, **kwargs):
        self.ensure_admin_user_management_access()
        search = request.query_params.get('search', '').strip()
        role_filter = request.query_params.get('role', '').strip().lower()
        if search:
            queryset = Employee.objects.select_related('department', 'section', 'user').filter(is_deleted=False).order_by(
                'last_name', 'first_name', 'surname', 'tabel_number'
            )
            queryset = queryset.filter(
                models.Q(first_name__icontains=search)
                | models.Q(last_name__icontains=search)
                | models.Q(surname__icontains=search)
                | models.Q(tabel_number__icontains=search)
                | models.Q(login__icontains=search)
                | models.Q(position__icontains=search)
            )

            page = self.paginate_queryset(queryset)
            employees = list(page) if page is not None else list(queryset)

            user_ids = [employee.user_id for employee in employees if employee.user_id]
            profiles = UserProfile.objects.select_related('user').filter(user_id__in=user_ids)
            if role_filter in {ROLE_ADMIN, ROLE_HR}:
                profiles = profiles.filter(role=role_filter)
            profile_map = {profile.user_id: profile for profile in profiles}
            if role_filter in {ROLE_ADMIN, ROLE_HR}:
                employees = [employee for employee in employees if employee.user_id in profile_map]
        else:
            queryset = UserProfile.objects.select_related(
                'user',
                'user__employee',
                'user__employee__department',
                'user__employee__section',
            ).filter(
                role__in=[ROLE_ADMIN, ROLE_HR],
                user__employee__isnull=False,
                user__employee__is_deleted=False,
            ).order_by(
                'user__employee__last_name',
                'user__employee__first_name',
                'user__employee__surname',
                'user__employee__tabel_number',
            )

            if role_filter in {ROLE_ADMIN, ROLE_HR}:
                queryset = queryset.filter(role=role_filter)

            page = self.paginate_queryset(queryset)
            profiles = list(page) if page is not None else list(queryset)
            employees = [profile.user.employee for profile in profiles if getattr(profile.user, 'employee', None) is not None]
            profile_map = {profile.user_id: profile for profile in profiles}

        payload = []
        for employee in employees:
            profile = profile_map.get(employee.user_id)
            profile_role = getattr(profile, 'role', '') or ''
            visible_role = profile_role if profile_role in {ROLE_ADMIN, ROLE_HR} else None
            payload.append({
                'id': employee.id,
                'slug': employee.slug,
                'first_name': employee.first_name,
                'last_name': employee.last_name,
                'surname': employee.surname,
                'full_name': str(employee),
                'tabel_number': employee.tabel_number,
                'login': getattr(getattr(employee, 'user', None), 'username', '') or employee.login,
                'department_name': employee.department.name if employee.department else '',
                'section_name': employee.section.name if employee.section else '',
                'position': employee.position,
                'base_image_url': employee.base_image.url if employee.base_image else None,
                'role': visible_role,
                'profile_id': profile.id if profile else None,
                'has_access': bool(profile),
                'is_active': bool(profile.user.is_active) if profile else bool(employee.is_active),
            })

        if page is not None:
            return Response({
                'success': True,
                'message': 'Доступы сотрудников успешно получены',
                'data': payload,
                'count': self.paginator.page.paginator.count,
                'next': self.paginator.get_next_link(),
                'previous': self.paginator.get_previous_link(),
            })

        return Response({
            'success': True,
            'message': 'Доступы сотрудников успешно получены',
            'data': payload,
            'count': len(payload),
            'next': None,
            'previous': None,
        })


class UserDetailTemplateView(UserManagementAccessMixin, generics.RetrieveUpdateDestroyAPIView):
    """
    Шаблонное представление для деталей пользователя.
    GET: получить пользователя.
    PUT/PATCH: обновить пользователя.
    DELETE: удалить пользователя.
    """
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserProfile.objects.select_related('user')

    def get_object(self):
        instance = super().get_object()
        profile = getattr(self.request.user, 'profile', None)
        if profile is not None and profile.role in {ROLE_ADMIN, ROLE_HR}:
            return instance
        if instance.user_id != self.request.user.id:
            raise PermissionDenied('У вас нет доступа к управлению этим пользователем.')
        return instance

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            'success': True,
            'message': 'Пользователь успешно получен',
            'data': serializer.data,
        })

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            'success': True,
            'message': 'Пользователь успешно обновлён',
            'data': serializer.data,
        })

    def destroy(self, request, *args, **kwargs):
        self.ensure_user_management_access()
        instance = self.get_object()
        user = instance.user
        employee = getattr(user, 'employee', None)
        if employee is not None:
            employee.user = None
            employee.login = ''
            employee.password_hash = ''
            employee.save(update_fields=['user', 'login', 'password_hash', 'updated_at'])
        instance.delete()
        user.delete()
        return Response({
            'success': True,
            'message': 'Пользователь успешно удалён',
        }, status=status.HTTP_200_OK)
