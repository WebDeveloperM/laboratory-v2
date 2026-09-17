import json
from urllib.parse import urlsplit, urlunsplit

import requests

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.http import HttpResponseRedirect
from django.shortcuts import get_object_or_404, render
from django.urls import reverse
from django.utils.http import url_has_allowed_host_and_scheme
from django.views import View
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response

from .bnpzid import build_bnpzid_redirect, get_bnpzid_authorize_request
from .models import Department, Employee, Section, ROLE_ADMIN, ROLE_CHOICES, ROLE_HR, UserProfile


PENDING_FACE_AUTH_USER_ID = 'pending_face_auth_user_id'
PENDING_FACE_AUTH_BACKEND = 'pending_face_auth_backend'
PENDING_FACE_AUTH_NEXT = 'pending_face_auth_next'
PENDING_BNPZID_REQUEST = 'pending_bnpzid_request'


def get_employee_web_queryset():
    return Employee.objects.select_related('department', 'section', 'section__department').filter(is_deleted=False)


def get_safe_redirect_url(request, fallback_url):
    next_url = request.GET.get('next') or request.POST.get('next')
    if next_url and url_has_allowed_host_and_scheme(next_url, {request.get_host()}, require_https=request.is_secure()):
        return next_url
    return fallback_url


def clear_pending_face_auth(session):
    for key in (PENDING_FACE_AUTH_USER_ID, PENDING_FACE_AUTH_BACKEND, PENDING_FACE_AUTH_NEXT, PENDING_BNPZID_REQUEST):
        session.pop(key, None)


def get_bnpzid_access_check_url(redirect_uri):
    parts = urlsplit(str(redirect_uri or '').strip())
    if not parts.scheme or not parts.netloc:
        return ''
    return urlunsplit((parts.scheme, parts.netloc, '/api/v1/users/bnpzid/access-check/', '', ''))


def resolve_bnpzid_access_check_url(client_config, redirect_uri):
    configured_url = str((client_config or {}).get('access_check_url', '')).strip()
    if configured_url:
        parts = urlsplit(configured_url)
        if parts.scheme and parts.netloc:
            return configured_url
    return get_bnpzid_access_check_url(redirect_uri)


def get_bnpzid_access_check_verify_value():
    ca_bundle = str(getattr(settings, 'BNPZID_ACCESS_CHECK_CA_BUNDLE', '') or '').strip()
    if ca_bundle:
        return ca_bundle
    return bool(getattr(settings, 'BNPZID_ACCESS_CHECK_VERIFY_SSL', True))


def resolve_bnpzid_client_access(user, bnpzid_request):
    from .bnpzid import get_bnpzid_client_config as _get_client_config
    client_id = str((bnpzid_request or {}).get('client_id', '')).strip()
    redirect_uri = str((bnpzid_request or {}).get('redirect_uri', '')).strip()
    client_config = _get_client_config(client_id) or {}
    client_secret = str(client_config.get('client_secret', '')).strip()
    access_check_url = resolve_bnpzid_access_check_url(client_config, redirect_uri)
    employee = getattr(user, 'employee', None)

    if not client_id or not client_secret:
        raise ValueError('Некорректная конфигурация bnpzID клиента.')

    # access_check_url konfiguratsiya qilinmagan bo'lsa — barcha
    # autentifikatsiyadan o'tgan foydalanuvchilarga ruxsat beriladi
    if not access_check_url:
        return {'allowed': True, 'requires_face_id': False, 'error': ''}

    try:
        response = requests.post(
            access_check_url,
            json={
                'client_id': client_id,
                'client_secret': client_secret,
                'username': user.username,
                'employee_slug': getattr(employee, 'slug', '') or '',
                'tabel_number': getattr(employee, 'tabel_number', '') or '',
            },
            timeout=10,
            verify=get_bnpzid_access_check_verify_value(),
        )
    except requests.RequestException as exc:
        raise ValueError(f'Не удалось проверить доступ клиента bnpzID: {exc}') from exc

    try:
        payload = response.json()
    except ValueError:
        payload = {}

    if response.status_code == 403:
        return {
            'allowed': False,
            'requires_face_id': False,
            'error': payload.get('error') or 'Вам не разрешен доступ в эту систему.',
        }

    if response.status_code >= 400:
        raise ValueError(payload.get('error') or f'Ошибка проверки доступа клиента bnpzID (HTTP {response.status_code}).')

    return {
        'allowed': bool(payload.get('allowed', False)),
        'requires_face_id': bool(payload.get('face_id_required', False)),
        'error': payload.get('error') or '',
    }


def start_bnpzid_authorization(request, *, user, profile, bnpzid_request):
    try:
        access = resolve_bnpzid_client_access(user, bnpzid_request)
    except ValueError as exc:
        clear_pending_face_auth(request.session)
        return None, str(exc)

    if not access.get('allowed'):
        clear_pending_face_auth(request.session)
        return None, access.get('error') or 'Вам не разрешен доступ в эту систему.'

    if access.get('requires_face_id'):
        if profile is None or not profile.avatar_image:
            clear_pending_face_auth(request.session)
            return None, 'Для этого пользователя не настроен Face ID. Загрузите базовое изображение в карточке сотрудника.'

        request.session[PENDING_FACE_AUTH_USER_ID] = user.id
        request.session[PENDING_FACE_AUTH_BACKEND] = getattr(user, 'backend', 'django.contrib.auth.backends.ModelBackend')
        request.session[PENDING_FACE_AUTH_NEXT] = ''
        request.session[PENDING_BNPZID_REQUEST] = {
            'client_id': bnpzid_request['client_id'],
            'redirect_uri': bnpzid_request['redirect_uri'],
            'state': bnpzid_request.get('state', ''),
        }
        request.session.modified = True
        return 'face_required', ''

    clear_pending_face_auth(request.session)
    login(request, user)
    return build_bnpzid_redirect(
        user=user,
        profile=profile,
        client_id=bnpzid_request['client_id'],
        redirect_uri=bnpzid_request['redirect_uri'],
        state=bnpzid_request['state'],
    ), ''


class AuthenticatedTemplateView(APIView):
    permission_classes = [IsAuthenticated]

    def dispatch(self, request, *args, **kwargs):
        if not getattr(request, 'user', None) or not request.user.is_authenticated:
            login_url = reverse('login')
            redirect_target = f'{login_url}?next={request.get_full_path()}'
            return HttpResponseRedirect(redirect_target)
        return super().dispatch(request, *args, **kwargs)


class LoginPageView(View):
    template_name = 'login.html'

    def _render_login(self, request, *, error_message='', username='', bnpzid_request=None):
        pending_user_id = request.session.get(PENDING_FACE_AUTH_USER_ID)
        pending_bnpzid_request = request.session.get(PENDING_BNPZID_REQUEST)
        if pending_user_id and (not request.user.is_authenticated or pending_bnpzid_request):
            profile = UserProfile.objects.select_related('user').filter(user_id=pending_user_id).first()
            requires_face_auth = profile is not None and profile.avatar_image and (bool(pending_bnpzid_request) or profile.requires_face_id_login)
            if requires_face_auth:
                return render(request, self.template_name, {
                    'face_auth_required': True,
                    'next_url': request.session.get(PENDING_FACE_AUTH_NEXT, ''),
                    'pending_username': profile.user.username,
                    'pending_role_display': profile.get_role_display(),
                    'error_message': error_message,
                })
            clear_pending_face_auth(request.session)

        return render(request, self.template_name, {
            'next_url': request.GET.get('next', '') or request.POST.get('next', ''),
            'error_message': error_message,
            'username': username,
            'bnpzid_request': bnpzid_request,
        })

    def get(self, request, *args, **kwargs):
        bnpzid_request, bnpzid_error = get_bnpzid_authorize_request(request.GET)
        if request.user.is_authenticated and bnpzid_request is not None:
            profile = getattr(request.user, 'profile', None)
            redirect_target, error_message = start_bnpzid_authorization(request, user=request.user, profile=profile, bnpzid_request=bnpzid_request)
            if error_message:
                return self._render_login(request, error_message=error_message, bnpzid_request=bnpzid_request)
            if redirect_target == 'face_required':
                return self._render_login(request, bnpzid_request=bnpzid_request)
            return HttpResponseRedirect(redirect_target)
        if request.user.is_authenticated:
            return HttpResponseRedirect(get_safe_redirect_url(request, settings.LOGIN_REDIRECT_URL))
        if request.GET.get('reset'):
            clear_pending_face_auth(request.session)
        return self._render_login(request, error_message=bnpzid_error, bnpzid_request=bnpzid_request)

    def post(self, request, *args, **kwargs):
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')
        bnpzid_request, bnpzid_error = get_bnpzid_authorize_request(request.POST)

        if bnpzid_error:
            clear_pending_face_auth(request.session)
            return self._render_login(request, error_message=bnpzid_error, username=username)

        user = authenticate(request, username=username, password=password)

        if user is None:
            clear_pending_face_auth(request.session)
            return self._render_login(request, error_message='Неверный логин или пароль.', username=username, bnpzid_request=bnpzid_request)

        profile = getattr(user, 'profile', None)
        redirect_url = get_safe_redirect_url(request, settings.LOGIN_REDIRECT_URL)

        if bnpzid_request is not None:
            redirect_target, error_message = start_bnpzid_authorization(request, user=user, profile=profile, bnpzid_request=bnpzid_request)
            if error_message:
                return self._render_login(request, error_message=error_message, username=username, bnpzid_request=bnpzid_request)
            if redirect_target == 'face_required':
                return self._render_login(request, bnpzid_request=bnpzid_request)
            return HttpResponseRedirect(redirect_target)

        if profile is not None and profile.requires_face_id_login:
            if not profile.avatar_image:
                clear_pending_face_auth(request.session)
                return self._render_login(
                    request,
                    error_message='Для этого пользователя не настроен Face ID. Загрузите базовое изображение в карточке сотрудника.',
                    username=username,
                    bnpzid_request=bnpzid_request,
                )

            request.session[PENDING_FACE_AUTH_USER_ID] = user.id
            request.session[PENDING_FACE_AUTH_BACKEND] = getattr(user, 'backend', 'django.contrib.auth.backends.ModelBackend')
            request.session[PENDING_FACE_AUTH_NEXT] = redirect_url
            request.session.modified = True
            return self._render_login(request, bnpzid_request=bnpzid_request)

        clear_pending_face_auth(request.session)
        login(request, user)
        return HttpResponseRedirect(redirect_url)


class LogoutPageView(View):
    def post(self, request, *args, **kwargs):
        logout(request)
        return HttpResponseRedirect(settings.LOGOUT_REDIRECT_URL)

    def get(self, request, *args, **kwargs):
        logout(request)
        return HttpResponseRedirect(settings.LOGOUT_REDIRECT_URL)


class DashboardView(AuthenticatedTemplateView):
    """Представление панели управления сервиса сотрудников."""
    template_name = 'dashboard.html'
    
    def get(self, request, *args, **kwargs):
        # Если пользователь с ролью 'user' — перенаправляем на его карточку сотрудника
        profile = getattr(request.user, 'profile', None)
        if profile and profile.role == 'user':
            employee = getattr(request.user, 'employee', None)
            if employee and not employee.is_deleted:
                return HttpResponseRedirect(f'/employees/{employee.slug}/')

        # Для API-запросов возвращаем JSON
        if request.headers.get('Accept') == 'application/json':
            return Response({
                'success': True,
                'message': 'Данные панели управления успешно получены',
                'data': self.get_dashboard_data()
            })
        
        # Для веб-запросов возвращаем HTML-шаблон
        return render(request, self.template_name)
    
    def get_dashboard_data(self):
        """Получить статистику и данные панели управления."""
        total_employees = Employee.objects.filter(is_deleted=False).count()
        active_employees = Employee.objects.filter(is_deleted=False, is_active=True).count()
        total_departments = Department.objects.count()
        total_sections = Section.objects.count()
        
        return {
            'total_employees': total_employees,
            'active_employees': active_employees,
            'total_departments': total_departments,
            'total_sections': total_sections,
            'inactive_employees': total_employees - active_employees
        }


class DepartmentsWebView(AuthenticatedTemplateView):
    """Веб-представление для управления цехами."""
    template_name = 'departments.html'
    
    def get(self, request, *args, **kwargs):
        return render(request, self.template_name)


class SectionsWebView(AuthenticatedTemplateView):
    """Веб-представление для управления отделами."""
    template_name = 'sections.html'
    
    def get(self, request, *args, **kwargs):
        return HttpResponseRedirect('/departments/#sections')


class EmployeeCreateWebView(AuthenticatedTemplateView):
    """Веб-представление для создания нового сотрудника."""
    template_name = 'employee_create.html'

    def get(self, request, *args, **kwargs):
        return render(request, self.template_name, {
            'departments': Department.objects.order_by('sort_order', 'name'),
            'sections': Section.objects.select_related('department').order_by('department__sort_order', 'department__name', 'name'),
        })


class EmployeeDetailWebView(AuthenticatedTemplateView):
    """Веб-представление для просмотра карточки сотрудника."""
    template_name = 'employee_detail.html'

    def get(self, request, slug, *args, **kwargs):
        employee = get_object_or_404(get_employee_web_queryset(), slug=slug)
        profile = getattr(request.user, 'profile', None)
        user_employee = getattr(request.user, 'employee', None)
        can_edit_sizes_only = bool(
            profile is not None
            and profile.role == 'user'
            and user_employee is not None
            and user_employee.pk == employee.pk
        )

        if profile is not None and profile.role == 'user' and not can_edit_sizes_only:
            if user_employee is not None and not user_employee.is_deleted:
                return HttpResponseRedirect(f'/employees/{user_employee.slug}/')
            return HttpResponseRedirect('/')

        return render(request, self.template_name, {
            'employee': employee,
            'page_mode': 'view',
            'can_edit_sizes_only': can_edit_sizes_only,
            'departments': Department.objects.order_by('sort_order', 'name'),
            'sections': Section.objects.select_related('department').order_by('department__sort_order', 'department__name', 'name'),
        })


class EmployeeEditWebView(AuthenticatedTemplateView):
    """Веб-представление для редактирования карточки сотрудника."""
    template_name = 'employee_detail.html'

    def get(self, request, slug, *args, **kwargs):
        employee = get_object_or_404(get_employee_web_queryset(), slug=slug)
        profile = getattr(request.user, 'profile', None)
        user_employee = getattr(request.user, 'employee', None)

        if profile is not None and profile.role == 'user':
            if user_employee is not None and user_employee.pk == employee.pk and not user_employee.is_deleted:
                return HttpResponseRedirect(f'/employees/{employee.slug}/')
            if user_employee is not None and not user_employee.is_deleted:
                return HttpResponseRedirect(f'/employees/{user_employee.slug}/')
            return HttpResponseRedirect('/')

        return render(request, self.template_name, {
            'employee': employee,
            'page_mode': 'edit',
            'can_edit_sizes_only': False,
            'departments': Department.objects.order_by('sort_order', 'name'),
            'sections': Section.objects.select_related('department').order_by('department__sort_order', 'department__name', 'name'),
        })


class EmployeeDeleteWebView(AuthenticatedTemplateView):
    """Веб-представление для подтверждения удаления сотрудника."""
    template_name = 'employee_delete.html'

    def get(self, request, slug, *args, **kwargs):
        employee = get_object_or_404(get_employee_web_queryset(), slug=slug)
        return render(request, self.template_name, {
            'employee': employee,
        })


class UsersWebView(AuthenticatedTemplateView):
    """Веб-представление для управления пользователями."""
    template_name = 'users.html'

    def get(self, request, *args, **kwargs):
        profile = getattr(request.user, 'profile', None)
        if profile is None or profile.role not in {ROLE_ADMIN, ROLE_HR}:
            return HttpResponseRedirect('/')
        return render(request, self.template_name, {
            'role_choices': ROLE_CHOICES,
        })


class UserAccessWebView(AuthenticatedTemplateView):
    """Веб-представление для управления доступом пользователей."""
    template_name = 'user_access.html'

    def get(self, request, *args, **kwargs):
        profile = getattr(request.user, 'profile', None)
        if profile is None or profile.role != ROLE_ADMIN:
            return HttpResponseRedirect('/')
        return render(request, self.template_name, {
            'role_choices': ROLE_CHOICES,
        })


class ProfileEditWebView(AuthenticatedTemplateView):
    """Веб-представление для редактирования профиля пользователя."""
    template_name = 'profile_edit.html'

    def get(self, request, *args, **kwargs):
        return render(request, self.template_name, {
            'employee': getattr(request.user, 'employee', None),
        })
