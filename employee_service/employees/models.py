import re

from django.db import models
from django.contrib.auth.models import User, Group
from django.template.defaultfilters import slugify


ROLE_ADMIN = 'admin'
ROLE_HR = 'hr'
ROLE_USER = 'user'
ROLE_CHOICES = [
    (ROLE_ADMIN, 'Администратор'),
    (ROLE_HR, 'HR менеджер'),
    (ROLE_USER, 'Пользователь'),
]


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile', verbose_name='Пользователь')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_USER, verbose_name='Роль')
    face_image = models.ImageField(upload_to='user_face_images/', null=True, blank=True, verbose_name='Эталонное изображение лица')

    class Meta:
        verbose_name = 'Профиль пользователя'
        verbose_name_plural = 'Профили пользователей'

    def __str__(self):
        return f'{self.user.username} — {self.get_role_display()}'

    @property
    def avatar_image(self):
        employee = getattr(self.user, 'employee', None)
        if employee and employee.base_image:
            return employee.base_image
        return self.face_image

    @property
    def requires_face_id_login(self):
        return self.role in {ROLE_ADMIN, ROLE_HR}


class Department(models.Model):
    name = models.CharField(max_length=255, unique=True, verbose_name='Название цеха')
    boss_full_name = models.CharField(max_length=255, blank=True, verbose_name='Руководитель цеха')
    sort_order = models.PositiveIntegerField(default=0, db_index=True, verbose_name='Порядок сортировки')

    class Meta:
        ordering = ['sort_order', 'name']

    def save(self, *args, **kwargs):
        if not self.sort_order:
            match = re.match(r'^\s*(\d+)', self.name or '')
            if match:
                self.sort_order = int(match.group(1))
            else:
                max_sort_order = Department.objects.exclude(pk=self.pk).aggregate(models.Max('sort_order'))['sort_order__max'] or 0
                self.sort_order = max_sort_order + 1

        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Section(models.Model):
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='sections', verbose_name='Цех')
    name = models.CharField(max_length=255, verbose_name='Название отдела')

    class Meta:
        ordering = ['department__sort_order', 'department__name', 'name']
        unique_together = [('department', 'name')]

    def __str__(self):
        return f'{self.department.name} / {self.name}'


class Employee(models.Model):
    source_system = models.CharField(max_length=100, default='default', verbose_name='Источник системы')
    external_id = models.CharField(max_length=100, blank=True, default='', verbose_name='Внешний ID')
    first_name = models.CharField(max_length=255, verbose_name='Имя')
    last_name = models.CharField(max_length=255, verbose_name='Фамилия')
    surname = models.CharField(max_length=255, blank=True, default='', verbose_name='Отчество')
    tabel_number = models.CharField(max_length=255, unique=True, verbose_name='Табельный номер')
    gender = models.CharField(max_length=8, choices=[('M', 'Мужской'), ('F', 'Женский')], blank=True, default='', verbose_name='Пол')
    date_of_birth = models.DateField(null=True, blank=True, verbose_name='Дата рождения')
    height = models.CharField(max_length=255, blank=True, default='')
    clothe_size = models.CharField(max_length=255, blank=True, default='')
    special_clothing_size = models.CharField(max_length=255, blank=True, default='', verbose_name='Спецодежда')
    shoe_size = models.CharField(max_length=255, blank=True, default='')
    jacket_size = models.CharField(max_length=255, blank=True, default='', verbose_name='Куртка')
    tshirt_size = models.CharField(max_length=255, blank=True, default='', verbose_name='Футболка')
    phone_number_1 = models.CharField(max_length=20, blank=True, default='', verbose_name='Телефон 1')
    phone_number_2 = models.CharField(max_length=20, blank=True, default='', verbose_name='Телефон 2')
    login = models.CharField(max_length=150, blank=True, default='', verbose_name='Логин')
    password_hash = models.CharField(max_length=128, blank=True, default='', verbose_name='Хеш пароля')
    user = models.OneToOneField(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='employee', verbose_name='Пользователь')
    base_image = models.ImageField(upload_to='employee_base_images/', null=True, blank=True, verbose_name='Базовое изображение')
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='employees', verbose_name='Цех')
    section = models.ForeignKey(Section, on_delete=models.SET_NULL, null=True, blank=True, related_name='employees', verbose_name='Отдел')
    position = models.TextField(blank=True, default='', verbose_name='Должность')
    date_of_employment = models.DateField(null=True, blank=True, verbose_name='Дата приема на работу')
    date_of_change_position = models.DateField(null=True, blank=True, verbose_name='Дата изменения должности')
    slug = models.SlugField(unique=True, blank=True, verbose_name='Слаг')
    is_active = models.BooleanField(default=True, verbose_name='Активен')
    is_deleted = models.BooleanField(default=False, verbose_name='Удален')
    requires_face_id_checkout = models.BooleanField(default=True, verbose_name='Требует проверку по лицу')
    metadata = models.JSONField(default=dict, blank=True, verbose_name='Метаданные')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлен')

    class Meta:
        ordering = ['last_name', 'first_name', 'surname', 'tabel_number']
        constraints = [
            models.UniqueConstraint(
                fields=['source_system', 'external_id'],
                condition=~models.Q(external_id=''),
                name='employees_employee_source_external_unique',
            )
        ]

    def __str__(self):
        parts = [self.last_name, self.first_name, self.surname]
        return ' '.join(part for part in parts if part).strip() or self.tabel_number

    def save(self, *args, **kwargs):
        if not self.slug:
            slug_parts = [self.tabel_number, self.first_name, self.last_name]
            base_slug = slugify('-'.join(str(part).strip() for part in slug_parts if part)) or 'employee'
            slug_candidate = base_slug
            suffix = 1
            while Employee.objects.filter(slug=slug_candidate).exclude(pk=self.pk).exists():
                suffix += 1
                slug_candidate = f'{base_slug}-{suffix}'
            self.slug = slug_candidate

        super().save(*args, **kwargs)


class BnpzIdClient(models.Model):
    client_id = models.CharField(max_length=100, unique=True, verbose_name='Client ID')
    name = models.CharField(max_length=200, verbose_name='Название')
    client_secret = models.CharField(max_length=255, verbose_name='Client Secret')
    allowed_redirects = models.TextField(
        blank=True, default='',
        verbose_name='Разрешённые redirect URI',
        help_text='По одному URI на строку',
    )
    access_check_url = models.URLField(
        blank=True, default='',
        verbose_name='URL проверки доступа',
        help_text='Оставьте пустым, чтобы разрешить доступ всем аутентифицированным пользователям',
    )
    is_active = models.BooleanField(default=True, verbose_name='Активен')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлён')

    class Meta:
        verbose_name = 'bnpzID клиент'
        verbose_name_plural = 'bnpzID клиенты'
        ordering = ['client_id']

    def __str__(self):
        return f'{self.client_id} ({self.name})'

    def get_allowed_redirects_list(self):
        return [line.strip() for line in self.allowed_redirects.splitlines() if line.strip()]

    def to_config_dict(self):
        return {
            'name': self.name,
            'client_secret': self.client_secret,
            'allowed_redirects': self.get_allowed_redirects_list(),
            'access_check_url': self.access_check_url or '',
        }


class EmployeeBaseImageChangeLog(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='base_image_change_logs')
    employee_full_name = models.CharField(max_length=255, blank=True, default='')
    employee_tabel_number = models.CharField(max_length=255, blank=True, default='')
    changed_by_username = models.CharField(max_length=150, blank=True, default='')
    changed_by_user_id = models.CharField(max_length=64, blank=True, default='')
    changed_by_role = models.CharField(max_length=64, blank=True, default='')
    old_image = models.CharField(max_length=500, blank=True, default='')
    new_image = models.CharField(max_length=500, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-id']

    def __str__(self):
        label = self.employee_full_name or str(self.employee)
        return f'{label} — {self.created_at:%Y-%m-%d %H:%M:%S}'
    