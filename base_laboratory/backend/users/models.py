from django.utils.timezone import now
from rest_framework.authtoken.models import Token
from datetime import timedelta
from django.db import models
from django.conf import settings



class CustomToken(Token):
    expires_at = models.DateTimeField(null=True, blank=True)

    @staticmethod
    def get_session_ttl():
        ttl_seconds = int(getattr(settings, 'TOKEN_SESSION_TTL_SECONDS', 7200) or 7200)
        return timedelta(seconds=ttl_seconds)

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = now() + self.get_session_ttl()
        return super().save(*args, **kwargs)

    def is_expired(self):
        session_deadline = self.created + self.get_session_ttl()
        if self.expires_at:
            session_deadline = min(session_deadline, self.expires_at)
        return now() > session_deadline


class UserRole(models.Model):
    ADMIN = 'admin'
    IT_CENTER = 'it_center'
    SHIFT_HEAD = 'shift_head'
    STTL_HEAD = 'sttl_head'
    CZL_HEAD = 'czl_head'
    DISPATCHER = 'dispatcher'
    USER = 'user'

    # These four roles all share the same page/feature access defaults (see
    # get_default_page_access / get_default_feature_access) — they replace the
    # single consolidated laboratory_manager role with per-position labels.
    MANAGER_TIER_ROLES = (SHIFT_HEAD, STTL_HEAD, CZL_HEAD, DISPATCHER)

    ROLE_CHOICES = (
        (ADMIN, 'Админ'),
        (IT_CENTER, 'IT Center'),
        (SHIFT_HEAD, 'Начальник смены'),
        (STTL_HEAD, 'Начальник СТТЛ'),
        (CZL_HEAD, 'Начальник ЦЗЛ'),
        (DISPATCHER, 'Диспетчер'),
        (USER, 'Обычный пользователь'),
    )

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='role_profile')
    role = models.CharField(max_length=32, choices=ROLE_CHOICES, default=USER)
    base_avatar = models.ImageField(upload_to='user_avatars/', null=True, blank=True, verbose_name='Базовый аватар')
    employee_slug = models.CharField(max_length=255, null=True, blank=True, verbose_name='Slug сотрудника из employee_service')
    face_id_required = models.BooleanField(default=True, verbose_name='Требуется Face ID при входе')

    def __str__(self):
        return f"{self.user.username}: {self.role}"


def get_effective_user_role(user):
    if not user or not user.is_authenticated:
        return UserRole.USER

    if user.is_superuser:
        return UserRole.ADMIN

    user_id = getattr(user, 'pk', None)
    if not user_id:
        return UserRole.USER

    profile = UserRole.objects.filter(user_id=user_id).only('role').first()
    if profile and profile.role in {choice[0] for choice in UserRole.ROLE_CHOICES}:
        return profile.role

    profile, _ = UserRole.objects.get_or_create(user_id=user_id)
    return profile.role if profile.role in {choice[0] for choice in UserRole.ROLE_CHOICES} else UserRole.USER


ROLE_PAGE_ACCESS_FIELD_MAP = {
    'dashboard': 'can_view_dashboard',
    'ppe_arrival': 'can_view_ppe_arrival',
    'statistics': 'can_view_statistics',
    'passports': 'can_view_passports',
    'settings': 'can_view_settings',
}

ROLE_FEATURE_ACCESS_FIELD_MAP = {
    'dashboard_due_cards': 'can_view_dashboard_due_cards',
    'dashboard_export_excel': 'can_export_dashboard_excel',
    'dashboard_delete_employee': 'can_delete_employee',
    'employee_ppe_tab': 'can_view_employee_ppe_tab',
    'face_id_control': 'can_manage_face_id_control',
    'ppe_arrival_intake': 'can_submit_ppe_arrival',
}


def get_default_page_access(role):
    normalized_role = str(role or UserRole.USER).strip().lower()

    # 'passports' defaults to True everywhere: the Паспорта section used to be shown to every
    # authenticated role unconditionally, so anything else would silently take it away.
    defaults = {
        'dashboard': True,
        'ppe_arrival': False,
        'statistics': False,
        'passports': True,
        'settings': False,
    }

    if normalized_role in [UserRole.ADMIN, UserRole.IT_CENTER]:
        return {
            'dashboard': True,
            'ppe_arrival': True,
            'statistics': True,
            'passports': True,
            'settings': True,
        }

    if normalized_role in UserRole.MANAGER_TIER_ROLES:
        return {
            'dashboard': True,
            'ppe_arrival': True,
            'statistics': True,
            'passports': True,
            'settings': True,
        }

    return defaults


def get_default_feature_access(role):
    normalized_role = str(role or UserRole.USER).strip().lower()

    defaults = {
        'dashboard_due_cards': True,
        'dashboard_export_excel': True,
        'dashboard_delete_employee': False,
        'employee_ppe_tab': True,
        'face_id_control': False,
        'ppe_arrival_intake': False,
    }

    if normalized_role == UserRole.ADMIN:
        return {
            'dashboard_due_cards': True,
            'dashboard_export_excel': True,
            'dashboard_delete_employee': True,
            'employee_ppe_tab': True,
            'face_id_control': True,
            'ppe_arrival_intake': True,
        }

    if normalized_role == UserRole.IT_CENTER:
        return {
            'dashboard_due_cards': True,
            'dashboard_export_excel': True,
            'dashboard_delete_employee': True,
            'employee_ppe_tab': True,
            'face_id_control': False,
            'ppe_arrival_intake': True,
        }

    if normalized_role in UserRole.MANAGER_TIER_ROLES:
        return {
            'dashboard_due_cards': True,
            'dashboard_export_excel': True,
            'dashboard_delete_employee': False,
            'employee_ppe_tab': True,
            'face_id_control': True,
            'ppe_arrival_intake': True,
        }

    return defaults


class RolePageAccess(models.Model):
    role = models.CharField(max_length=32, choices=UserRole.ROLE_CHOICES, unique=True)
    can_view_dashboard = models.BooleanField(default=True)
    can_view_ppe_arrival = models.BooleanField(default=False)
    can_view_statistics = models.BooleanField(default=False)
    can_view_passports = models.BooleanField(default=True)
    can_view_settings = models.BooleanField(default=False)
    can_view_dashboard_due_cards = models.BooleanField(default=True)
    can_add_employee = models.BooleanField(default=False)
    can_export_dashboard_excel = models.BooleanField(default=True)
    can_edit_employee = models.BooleanField(default=False)
    can_delete_employee = models.BooleanField(default=False)
    can_view_employee_ppe_tab = models.BooleanField(default=True)
    can_manage_face_id_control = models.BooleanField(default=False)
    can_submit_ppe_arrival = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Role Page Access'
        verbose_name_plural = 'Role Page Access'
        ordering = ['role']

    def __str__(self):
        return f"{self.role} page access"


def get_role_page_access_instance(role):
    normalized_role = str(role or UserRole.USER).strip().lower()
    defaults = get_default_page_access(normalized_role)
    feature_defaults = get_default_feature_access(normalized_role)
    db_defaults = {
        ROLE_PAGE_ACCESS_FIELD_MAP[key]: value
        for key, value in defaults.items()
    }
    db_defaults.update({
        ROLE_FEATURE_ACCESS_FIELD_MAP[key]: value
        for key, value in feature_defaults.items()
    })

    instance, created = RolePageAccess.objects.get_or_create(role=normalized_role, defaults=db_defaults)

    if normalized_role == UserRole.ADMIN:
        fields_to_update = []
        for key, field_name in ROLE_PAGE_ACCESS_FIELD_MAP.items():
            default_value = defaults[key]
            if getattr(instance, field_name) != default_value:
                setattr(instance, field_name, default_value)
                fields_to_update.append(field_name)
        for key, field_name in ROLE_FEATURE_ACCESS_FIELD_MAP.items():
            default_value = feature_defaults[key]
            if getattr(instance, field_name) != default_value:
                setattr(instance, field_name, default_value)
                fields_to_update.append(field_name)
        if fields_to_update:
            instance.save(update_fields=fields_to_update + ['updated_at'])

    return instance


def get_page_access_for_role(role):
    instance = get_role_page_access_instance(role)
    return {
        key: bool(getattr(instance, field_name))
        for key, field_name in ROLE_PAGE_ACCESS_FIELD_MAP.items()
    }


def get_feature_access_for_role(role):
    instance = get_role_page_access_instance(role)
    return {
        key: bool(getattr(instance, field_name))
        for key, field_name in ROLE_FEATURE_ACCESS_FIELD_MAP.items()
    }


def user_has_page_access(user, page_key):
    role = get_effective_user_role(user)
    access = get_page_access_for_role(role)
    return bool(access.get(page_key, False))


def user_has_feature_access(user, feature_key):
    role = get_effective_user_role(user)
    access = get_feature_access_for_role(role)
    return bool(access.get(feature_key, False))



