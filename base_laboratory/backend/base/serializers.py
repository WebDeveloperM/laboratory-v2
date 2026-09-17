# accounts/serializers.py
from rest_framework import serializers
from .models import *
from .employee_data import build_employee_snapshot
import re
from django.utils.formats import date_format


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = "__all__"


class DepartmentSerializerForSection(serializers.ModelSerializer):
    name = serializers.CharField()

    class Meta:
        model = Department
        fields = ['name']


class SectionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Section
        fields = ["id", "department", "name"]


class SectionSerializer(serializers.ModelSerializer):
    department = DepartmentSerializerForSection()

    class Meta:
        model = Section
        fields = "__all__"


class SectionSimpleSerializer(serializers.ModelSerializer):
    department = DepartmentSerializerForSection()
    name = serializers.SerializerMethodField()
    raw_name = serializers.CharField(source='name', read_only=True)

    def get_name(self, obj):
        match = re.search(r'(.+?[Цц]ех)', obj.department.name)
        department_name = match.group(1).strip() if match else obj.department.name.strip()
        return f"{department_name} ( {obj.name} )"

    class Meta:
        model = Section
        fields = ["id", "department", "name", "raw_name"]


class SettingsSectionSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = Section
        fields = ["id", "department", "department_name", "name"]


class PPEProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = PPEProduct
        fields = ["id", "name", "renewal_months", "low_stock_threshold", "type_product", "target_gender", "is_active"]


class DepartmentPPERenewalRuleSerializer(serializers.ModelSerializer):
    ppeproduct_name = serializers.CharField(source='ppeproduct.name', read_only=True)
    ppeproduct_type_product = serializers.CharField(source='ppeproduct.type_product', read_only=True)
    ppeproduct_target_gender = serializers.CharField(source='ppeproduct.target_gender', read_only=True)
    ppeproduct_target_gender_display = serializers.CharField(source='ppeproduct.get_target_gender_display', read_only=True)

    class Meta:
        model = DepartmentPPERenewalRule
        fields = [
            'id',
            'department_service_id',
            'department_name',
            'ppeproduct',
            'ppeproduct_name',
            'ppeproduct_type_product',
            'ppeproduct_target_gender',
            'ppeproduct_target_gender_display',
            'renewal_months',
            'updatedAt',
        ]


class PositionPPERenewalRuleSerializer(serializers.ModelSerializer):
    ppeproduct_name = serializers.CharField(source='ppeproduct.name', read_only=True)
    ppeproduct_type_product = serializers.CharField(source='ppeproduct.type_product', read_only=True)
    ppeproduct_target_gender = serializers.CharField(source='ppeproduct.target_gender', read_only=True)
    ppeproduct_target_gender_display = serializers.CharField(source='ppeproduct.get_target_gender_display', read_only=True)

    class Meta:
        model = PositionPPERenewalRule
        fields = [
            'id',
            'department_service_id',
            'department_name',
            'position_name',
            'ppeproduct',
            'ppeproduct_name',
            'ppeproduct_type_product',
            'ppeproduct_target_gender',
            'ppeproduct_target_gender_display',
            'is_allowed',
            'renewal_months',
            'updatedAt',
        ]

    def validate_position_name(self, value):
        normalized = ' '.join(str(value or '').strip().split())
        if not normalized:
            raise serializers.ValidationError('Выберите должность.')
        return normalized

    def validate_department_name(self, value):
        return ' '.join(str(value or '').strip().split())

    def validate(self, attrs):
        attrs = super().validate(attrs)
        department_service_id = attrs.get('department_service_id', getattr(self.instance, 'department_service_id', None))
        department_name = attrs.get('department_name', getattr(self.instance, 'department_name', ''))
        position_name = attrs.get('position_name', getattr(self.instance, 'position_name', ''))
        ppeproduct = attrs.get('ppeproduct', getattr(self.instance, 'ppeproduct', None))
        position_key = normalize_employee_position(position_name)

        attrs['department_name'] = ' '.join(str(department_name or '').strip().split())

        if position_key and ppeproduct is not None:
            queryset = PositionPPERenewalRule.objects.filter(
                department_service_id=department_service_id,
                position_key=position_key,
                ppeproduct=ppeproduct,
            )
            if self.instance is not None:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError({
                    'position_name': 'Для этой должности в выбранном цехе уже задана норма по выбранному СИЗ.',
                })

        return attrs


class ResponsiblePersonSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResponsiblePerson
        fields = ["id", "full_name", "position", "employee_slug"]


class AddEmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee    
        fields = (
            'id',
            'first_name',
            'last_name',
            'surname',
            'tabel_number',
            'department',
            'section',
            'position',
            'date_of_employment',
            'date_of_change_position',
            'addedUser',
            'updatedUser',
            'updatedAt',
            'slug',
            'isActive',
        )
        

    def save(self, **kwargs):
        """Override save to set history_user from context"""
        request = self.context.get('request', None)
        instance = super().save(**kwargs)

        # Set history user if request exists and user is authenticated
        if request and request.user and request.user.is_authenticated:
            instance._history_user = request.user

        return instance


class EmployeeCreateSerializer(serializers.ModelSerializer):
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all())
    section = serializers.PrimaryKeyRelatedField(queryset=Section.objects.all())
    date_of_change_position = serializers.DateField(required=False, allow_null=True)
    base_image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Employee
        fields = (
            'first_name',
            'last_name',
            'surname',
            'tabel_number',
            'position',
            'gender',
            'height',
            'clothe_size',
            'shoe_size',
            'base_image',
            'date_of_employment',
            'date_of_change_position',
            'department',
            'section',
        )

    def validate(self, attrs):
        department = attrs.get('department')
        section = attrs.get('section')

        if department and section and section.department_id != department.id:
            raise serializers.ValidationError({
                'section': 'Выбранный отдел не относится к указанному цеху.'
            })

        return attrs

    def validate_tabel_number(self, value):
        normalized = str(value).strip()
        if Employee.objects.filter(tabel_number=normalized).exists():
            raise serializers.ValidationError("Bunday tabel raqam mavjud")
        return normalized


class EmployeePersonalDataUpdateSerializer(serializers.ModelSerializer):
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all(), required=False)
    section = serializers.PrimaryKeyRelatedField(queryset=Section.objects.all(), required=False)
    date_of_change_position = serializers.DateField(required=False, allow_null=True)
    base_image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Employee
        fields = (
            'first_name',
            'last_name',
            'surname',
            'tabel_number',
            'position',
            'gender',
            'height',
            'clothe_size',
            'shoe_size',
            'base_image',
            'date_of_employment',
            'date_of_change_position',
            'department',
            'section',
        )

    def validate(self, attrs):
        department = attrs.get('department') or getattr(self.instance, 'department', None)
        section = attrs.get('section') or getattr(self.instance, 'section', None)

        if department and section and section.department_id != department.id:
            raise serializers.ValidationError({
                'section': 'Выбранный отдел не относится к указанному цеху.'
            })

        return attrs


class EmployeeSerializer(serializers.ModelSerializer):
    department = DepartmentSerializer()
    section = SectionSerializer()  
    history_date = serializers.SerializerMethodField()
    history_user = serializers.SerializerMethodField()
        
    def get_history_date(self, obj):
        annotated_history_date = getattr(obj, 'latest_history_date', None)
        if annotated_history_date is not None:
            return annotated_history_date

        rec = (
            obj.history
            .order_by('-history_date', '-history_id')
            .first()
        )
        return rec.history_date if rec else None

    def get_history_user(self, obj):
        annotated_history_user = getattr(obj, 'latest_history_user', None)
        if annotated_history_user:
            return annotated_history_user

        rec = (
            obj.history
            .order_by('-history_date', '-history_id')
            .first()
        )
        return rec.history_user.username if rec and rec.history_user else None

    class Meta:
        model = Employee
        fields = "__all__"


class EmployeeNestedSerializer(serializers.ModelSerializer):
    department = DepartmentSerializer()
    section = SectionSerializer()

    class Meta:
        model = Employee
        fields = "__all__"


class ItemSerializer(serializers.ModelSerializer):
    employee = serializers.SerializerMethodField()
    history_date = serializers.SerializerMethodField()
    history_user = serializers.SerializerMethodField()
    issued_by_info = serializers.SerializerMethodField()
    ppeproduct_info = serializers.SerializerMethodField()
    issue_history = serializers.SerializerMethodField()

    def get_employee(self, obj):
        payload = getattr(obj, '_employee_snapshot_override', None) or getattr(obj, 'employee_snapshot', None)
        return build_employee_snapshot(payload)

    def get_history_date(self, obj):
        annotated_history_date = getattr(obj, 'latest_history_date', None)
        if annotated_history_date is not None:
            return annotated_history_date

        rec = (
            obj.history
            .order_by('-history_date', '-history_id')
            .first()
        )
        return rec.history_date if rec else None

    def get_history_user(self, obj):
        annotated_history_user = getattr(obj, 'latest_history_user', None)
        if annotated_history_user:
            return annotated_history_user

        rec = (
            obj.history
            .order_by('-history_date', '-history_id')
            .first()
        )
        return rec.history_user.username if rec and rec.history_user else None

    def get_issued_by_info(self, obj):
        if not obj.issued_by:
            return None

        full_name = f"{obj.issued_by.last_name} {obj.issued_by.first_name}".strip()
        return {
            "id": obj.issued_by.id,
            "username": obj.issued_by.username,
            "full_name": full_name or obj.issued_by.username,
        }

    def _get_position_key(self, item_obj):
        payload = getattr(item_obj, '_employee_snapshot_override', None) or getattr(item_obj, 'employee_snapshot', None)
        employee_payload = build_employee_snapshot(payload)
        return normalize_employee_position(employee_payload.get('position'))

    def _get_department_service_id(self, item_obj):
        payload = getattr(item_obj, '_employee_snapshot_override', None) or getattr(item_obj, 'employee_snapshot', None)
        employee_payload = build_employee_snapshot(payload)
        department = employee_payload.get('department') or {}
        try:
            return int(department.get('id'))
        except (TypeError, ValueError):
            return None

    def _get_effective_renewal_months(self, product, item_obj):
        department_service_id = self._get_department_service_id(item_obj)
        position_key = self._get_position_key(item_obj)
        if position_key:
            if department_service_id is not None:
                rule = (
                    PositionPPERenewalRule.objects
                    .filter(department_service_id=department_service_id, position_key=position_key, ppeproduct_id=product.id)
                    .only('renewal_months')
                    .first()
                )
                if rule:
                    return int(rule.renewal_months or 0)

            rule = (
                PositionPPERenewalRule.objects
                .filter(department_service_id__isnull=True, position_key=position_key, ppeproduct_id=product.id)
                .only('renewal_months')
                .first()
            )
            if rule:
                return int(rule.renewal_months or 0)

        return int(product.renewal_months or 0)

    def get_ppeproduct_info(self, obj):
        include_split = bool(self.context.get('include_ppe_split'))
        size_map = obj.ppe_sizes or {}

        previous_ppe_ids = set()
        if include_split and obj.employee_id:
            previous_item = (
                Item.objects
                .filter(employee_service_id=obj.employee_id, is_deleted=False)
                .exclude(pk=obj.pk)
                .order_by('-issued_at', '-id')
                .first()
            )
            if previous_item:
                previous_ppe_ids = set(previous_item.ppeproduct.values_list('id', flat=True))

        rows = [
            {
                "id": product.id,
                "name": product.name,
                "type_product": product.type_product,
                "type_product_display": product.get_type_product_display() if product.type_product else None,
                "renewal_months": self._get_effective_renewal_months(product, obj),
                "size": size_map.get(str(product.id)) or "",
                "is_new": product.id not in previous_ppe_ids if include_split else None,
            }
            for product in obj.ppeproduct.all()
        ]

        if include_split:
            rows.sort(key=lambda row: (bool(row.get('is_new')), row['id']))

        return rows

    def get_issue_history(self, obj):
        if not self.context.get('include_issue_history'):
            return []

        if not obj.employee_id:
            return []

        issues = (
            Item.objects
            .filter(employee_service_id=obj.employee_id, is_deleted=False)
            .select_related('issued_by')
            .prefetch_related('ppeproduct')
            .order_by('-issued_at', '-id')
        )

        rows = []
        request = self.context.get('request')
        for issue in issues:
            issued_by_info = None
            issue_size_map = issue.ppe_sizes or {}
            if issue.issued_by:
                full_name = f"{issue.issued_by.last_name} {issue.issued_by.first_name}".strip()
                issued_by_info = {
                    "id": issue.issued_by.id,
                    "username": issue.issued_by.username,
                    "full_name": full_name or issue.issued_by.username,
                }

            # Get employee signature image from related pending issue (if any)
            pending_qs = getattr(issue, 'pending_source', None)
            signature_url = None
            warehouse_signature_url = None
            qr_code_image_url = None
            qr_frontend_path = None
            qr_scan_url = None
            qr_token = None
            if pending_qs is not None:
                pending_obj = pending_qs.filter(status=PendingItemIssue.STATUS_CONFIRMED).order_by('-confirmed_at').first()
                if pending_obj:
                    qr_token = str(pending_obj.qr_token)
                    qr_frontend_path = pending_obj.get_qr_frontend_path()
                    if request is not None and qr_frontend_path:
                        qr_scan_url = request.build_absolute_uri(qr_frontend_path)
                    else:
                        qr_scan_url = qr_frontend_path
                    if pending_obj.signature_image:
                        try:
                            signature_url = pending_obj.signature_image.url
                        except Exception:
                            signature_url = None
                    if pending_obj.warehouse_signature_image:
                        try:
                            warehouse_signature_url = pending_obj.warehouse_signature_image.url
                        except Exception:
                            warehouse_signature_url = None
                    if pending_obj.qr_code_image:
                        try:
                            qr_code_image_url = pending_obj.qr_code_image.url
                        except Exception:
                            qr_code_image_url = None

            rows.append({
                "id": issue.id,
                "slug": issue.slug,
                "image": issue.image.url if issue.image else None,
                "signature_image": signature_url,
                "warehouse_signature_image": warehouse_signature_url,
                "qr_token": qr_token,
                "qr_code_image": qr_code_image_url,
                "qr_frontend_path": qr_frontend_path,
                "qr_scan_url": qr_scan_url,
                "issued_at": issue.issued_at,
                "next_due_date": issue.next_due_date,
                "is_current": issue.pk == obj.pk,
                "issued_by_info": issued_by_info,
                "ppeproduct_info": [
                    {
                        "id": product.id,
                        "name": product.name,
                        "type_product": product.type_product,
                        "type_product_display": product.get_type_product_display() if product.type_product else None,
                        "renewal_months": self._get_effective_renewal_months(product, issue),
                        "size": issue_size_map.get(str(product.id)) or "",
                    }
                    for product in issue.ppeproduct.all()
                ],
            })

        return rows

    class Meta:
        model = Item
        fields = "__all__"


class PPEArrivalSerializer(serializers.ModelSerializer):
    ppeproduct_name = serializers.CharField(source='ppeproduct.name', read_only=True)
    accepted_by = serializers.SerializerMethodField()
    size_display = serializers.SerializerMethodField()

    class Meta:
        model = PPEArrival
        fields = (
            'id',
            'ppeproduct',
            'ppeproduct_name',
            'quantity',
            'size',
            'size_breakdown',
            'size_display',
            'received_at',
            'note',
            'accepted_by',
            'addedUser',
            'updatedAt',
        )
        read_only_fields = ('addedUser', 'updatedAt', 'accepted_by', 'ppeproduct_name', 'size_display')

    def validate(self, attrs):
        size_breakdown = attrs.get('size_breakdown')

        if isinstance(size_breakdown, dict) and size_breakdown:
            normalized_breakdown = {}
            total_quantity = 0

            for raw_size, raw_qty in size_breakdown.items():
                size_key = str(raw_size).strip()
                if not size_key:
                    continue

                try:
                    qty = int(raw_qty)
                except (TypeError, ValueError):
                    raise serializers.ValidationError({'size_breakdown': f'Размер {size_key}: количество должно быть числом'})

                if qty <= 0:
                    raise serializers.ValidationError({'size_breakdown': f'Размер {size_key}: количество должно быть больше 0'})

                normalized_breakdown[size_key] = qty
                total_quantity += qty

            if not normalized_breakdown:
                raise serializers.ValidationError({'size_breakdown': 'Укажите хотя бы один размер с количеством'})

            attrs['size_breakdown'] = normalized_breakdown
            attrs['quantity'] = total_quantity

            if not attrs.get('size') and len(normalized_breakdown) == 1:
                attrs['size'] = next(iter(normalized_breakdown.keys()))

        return attrs

    def get_accepted_by(self, obj):
        if not obj.addedUser:
            return None
        full_name = f"{obj.addedUser.last_name} {obj.addedUser.first_name}".strip()
        return full_name or obj.addedUser.username

    def get_size_display(self, obj):
        breakdown = obj.size_breakdown if isinstance(obj.size_breakdown, dict) else {}
        if breakdown:
            return ', '.join([f"{size}={qty}" for size, qty in breakdown.items()])

        if obj.size:
            return str(obj.size)

        return ''