import datetime
import uuid

from django.db import models
from django.db.models import Q
from io import BytesIO
from django.core.files.base import ContentFile
import qrcode
from django.db import models
from django.contrib.auth.models import User
from django.template.defaultfilters import slugify
from django.conf import settings
from simple_history.models import HistoricalRecords
from django.utils import timezone
import datetime as dt
# from rest_framework.permissions import AllowAny
# from rest_framework import serializers, viewsets
# from rest_framework.response import Response
# from rest_framework.decorators import api_view, permission_classes
# from django.core.exceptions import ValidationError
from base.middleware import CurrentUserMiddleware
from django.db.models.signals import m2m_changed
from django.dispatch import receiver

from .employee_data import build_employee_namespace, build_employee_snapshot


class Department(models.Model):
    name = models.CharField(max_length=255, verbose_name='Название цеха')
    boss_fullName = models.CharField(max_length=255, verbose_name='Руководитель цеха')

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = 'Цех '
        verbose_name_plural = 'Цех'


class Section(models.Model):
    department = models.ForeignKey(Department, on_delete=models.CASCADE, verbose_name='Название цеха')
    name = models.CharField(max_length=255, verbose_name='Название отдела')

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = 'Отдел'
        verbose_name_plural = 'Отдел'
        db_table = 'base_section'


class ResponsiblePerson(models.Model):
    full_name = models.CharField(max_length=255, verbose_name='ФИО ответственного лица')
    position = models.CharField(max_length=255, verbose_name='Должность ответственного лица')
    employee_slug = models.CharField(
        max_length=255, null=True, blank=True,
        verbose_name='Slug сотрудника (employee_service)',
    )

    def __str__(self):
        return self.full_name

    class Meta:
        verbose_name = 'Ответственное лицо'
        verbose_name_plural = 'Ответственные лица'
        

class Employee(models.Model):
    first_name = models.CharField(max_length=255, verbose_name='Имя')
    last_name = models.CharField(max_length=255, verbose_name='Фамилия')
    surname = models.CharField(max_length=255, verbose_name='Отчество')
    tabel_number = models.CharField(max_length=255, unique=True, verbose_name='Табельный номер')
    
    gender = models.CharField(choices=[('M', 'Мужской'), ('F', 'Женский')], max_length=255, verbose_name='Пол')
    height = models.CharField(max_length=255, verbose_name='Рост')
    
    clothe_size = models.CharField(max_length=255, verbose_name='Размер одежды')
    shoe_size = models.CharField(max_length=255, verbose_name='Размер обуви')
    base_image = models.ImageField(upload_to='employee_base_images/', null=True, blank=True, verbose_name='Базовое фото 3x4')
    
    section = models.ForeignKey(Section, on_delete=models.CASCADE, verbose_name='Отдел')
    department = models.ForeignKey(Department, on_delete=models.CASCADE, verbose_name='Цех')
    position = models.TextField(verbose_name='Должность', blank=True, null=True)
    date_of_employment = models.DateField(verbose_name='Дата приема на работу', blank=True, null=True)
    date_of_change_position = models.DateField(verbose_name='Дата последнего изменения должности', blank=True, null=True)
    
    addedUser = models.ForeignKey(User, on_delete=models.SET_NULL, verbose_name="Сотрудник", null=True, blank=True)
    updatedUser = models.ForeignKey(User, on_delete=models.SET_NULL, related_name="updated_items",
                                    verbose_name="Изменил", null=True, blank=True)
    updatedAt = models.DateTimeField(auto_now=True, verbose_name="Дата изменения", null=True, blank=True)
    
    slug = models.SlugField(unique=True, blank=True)
    isActive = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)
    requires_face_id_checkout = models.BooleanField(
        default=True, 
        verbose_name='Требуется Face ID при выдаче СИЗ',
        help_text='Если отключено, сотрудник может брать СИЗ без верификации лица'
    )
    history = HistoricalRecords(
        history_change_reason_field=models.TextField(null=True),
        inherit=True,
        excluded_fields=['tabel_number'] )
    def __str__(self):
        return self.first_name + " " + self.last_name + " " + self.surname

    def save(self, *args, **kwargs):
        user = CurrentUserMiddleware.get_current_user()
        if user and user.is_authenticated:
            self.updatedUser = user
            if not hasattr(self, '_history_user'):
                self._history_user = user

        if not self.slug:
            slug_parts = [self.tabel_number, self.first_name, self.last_name]
            base_slug = slugify("-".join(str(part).strip() for part in slug_parts if part))
            if not base_slug:
                base_slug = f"employee-{self.tabel_number}" if self.tabel_number else "employee"

            slug_candidate = base_slug
            counter = 1
            while Employee.objects.filter(slug=slug_candidate).exclude(pk=self.pk).exists():
                counter += 1
                slug_candidate = f"{base_slug}-{counter}"

            self.slug = slug_candidate

        super().save(*args, **kwargs) 

    class Meta:
        verbose_name = 'Сотрудник'
        verbose_name_plural = 'Сотрудник'
        db_table = 'base_employee'


class EmployeeFaceIdOverride(models.Model):
    employee_service_id = models.BigIntegerField(null=True, blank=True, db_index=True, unique=True, verbose_name='ID сотрудника из employee_service')
    employee_slug = models.SlugField(max_length=255, null=True, blank=True, db_index=True, unique=True, verbose_name='Slug сотрудника из employee_service')
    tabel_number = models.CharField(max_length=255, null=True, blank=True, db_index=True, verbose_name='Табельный номер')
    full_name = models.CharField(max_length=255, blank=True, default='', verbose_name='ФИО сотрудника')
    requires_face_id_checkout = models.BooleanField(
        default=True,
        verbose_name='Требуется Face ID при выдаче СИЗ',
        help_text='Локальный override для случаев, когда employee_service доступен только на чтение',
    )
    updatedAt = models.DateTimeField(auto_now=True, verbose_name='Дата изменения', null=True, blank=True)

    class Meta:
        verbose_name = 'Локальная настройка Face ID'
        verbose_name_plural = 'Локальные настройки Face ID'
        db_table = 'base_employee_face_id_override'
        ordering = ['full_name', 'employee_slug', 'id']

    def __str__(self):
        label = self.full_name or self.employee_slug or str(self.employee_service_id or self.tabel_number or self.pk)
        return f"{label} — {'требуется' if self.requires_face_id_checkout else 'не требуется'}"
        

class PPEProduct(models.Model):
    TARGET_GENDER_ALL = 'ALL'
    TARGET_GENDER_MALE = 'M'
    TARGET_GENDER_FEMALE = 'F'
    TARGET_GENDER_CHOICES = [
        (TARGET_GENDER_ALL, 'Для всех'),
        (TARGET_GENDER_MALE, 'Мужской'),
        (TARGET_GENDER_FEMALE, 'Женский'),
    ]
   
    name = models.CharField(max_length=255, verbose_name="Наименование")
    
    renewal_months = models.PositiveIntegerField(default=0, verbose_name="Срок обновления (в месяцах)", help_text="0 bo'lsa muddat yo'q (cheklanmagan)")
    low_stock_threshold = models.PositiveIntegerField(default=0, verbose_name="Порог остатка")
    type_product = models.CharField(max_length=255, choices=[('Комплект', 'Комплект'), ('Пара', 'Пара'), ('ШТ','ШТ')], verbose_name="Единица измерения", blank=True, null=True)
    target_gender = models.CharField(
        max_length=3,
        choices=TARGET_GENDER_CHOICES,
        default=TARGET_GENDER_ALL,
        verbose_name='Для кого',
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Средство индивидуальной защиты'
        verbose_name_plural = 'Средства индивидуальной защиты'

    def __str__(self):
        return self.name


def normalize_employee_position(value):
    return ' '.join(str(value or '').strip().lower().split())


class DepartmentPPERenewalRule(models.Model):
    department_service_id = models.PositiveIntegerField(db_index=True, verbose_name='ID цеха из employee_service')
    department_name = models.CharField(max_length=255, verbose_name='Название цеха')
    ppeproduct = models.ForeignKey(
        PPEProduct,
        on_delete=models.CASCADE,
        related_name='department_renewal_rules',
        verbose_name='Средство индивидуальной защиты',
    )
    renewal_months = models.PositiveIntegerField(default=0, verbose_name='Срок выдачи (в месяцах)')
    updatedAt = models.DateTimeField(auto_now=True, verbose_name='Дата изменения', null=True, blank=True)

    class Meta:
        verbose_name = 'Норма выдачи СИЗ по цеху'
        verbose_name_plural = 'Нормы выдачи СИЗ по цехам'
        db_table = 'base_department_ppe_renewal_rule'
        ordering = ['department_name', 'ppeproduct__name', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['department_service_id', 'ppeproduct'],
                name='unique_department_ppe_renewal_rule',
            ),
        ]

    def __str__(self):
        return f"{self.department_name} — {self.ppeproduct.name} ({self.renewal_months} мес.)"


class PositionPPERenewalRule(models.Model):
    department_service_id = models.PositiveIntegerField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name='ID цеха из employee_service',
    )
    department_name = models.CharField(max_length=255, blank=True, default='', verbose_name='Цех')
    position_name = models.CharField(max_length=255, verbose_name='Должность')
    position_key = models.CharField(max_length=255, db_index=True, editable=False, verbose_name='Ключ должности')
    ppeproduct = models.ForeignKey(
        PPEProduct,
        on_delete=models.CASCADE,
        related_name='position_renewal_rules',
        verbose_name='Средство индивидуальной защиты',
    )
    is_allowed = models.BooleanField(default=True, verbose_name='Разрешено для должности')
    renewal_months = models.PositiveIntegerField(default=0, verbose_name='Срок выдачи (в месяцах)')
    updatedAt = models.DateTimeField(auto_now=True, verbose_name='Дата изменения', null=True, blank=True)

    class Meta:
        verbose_name = 'Норма выдачи СИЗ по должности'
        verbose_name_plural = 'Нормы выдачи СИЗ по должностям'
        db_table = 'base_position_ppe_renewal_rule'
        ordering = ['department_name', 'position_name', 'ppeproduct__name', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['department_service_id', 'position_key', 'ppeproduct'],
                name='unique_department_position_ppe_renewal_rule',
            ),
            models.UniqueConstraint(
                fields=['position_key', 'ppeproduct'],
                condition=Q(department_service_id__isnull=True),
                name='unique_global_position_ppe_renewal_rule',
            ),
        ]

    def save(self, *args, **kwargs):
        self.department_name = ' '.join(str(self.department_name or '').strip().split())
        self.position_name = ' '.join(str(self.position_name or '').strip().split())
        self.position_key = normalize_employee_position(self.position_name)
        super().save(*args, **kwargs)

    def __str__(self):
        if self.department_name:
            return f"{self.department_name} — {self.position_name} — {self.ppeproduct.name} ({self.renewal_months} мес.)"
        return f"{self.position_name} — {self.ppeproduct.name} ({self.renewal_months} мес.)"


class PPEArrival(models.Model):
    ppeproduct = models.ForeignKey(PPEProduct, on_delete=models.CASCADE, related_name='arrivals', verbose_name='Средство защиты')
    quantity = models.PositiveIntegerField(default=0, verbose_name='Количество (приход)')
    size = models.CharField(max_length=50, blank=True, null=True, verbose_name='Размер')
    size_breakdown = models.JSONField(default=dict, blank=True, verbose_name='Разбивка по размерам')
    received_at = models.DateField(verbose_name='Дата прихода')
    note = models.CharField(max_length=255, blank=True, null=True, verbose_name='Примечание')
    addedUser = models.ForeignKey(User, on_delete=models.SET_NULL, verbose_name='Сотрудник', null=True, blank=True)
    updatedAt = models.DateTimeField(auto_now=True, verbose_name='Дата изменения', null=True, blank=True)

    class Meta:
        verbose_name = 'Приход СИЗ'
        verbose_name_plural = 'Приходы СИЗ'
        db_table = 'base_ppe_arrival'
        ordering = ['-received_at', '-id']

    def __str__(self):
        return f"{self.ppeproduct.name} — {self.quantity} ({self.received_at})"


def get_employee_snapshot_label(snapshot: dict) -> str:
    employee = build_employee_namespace(snapshot)
    return str(employee)




class Item(models.Model):
    """
    'Berildi' hujjati (head).
    """
    employee_service_id = models.BigIntegerField(db_index=True, verbose_name='ID сотрудника из employee_service')
    employee_slug = models.SlugField(blank=True, null=True, db_index=True)
    employee_snapshot = models.JSONField(default=dict, blank=True, verbose_name='Снимок сотрудника')
    ppeproduct = models.ManyToManyField(PPEProduct, related_name="issues", verbose_name="Средство индивидуальной защиты")
    ppe_sizes = models.JSONField(default=dict, blank=True, verbose_name="Размеры СИЗ")
    image = models.ImageField(upload_to='item_images/', null=True, blank=True, verbose_name='Фото при выдаче')
    slug = models.SlugField(unique=True, blank=True, null=True)
    issued_at = models.DateTimeField(default=dt.datetime.now, verbose_name="Дата выдачи")
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="ppe_issued_docs"
    )
    next_due_date = models.DateTimeField(null=True, blank=True, verbose_name="Дата следующей выдачи")
    addedUser = models.ForeignKey(User, on_delete=models.SET_NULL, verbose_name="Сотрудник", null=True, blank=True)
    updatedUser = models.ForeignKey(User, on_delete=models.SET_NULL, related_name="updated_employees",
                                    verbose_name="Изменил", null=True, blank=True)
    updatedAt = models.DateTimeField(auto_now=True, verbose_name="Дата изменения", null=True, blank=True)
    affects_stock = models.BooleanField(default=True, verbose_name='Влияет на остатки склада')
    isActive = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)
    history = HistoricalRecords(
        history_change_reason_field=models.TextField(null=True),
        inherit=True
    )

    def _build_unique_slug(self):
        if not self.employee_service_id:
            return

        employee = self.employee
        slug_parts = [
            employee.tabel_number,
            employee.last_name,
            employee.first_name,
            employee.surname,
        ]
        base_slug = slugify("-".join(str(part).strip() for part in slug_parts if part))
        if not base_slug:
            base_slug = f"item-{self.employee_service_id}"

        slug_candidate = base_slug
        suffix = 1
        while Item.objects.filter(slug=slug_candidate).exclude(pk=self.pk).exists():
            suffix += 1
            slug_candidate = f"{base_slug}-{suffix}"

        self.slug = slug_candidate
    
    def save(self, *args, **kwargs):
        user = CurrentUserMiddleware.get_current_user()
        if user and user.is_authenticated:
            self.updatedUser = user
            if not hasattr(self, '_history_user'):
                self._history_user = user

        if self.employee_snapshot:
            self.employee_snapshot = build_employee_snapshot(self.employee_snapshot)
            if not self.employee_slug:
                self.employee_slug = self.employee_snapshot.get('slug') or None
            if not self.employee_service_id:
                external_id = self.employee_snapshot.get('external_id') or self.employee_snapshot.get('id')
                if str(external_id or '').strip():
                    self.employee_service_id = int(external_id)

        if not self.slug:
            self._build_unique_slug()
                
        if self.pk and self.next_due_date is None:
            max_renewal_months = self.ppeproduct.aggregate(models.Max('renewal_months'))['renewal_months__max']
            if max_renewal_months and max_renewal_months > 0:
                self.next_due_date = self.issued_at + datetime.timedelta(days=30 * max_renewal_months)
                
        super().save(*args, **kwargs)
        
    class Meta:
        ordering = ["-issued_at", "-id"]

    def __str__(self):
        return f"Issue #{self.id} {get_employee_snapshot_label(self.employee_snapshot)} {self.issued_at}"

    @property
    def employee(self):
        payload = getattr(self, '_employee_snapshot_override', None) or self.employee_snapshot
        return build_employee_namespace(payload)

    @property
    def employee_id(self):
        return self.employee_service_id

    def set_employee_snapshot(self, payload: dict):
        normalized = build_employee_snapshot(payload)
        self.employee_snapshot = normalized
        self._employee_snapshot_override = normalized
        self.employee_slug = normalized.get('slug') or self.employee_slug
        external_id = normalized.get('external_id') or normalized.get('id')
        if str(external_id or '').strip():
            self.employee_service_id = int(external_id)


@receiver(m2m_changed, sender=Item.ppeproduct.through)
def set_next_due_date_on_ppe_change(sender, instance, action, **kwargs):
    if action not in {"post_add", "post_remove", "post_clear"}:
        return

    max_renewal_months = instance.ppeproduct.aggregate(models.Max('renewal_months'))['renewal_months__max']
    if max_renewal_months and max_renewal_months > 0:
        next_due_date = instance.issued_at + datetime.timedelta(days=30 * max_renewal_months)
    else:
        next_due_date = None

    if instance.next_due_date != next_due_date:
        Item.objects.filter(pk=instance.pk).update(next_due_date=next_due_date)


class PendingItemIssue(models.Model):
    """
    СИЗ berish uchun kutilayotgan holat.
    Hodim imzo qo'ymaguncha Item yaratilmaydi.
    3 daqiqa ichida imzo qo'yilmasa, bu yozuv o'chirilishi mumkin.
    """
    STATUS_PENDING = 'pending'
    STATUS_CONFIRMED = 'confirmed'
    STATUS_EXPIRED = 'expired'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Ожидает подписи'),
        (STATUS_CONFIRMED, 'Подтверждено'),
        (STATUS_EXPIRED, 'Истекло'),
    ]

    employee_service_id = models.BigIntegerField(db_index=True, verbose_name='ID сотрудника из employee_service')
    employee_slug = models.SlugField(blank=True, null=True, db_index=True)
    employee_snapshot = models.JSONField(default=dict, blank=True, verbose_name='Снимок сотрудника')
    ppeproduct_ids = models.JSONField(default=list, verbose_name="ID средств защиты")
    ppe_sizes = models.JSONField(default=dict, blank=True, verbose_name="Размеры СИЗ")
    verified_image = models.ImageField(upload_to='pending_verified_images/', null=True, blank=True, verbose_name='Фото верификации')
    signature_image = models.ImageField(upload_to='signatures/', null=True, blank=True, verbose_name='Подпись сотрудника')
    warehouse_signature_image = models.ImageField(upload_to='signatures/', null=True, blank=True, verbose_name='Подпись кладовщика')
    qr_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True, verbose_name='QR токен выдачи')
    qr_code_image = models.ImageField(upload_to='issue_qr_codes/', null=True, blank=True, verbose_name='QR код выдачи')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING, verbose_name="Статус")
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")
    employee_signed_at = models.DateTimeField(null=True, blank=True, verbose_name='Дата подписи сотрудника')
    warehouse_signed_at = models.DateTimeField(null=True, blank=True, verbose_name='Дата подписи кладовщика')
    expires_at = models.DateTimeField(verbose_name="Истекает")
    confirmed_at = models.DateTimeField(null=True, blank=True, verbose_name="Дата подтверждения")
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="pending_issues_created"
    )
    
    # Link to created Item after confirmation
    confirmed_item = models.ForeignKey(
        Item, on_delete=models.SET_NULL, null=True, blank=True, related_name="pending_source"
    )

    class Meta:
        verbose_name = 'Ожидающая выдача'
        verbose_name_plural = 'Ожидающие выдачи'
        ordering = ['-created_at']

    def __str__(self):
        return f"PendingIssue #{self.id} - {get_employee_snapshot_label(self.employee_snapshot)} ({self.status})"

    def is_expired(self):
        return timezone.now() > self.expires_at

    def save(self, *args, **kwargs):
        if self.employee_snapshot:
            self.employee_snapshot = build_employee_snapshot(self.employee_snapshot)
            if not self.employee_slug:
                self.employee_slug = self.employee_snapshot.get('slug') or None
            if not self.employee_service_id:
                external_id = self.employee_snapshot.get('external_id') or self.employee_snapshot.get('id')
                if str(external_id or '').strip():
                    self.employee_service_id = int(external_id)
        if not self.expires_at:
            self.expires_at = timezone.now() + datetime.timedelta(minutes=3)
        super().save(*args, **kwargs)

    def get_qr_frontend_path(self):
        return f'/issue-qr/{self.qr_token}'

    def generate_qr_code(self, absolute_url: str):
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=2,
        )
        qr.add_data(str(absolute_url or '').strip())
        qr.make(fit=True)

        image = qr.make_image(fill_color='black', back_color='white')
        buffer = BytesIO()
        image.save(buffer, format='PNG')
        self.qr_code_image.save(
            f'issue_qr_{self.qr_token}.png',
            ContentFile(buffer.getvalue()),
            save=False,
        )

    @property
    def employee(self):
        payload = getattr(self, '_employee_snapshot_override', None) or self.employee_snapshot
        return build_employee_namespace(payload)

    @property
    def employee_id(self):
        return self.employee_service_id

    def set_employee_snapshot(self, payload: dict):
        normalized = build_employee_snapshot(payload)
        self.employee_snapshot = normalized
        self._employee_snapshot_override = normalized
        self.employee_slug = normalized.get('slug') or self.employee_slug
        external_id = normalized.get('external_id') or normalized.get('id')
        if str(external_id or '').strip():
            self.employee_service_id = int(external_id)
