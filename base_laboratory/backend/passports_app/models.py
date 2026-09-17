import uuid

from django.conf import settings
from django.db import models


# ─── Spravka (o'zgarishsiz) ────────────────────────────────────────────────────

class Spravka(models.Model):
    STATUS_DRAFT = 'draft'
    STATUS_PENDING_STTL = 'pending_sttl'
    STATUS_PENDING_CZL = 'pending_czl'
    STATUS_PENDING_DISPATCHER = 'pending_dispatcher'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'
    APPROVAL_STATUS_CHOICES = [
        (STATUS_DRAFT, 'Черновик'),
        (STATUS_PENDING_STTL, 'На подписи: Начальник СТТЛ'),
        (STATUS_PENDING_CZL, 'На подписи: Начальник ЦЗЛ'),
        (STATUS_PENDING_DISPATCHER, 'На подписи: Диспетчер'),
        (STATUS_APPROVED, 'Утверждён'),
        (STATUS_REJECTED, 'Отклонён'),
    ]

    STEP_STTL = 'sttl'
    STEP_CZL = 'czl'
    STEP_DISPATCHER = 'dispatcher'
    APPROVAL_STEP_CHOICES = [
        (STEP_STTL, 'Начальник СТТЛ'),
        (STEP_CZL, 'Начальник ЦЗЛ'),
        (STEP_DISPATCHER, 'Диспетчер'),
    ]

    spravka_number = models.CharField(max_length=100, verbose_name='Номер справки')
    manufacture_date = models.CharField(max_length=100, blank=True, verbose_name='Дата изготовления / налива')
    reservoir = models.CharField(max_length=100, blank=True, verbose_name='Резервуар')
    measurement = models.CharField(max_length=100, blank=True, verbose_name='Замер')
    wagon_count = models.CharField(max_length=100, blank=True, verbose_name='Количество вагон-цистерн')
    wagon_numbers = models.TextField(blank=True, verbose_name='Номера вагон-цистерн')
    sample_collection_date = models.CharField(max_length=100, blank=True, verbose_name='Дата отбора образцов')
    issue_date = models.CharField(max_length=100, blank=True, verbose_name='Дата выдачи')
    actual_values = models.JSONField(default=dict, verbose_name='Фактические значения')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ─── Sequential approval chain: Начальник смены → Начальник СТТЛ → Начальник ЦЗЛ → Диспетчер ───
    shift_head = models.CharField(max_length=255, blank=True, default='', verbose_name='Начальник смены')
    sttl_head = models.CharField(max_length=255, blank=True, default='', verbose_name='Начальник СТТЛ')
    czl_head = models.CharField(max_length=255, blank=True, default='', verbose_name='Начальник ЦЗЛ')
    dispatcher_head = models.CharField(max_length=255, blank=True, default='', verbose_name='Диспетчер')

    approval_status = models.CharField(
        max_length=20, choices=APPROVAL_STATUS_CHOICES, default=STATUS_DRAFT,
        verbose_name='Статус согласования',
    )
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='+', verbose_name='Отправил на подпись',
    )
    submitted_at = models.DateTimeField(null=True, blank=True)

    sttl_employee_slug = models.CharField(max_length=255, blank=True, default='')
    sttl_approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+'
    )
    sttl_approved_at = models.DateTimeField(null=True, blank=True)

    czl_employee_slug = models.CharField(max_length=255, blank=True, default='')
    czl_approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+'
    )
    czl_approved_at = models.DateTimeField(null=True, blank=True)

    dispatcher_employee_slug = models.CharField(max_length=255, blank=True, default='')
    dispatcher_approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+'
    )
    dispatcher_approved_at = models.DateTimeField(null=True, blank=True)

    rejected_step = models.CharField(max_length=20, choices=APPROVAL_STEP_CHOICES, blank=True, default='')
    rejected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+'
    )
    rejected_at = models.DateTimeField(null=True, blank=True)
    rejection_comment = models.TextField(blank=True, default='')

    # Public verification QR — scannable once fully approved, see SpravkaVerifyApiView.
    qr_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Справка'
        verbose_name_plural = 'Справки'

    def __str__(self):
        return f'Справка № {self.spravka_number}'

    @property
    def is_locked(self):
        return self.approval_status not in (self.STATUS_DRAFT, self.STATUS_REJECTED)

    @property
    def current_step(self):
        return {
            self.STATUS_PENDING_STTL: self.STEP_STTL,
            self.STATUS_PENDING_CZL: self.STEP_CZL,
            self.STATUS_PENDING_DISPATCHER: self.STEP_DISPATCHER,
        }.get(self.approval_status)


# ─── Shablon ───────────────────────────────────────────────────────────────────

RESERVOIR_TYPE_CHOICES = [
    ('', '—'),
    ('reservoir', 'Резервуар'),
    ('wagon', 'Вагон'),
]


class PassportTemplate(models.Model):
    """Mahsulot turi uchun pasport shabloni (masalan: ДТ-ЕВРО-Л(А)-К3)"""

    name = models.CharField(max_length=200, verbose_name='Название')
    category = models.CharField(max_length=100, blank=True, verbose_name='Категория')
    product_standard = models.CharField(
        max_length=100, blank=True, verbose_name='Стандарт (ГОСТ / O\'zMSt)'
    )
    reservoir_type = models.CharField(
        max_length=20, blank=True, choices=RESERVOIR_TYPE_CHOICES,
        verbose_name='Резервуар / Вагон'
    )
    # Header HTML — {{placeholder}} sintaksisida
    header_html = models.TextField(blank=True, default='', verbose_name='Шапка (HTML)')
    # Footer HTML
    footer_html = models.TextField(blank=True, default='', verbose_name='Подвал (HTML)')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['category', 'name']
        verbose_name = 'Шаблон паспорта'
        verbose_name_plural = 'Шаблоны паспортов'

    def __str__(self):
        return f'{self.category} — {self.name}' if self.category else self.name


class TemplateField(models.Model):
    """Header/footer qismida to'ldirilishi kerak bo'lgan maydon"""

    FIELD_TYPES = [
        ('text', 'Текст'),
        ('date', 'Дата'),
        ('number', 'Число'),
        ('select', 'Список'),
        ('textarea', 'Многострочный текст'),
    ]

    template = models.ForeignKey(
        PassportTemplate, on_delete=models.CASCADE, related_name='fields'
    )
    key = models.CharField(max_length=100, verbose_name='Ключ (placeholder)')
    label = models.CharField(max_length=200, verbose_name='Название поля')
    field_type = models.CharField(
        max_length=20, choices=FIELD_TYPES, default='text', verbose_name='Тип'
    )
    options = models.JSONField(
        default=list, blank=True, verbose_name='Варианты (для select)'
    )
    order = models.PositiveSmallIntegerField(default=0, verbose_name='Порядок')
    required = models.BooleanField(default=False, verbose_name='Обязательное')

    class Meta:
        ordering = ['order']
        unique_together = [('template', 'key')]
        verbose_name = 'Поле шаблона'
        verbose_name_plural = 'Поля шаблона'

    def __str__(self):
        return f'{self.template.name} → {self.label}'


class TemplateRow(models.Model):
    """Jadval qatori — ko'rsatkich nomi, GOST, standart qiymat"""

    template = models.ForeignKey(
        PassportTemplate, on_delete=models.CASCADE, related_name='rows'
    )
    order = models.PositiveSmallIntegerField(default=0, verbose_name='Порядок')
    name = models.CharField(max_length=400, verbose_name='Наименование показателя')
    gost = models.CharField(max_length=200, blank=True, verbose_name='Метод контроля')
    standard_value = models.CharField(
        max_length=200, blank=True, verbose_name='Значение по НД (OTP)'
    )
    standard_value_2 = models.CharField(
        max_length=200, blank=True, verbose_name='Значение по НД (столбец 2)'
    )
    unit = models.CharField(max_length=100, blank=True, verbose_name='Единица / примечание')
    is_section = models.BooleanField(
        default=False, verbose_name='Раздел (жирный заголовок без значения)'
    )

    class Meta:
        ordering = ['order']
        verbose_name = 'Строка таблицы'
        verbose_name_plural = 'Строки таблицы'

    def __str__(self):
        return f'{self.template.name} [{self.order}] {self.name[:60]}'


# ─── Паспорт ───────────────────────────────────────────────────────────────────

class Passport(models.Model):
    """Yaratilgan pasport hujjati"""

    STATUS_DRAFT = 'draft'
    STATUS_PENDING_STTL = 'pending_sttl'
    STATUS_PENDING_CZL = 'pending_czl'
    STATUS_PENDING_DISPATCHER = 'pending_dispatcher'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'
    APPROVAL_STATUS_CHOICES = [
        (STATUS_DRAFT, 'Черновик'),
        (STATUS_PENDING_STTL, 'На подписи: Начальник СТТЛ'),
        (STATUS_PENDING_CZL, 'На подписи: Начальник ЦЗЛ'),
        (STATUS_PENDING_DISPATCHER, 'На подписи: Диспетчер'),
        (STATUS_APPROVED, 'Утверждён'),
        (STATUS_REJECTED, 'Отклонён'),
    ]

    STEP_STTL = 'sttl'
    STEP_CZL = 'czl'
    STEP_DISPATCHER = 'dispatcher'
    APPROVAL_STEP_CHOICES = [
        (STEP_STTL, 'Начальник СТТЛ'),
        (STEP_CZL, 'Начальник ЦЗЛ'),
        (STEP_DISPATCHER, 'Диспетчер'),
    ]

    template = models.ForeignKey(
        PassportTemplate, on_delete=models.SET_NULL,
        null=True, blank=True, verbose_name='Шаблон'
    )
    # Header maydonlari qiymatlari: {"passport_no": "123", "sampling_date": "2026-05-21", ...}
    field_values = models.JSONField(default=dict, verbose_name='Значения полей')
    # Jadval fakt qiymatlari: {"<row_id>": "51,0", ...}
    actual_values = models.JSONField(default=dict, verbose_name='Фактические значения')
    # Tayyor HTML hujjat (saqlash uchun)
    document_html = models.TextField(blank=True, default='', verbose_name='Документ (HTML)')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ─── Sequential approval chain: Начальник СТТЛ → Начальник ЦЗЛ → Диспетчер ───
    approval_status = models.CharField(
        max_length=20, choices=APPROVAL_STATUS_CHOICES, default=STATUS_DRAFT,
        verbose_name='Статус согласования',
    )
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='+', verbose_name='Отправил на подпись',
    )
    submitted_at = models.DateTimeField(null=True, blank=True)

    sttl_employee_slug = models.CharField(max_length=255, blank=True, default='')
    sttl_approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+'
    )
    sttl_approved_at = models.DateTimeField(null=True, blank=True)

    czl_employee_slug = models.CharField(max_length=255, blank=True, default='')
    czl_approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+'
    )
    czl_approved_at = models.DateTimeField(null=True, blank=True)

    dispatcher_employee_slug = models.CharField(max_length=255, blank=True, default='')
    dispatcher_approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+'
    )
    dispatcher_approved_at = models.DateTimeField(null=True, blank=True)

    rejected_step = models.CharField(max_length=20, choices=APPROVAL_STEP_CHOICES, blank=True, default='')
    rejected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+'
    )
    rejected_at = models.DateTimeField(null=True, blank=True)
    rejection_comment = models.TextField(blank=True, default='')

    # Public verification QR — scannable once fully approved, see PassportVerifyApiView.
    qr_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)

    # Soft delete — passports are never hard-deleted, only hidden from the active list.
    is_delete = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Паспорт'
        verbose_name_plural = 'Паспорта'

    def __str__(self):
        num = self.field_values.get('passport_no', '')
        tpl = self.template.name if self.template else '—'
        return f'Паспорт {num} ({tpl})'

    @property
    def passport_number(self):
        return self.field_values.get('passport_no', '')

    @property
    def template_name(self):
        return self.template.name if self.template else ''

    @property
    def template_category(self):
        return self.template.category if self.template else ''

    @property
    def is_locked(self):
        return self.approval_status not in (self.STATUS_DRAFT, self.STATUS_REJECTED)

    @property
    def current_step(self):
        return {
            self.STATUS_PENDING_STTL: self.STEP_STTL,
            self.STATUS_PENDING_CZL: self.STEP_CZL,
            self.STATUS_PENDING_DISPATCHER: self.STEP_DISPATCHER,
        }.get(self.approval_status)
