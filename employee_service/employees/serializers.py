import os
from pathlib import Path
from uuid import uuid4

from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from django.core.files.base import ContentFile
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from .models import Department, Employee, Section, UserProfile, ROLE_CHOICES, ROLE_USER

from django.contrib.auth.models import User as AuthUser


EMPLOYEE_DATE_INPUT_FORMATS = ['%d.%m.%Y', '%d/%m/%Y', '%Y-%m-%d']
EMPLOYEE_DATE_OUTPUT_FORMAT = '%d/%m/%Y'


def normalize_uploaded_filename(file_name, max_stem_length=40):
    original_name = os.path.basename(file_name or '')
    stem, extension = os.path.splitext(original_name)
    safe_extension = extension[:10]
    safe_stem = ''.join(ch if ch.isalnum() or ch in {'-', '_'} else '-' for ch in stem).strip('-_') or 'upload'
    safe_stem = safe_stem[:max_stem_length]
    return f'{safe_stem}-{uuid4().hex[:8]}{safe_extension}'


class BlankableDateField(serializers.DateField):
    def to_internal_value(self, value):
        if value in ('', None):
            return None
        return super().to_internal_value(value)


class SanitizedImageField(serializers.ImageField):
    def to_internal_value(self, data):
        if hasattr(data, 'name') and data.name:
            data.name = normalize_uploaded_filename(data.name)
        return super().to_internal_value(data)


class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username')
    first_name = serializers.CharField(source='user.first_name', allow_blank=True, required=False)
    last_name = serializers.CharField(source='user.last_name', allow_blank=True, required=False)
    email = serializers.EmailField(source='user.email', allow_blank=True, required=False)
    is_active = serializers.BooleanField(source='user.is_active', required=False)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    has_face_image = serializers.SerializerMethodField()
    face_image_url = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            'id',
            'user_id',
            'username',
            'first_name',
            'last_name',
            'email',
            'role',
            'role_display',
            'is_active',
            'password',
            'face_image_url',
            'has_face_image',
        ]

    def validate_username(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Логин обязателен")
        queryset = User.objects.filter(username=value.strip())
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.user_id)
        if queryset.exists():
            raise serializers.ValidationError("Пользователь с таким логином уже существует")
        return value.strip()

    def validate_password(self, value):
        if not self.instance and (not value or not value.strip()):
            raise serializers.ValidationError("Пароль обязателен для нового пользователя")
        
        if value and len(value) < 6:
            raise serializers.ValidationError("Пароль должен содержать минимум 6 символов")
        
        if value and not any(c.isdigit() for c in value):
            raise serializers.ValidationError("Пароль должен содержать хотя бы одну цифру")
        
        if value and not any(c.isalpha() for c in value):
            raise serializers.ValidationError("Пароль должен содержать хотя бы одну букву")
        
        return value

    def _validate_unique_profile_field(self, field_name, value):
        normalized = (value or '').strip()
        if not normalized:
            return ''

        queryset = UserProfile.objects.filter(**{field_name: normalized})
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError({field_name: 'Это значение уже привязано к другому пользователю.'})
        return normalized

    def validate(self, attrs):
        role = attrs.get('role', getattr(self.instance, 'role', ROLE_USER))
        has_existing_face = bool(getattr(self.instance, 'avatar_image', None))

        if role in {'admin', 'hr'} and not has_existing_face:
            raise serializers.ValidationError({'role': 'Для ролей Администратор и HR менеджер необходимо загрузить базовое изображение в карточке сотрудника.'})

        return attrs

    def _clone_uploaded_image(self, uploaded_file, fallback_name):
        if uploaded_file in (None, serializers.empty):
            return None

        file_name = os.path.basename(getattr(uploaded_file, 'name', '') or fallback_name)
        if hasattr(uploaded_file, 'seek'):
            uploaded_file.seek(0)
        content = uploaded_file.read()
        if hasattr(uploaded_file, 'seek'):
            uploaded_file.seek(0)
        return ContentFile(content, name=file_name)

    def _sync_profile_face_image(self, profile, uploaded_file):
        if profile is None:
            return
        if uploaded_file is None:
            profile.face_image = None
            profile.save(update_fields=['face_image'])
            return

        profile.face_image = self._clone_uploaded_image(uploaded_file, 'profile-face.jpg')
        profile.save(update_fields=['face_image'])

    def create(self, validated_data):
        user_data = validated_data.pop('user', {})
        password = validated_data.pop('password', '')
        role = validated_data.get('role', ROLE_USER)

        user = User.objects.create_user(
            username=user_data.get('username', ''),
            first_name=user_data.get('first_name', ''),
            last_name=user_data.get('last_name', ''),
            email=user_data.get('email', ''),
            password=password or 'changeme123',
            is_active=user_data.get('is_active', True),
        )
        return UserProfile.objects.create(user=user, role=role)

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        password = validated_data.pop('password', '')
        next_role = validated_data.get('role', instance.role)
        employee = getattr(instance.user, 'employee', None)

        user = instance.user
        if 'username' in user_data:
            user.username = user_data['username']
        if 'first_name' in user_data:
            user.first_name = user_data['first_name']
        if 'last_name' in user_data:
            user.last_name = user_data['last_name']
        if 'email' in user_data:
            user.email = user_data['email']
        if 'is_active' in user_data:
            user.is_active = user_data['is_active']
        if password:
            user.set_password(password)
        user.save()

        if employee is not None:
            update_fields = []
            if employee.login != user.username:
                employee.login = user.username
                update_fields.append('login')
            if employee.is_active != user.is_active:
                employee.is_active = user.is_active
                update_fields.append('is_active')
            if password and employee.password_hash != user.password:
                employee.password_hash = user.password
                update_fields.append('password_hash')
            if update_fields:
                employee.save(update_fields=update_fields)

        instance.role = next_role
        instance.save()
        return instance

    def get_has_face_image(self, obj):
        return bool(obj.avatar_image)

    def get_face_image_url(self, obj):
        avatar_image = obj.avatar_image
        if not avatar_image:
            return None

        request = self.context.get('request')
        if request is None:
            return avatar_image.url
        return request.build_absolute_uri(avatar_image.url)


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name', 'boss_full_name', 'sort_order']


class SectionSerializer(serializers.ModelSerializer):
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source='department',
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Section
        fields = ['id', 'name', 'department', 'department_id']


class EmployeeSerializer(serializers.ModelSerializer):
    department = DepartmentSerializer(read_only=True)
    section = SectionSerializer(read_only=True)
    tabel_number = serializers.CharField(
        validators=[
            UniqueValidator(
                queryset=Employee.objects.all(),
                message='Сотрудник с таким табельным номером уже добавлен.',
            )
        ]
    )
    date_of_birth = BlankableDateField(
        required=False,
        allow_null=True,
        input_formats=EMPLOYEE_DATE_INPUT_FORMATS,
        format=EMPLOYEE_DATE_OUTPUT_FORMAT,
    )
    surname = serializers.CharField(required=False, allow_blank=True)
    gender = serializers.ChoiceField(
        choices=Employee._meta.get_field('gender').choices,
        required=False,
        allow_blank=True,
    )
    phone_number_1 = serializers.CharField(required=False, allow_blank=True)
    phone_number_2 = serializers.CharField(required=False, allow_blank=True)
    clothe_size = serializers.CharField(required=False, allow_blank=True)
    date_of_employment = BlankableDateField(
        required=False,
        allow_null=True,
        input_formats=EMPLOYEE_DATE_INPUT_FORMATS,
        format=EMPLOYEE_DATE_OUTPUT_FORMAT,
    )
    date_of_change_position = BlankableDateField(
        required=False,
        allow_null=True,
        input_formats=EMPLOYEE_DATE_INPUT_FORMATS,
        format=EMPLOYEE_DATE_OUTPUT_FORMAT,
    )
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source='department',
        write_only=True,
        required=False,
        allow_null=True,
    )
    section_id = serializers.PrimaryKeyRelatedField(
        queryset=Section.objects.all(),
        source='section',
        write_only=True,
        required=False,
        allow_null=True,
    )
    department_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    section_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    boss_full_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    full_name = serializers.SerializerMethodField()
    base_image_url = serializers.SerializerMethodField()
    base_image = SanitizedImageField(required=False, allow_null=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    password_confirm = serializers.CharField(write_only=True, required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=ROLE_CHOICES, default=ROLE_USER, write_only=True, required=False)

    class Meta:
        model = Employee
        fields = [
            'id',
            'source_system',
            'external_id',
            'first_name',
            'last_name',
            'surname',
            'full_name',
            'tabel_number',
            'gender',
            'date_of_birth',
            'special_clothing_size',
            'clothe_size',
            'shoe_size',
            'jacket_size',
            'tshirt_size',
            'phone_number_1',
            'phone_number_2',
            'login',
            'password',
            'password_confirm',
            'role',
            'base_image',
            'base_image_url',
            'department',
            'section',
            'department_id',
            'section_id',
            'department_name',
            'section_name',
            'boss_full_name',
            'position',
            'date_of_employment',
            'date_of_change_position',
            'slug',
            'is_active',
            'is_deleted',
            'requires_face_id_checkout',
            'metadata',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['slug', 'created_at', 'updated_at', 'password_hash']

    def validate(self, attrs):
        department = attrs.get('department', getattr(self.instance, 'department', None))
        section = attrs.get('section', getattr(self.instance, 'section', None))
        if department and section and section.department_id != department.id:
            raise serializers.ValidationError({'section_id': 'Отдел не относится к выбранному цеху.'})

        password = attrs.get('password', '')
        password_confirm = attrs.get('password_confirm', '')
        if password or password_confirm:
            if password != password_confirm:
                raise serializers.ValidationError({'password_confirm': 'Пароли не совпадают.'})

        login = attrs.get('login', '').strip()
        if login:
            qs = Employee.objects.filter(login=login)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({'login': 'Сотрудник с таким логином уже существует.'})
            # Also check Django User uniqueness for new employees
            user_qs = AuthUser.objects.filter(username=login)
            if self.instance and self.instance.user_id:
                user_qs = user_qs.exclude(pk=self.instance.user_id)
            if user_qs.exists():
                raise serializers.ValidationError({'login': 'Пользователь с таким логином уже существует.'})

        return attrs

    def _clone_uploaded_image(self, uploaded_file, fallback_name):
        if uploaded_file in (None, serializers.empty):
            return None

        file_name = os.path.basename(getattr(uploaded_file, 'name', '') or fallback_name)
        if hasattr(uploaded_file, 'seek'):
            uploaded_file.seek(0)
        content = uploaded_file.read()
        if hasattr(uploaded_file, 'seek'):
            uploaded_file.seek(0)
        return ContentFile(content, name=file_name)

    def _sync_profile_face_image(self, profile, uploaded_file):
        if profile is None:
            return
        if uploaded_file is None:
            profile.face_image = None
            profile.save(update_fields=['face_image'])
            return

        profile.face_image = self._clone_uploaded_image(uploaded_file, 'profile-face.jpg')
        profile.save(update_fields=['face_image'])

    def create(self, validated_data):
        department_name = validated_data.pop('department_name', '').strip()
        section_name = validated_data.pop('section_name', '').strip()
        boss_full_name = validated_data.pop('boss_full_name', '').strip()
        password = validated_data.pop('password', '').strip()
        validated_data.pop('password_confirm', None)
        department, section = self._resolve_department_section(
            validated_data.get('department'),
            validated_data.get('section'),
            department_name,
            section_name,
            boss_full_name,
        )
        validated_data['department'] = department
        validated_data['section'] = section
        if password:
            validated_data['password_hash'] = make_password(password)

        # Auto-create Django User + UserProfile with role 'user' for the employee
        login_value = validated_data.get('login', '').strip()
        role_value = validated_data.pop('role', ROLE_USER)
        if login_value:
            auth_user = AuthUser.objects.create_user(
                username=login_value,
                first_name=validated_data.get('first_name', ''),
                last_name=validated_data.get('last_name', ''),
                password=password or 'changeme123',
                is_active=validated_data.get('is_active', True),
            )
            UserProfile.objects.create(user=auth_user, role=role_value)
            validated_data['user'] = auth_user

        base_image = validated_data.get('base_image', serializers.empty)
        employee = super().create(validated_data)
        if base_image is not serializers.empty and employee.user_id:
            self._sync_profile_face_image(employee.user.profile, base_image)
        return employee

    def update(self, instance, validated_data):
        department_name = validated_data.pop('department_name', '').strip()
        section_name = validated_data.pop('section_name', '').strip()
        boss_full_name = validated_data.pop('boss_full_name', '').strip()
        password = validated_data.pop('password', '').strip()
        login_value = validated_data.get('login', instance.login).strip()
        is_active = validated_data.get('is_active', instance.is_active)
        validated_data.pop('password_confirm', None)
        department, section = self._resolve_department_section(
            validated_data.get('department', instance.department),
            validated_data.get('section', instance.section),
            department_name,
            section_name,
            boss_full_name,
        )
        validated_data['department'] = department
        validated_data['section'] = section
        linked_user = instance.user
        base_image = validated_data.get('base_image', serializers.empty)

        if login_value and linked_user is None:
            role_value = ROLE_USER
            if instance.user_id:
                role_value = instance.user.profile.role

            linked_user = AuthUser.objects.create_user(
                username=login_value,
                first_name=validated_data.get('first_name', instance.first_name),
                last_name=validated_data.get('last_name', instance.last_name),
                password=password or 'changeme123',
                is_active=is_active,
            )
            UserProfile.objects.create(user=linked_user, role=role_value)
            validated_data['user'] = linked_user
            if password:
                validated_data['password_hash'] = linked_user.password
        elif linked_user is not None:
            if login_value:
                linked_user.username = login_value
            linked_user.first_name = validated_data.get('first_name', instance.first_name)
            linked_user.last_name = validated_data.get('last_name', instance.last_name)
            linked_user.is_active = is_active
            if password:
                linked_user.set_password(password)
                validated_data['password_hash'] = linked_user.password
            linked_user.save()

        if password and 'password_hash' not in validated_data:
            validated_data['password_hash'] = make_password(password)
        employee = super().update(instance, validated_data)
        if base_image is not serializers.empty and employee.user_id:
            self._sync_profile_face_image(employee.user.profile, base_image)
        return employee

    def _resolve_department_section(self, department, section, department_name, section_name, boss_full_name):
        if department is None and department_name:
            department, _ = Department.objects.get_or_create(
                name=department_name,
                defaults={'boss_full_name': boss_full_name},
            )
            if boss_full_name and department.boss_full_name != boss_full_name:
                department.boss_full_name = boss_full_name
                department.save(update_fields=['boss_full_name'])

        if section is None and department is not None and section_name:
            section, _ = Section.objects.get_or_create(
                department=department,
                name=section_name,
            )

        return department, section

    def get_full_name(self, obj):
        return str(obj)

    def get_base_image_url(self, obj):
        if not obj.base_image:
            return None

        request = self.context.get('request')
        if request is None:
            return obj.base_image.url
        return request.build_absolute_uri(obj.base_image.url)


class EmployeeUpsertSerializer(EmployeeSerializer):
    class Meta(EmployeeSerializer.Meta):
        read_only_fields = ['slug', 'created_at', 'updated_at']