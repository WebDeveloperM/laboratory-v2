from rest_framework import serializers
from .approval import can_user_submit, can_act_on_step, can_user_submit_spravka
from .models import Passport, Spravka, PassportTemplate, TemplateField, TemplateRow


class SpravkaListSerializer(serializers.ModelSerializer):
    approval_status_display = serializers.CharField(source='get_approval_status_display', read_only=True)
    current_step = serializers.CharField(read_only=True)

    class Meta:
        model = Spravka
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'qr_token')


class SpravkaWriteSerializer(serializers.ModelSerializer):
    # Обязателен только Начальник смены: на нём держится цепочка согласования
    # (resolve_signer ищет подписанта именно по этому имени). Всё остальное,
    # включая номер справки, можно оставить пустым и заполнить позже.
    spravka_number = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    shift_head = serializers.CharField(max_length=255, required=True, allow_blank=False)

    class Meta:
        model = Spravka
        fields = ('id', 'spravka_number', 'manufacture_date', 'reservoir', 'measurement',
                  'wagon_count', 'wagon_numbers', 'sample_collection_date', 'issue_date',
                  'actual_values', 'shift_head', 'sttl_head', 'czl_head', 'dispatcher_head',
                  'created_at', 'updated_at')
        read_only_fields = ('created_at', 'updated_at')


class SpravkaDetailSerializer(serializers.ModelSerializer):
    approval_status_display = serializers.CharField(source='get_approval_status_display', read_only=True)
    current_step = serializers.CharField(read_only=True)
    submitted_by_username = serializers.SerializerMethodField()
    rejected_by_username = serializers.SerializerMethodField()
    sttl_approved_by_username = serializers.SerializerMethodField()
    czl_approved_by_username = serializers.SerializerMethodField()
    dispatcher_approved_by_username = serializers.SerializerMethodField()
    can_submit = serializers.SerializerMethodField()
    can_approve_current_step = serializers.SerializerMethodField()

    class Meta:
        model = Spravka
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'qr_token')

    @staticmethod
    def _username(user):
        return user.username if user else None

    def get_submitted_by_username(self, obj):
        return self._username(obj.submitted_by)

    def get_rejected_by_username(self, obj):
        return self._username(obj.rejected_by)

    def get_sttl_approved_by_username(self, obj):
        return self._username(obj.sttl_approved_by)

    def get_czl_approved_by_username(self, obj):
        return self._username(obj.czl_approved_by)

    def get_dispatcher_approved_by_username(self, obj):
        return self._username(obj.dispatcher_approved_by)

    def get_can_submit(self, obj):
        if obj.approval_status not in (Spravka.STATUS_DRAFT, Spravka.STATUS_REJECTED):
            return False
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return False
        return can_user_submit_spravka(user, obj)

    def get_can_approve_current_step(self, obj):
        step = obj.current_step
        if not step:
            return False
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return False
        return can_act_on_step(user, obj, step)


class SpravkaPendingApprovalSerializer(serializers.ModelSerializer):
    approval_status_display = serializers.CharField(source='get_approval_status_display', read_only=True)
    current_step = serializers.CharField(read_only=True)
    submitted_by_username = serializers.SerializerMethodField()

    class Meta:
        model = Spravka
        fields = ('id', 'spravka_number', 'approval_status', 'approval_status_display', 'current_step',
                  'submitted_by_username', 'submitted_at', 'created_at')

    def get_submitted_by_username(self, obj):
        return obj.submitted_by.username if obj.submitted_by else None


# ─── Template serializers ──────────────────────────────────────────────────────

class TemplateFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = TemplateField
        fields = ('id', 'key', 'label', 'field_type', 'options', 'order', 'required')


class TemplateRowSerializer(serializers.ModelSerializer):
    class Meta:
        model = TemplateRow
        fields = ('id', 'order', 'name', 'gost', 'standard_value', 'standard_value_2', 'unit', 'is_section')


class PassportTemplateListSerializer(serializers.ModelSerializer):
    """Ro'yxat uchun — fields/rows yuklanmaydi"""
    fields_count = serializers.SerializerMethodField()
    rows_count = serializers.SerializerMethodField()

    class Meta:
        model = PassportTemplate
        fields = ('id', 'name', 'category', 'product_standard', 'reservoir_type',
                  'fields_count', 'rows_count', 'created_at', 'updated_at')

    def get_fields_count(self, obj):
        return obj.fields.count()

    def get_rows_count(self, obj):
        return obj.rows.count()


class PassportTemplateDetailSerializer(serializers.ModelSerializer):
    """Detail — fields va rows bilan"""
    fields = TemplateFieldSerializer(many=True, read_only=True)
    rows = TemplateRowSerializer(many=True, read_only=True)

    class Meta:
        model = PassportTemplate
        fields = ('id', 'name', 'category', 'product_standard', 'reservoir_type',
                  'header_html', 'footer_html', 'fields', 'rows',
                  'created_at', 'updated_at')
        read_only_fields = ('created_at', 'updated_at')


class PassportTemplateWriteSerializer(serializers.ModelSerializer):
    """Yaratish / yangilash uchun"""
    class Meta:
        model = PassportTemplate
        fields = ('id', 'name', 'category', 'product_standard', 'reservoir_type',
                  'header_html', 'footer_html')


# ─── Passport serializers ──────────────────────────────────────────────────────

class PassportListSerializer(serializers.ModelSerializer):
    template_name = serializers.CharField(read_only=True)
    template_category = serializers.CharField(read_only=True)
    passport_number = serializers.CharField(read_only=True)
    approval_status_display = serializers.CharField(source='get_approval_status_display', read_only=True)
    current_step = serializers.CharField(read_only=True)

    class Meta:
        model = Passport
        fields = ('id', 'template', 'template_name', 'template_category',
                  'passport_number', 'field_values', 'approval_status',
                  'approval_status_display', 'current_step', 'created_at', 'updated_at')


class PassportWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Passport
        fields = ('id', 'template', 'field_values', 'actual_values', 'document_html',
                  'created_at', 'updated_at')
        read_only_fields = ('created_at', 'updated_at')


class PassportDetailSerializer(serializers.ModelSerializer):
    template_data = PassportTemplateDetailSerializer(source='template', read_only=True)
    passport_number = serializers.CharField(read_only=True)
    approval_status_display = serializers.CharField(source='get_approval_status_display', read_only=True)
    current_step = serializers.CharField(read_only=True)
    submitted_by_username = serializers.SerializerMethodField()
    rejected_by_username = serializers.SerializerMethodField()
    sttl_approved_by_username = serializers.SerializerMethodField()
    czl_approved_by_username = serializers.SerializerMethodField()
    dispatcher_approved_by_username = serializers.SerializerMethodField()
    can_submit = serializers.SerializerMethodField()
    can_approve_current_step = serializers.SerializerMethodField()

    class Meta:
        model = Passport
        fields = ('id', 'template', 'template_data', 'passport_number',
                  'field_values', 'actual_values', 'document_html',
                  'approval_status', 'approval_status_display', 'current_step',
                  'submitted_by_username', 'submitted_at',
                  'sttl_approved_by_username', 'sttl_approved_at',
                  'czl_approved_by_username', 'czl_approved_at',
                  'dispatcher_approved_by_username', 'dispatcher_approved_at',
                  'rejected_step', 'rejected_by_username', 'rejected_at', 'rejection_comment',
                  'can_submit', 'can_approve_current_step', 'qr_token', 'created_at', 'updated_at')
        read_only_fields = ('qr_token', 'created_at', 'updated_at')

    @staticmethod
    def _username(user):
        return user.username if user else None

    def get_submitted_by_username(self, obj):
        return self._username(obj.submitted_by)

    def get_rejected_by_username(self, obj):
        return self._username(obj.rejected_by)

    def get_sttl_approved_by_username(self, obj):
        return self._username(obj.sttl_approved_by)

    def get_czl_approved_by_username(self, obj):
        return self._username(obj.czl_approved_by)

    def get_dispatcher_approved_by_username(self, obj):
        return self._username(obj.dispatcher_approved_by)

    def get_can_submit(self, obj):
        if obj.approval_status not in (Passport.STATUS_DRAFT, Passport.STATUS_REJECTED):
            return False
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return False
        return can_user_submit(user, obj)

    def get_can_approve_current_step(self, obj):
        step = obj.current_step
        if not step:
            return False
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return False
        return can_act_on_step(user, obj, step)


class PassportPendingApprovalSerializer(serializers.ModelSerializer):
    passport_number = serializers.CharField(read_only=True)
    template_name = serializers.CharField(read_only=True)
    template_category = serializers.CharField(read_only=True)
    approval_status_display = serializers.CharField(source='get_approval_status_display', read_only=True)
    current_step = serializers.CharField(read_only=True)
    submitted_by_username = serializers.SerializerMethodField()

    class Meta:
        model = Passport
        fields = ('id', 'template', 'field_values', 'passport_number', 'template_name', 'template_category',
                  'approval_status', 'approval_status_display', 'current_step',
                  'submitted_by_username', 'submitted_at', 'created_at')

    def get_submitted_by_username(self, obj):
        return obj.submitted_by.username if obj.submitted_by else None
