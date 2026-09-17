from django.db.models.functions import Lower
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import authenticate
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token
from rest_framework import status, generics, serializers
from drf_spectacular.utils import OpenApiExample, OpenApiResponse, extend_schema
from .models import *
from .serializers import *
from .employee_service_client import (
    EmployeeServiceClientError,
    create_department,
    create_section,
    delete_department,
    delete_section,
    detect_face_boxes as detect_face_boxes_remote,
    get_employee_by_external_id,
    get_employee_by_slug,
    get_employees_by_external_ids,
    get_employees_by_slugs,
    is_employee_service_enabled,
    list_departments,
    list_employees,
    list_face_id_exemptions,
    list_sections,
    sync_employee_to_service,
    update_department,
    update_employee_payload,
    update_face_id_exemption,
    update_section,
    upsert_employee_payload,
    verify_employee_face as verify_employee_face_remote,
)
from .employee_data import build_employee_namespace, build_employee_snapshot
from users.authentication import ExpiringTokenAuthentication as TokenAuthentication
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.utils.dateparse import parse_date, parse_datetime
from .utils import import_computers_from_excel
from django.shortcuts import get_object_or_404
from django.db.models import Count
from django.db import transaction
from django.template.defaultfilters import slugify
import datetime as dt
from simple_history.utils import update_change_reason
from django.contrib.auth.models import User
from django.db.models import Case, When, Value, IntegerField, Max, Sum
from django.db.models import Count, Q, F, DateTimeField
from django.db.models import OuterRef, Subquery, Prefetch
from django.utils import timezone
from django.conf import settings
from calendar import monthrange
import base64
import binascii
import os
import numpy as np
import requests
import pandas as pd
from io import BytesIO
from PIL import Image
from urllib.parse import parse_qs, unquote, urlsplit
from functools import lru_cache
from django.core.files.base import ContentFile
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import *
from users.models import UserRole, get_effective_user_role, user_has_feature_access, user_has_page_access

# Получаем текущее время и датуl
now = dt.datetime.now()


def sync_employee_to_external_service_safe(employee):
    if not is_employee_service_enabled():
        return None

    try:
        return sync_employee_to_service(employee)
    except EmployeeServiceClientError:
        return None


def extract_employee_results(payload):
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in ['results', 'employees', 'data']:
            value = payload.get(key)
            if isinstance(value, list):
                return value
    return []


def extract_service_results(payload):
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in ['results', 'data', 'items']:
            value = payload.get(key)
            if isinstance(value, list):
                return value
    return []


def get_employee_gender_code(employee_payload):
    if not employee_payload:
        return ''
    if isinstance(employee_payload, dict):
        gender = employee_payload.get('gender')
    else:
        gender = getattr(employee_payload, 'gender', '')
    normalized = str(gender or '').strip().upper()
    return normalized if normalized in {'M', 'F'} else ''


def get_employee_position_key(employee_payload):
    if not employee_payload:
        return ''

    if isinstance(employee_payload, dict):
        raw_value = employee_payload.get('position', '')
    else:
        raw_value = getattr(employee_payload, 'position', '')

    return normalize_employee_position(raw_value)


def get_employee_department_service_id(employee_payload):
    if not employee_payload:
        return None

    if isinstance(employee_payload, dict):
        department = employee_payload.get('department') or {}
        raw_value = department.get('id')
    else:
        department = getattr(employee_payload, 'department', None)
        raw_value = getattr(department, 'id', None) if department is not None else None

    try:
        return int(raw_value)
    except (TypeError, ValueError):
        return None


def filter_ppe_products_for_employee_gender(products_queryset, employee_payload):
    employee_gender = get_employee_gender_code(employee_payload)
    if not employee_gender:
        return products_queryset
    return products_queryset.filter(
        Q(target_gender=PPEProduct.TARGET_GENDER_ALL) | Q(target_gender=employee_gender)
    )


def get_effective_position_ppe_rule(product, employee_payload):
    department_service_id = get_employee_department_service_id(employee_payload)
    position_key = get_employee_position_key(employee_payload)
    if not position_key:
        return None

    if department_service_id is not None:
        rule = (
            PositionPPERenewalRule.objects
            .filter(department_service_id=department_service_id, position_key=position_key, ppeproduct_id=product.id)
            .only('renewal_months', 'is_allowed')
            .first()
        )
        if rule is not None:
            return rule

    return (
        PositionPPERenewalRule.objects
        .filter(department_service_id__isnull=True, position_key=position_key, ppeproduct_id=product.id)
        .only('renewal_months', 'is_allowed')
        .first()
    )


def position_has_configured_ppe_rules(employee_payload):
    department_service_id = get_employee_department_service_id(employee_payload)
    position_key = get_employee_position_key(employee_payload)
    if not position_key:
        return False

    department_rules_exist = False
    if department_service_id is not None:
        department_rules_exist = PositionPPERenewalRule.objects.filter(
            department_service_id=department_service_id,
            position_key=position_key,
        ).exists()

    global_rules_exist = PositionPPERenewalRule.objects.filter(
        department_service_id__isnull=True,
        position_key=position_key,
    ).exists()

    return department_rules_exist or global_rules_exist


def get_effective_product_renewal_months(product, employee_payload):
    rule = get_effective_position_ppe_rule(product, employee_payload)
    if rule is not None:
        return int(rule.renewal_months or 0)
    return int(product.renewal_months or 0)


def is_product_allowed_for_employee(product, employee_payload):
    rule = get_effective_position_ppe_rule(product, employee_payload)
    if rule is not None:
        return bool(rule.is_allowed)
    if position_has_configured_ppe_rules(employee_payload):
        return False
    return True


def coerce_request_boolean(value, default=True):
    if value in [None, '']:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    normalized = str(value).strip().lower()
    if normalized in {'true', '1', 'yes', 'y', 'on'}:
        return True
    if normalized in {'false', '0', 'no', 'n', 'off'}:
        return False
    raise ValueError('Булево значение указано некорректно.')


def get_available_employee_positions():
    payload = list_employees_bootstrapped(source_system=None, no_pagination=True)
    employees = [build_employee_snapshot(item) for item in extract_employee_results(payload)]

    position_map = {}
    for employee in employees:
        position_name = ' '.join(str(employee.get('position') or '').strip().split())
        position_key = normalize_employee_position(position_name)
        if not position_key:
            continue

        department = employee.get('department') or {}
        department_id = department.get('id')
        department_name = ' '.join(str(department.get('name') or '').strip().split())

        try:
            normalized_department_id = int(department_id)
        except (TypeError, ValueError):
            normalized_department_id = None

        entry_key = (normalized_department_id, department_name.lower(), position_key)

        entry = position_map.setdefault(entry_key, {
            'position_name': position_name,
            'position_key': position_key,
            'selection_key': f"{normalized_department_id if normalized_department_id is not None else 'none'}:{position_key}",
            'employee_count': 0,
            'department_id': normalized_department_id,
            'department_name': department_name,
        })
        entry['employee_count'] += 1

    return sorted(
        position_map.values(),
        key=lambda item: ((item['department_name'] or '').lower(), item['position_name'].lower()),
    )


def get_service_department_map():
    departments = sorted(
        [normalize_department_payload(item) for item in extract_service_results(list_departments())],
        key=department_sort_key,
    )
    return {
        int(item['id']): item
        for item in departments
        if item.get('id') is not None
    }


def normalize_position_rule_payload(rule_payload, department_map=None):
    normalized = dict(rule_payload)
    department_map = department_map or {}

    raw_department_id = normalized.get('department_service_id')
    try:
        department_service_id = int(raw_department_id) if raw_department_id not in [None, ''] else None
    except (TypeError, ValueError):
        department_service_id = None

    service_department = department_map.get(department_service_id) if department_service_id is not None else None
    normalized['department_name'] = ' '.join(
        str(
            (service_department or {}).get('name')
            or normalized.get('department_name')
            or ''
        ).strip().split()
    )
    return normalized


def position_rule_sort_key(rule_payload, department_order_map=None):
    department_order_map = department_order_map or {}

    raw_department_id = rule_payload.get('department_service_id')
    try:
        department_service_id = int(raw_department_id) if raw_department_id not in [None, ''] else None
    except (TypeError, ValueError):
        department_service_id = None

    department_name = ' '.join(str(rule_payload.get('department_name') or '').strip().split())
    position_name = ' '.join(str(rule_payload.get('position_name') or '').strip().split())
    product_name = ' '.join(str(rule_payload.get('ppeproduct_name') or '').strip().split())

    return (
        0 if department_service_id is not None else 1,
        department_order_map.get(department_service_id, 10 ** 9),
        department_name.lower(),
        position_name.lower(),
        product_name.lower(),
        int(rule_payload.get('id') or 0),
    )


def normalize_department_payload(department):
    return {
        'id': department.get('id'),
        'name': department.get('name', ''),
        'boss_fullName': department.get('boss_full_name', department.get('boss_fullName', '')),
        'sort_order': department.get('sort_order', 0) or 0,
    }


def department_sort_key(item):
    sort_order = item.get('sort_order')
    normalized_sort_order = sort_order if isinstance(sort_order, int) and sort_order > 0 else 10 ** 9
    return (normalized_sort_order, (item.get('name') or '').lower())


def normalize_section_payload(section):
    department = section.get('department') or {}
    return {
        'id': section.get('id'),
        'department': section.get('department_id', department.get('id')),
        'department_name': section.get('department_name', department.get('name', '')),
        'name': section.get('name', ''),
    }


def build_department_service_payload(data):
    payload = {}
    if 'name' in data:
        payload['name'] = str(data.get('name', '')).strip()
    if 'boss_fullName' in data or 'boss_full_name' in data:
        payload['boss_full_name'] = str(data.get('boss_full_name', data.get('boss_fullName', ''))).strip()
    return payload


def build_section_service_payload(data):
    payload = {}
    if 'name' in data:
        payload['name'] = str(data.get('name', '')).strip()
    if 'department' in data or 'department_id' in data:
        payload['department_id'] = data.get('department_id', data.get('department'))
    return payload


def fetch_employee_by_slug_or_404(slug: str):
    try:
        return apply_local_face_id_override(build_employee_snapshot(get_employee_by_slug(slug)))
    except EmployeeServiceClientError:
        return None


def fetch_employee_by_external_id_safe(employee_id):
    if employee_id in [None, '']:
        return None
    try:
        payload = get_employee_by_external_id(employee_id)
    except EmployeeServiceClientError:
        payload = None
    return apply_local_face_id_override(build_employee_snapshot(payload)) if payload else None


def fetch_employees_map_by_ids(employee_ids):
    values = [str(value).strip() for value in employee_ids if str(value).strip()]
    if not values:
        return {}
    try:
        return {
            key: apply_local_face_id_override(build_employee_snapshot(value))
            for key, value in get_employees_by_external_ids(values).items()
        }
    except EmployeeServiceClientError:
        return {}


def fetch_employees_map_by_slugs(slugs):
    values = [str(value).strip() for value in slugs if str(value).strip()]
    if not values:
        return {}
    try:
        return {
            key: apply_local_face_id_override(build_employee_snapshot(value))
            for key, value in get_employees_by_slugs(values, source_system=None).items()
        }
    except EmployeeServiceClientError:
        return {}


def list_employees_bootstrapped(*, search=None, tabel_number=None, department_id=None, source_system=None, no_pagination=True, page=None, page_size=None):
    try:
        payload = list_employees(
            search=search,
            tabel_number=tabel_number,
            department_id=department_id,
            source_system=source_system,
            no_pagination=no_pagination,
            page=page,
            page_size=page_size,
        )
        employees = extract_employee_results(payload)
    except EmployeeServiceClientError:
        employees = []
        payload = []

    if employees:
        return payload

    local_employees = Employee.objects.filter(is_deleted=False)
    if tabel_number:
        local_employees = local_employees.filter(tabel_number=tabel_number)
    if department_id:
        local_employees = local_employees.filter(department_id=department_id)
    if search:
        local_employees = local_employees.filter(
            Q(first_name__icontains=search)
            | Q(last_name__icontains=search)
            | Q(surname__icontains=search)
            | Q(tabel_number__icontains=search)
            | Q(position__icontains=search)
            | Q(department__name__icontains=search)
            | Q(section__name__icontains=search)
        )

    local_employees = list(local_employees.select_related('department', 'section'))
    if not local_employees:
        return payload

    for employee in local_employees:
        sync_employee_to_external_service_safe(employee)

    try:
        return list_employees(
            search=search,
            tabel_number=tabel_number,
            department_id=department_id,
            source_system=source_system,
            no_pagination=no_pagination,
            page=page,
            page_size=page_size,
        )
    except EmployeeServiceClientError:
        return [build_employee_snapshot(employee) for employee in local_employees]


def attach_employee_snapshots(items):
    employee_map = fetch_employees_map_by_ids([item.employee_service_id for item in items])
    employee_slug_map = fetch_employees_map_by_slugs([item.employee_slug for item in items])
    for item in items:
        payload = (
            employee_map.get(str(item.employee_service_id))
            or employee_slug_map.get(str(item.employee_slug or '').strip())
            or apply_local_face_id_override(build_employee_snapshot(item.employee_snapshot))
        )
        item._employee_snapshot_override = payload
    return items


def build_employee_only_item_payload(employee_payload):
    employee_data = apply_local_face_id_override(build_employee_snapshot(employee_payload))
    return {
        'id': None,
        'slug': None,
        'employee_slug': employee_data.get('slug'),
        'employee': employee_data,
        'issued_at': None,
        'next_due_date': None,
        'issued_by': None,
        'issued_by_info': None,
        'isActive': True,
        'ppeproduct': [],
        'ppeproduct_info': [],
        'issue_history': [],
        'history_date': None,
        'history_user': None,
    }


def get_employee_lookup_slug(employee_payload):
    return str((employee_payload or {}).get('slug') or '').strip()


def get_employee_service_reference(employee_payload):
    payload = employee_payload or {}
    source_system = str(payload.get('source_system') or '').strip().lower()
    external_id = str(payload.get('external_id') or '').strip()

    if source_system == 'tb-project' and external_id:
        return external_id

    return ''


def normalize_phone_for_lookup(value):
    digits = ''.join(ch for ch in str(value or '') if ch.isdigit())
    if not digits:
        return ''
    if digits.startswith('998') and len(digits) == 12:
        return digits
    if len(digits) == 9:
        return f'998{digits}'
    return digits


def employee_phone_matches(employee_payload, phone_number):
    expected_phone = normalize_phone_for_lookup(phone_number)
    if not expected_phone:
        return False

    phone_candidates = [
        employee_payload.get('phone_number_1'),
        employee_payload.get('phone_number_2'),
    ]
    normalized_candidates = {
        normalized
        for normalized in (normalize_phone_for_lookup(value) for value in phone_candidates)
        if normalized
    }
    return expected_phone in normalized_candidates


def find_employee_for_telegram_lookup(phone_number, tabel_number):
    payload = list_employees(
        tabel_number=tabel_number,
        source_system=None,
        no_pagination=True,
    )
    employees = extract_employee_results(payload)
    for employee in employees:
        if employee_phone_matches(employee, phone_number):
            return build_employee_snapshot(employee)
    return None


def get_employee_items_queryset(employee_payload):
    employee_slug = get_employee_lookup_slug(employee_payload)
    if employee_slug:
        return Item.objects.filter(employee_slug=employee_slug, is_deleted=False)

    employee_reference = get_employee_service_reference(employee_payload)
    if employee_reference:
        return Item.objects.filter(employee_service_id=employee_reference, is_deleted=False)

    employee_id = (employee_payload or {}).get('id')
    if str(employee_id or '').strip():
        return Item.objects.filter(employee_service_id=employee_id, is_deleted=False)

    return Item.objects.none()


def format_local_date_value(value):
    if not value:
        return None
    if timezone.is_naive(value):
        value = timezone.make_aware(value, timezone.get_current_timezone())
    return timezone.localtime(value).strftime('%d.%m.%Y')


def get_default_size_for_product(product_obj, employee_payload):
    if not employee_payload:
        return None
    employee = build_employee_namespace(employee_payload)
    name_lower = (product_obj.name or '').lower()
    if any(kw in name_lower for kw in ['футболка', 'майка', 'tshirt', 't-shirt']):
        return getattr(employee, 'tshirt_size', None) or getattr(employee, 'clothe_size', None) or None
    if any(kw in name_lower for kw in ['куртка', 'jacket']):
        return getattr(employee, 'jacket_size', None) or getattr(employee, 'clothe_size', None) or None
    if any(kw in name_lower for kw in ['обувь', 'ботинки', 'сапоги', 'туфли', 'кроссовки', 'oyoq', 'poyabzal']):
        return getattr(employee, 'shoe_size', None) or None
    if any(kw in name_lower for kw in ['брюки', 'комбинезон', 'костюм', 'жилет', 'рубашка', 'халат', 'спецодежда', 'kiyim']):
        return getattr(employee, 'special_clothing_size', None) or getattr(employee, 'clothe_size', None) or None
    return None


def get_size_label_for_product(product_obj):
    name_lower = (product_obj.name or '').lower()
    if any(kw in name_lower for kw in ['обувь', 'ботинки', 'сапоги', 'туфли', 'кроссовки', 'oyoq', 'poyabzal']):
        return 'shoe'
    if any(kw in name_lower for kw in ['каска', 'шлем', 'шапка', 'берет', 'головн', 'bosh kiyim']):
        return 'headdress'
    if any(kw in name_lower for kw in ['куртка', 'брюки', 'комбинезон', 'костюм', 'жилет', 'футболка', 'рубашка', 'халат', 'спецодежда', 'kiyim']):
        return 'clothe'
    return None


def build_employee_ppe_products_payload(employee_payload):
    ppe_products = filter_ppe_products_for_employee_gender(
        PPEProduct.objects.filter(is_active=True).order_by('name'),
        employee_payload,
    )
    latest_rows = (
        get_employee_items_queryset(employee_payload)
        .filter(ppeproduct__is_active=True)
        .values('ppeproduct')
        .annotate(latest_issued_at=Max('issued_at'))
    )
    latest_issue_dates_by_product = {
        row['ppeproduct']: row['latest_issued_at']
        for row in latest_rows
        if row.get('ppeproduct')
    }

    now_dt = timezone.now()
    ppe_products_payload = []
    for product in ppe_products:
        rule = get_effective_position_ppe_rule(product, employee_payload)
        if rule is not None and not rule.is_allowed:
            continue

        renewal_months = int(rule.renewal_months or 0) if rule is not None else int(product.renewal_months or 0)
        last_issue_dt = latest_issue_dates_by_product.get(product.id)
        next_due_dt = (
            add_calendar_months(last_issue_dt, renewal_months - 1)
            if renewal_months > 0 and last_issue_dt
            else None
        )

        if renewal_months <= 0 or not last_issue_dt:
            can_issue = True
            months_left = 0
            remaining_text = None
        else:
            months_left = get_months_remaining(now_dt, next_due_dt)
            remaining_text = format_remaining_period_ru(months_left)
            can_issue = now_dt >= next_due_dt

        not_due_message = None
        if renewal_months > 0 and last_issue_dt and not can_issue:
            not_due_message = f"Для получения этого продукта осталось {remaining_text}"

        default_size = get_default_size_for_product(product, employee_payload)
        default_size_remaining = None
        stock_available = None
        stock_message = None
        if str(default_size or '').strip():
            default_size_remaining = get_product_size_remaining_quantity(product.id, default_size)
            stock_available = default_size_remaining > 0
            if not stock_available:
                stock_message = 'Нет на складе'

        ppe_products_payload.append({
            'id': product.id,
            'name': product.name,
            'type_product': product.type_product,
            'type_product_display': product.get_type_product_display() if product.type_product else None,
            'renewal_months': renewal_months,
            'can_issue': can_issue,
            'months_left': months_left,
            'remaining_text': remaining_text,
            'not_due_message': not_due_message,
            'last_issued_at': format_local_date_value(last_issue_dt),
            'next_due_date': format_local_date_value(next_due_dt),
            'default_size': default_size,
            'size_type': get_size_label_for_product(product),
            'default_size_remaining': default_size_remaining,
            'stock_available': stock_available,
            'stock_message': stock_message,
        })

    return ppe_products_payload


def build_latest_item_payload_for_employee(employee_payload, request=None):
    latest_item = (
        get_employee_items_queryset(employee_payload)
        .select_related('issued_by')
        .prefetch_related('ppeproduct')
        .order_by('-issued_at', '-id')
        .first()
    )
    if latest_item:
        attach_employee_snapshots([latest_item])
        serializer_context = {'include_ppe_split': True, 'include_issue_history': True}
        if request is not None:
            serializer_context['request'] = request
        return latest_item, ItemSerializer(latest_item, context=serializer_context).data
    return None, build_employee_only_item_payload(employee_payload)


def ensure_can_modify(request):
    """
    Проверяет, может ли пользователь модифицировать данные (кроме сотрудников).
    Разрешено: ADMIN, IT_CENTER, и роли из UserRole.MANAGER_TIER_ROLES
    Запрещено: USER
    """
    role = get_effective_user_role(request.user)
    if role in [UserRole.ADMIN, UserRole.IT_CENTER, *UserRole.MANAGER_TIER_ROLES]:
        return None
    return Response(
        {"error": "У вас есть только права на просмотр."},
        status=status.HTTP_403_FORBIDDEN,
    )


def ensure_can_add_issue_history(request):
    role = get_effective_user_role(request.user)
    if role in [UserRole.ADMIN, *UserRole.MANAGER_TIER_ROLES]:
        return None
    return Response(
        {"error": "У вас нет прав на добавление истории выдачи."},
        status=status.HTTP_403_FORBIDDEN,
    )


def ensure_can_manage_employees(request):
    """
    Проверяет, может ли пользователь управлять сотрудниками (добавлять, редактировать).
    Разрешено: ADMIN, IT_CENTER
    Запрещено: USER, и роли из UserRole.MANAGER_TIER_ROLES
    """
    role = get_effective_user_role(request.user)
    if role in [UserRole.ADMIN, UserRole.IT_CENTER]:
        return None
    return Response(
        {"error": "У вас нет прав на управление сотрудниками."},
        status=status.HTTP_403_FORBIDDEN,
    )


def ensure_admin_only(request):
    role = get_effective_user_role(request.user)
    if role == UserRole.ADMIN:
        return None
    return Response(
        {"error": "Только администратор имеет доступ."},
        status=status.HTTP_403_FORBIDDEN,
    )


def ensure_can_submit_ppe_arrival(request):
    if user_has_feature_access(request.user, 'ppe_arrival_intake'):
        return None
    return Response(
        {"error": "У вас нет прав на прием СИЗ на склад."},
        status=status.HTTP_403_FORBIDDEN,
    )


def ensure_can_manage_face_id_control(request):
    if user_has_feature_access(request.user, 'face_id_control'):
        return None
    return Response(
        {"error": "У вас нет прав на управление Face ID."},
        status=status.HTTP_403_FORBIDDEN,
    )


def ensure_can_view_dashboard_due_cards(request):
    if user_has_feature_access(request.user, 'dashboard_due_cards'):
        return None
    return Response(
        {"error": "У вас нет прав на просмотр карточек по срокам СИЗ."},
        status=status.HTTP_403_FORBIDDEN,
    )


def ensure_can_delete(request):
    role = get_effective_user_role(request.user)
    if role in [UserRole.ADMIN, UserRole.IT_CENTER]:
        return None
    return Response(
        {"error": "Вы не являетесь администратором. У вас нет прав на удаление."},
        status=status.HTTP_403_FORBIDDEN,
    )


class SettingsDepartmentListCreateApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        permission_error = ensure_can_modify(request)
        if permission_error:
            return permission_error

        try:
            departments = sorted(
                [normalize_department_payload(item) for item in extract_service_results(list_departments())],
                key=department_sort_key,
            )
        except EmployeeServiceClientError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(departments)

    def post(self, request):
        permission_error = ensure_can_modify(request)
        if permission_error:
            return permission_error

        try:
            department = create_department(build_department_service_payload(request.data))
        except EmployeeServiceClientError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(normalize_department_payload(department), status=status.HTTP_201_CREATED)


class SettingsSectionListCreateApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        permission_error = ensure_can_modify(request)
        if permission_error:
            return permission_error

        try:
            sections = sorted(
                [normalize_section_payload(item) for item in extract_service_results(list_sections())],
                key=lambda item: (item.get('name') or '').lower(),
            )
        except EmployeeServiceClientError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(sections)

    def post(self, request):
        permission_error = ensure_can_modify(request)
        if permission_error:
            return permission_error

        try:
            section = create_section(build_section_service_payload(request.data))
        except EmployeeServiceClientError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(normalize_section_payload(section), status=status.HTTP_201_CREATED)


class SettingsPPEProductListCreateApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        permission_error = ensure_can_modify(request)
        if permission_error:
            return permission_error

        products = PPEProduct.objects.all().order_by(Lower('name'))
        serializer = PPEProductSerializer(products, many=True)
        return Response(serializer.data)

    def post(self, request):
        permission_error = ensure_can_modify(request)
        if permission_error:
            return permission_error

        serializer = PPEProductSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SettingsPPEDepartmentRuleListCreateApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        permission_error = ensure_can_modify(request)
        if permission_error:
            return permission_error

        rules = PositionPPERenewalRule.objects.select_related('ppeproduct').all()
        serializer = PositionPPERenewalRuleSerializer(rules, many=True)

        try:
            department_map = get_service_department_map()
        except EmployeeServiceClientError:
            department_map = {}

        department_order_map = {department_id: index for index, department_id in enumerate(department_map.keys())}
        payload = [normalize_position_rule_payload(item, department_map) for item in serializer.data]
        payload.sort(key=lambda item: position_rule_sort_key(item, department_order_map))
        return Response(payload)

    def post(self, request):
        permission_error = ensure_can_modify(request)
        if permission_error:
            return permission_error

        raw_position_entries = request.data.get('position_entries')
        normalized_positions = []

        if raw_position_entries is not None:
            if not isinstance(raw_position_entries, list):
                return Response({'error': 'Список должностей заполнен некорректно.'}, status=status.HTTP_400_BAD_REQUEST)

            seen_position_scopes = set()
            for raw_entry in raw_position_entries:
                if not isinstance(raw_entry, dict):
                    continue

                position_name = ' '.join(str(raw_entry.get('position_name') or '').strip().split())
                position_key = normalize_employee_position(position_name)
                if not position_key:
                    continue

                raw_department_id = raw_entry.get('department_service_id')
                try:
                    department_service_id = int(raw_department_id)
                except (TypeError, ValueError):
                    department_service_id = None

                department_name = ' '.join(str(raw_entry.get('department_name') or '').strip().split())
                scope_key = (department_service_id, position_key)
                if scope_key in seen_position_scopes:
                    continue

                seen_position_scopes.add(scope_key)
                normalized_positions.append({
                    'department_service_id': department_service_id,
                    'department_name': department_name,
                    'position_name': position_name,
                })
        else:
            raw_position_names = request.data.get('position_names')
            if raw_position_names is None:
                raw_position_names = [request.data.get('position_name')]
            if not isinstance(raw_position_names, list):
                raw_position_names = [raw_position_names]

            seen_position_keys = set()
            for raw_value in raw_position_names:
                position_name = ' '.join(str(raw_value or '').strip().split())
                position_key = normalize_employee_position(position_name)
                if not position_key or position_key in seen_position_keys:
                    continue
                seen_position_keys.add(position_key)
                normalized_positions.append({
                    'department_service_id': None,
                    'department_name': '',
                    'position_name': position_name,
                })

        if not normalized_positions:
            return Response({'error': 'Выберите хотя бы одну должность.'}, status=status.HTTP_400_BAD_REQUEST)

        raw_product_rules = request.data.get('product_rules')
        if raw_product_rules is not None:
            if not isinstance(raw_product_rules, list):
                return Response({'error': 'Список СИЗ заполнен некорректно.'}, status=status.HTTP_400_BAD_REQUEST)

            normalized_product_rules = []
            seen_products = set()
            for raw_rule in raw_product_rules:
                if not isinstance(raw_rule, dict):
                    continue

                raw_product_id = raw_rule.get('ppeproduct')
                try:
                    product_id = int(raw_product_id)
                except (TypeError, ValueError):
                    continue

                if product_id in seen_products:
                    continue

                try:
                    renewal_months = int(raw_rule.get('renewal_months', 0) or 0)
                except (TypeError, ValueError):
                    return Response({'error': 'Срок выдачи должен быть числом.'}, status=status.HTTP_400_BAD_REQUEST)

                if renewal_months < 0:
                    return Response({'error': 'Срок выдачи не может быть отрицательным.'}, status=status.HTTP_400_BAD_REQUEST)

                seen_products.add(product_id)
                try:
                    is_allowed = coerce_request_boolean(raw_rule.get('is_allowed', True), default=True)
                except ValueError:
                    return Response({'error': 'Флаг разрешения СИЗ указан некорректно.'}, status=status.HTTP_400_BAD_REQUEST)

                normalized_product_rules.append({
                    'ppeproduct': product_id,
                    'is_allowed': is_allowed,
                    'renewal_months': renewal_months,
                })

            if not normalized_product_rules:
                return Response({'error': 'Укажите хотя бы один СИЗ и срок выдачи.'}, status=status.HTTP_400_BAD_REQUEST)

            payloads = []
            for position_entry in normalized_positions:
                for product_rule in normalized_product_rules:
                    payloads.append({
                        'department_service_id': position_entry['department_service_id'],
                        'department_name': position_entry['department_name'],
                        'position_name': position_entry['position_name'],
                        'ppeproduct': product_rule['ppeproduct'],
                        'is_allowed': product_rule['is_allowed'],
                        'renewal_months': product_rule['renewal_months'],
                    })

            serializer = PositionPPERenewalRuleSerializer(data=payloads, many=True)
            if serializer.is_valid():
                with transaction.atomic():
                    serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)

            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        payloads = []
        for position_entry in normalized_positions:
            payload = request.data.copy()
            payload['department_service_id'] = position_entry['department_service_id']
            payload['department_name'] = position_entry['department_name']
            payload['position_name'] = position_entry['position_name']
            payloads.append(payload)

        serializer = PositionPPERenewalRuleSerializer(data=payloads, many=True)
        if serializer.is_valid():
            with transaction.atomic():
                serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SettingsResponsiblePersonListCreateApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        permission_error = ensure_can_modify(request)
        if permission_error:
            return permission_error

        persons = ResponsiblePerson.objects.all().order_by(Lower('full_name'))
        serializer = ResponsiblePersonSerializer(persons, many=True)
        return Response(serializer.data)

    def post(self, request):
        permission_error = ensure_can_modify(request)
        if permission_error:
            return permission_error

        serializer = ResponsiblePersonSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SettingsEmployeePositionListApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        permission_error = ensure_can_modify(request)
        if permission_error:
            return permission_error

        return Response(get_available_employee_positions())


class SettingsDepartmentDetailApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        permission_error = ensure_can_modify(request)
        if permission_error:
            return permission_error

        try:
            department = update_department(pk, build_department_service_payload(request.data))
        except EmployeeServiceClientError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(normalize_department_payload(department))

    def delete(self, request, pk):
        permission_error = ensure_can_modify(request)
        if permission_error:
            return permission_error

        try:
            delete_department(pk)
        except EmployeeServiceClientError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SettingsSectionDetailApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        permission_error = ensure_can_modify(request)
        if permission_error:
            return permission_error

        try:
            section = update_section(pk, build_section_service_payload(request.data))
        except EmployeeServiceClientError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(normalize_section_payload(section))

    def delete(self, request, pk):
        permission_error = ensure_can_modify(request)
        if permission_error:
            return permission_error

        try:
            delete_section(pk)
        except EmployeeServiceClientError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SettingsPPEProductDetailApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        permission_error = ensure_admin_only(request)
        if permission_error:
            return permission_error

        product = get_object_or_404(PPEProduct, pk=pk)
        serializer = PPEProductSerializer(product, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        permission_error = ensure_admin_only(request)
        if permission_error:
            return permission_error

        product = get_object_or_404(PPEProduct, pk=pk)
        product.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SettingsPPEDepartmentRuleDetailApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        permission_error = ensure_can_modify(request)
        if permission_error:
            return permission_error

        rule = get_object_or_404(PositionPPERenewalRule, pk=pk)

        position_name = ' '.join(str(request.data.get('position_name', rule.position_name) or '').strip().split())
        if not position_name:
            return Response({'error': 'Выберите должность.'}, status=status.HTTP_400_BAD_REQUEST)

        raw_department_id = request.data.get('department_service_id', rule.department_service_id)
        try:
            department_service_id = int(raw_department_id) if raw_department_id not in [None, ''] else None
        except (TypeError, ValueError):
            return Response({'error': 'Цех указан некорректно.'}, status=status.HTTP_400_BAD_REQUEST)

        department_name = ' '.join(str(request.data.get('department_name', rule.department_name) or '').strip().split())

        payload = request.data.copy()
        payload['department_service_id'] = department_service_id
        payload['department_name'] = department_name
        payload['position_name'] = position_name

        serializer = PositionPPERenewalRuleSerializer(rule, data=payload, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        permission_error = ensure_admin_only(request)
        if permission_error:
            return permission_error

        rule = get_object_or_404(PositionPPERenewalRule, pk=pk)
        rule.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SettingsResponsiblePersonDetailApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        permission_error = ensure_can_modify(request)
        if permission_error:
            return permission_error

        person = get_object_or_404(ResponsiblePerson, pk=pk)
        serializer = ResponsiblePersonSerializer(person, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        permission_error = ensure_can_modify(request)
        if permission_error:
            return permission_error

        person = get_object_or_404(ResponsiblePerson, pk=pk)
        person.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


def resolve_employee_from_slug(slug: str):
    source_item = Item.objects.filter(slug=slug, is_deleted=False).first()
    if source_item:
        employee_payload = fetch_employee_by_slug_or_404(source_item.employee_slug) if source_item.employee_slug else None
        return employee_payload or build_employee_snapshot(source_item.employee_snapshot)

    return fetch_employee_by_slug_or_404(slug)


def resolve_employee_service_slug(slug: str):
    source_item = Item.objects.filter(slug=slug, is_deleted=False).only('employee_slug', 'employee_snapshot').first()
    if source_item:
        if source_item.employee_slug:
            remote_employee = fetch_employee_by_slug_or_404(source_item.employee_slug)
            if remote_employee and remote_employee.get('slug'):
                return remote_employee.get('slug')

        employee_snapshot = build_employee_snapshot(source_item.employee_snapshot)
        external_id = str(employee_snapshot.get('external_id') or '').strip()
        tabel_number = str(employee_snapshot.get('tabel_number') or '').strip()

        if external_id:
            remote_employee = fetch_employee_by_external_id_safe(external_id)
            if remote_employee and remote_employee.get('slug'):
                return remote_employee.get('slug')

        if tabel_number:
            remote_payload = list_employees_bootstrapped(tabel_number=tabel_number, source_system=None)
            remote_employees = extract_employee_results(remote_payload)
            if remote_employees:
                remote_slug = str((remote_employees[0] or {}).get('slug') or '').strip()
                if remote_slug:
                    return remote_slug

        if source_item.employee_slug:
            return source_item.employee_slug

    return slug


def should_fallback_from_employee_service_error(exc: EmployeeServiceClientError) -> bool:
    message = str(exc or '').strip().lower()
    if message.startswith('employee service request failed:'):
        return True
    if 'только операции чтения' in message:
        return True
    if 'supports only read operations' in message:
        return True
    if 'read-only' in message:
        return True
    return False


def _get_employee_face_id_lookup(employee_payload: dict):
    employee_data = build_employee_snapshot(employee_payload)

    employee_slug = str(employee_data.get('slug') or '').strip() or None
    tabel_number = str(employee_data.get('tabel_number') or '').strip() or None

    external_id = str(employee_data.get('external_id') or employee_data.get('id') or '').strip()
    employee_service_id = None
    if external_id.isdigit():
        employee_service_id = int(external_id)

    return employee_data, employee_slug, employee_service_id, tabel_number


def get_local_face_id_override_value(employee_payload: dict):
    employee_data, employee_slug, employee_service_id, tabel_number = _get_employee_face_id_lookup(employee_payload)

    override = None
    if employee_slug:
        override = EmployeeFaceIdOverride.objects.filter(employee_slug=employee_slug).first()
    if override is None and employee_service_id is not None:
        override = EmployeeFaceIdOverride.objects.filter(employee_service_id=employee_service_id).first()
    if override is None and tabel_number:
        override = EmployeeFaceIdOverride.objects.filter(tabel_number=tabel_number).first()
    if override is not None:
        return bool(override.requires_face_id_checkout)

    local_employee = None
    queryset = Employee.objects.filter(is_deleted=False)
    if employee_slug:
        local_employee = queryset.filter(slug=employee_slug).first()
    if local_employee is None and tabel_number:
        local_employee = queryset.filter(tabel_number=tabel_number).first()
    if local_employee is None and employee_service_id is not None:
        local_employee = queryset.filter(pk=employee_service_id).first()
    if local_employee is not None:
        return bool(local_employee.requires_face_id_checkout)

    return None


def apply_local_face_id_override(employee_payload: dict):
    employee_data = build_employee_snapshot(employee_payload)
    override_value = get_local_face_id_override_value(employee_data)
    if override_value is None:
        return employee_data

    overridden = dict(employee_data)
    overridden['requires_face_id_checkout'] = bool(override_value)
    return overridden


def update_local_face_id_exemption(employee_payload: dict, requires_face_id_checkout: bool):
    if not employee_payload:
        return None

    employee_data, employee_slug, employee_service_id, tabel_number = _get_employee_face_id_lookup(employee_payload)
    full_name = str(employee_data.get('full_name') or '').strip()

    queryset = Employee.objects.filter(is_deleted=False)

    local_employee = None
    if employee_slug:
        local_employee = queryset.filter(slug=employee_slug).first()
    if local_employee is None and tabel_number:
        local_employee = queryset.filter(tabel_number=tabel_number).first()
    if local_employee is None and employee_service_id is not None:
        local_employee = queryset.filter(pk=employee_service_id).first()

    override_defaults = {
        'employee_service_id': employee_service_id,
        'employee_slug': employee_slug,
        'tabel_number': tabel_number,
        'full_name': full_name,
        'requires_face_id_checkout': bool(requires_face_id_checkout),
    }

    override = None
    if employee_slug:
        override, _ = EmployeeFaceIdOverride.objects.update_or_create(
            employee_slug=employee_slug,
            defaults=override_defaults,
        )
    elif employee_service_id is not None:
        override, _ = EmployeeFaceIdOverride.objects.update_or_create(
            employee_service_id=employee_service_id,
            defaults=override_defaults,
        )
    elif tabel_number:
        override, _ = EmployeeFaceIdOverride.objects.update_or_create(
            tabel_number=tabel_number,
            defaults=override_defaults,
        )

    normalized_employee = employee_data
    if local_employee is not None:
        local_employee.requires_face_id_checkout = bool(requires_face_id_checkout)
        local_employee.save(update_fields=['requires_face_id_checkout', 'updatedAt'])
        normalized_employee = build_employee_snapshot(local_employee)

    if override is None and local_employee is None:
        return None

    response_slug = str((normalized_employee or {}).get('slug') or employee_slug or '').strip()
    response_id = (normalized_employee or {}).get('id') or employee_service_id
    response_name = str((normalized_employee or {}).get('full_name') or full_name or '').strip()
    return {
        'success': True,
        'employee': {
            'id': response_id,
            'slug': response_slug,
            'full_name': response_name,
            'requires_face_id_checkout': bool(requires_face_id_checkout),
        },
    }


def resolve_employee_reference_image_url(employee_payload: dict):
    raw_value = str(
        employee_payload.get('base_image_url')
        or employee_payload.get('base_image')
        or ''
    ).strip()
    if not raw_value or raw_value.startswith('data:'):
        return raw_value

    service_base = str(getattr(settings, 'EMPLOYEE_SERVICE_BASE_URL', '') or '').strip()
    if not service_base:
        return raw_value

    parsed_service = urlsplit(service_base)
    service_origin = f'{parsed_service.scheme}://{parsed_service.netloc}'

    if raw_value.startswith('/api/v1/employee-service/media-proxy/'):
        parsed_value = urlsplit(raw_value)
        encoded_path = parse_qs(parsed_value.query).get('path', [''])[0]
        media_path = unquote(encoded_path)
        if media_path.startswith('/media/'):
            return f'{service_origin}{media_path}'

    if raw_value.startswith('/media/'):
        return f'{service_origin}{raw_value}'

    return raw_value


def load_employee_reference_image(employee):
    if isinstance(employee, dict):
        employee_payload = build_employee_snapshot(employee)
        inline_image = employee_payload.get('base_image_data')
        if inline_image:
            reference_image = decode_image_to_pil(inline_image)
            if reference_image is not None:
                return reference_image, None

        image_url = resolve_employee_reference_image_url(employee_payload)
        if not image_url:
            return None, "Сотрудник не имеет базового изображения для сравнения"

        try:
            upstream = requests.get(
                image_url,
                timeout=getattr(settings, 'EMPLOYEE_SERVICE_TIMEOUT', 15),
                verify=bool(getattr(settings, 'EMPLOYEE_SERVICE_VERIFY_SSL', False)),
            )
        except requests.RequestException:
            return None, "Не удалось получить базовое изображение сотрудника"

        if upstream.status_code >= 400 or not upstream.content:
            return None, "Не удалось получить базовое изображение сотрудника"

        try:
            return Image.open(BytesIO(upstream.content)).convert('RGB'), None
        except Exception:
            return None, "Не удалось прочитать изображение из базы данных"

    base_image = getattr(employee, 'base_image', None)
    if not base_image:
        return None, "Сотрудник не имеет базового изображения для сравнения"

    try:
        reference_bytes = base_image.read()
    finally:
        try:
            base_image.close()
        except Exception:
            pass

    try:
        reference_image = Image.open(BytesIO(reference_bytes)).convert('RGB') if reference_bytes else None
    except Exception:
        reference_image = None

    if reference_image is None:
        return None, "Не удалось прочитать изображение из базы данных"

    return reference_image, None


def decode_image_to_pil(image_payload: str):
    if not image_payload:
        return None

    encoded = str(image_payload)
    if ',' in encoded:
        encoded = encoded.split(',', 1)[1]

    try:
        image_bytes = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError):
        return None

    if not image_bytes:
        return None

    try:
        image = Image.open(BytesIO(image_bytes))
        return image.convert('RGB')
    except Exception:
        return None


def save_item_image_from_payload(item: Item, image_payload: str):
    image = decode_image_to_pil(image_payload)
    if image is None:
        raise ValueError("Не удалось прочитать формат изображения для проверки сотрудника")

    buffer = BytesIO()
    image.save(buffer, format='JPEG', quality=92)
    buffer.seek(0)

    filename = f"item-verify-{item.slug or item.employee_id or 'employee'}-{int(timezone.now().timestamp())}.jpg"
    item.image.save(filename, ContentFile(buffer.read()), save=False)


def normalize_face_image(image: Image.Image):
    return image.convert('L').resize((160, 160))


def normalize_size_value(raw_value):
    return str(raw_value or '').strip().lower()


def get_product_available_sizes(product_id: int) -> list:
    """
    Returns list of available sizes for a product with their remaining quantities.
    """
    arrivals = PPEArrival.objects.filter(ppeproduct_id=product_id)
    
    # Collect all arrived sizes and their quantities
    arrived_by_size = {}
    for arrival in arrivals:
        breakdown = arrival.size_breakdown if isinstance(arrival.size_breakdown, dict) else {}
        if breakdown:
            for raw_size, raw_qty in breakdown.items():
                norm_size = normalize_size_value(raw_size)
                if not norm_size:
                    continue
                try:
                    arrived_by_size[norm_size] = arrived_by_size.get(norm_size, 0) + int(raw_qty)
                except (TypeError, ValueError):
                    continue
        elif arrival.size:
            norm_size = normalize_size_value(arrival.size)
            if norm_size:
                try:
                    arrived_by_size[norm_size] = arrived_by_size.get(norm_size, 0) + int(arrival.quantity or 0)
                except (TypeError, ValueError):
                    pass
    
    # Calculate issued quantities per size
    issued_items = (
        Item.objects
        .filter(
            ppeproduct__id=product_id,
            is_deleted=False,
            affects_stock=True,
        )
        .distinct()
    )
    
    issued_by_size = {}
    product_key = str(product_id)
    for issued_item in issued_items:
        size_map = issued_item.ppe_sizes if isinstance(issued_item.ppe_sizes, dict) else {}
        issued_size = normalize_size_value(size_map.get(product_key, ''))
        if issued_size:
            issued_by_size[issued_size] = issued_by_size.get(issued_size, 0) + 1
    
    # Calculate remaining and build result
    result = []
    for norm_size, arrived_qty in arrived_by_size.items():
        issued_qty = issued_by_size.get(norm_size, 0)
        remaining = max(arrived_qty - issued_qty, 0)
        if remaining > 0:
            result.append({
                'size': norm_size,
                'remaining': remaining,
            })
    
    # Sort by size (try numeric first, then alphabetic)
    def sort_key(item):
        try:
            return (0, float(item['size']))
        except ValueError:
            return (1, item['size'])
    
    result.sort(key=sort_key)
    return result


def get_product_size_remaining_quantity(product_id: int, size_value: str) -> int:
    normalized_size = normalize_size_value(size_value)
    if not normalized_size:
        return 0

    arrivals = PPEArrival.objects.filter(ppeproduct_id=product_id)
    arrived_quantity = 0
    for arrival in arrivals:
        breakdown = arrival.size_breakdown if isinstance(arrival.size_breakdown, dict) else {}
        if breakdown:
            for raw_size, raw_qty in breakdown.items():
                if normalize_size_value(raw_size) != normalized_size:
                    continue
                try:
                    arrived_quantity += int(raw_qty)
                except (TypeError, ValueError):
                    continue
            continue

        if normalize_size_value(arrival.size) == normalized_size:
            arrived_quantity += int(arrival.quantity or 0)

    issued_items = (
        Item.objects
        .filter(
            ppeproduct__id=product_id,
            is_deleted=False,
            affects_stock=True,
        )
        .distinct()
    )

    issued_quantity = 0
    product_key = str(product_id)
    for issued_item in issued_items:
        size_map = issued_item.ppe_sizes if isinstance(issued_item.ppe_sizes, dict) else {}
        issued_size = normalize_size_value(size_map.get(product_key, ''))
        if issued_size == normalized_size:
            issued_quantity += 1

    return max(arrived_quantity - issued_quantity, 0)


FACE_MODEL_DIR = os.path.join(settings.BASE_DIR, 'base', 'ml_models')
YUNET_MODEL_FILENAME = 'face_detection_yunet_2023mar.onnx'
SFACE_MODEL_FILENAME = 'face_recognition_sface_2021dec.onnx'
YUNET_MODEL_URL = 'https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx'
SFACE_MODEL_URL = 'https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx'


def _load_cv2_module():
    try:
        import cv2  # type: ignore
        return cv2
    except Exception:
        return None


def _ensure_face_model_file(filename: str, url: str):
    os.makedirs(FACE_MODEL_DIR, exist_ok=True)
    model_path = os.path.join(FACE_MODEL_DIR, filename)
    if os.path.exists(model_path) and os.path.getsize(model_path) > 0:
        return model_path, None

    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
    except Exception as exc:
        return None, f'Не удалось загрузить модель: {filename} ({exc})'

    try:
        with open(model_path, 'wb') as file_obj:
            file_obj.write(response.content)
    except Exception as exc:
        return None, f'Не удалось сохранить модель: {filename} ({exc})'

    return model_path, None


@lru_cache(maxsize=1)
def _get_sface_engines():
    cv2 = _load_cv2_module()
    if cv2 is None:
        return None, None, 'Не удалось загрузить OpenCV (cv2) модуль. Убедитесь, что он установлен и доступен.'  

    yunet_path, yunet_error = _ensure_face_model_file(YUNET_MODEL_FILENAME, YUNET_MODEL_URL)
    if yunet_error:
        return None, None, yunet_error

    sface_path, sface_error = _ensure_face_model_file(SFACE_MODEL_FILENAME, SFACE_MODEL_URL)
    if sface_error:
        return None, None, sface_error

    try:
        detector = cv2.FaceDetectorYN.create(yunet_path, '', (320, 320), 0.9, 0.3, 5000)
        recognizer = cv2.FaceRecognizerSF.create(sface_path, '')
        return detector, recognizer, None
    except Exception as exc:
        return None, None, f'SFace engine ishga tushmadi: {exc}'


def _extract_face_embedding(image: Image.Image):
    cv2 = _load_cv2_module()
    detector, recognizer, engine_error = _get_sface_engines()
    if cv2 is None or detector is None or recognizer is None:
        return None, engine_error or 'SFace engine mavjud emas'

    rgb_np = np.asarray(image.convert('RGB'))
    if rgb_np.size == 0:
        return None, 'Изображение пустое.'

    bgr = cv2.cvtColor(rgb_np, cv2.COLOR_RGB2BGR)
    height, width = bgr.shape[:2]
    if width < 20 or height < 20:
        return None, 'Размер изображения слишком мал.'

    detector.setInputSize((width, height))
    _, faces = detector.detect(bgr)
    if faces is None or len(faces) == 0:
        return None, 'Лицо не обнаружено'

    best_face = max(faces, key=lambda face: float(face[2]) * float(face[3]))
    try:
        aligned = recognizer.alignCrop(bgr, best_face)
        embedding = recognizer.feature(aligned)
    except Exception:
        return None, 'Не удалось вычислить вектор признаков лица'

    if embedding is None:
        return None, 'Не удалось вычислить вектор признаков лица'

    return embedding.astype(np.float32), None


def _embedding_similarity_percent(embedding_a: np.ndarray, embedding_b: np.ndarray) -> float:
    vec_a = embedding_a.flatten().astype(np.float32)
    vec_b = embedding_b.flatten().astype(np.float32)

    denominator = float(np.linalg.norm(vec_a) * np.linalg.norm(vec_b))
    if denominator <= 1e-8:
        return 0.0

    cosine = float(np.dot(vec_a, vec_b) / denominator)
    percent = ((cosine + 1.0) / 2.0) * 100.0
    return max(0.0, min(100.0, percent))


@lru_cache(maxsize=1)
def _get_face_cascade_classifier():
    cv2 = _load_cv2_module()
    if cv2 is None:
        return None

    try:
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        classifier = cv2.CascadeClassifier(cascade_path)
        if classifier.empty():
            return None
        return classifier
    except Exception:
        return None


@lru_cache(maxsize=1)
def _get_eye_cascade_classifier():
    cv2 = _load_cv2_module()
    if cv2 is None:
        return None

    try:
        cascade_path = cv2.data.haarcascades + 'haarcascade_eye_tree_eyeglasses.xml'
        classifier = cv2.CascadeClassifier(cascade_path)
        if classifier.empty():
            return None
        return classifier
    except Exception:
        return None


def extract_primary_face(image: Image.Image):
    cv2 = _load_cv2_module()
    classifier = _get_face_cascade_classifier()
    if cv2 is None or classifier is None:
        return None

    rgb_np = np.asarray(image.convert('RGB'))
    if rgb_np.size == 0:
        return None

    gray = cv2.cvtColor(rgb_np, cv2.COLOR_RGB2GRAY)
    gray = cv2.equalizeHist(gray)

    faces = classifier.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(64, 64),
    )
    if faces is None or len(faces) == 0:
        return None

    x, y, w, h = max(faces, key=lambda f: int(f[2]) * int(f[3]))

    left_trim = int(w * 0.08)
    right_trim = int(w * 0.08)
    top_trim = int(h * 0.05)
    bottom_trim = int(h * 0.12)

    x1 = max(0, int(x) + left_trim)
    y1 = max(0, int(y) + top_trim)
    x2 = min(gray.shape[1], int(x + w) - right_trim)
    y2 = min(gray.shape[0], int(y + h) - bottom_trim)

    if x2 <= x1 or y2 <= y1:
        return None

    face_gray = gray[y1:y2, x1:x2]
    if face_gray.size == 0:
        return None

    face_gray = cv2.resize(face_gray, (160, 160), interpolation=cv2.INTER_AREA)
    return face_gray


def detect_face_boxes(image: Image.Image):
    cv2 = _load_cv2_module()
    if cv2 is None:
        raise ValueError('Сервис распознавания лиц пока не запущен (cv2)')

    rgb_np = np.asarray(image.convert('RGB'))
    if rgb_np.size == 0:
        return []

    detector, _, _ = _get_sface_engines()
    if detector is not None:
        try:
            bgr = cv2.cvtColor(rgb_np, cv2.COLOR_RGB2BGR)
            height, width = bgr.shape[:2]
            detector.setInputSize((width, height))
            _, faces = detector.detect(bgr)
            if faces is not None and len(faces) > 0:
                return [
                    {
                        'x': int(face[0]),
                        'y': int(face[1]),
                        'width': int(face[2]),
                        'height': int(face[3]),
                    }
                    for face in faces
                ]
        except Exception:
            pass

    classifier = _get_face_cascade_classifier()
    if classifier is None:
        raise ValueError('Сервис распознавания лиц пока не запущен (детектор)')

    gray = cv2.cvtColor(rgb_np, cv2.COLOR_RGB2GRAY)
    gray = cv2.equalizeHist(gray)

    faces = classifier.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=6,
        minSize=(64, 64),
    )

    if faces is None or len(faces) == 0:
        return []

    return [
        {
            'x': int(x),
            'y': int(y),
            'width': int(w),
            'height': int(h),
        }
        for x, y, w, h in faces
    ]


def estimate_face_burst_liveness(images: list[Image.Image]) -> dict:
    normalized_images = [image for image in images if image is not None]
    if len(normalized_images) < 3:
        raise ValueError('Для Face ID проверки нужно минимум 3 кадра.')

    face_crops = []
    face_boxes = []

    for image in normalized_images:
        boxes = detect_face_boxes(image)
        if not boxes:
            raise ValueError('Лицо не обнаружено')

        best_box = max(boxes, key=lambda box: int(box['width']) * int(box['height']))
        face_crop = extract_primary_face(image)
        if face_crop is None:
            raise ValueError('Не удалось выделить лицо для Face ID проверки.')

        face_boxes.append(best_box)
        face_crops.append(face_crop.astype(np.float32))

    pixel_differences = []
    box_shifts = []
    scale_changes = []

    for previous_crop, current_crop, previous_box, current_box in zip(
        face_crops,
        face_crops[1:],
        face_boxes,
        face_boxes[1:],
    ):
        pixel_difference = float(np.mean(np.abs(current_crop - previous_crop)) / 255.0 * 100.0)
        pixel_differences.append(pixel_difference)

        previous_center_x = float(previous_box['x']) + float(previous_box['width']) / 2.0
        previous_center_y = float(previous_box['y']) + float(previous_box['height']) / 2.0
        current_center_x = float(current_box['x']) + float(current_box['width']) / 2.0
        current_center_y = float(current_box['y']) + float(current_box['height']) / 2.0
        previous_diagonal = max(
            float((previous_box['width'] ** 2 + previous_box['height'] ** 2) ** 0.5),
            1.0,
        )
        center_shift = float(
            ((current_center_x - previous_center_x) ** 2 + (current_center_y - previous_center_y) ** 2) ** 0.5
        )
        box_shifts.append((center_shift / previous_diagonal) * 100.0)

        previous_area = max(float(previous_box['width'] * previous_box['height']), 1.0)
        current_area = float(current_box['width'] * current_box['height'])
        scale_changes.append(abs(current_area - previous_area) / previous_area * 100.0)

    average_pixel_difference = float(np.mean(pixel_differences)) if pixel_differences else 0.0
    average_box_shift = float(np.mean(box_shifts)) if box_shifts else 0.0
    average_scale_change = float(np.mean(scale_changes)) if scale_changes else 0.0
    motion_score = average_pixel_difference + (average_box_shift * 0.35) + (average_scale_change * 0.15)

    return {
        'motion_score': motion_score,
        'pixel_difference': average_pixel_difference,
        'box_shift': average_box_shift,
        'scale_change': average_scale_change,
        'frame_count': len(normalized_images),
    }


def estimate_face_blink(images: list[Image.Image]) -> dict:
    cv2 = _load_cv2_module()
    eye_classifier = _get_eye_cascade_classifier()
    blink_threshold = float(getattr(settings, 'FACE_ID_BLINK_SCORE_DROP_THRESHOLD', 3.0))
    normalized_images = [image for image in images if image is not None]
    if cv2 is None or eye_classifier is None:
        raise ValueError('Сервис проверки моргания пока не запущен.')
    if len(normalized_images) < 5:
        raise ValueError('Для проверки моргания нужно больше кадров.')

    eye_counts = []
    eye_scores = []

    for image in normalized_images:
        rgb_np = np.asarray(image.convert('RGB'))
        if rgb_np.size == 0:
            raise ValueError('Один из кадров пустой.')

        gray = cv2.cvtColor(rgb_np, cv2.COLOR_RGB2GRAY)
        gray = cv2.equalizeHist(gray)
        boxes = detect_face_boxes(image)
        if not boxes:
            raise ValueError('Лицо не обнаружено')

        best_box = max(boxes, key=lambda box: int(box['width']) * int(box['height']))
        x = max(int(best_box['x']), 0)
        y = max(int(best_box['y']), 0)
        width = max(int(best_box['width']), 1)
        height = max(int(best_box['height']), 1)

        roi = gray[y:min(gray.shape[0], y + int(height * 0.55)), x:min(gray.shape[1], x + width)]
        if roi.size == 0:
            raise ValueError('Не удалось выделить область глаз.')

        min_width = max(int(width * 0.12), 14)
        min_height = max(int(height * 0.08), 10)
        max_width = max(int(width * 0.5), min_width)
        max_height = max(int(height * 0.28), min_height)

        detected_eyes = eye_classifier.detectMultiScale(
            roi,
            scaleFactor=1.05,
            minNeighbors=3,
            minSize=(min_width, min_height),
            maxSize=(max_width, max_height),
        )

        valid_eyes = sorted(
            detected_eyes,
            key=lambda eye: int(eye[2]) * int(eye[3]),
            reverse=True,
        )[:2] if detected_eyes is not None else []

        eye_count = len(valid_eyes)
        eye_counts.append(eye_count)

        if eye_count == 0:
            eye_scores.append(0.0)
            continue

        areas = [float(eye[2] * eye[3]) for eye in valid_eyes]
        normalized_area = (sum(areas) / eye_count) / max(float(width * height), 1.0) * 1000.0
        eye_scores.append((eye_count * 8.0) + normalized_area)

    peak_score = max(eye_scores) if eye_scores else 0.0
    min_score = min(eye_scores) if eye_scores else 0.0
    score_drop = peak_score - min_score

    blink_detected = False
    for frame_index in range(1, len(eye_scores) - 1):
        current_score = eye_scores[frame_index]
        left_peak = max(eye_scores[:frame_index], default=0.0)
        right_peak = max(eye_scores[frame_index + 1 :], default=0.0)
        local_drop = min(left_peak, right_peak) - current_score
        open_before = max(eye_counts[:frame_index], default=0) >= 1 or left_peak >= blink_threshold
        open_after = max(eye_counts[frame_index + 1 :], default=0) >= 1 or right_peak >= blink_threshold

        if local_drop >= blink_threshold and open_before and open_after:
            blink_detected = True
            break

    return {
        'blink_detected': blink_detected,
        'eye_counts': eye_counts,
        'eye_scores': eye_scores,
        'score_drop': score_drop,
    }


def estimate_head_pose_direction(images: list, required_direction: str) -> dict:
    """
    Estimates head pose (yaw/pitch) across frames using YuNet landmarks + solvePnP.
    Checks if the user turned their head in the required direction.
    Returns {'passed': bool, 'max_right_yaw': float, 'max_left_yaw': float, ...}
    """
    cv2 = _load_cv2_module()
    if cv2 is None:
        return {'passed': True, 'reason': 'cv2_unavailable_skipped'}

    detector, _, _ = _get_sface_engines()
    if detector is None:
        return {'passed': True, 'reason': 'detector_unavailable_skipped'}

    # Generic 3D face model (approximate mm, nose tip at origin)
    face_3d = np.array([
        (0.0, 0.0, 0.0),           # Nose tip
        (-43.3, 32.7, -26.0),      # Right eye (person's right)
        (43.3, 32.7, -26.0),       # Left eye (person's left)
        (-28.9, -28.9, -24.1),     # Right mouth corner
        (28.9, -28.9, -24.1),      # Left mouth corner
    ], dtype=np.float64)

    yaw_values = []
    pitch_values = []

    for image in images:
        if image is None:
            continue
        rgb = np.asarray(image.convert('RGB'))
        bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
        h, w = bgr.shape[:2]
        detector.setInputSize((w, h))

        try:
            _, faces = detector.detect(bgr)
        except Exception:
            continue

        if faces is None or len(faces) == 0:
            continue

        best_face = max(faces, key=lambda f: float(f[2]) * float(f[3]))

        # YuNet: [x, y, w, h, x_re, y_re, x_le, y_le, x_nt, y_nt, x_rcm, y_rcm, x_lcm, y_lcm, score]
        x_nt, y_nt = float(best_face[8]), float(best_face[9])
        x_re, y_re = float(best_face[4]), float(best_face[5])
        x_le, y_le = float(best_face[6]), float(best_face[7])
        x_rcm, y_rcm = float(best_face[10]), float(best_face[11])
        x_lcm, y_lcm = float(best_face[12]), float(best_face[13])

        image_2d = np.array([
            (x_nt, y_nt), (x_re, y_re), (x_le, y_le), (x_rcm, y_rcm), (x_lcm, y_lcm),
        ], dtype=np.float64)

        camera_matrix = np.array([
            [float(w), 0, w / 2.0],
            [0, float(w), h / 2.0],
            [0, 0, 1.0],
        ], dtype=np.float64)
        dist_coeffs = np.zeros((4, 1), dtype=np.float64)

        try:
            success, rvec, _ = cv2.solvePnP(
                face_3d, image_2d, camera_matrix, dist_coeffs,
                flags=cv2.SOLVEPNP_ITERATIVE,
            )
            if not success:
                continue

            rmat, _ = cv2.Rodrigues(rvec)
            sy = float(np.sqrt(rmat[0, 0] ** 2 + rmat[1, 0] ** 2))
            if sy > 1e-6:
                pitch = float(np.degrees(np.arctan2(rmat[2, 1], rmat[2, 2])))
                yaw = float(np.degrees(np.arctan2(-rmat[2, 0], sy)))
            else:
                pitch = float(np.degrees(np.arctan2(-rmat[1, 2], rmat[1, 1])))
                yaw = float(np.degrees(np.arctan2(-rmat[2, 0], sy)))

            yaw_values.append(yaw)
            pitch_values.append(pitch)
        except Exception:
            continue

    if not yaw_values:
        # If no valid pose detected, skip this check (fail gracefully)
        return {'passed': True, 'reason': 'no_valid_pose_skipped', 'frames_analyzed': 0}

    yaw_threshold = float(getattr(settings, 'FACE_ID_HEAD_POSE_YAW_THRESHOLD', 15.0))
    pitch_threshold = float(getattr(settings, 'FACE_ID_HEAD_POSE_PITCH_THRESHOLD', 12.0))

    max_right = max(yaw_values)
    max_left = min(yaw_values)
    min_pitch = min(pitch_values)

    if required_direction == 'right':
        passed = max_right >= yaw_threshold
    elif required_direction == 'left':
        passed = max_left <= -yaw_threshold
    elif required_direction == 'up':
        passed = min_pitch <= -pitch_threshold
    else:
        passed = True

    return {
        'passed': passed,
        'required_direction': required_direction,
        'max_right_yaw': round(max_right, 1),
        'max_left_yaw': round(max_left, 1),
        'yaw_range': round(max_right - max_left, 1),
        'frames_analyzed': len(yaw_values),
    }


def estimate_face_turn_score(image: Image.Image) -> float:
    cv2 = _load_cv2_module()
    detector, _, _ = _get_sface_engines()
    if cv2 is None or detector is None:
        raise ValueError('Сервис распознавания лиц пока не запущен (детектор)')

    rgb_np = np.asarray(image.convert('RGB'))
    if rgb_np.size == 0:
        raise ValueError('Face ID изображение пустое.')

    try:
        bgr = cv2.cvtColor(rgb_np, cv2.COLOR_RGB2BGR)
        height, width = bgr.shape[:2]
        detector.setInputSize((width, height))
        _, faces = detector.detect(bgr)
    except Exception as exc:
        raise ValueError('Не удалось обработать изображение лица.') from exc

    if faces is None or len(faces) == 0:
        raise ValueError('Лицо не обнаружено')

    best_face = max(faces, key=lambda face: float(face[2]) * float(face[3]))
    if len(best_face) < 14:
        raise ValueError('Недостаточно данных для проверки поворота головы.')

    landmarks = np.asarray(best_face[4:14], dtype=np.float32).reshape(5, 2)
    left_eye, right_eye = sorted(landmarks[:2], key=lambda point: float(point[0]))
    nose = landmarks[2]
    eye_distance = max(float(right_eye[0] - left_eye[0]), 1.0)
    eye_center_x = float((left_eye[0] + right_eye[0]) / 2.0)
    return float((float(nose[0]) - eye_center_x) / eye_distance)


def _orb_similarity(face_a: np.ndarray, face_b: np.ndarray) -> float:
    cv2 = _load_cv2_module()
    if cv2 is None:
        return 0.0

    try:
        orb = cv2.ORB_create(nfeatures=400)
        keypoints_a, descriptors_a = orb.detectAndCompute(face_a, None)
        keypoints_b, descriptors_b = orb.detectAndCompute(face_b, None)

        if descriptors_a is None or descriptors_b is None:
            return 0.0
        if not keypoints_a or not keypoints_b:
            return 0.0

        matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)
        knn_matches = matcher.knnMatch(descriptors_a, descriptors_b, k=2)

        good_matches = []
        for pair in knn_matches:
            if len(pair) < 2:
                continue
            first, second = pair
            if first.distance < 0.75 * second.distance:
                good_matches.append(first)

        denominator = max(len(keypoints_a), len(keypoints_b), 1)
        return max(0.0, min(1.0, len(good_matches) / float(denominator)))
    except Exception:
        return 0.0


def _ncc_similarity(face_a: np.ndarray, face_b: np.ndarray) -> float:
    a = face_a.astype(np.float32)
    b = face_b.astype(np.float32)

    a_centered = a - float(np.mean(a))
    b_centered = b - float(np.mean(b))

    denominator = float(np.linalg.norm(a_centered) * np.linalg.norm(b_centered))
    if denominator <= 1e-8:
        return 0.0

    ncc = float(np.sum(a_centered * b_centered) / denominator)
    return max(0.0, min(1.0, (ncc + 1.0) / 2.0))


def _gradient_similarity(face_a: np.ndarray, face_b: np.ndarray) -> float:
    grad_ax = np.diff(face_a.astype(np.float32), axis=1)
    grad_ay = np.diff(face_a.astype(np.float32), axis=0)
    grad_bx = np.diff(face_b.astype(np.float32), axis=1)
    grad_by = np.diff(face_b.astype(np.float32), axis=0)

    grad_a = np.concatenate([grad_ax.flatten(), grad_ay.flatten()])
    grad_b = np.concatenate([grad_bx.flatten(), grad_by.flatten()])

    denominator = float(np.linalg.norm(grad_a) * np.linalg.norm(grad_b))
    if denominator <= 1e-8:
        return 0.0

    similarity = float(np.dot(grad_a, grad_b) / denominator)
    return max(0.0, min(1.0, (similarity + 1.0) / 2.0))


def _hog_similarity(face_a: np.ndarray, face_b: np.ndarray) -> float:
    cv2 = _load_cv2_module()
    if cv2 is None:
        return 0.0

    try:
        resized_a = cv2.resize(face_a.astype(np.uint8), (64, 64), interpolation=cv2.INTER_AREA)
        resized_b = cv2.resize(face_b.astype(np.uint8), (64, 64), interpolation=cv2.INTER_AREA)

        hog = cv2.HOGDescriptor(
            _winSize=(64, 64),
            _blockSize=(16, 16),
            _blockStride=(8, 8),
            _cellSize=(8, 8),
            _nbins=9,
        )

        feature_a = hog.compute(resized_a)
        feature_b = hog.compute(resized_b)

        if feature_a is None or feature_b is None:
            return 0.0

        vec_a = feature_a.flatten().astype(np.float32)
        vec_b = feature_b.flatten().astype(np.float32)

        denominator = float(np.linalg.norm(vec_a) * np.linalg.norm(vec_b))
        if denominator <= 1e-8:
            return 0.0

        cosine = float(np.dot(vec_a, vec_b) / denominator)
        return max(0.0, min(1.0, (cosine + 1.0) / 2.0))
    except Exception:
        return 0.0


def calculate_face_identity_similarity(reference_image: Image.Image, captured_image: Image.Image) -> float:
    if reference_image is None or captured_image is None:
        return 0.0

    if _load_cv2_module() is None:
        raise ValueError('Сервис распознавания лиц пока не запущен (cv2)')

    reference_embedding, reference_embedding_error = _extract_face_embedding(reference_image)
    captured_embedding, captured_embedding_error = _extract_face_embedding(captured_image)

    if reference_embedding is None or captured_embedding is None:
        if reference_embedding is None and captured_embedding is None:
            raise ValueError(reference_embedding_error or captured_embedding_error or 'Лица на изображениях не обнаружены')
        if reference_embedding is None:
            raise ValueError(reference_embedding_error or 'Лицо на сохраненном изображении не обнаружено')
        raise ValueError(captured_embedding_error or 'Лицо на изображении с камеры не обнаружено')

    return _embedding_similarity_percent(reference_embedding, captured_embedding)


def calculate_face_similarity(reference_image: Image.Image, captured_image: Image.Image) -> float:
    if reference_image is None or captured_image is None:
        return 0.0

    if _load_cv2_module() is None:
        raise ValueError('Сервис распознавания лиц пока не запущен (cv2)')

    reference_embedding, reference_embedding_error = _extract_face_embedding(reference_image)
    captured_embedding, captured_embedding_error = _extract_face_embedding(captured_image)

    embedding_similarity = None
    if reference_embedding is not None and captured_embedding is not None:
        embedding_similarity = _embedding_similarity_percent(reference_embedding, captured_embedding)

    ref_face = extract_primary_face(reference_image)
    cap_face = extract_primary_face(captured_image)

    if ref_face is None or cap_face is None:
        if embedding_similarity is not None:
            return embedding_similarity
        if ref_face is None and cap_face is None:
            raise ValueError(reference_embedding_error or captured_embedding_error or 'Лица на изображениях не обнаружены')
        if ref_face is None:
            raise ValueError(reference_embedding_error or 'Лицо на сохраненном изображении не обнаружено')
        raise ValueError(captured_embedding_error or 'Лицо на изображении с камеры не обнаружено')

    ref_np = np.asarray(ref_face, dtype=np.float32)
    cap_np = np.asarray(cap_face, dtype=np.float32)

    ref_eq = ref_np.copy()
    cap_eq = cap_np.copy()
    cv2 = _load_cv2_module()
    if cv2 is not None:
        ref_eq = cv2.equalizeHist(ref_eq.astype(np.uint8)).astype(np.float32)
        cap_eq = cv2.equalizeHist(cap_eq.astype(np.uint8)).astype(np.float32)

    diff = np.abs(ref_eq - cap_eq)
    pixel_similarity = 1.0 - float(np.mean(diff) / 255.0)

    ref_hist, _ = np.histogram(ref_eq.flatten(), bins=64, range=(0, 256), density=True)
    cap_hist, _ = np.histogram(cap_eq.flatten(), bins=64, range=(0, 256), density=True)
    hist_distance = float(np.sum(np.abs(ref_hist - cap_hist)))
    hist_similarity = max(0.0, min(1.0, 1.0 - (hist_distance / 2.0)))

    ncc_similarity = _ncc_similarity(ref_eq, cap_eq)
    gradient_similarity = _gradient_similarity(ref_eq, cap_eq)
    hog_similarity = _hog_similarity(ref_eq, cap_eq)
    orb_similarity = _orb_similarity(ref_eq.astype(np.uint8), cap_eq.astype(np.uint8))

    combined_similarity = (
        (pixel_similarity * 0.10)
        + (hist_similarity * 0.07)
        + (ncc_similarity * 0.33)
        + (gradient_similarity * 0.22)
        + (hog_similarity * 0.18)
        + (orb_similarity * 0.10)
    )
    classic_similarity = max(0.0, min(1.0, combined_similarity)) * 100.0

    if embedding_similarity is None:
        return classic_similarity

    high_accuracy_similarity = (embedding_similarity * 0.80) + (classic_similarity * 0.20)
    return max(0.0, min(100.0, high_accuracy_similarity))


def add_calendar_months(value: dt.datetime, months: int) -> dt.datetime:
    if months <= 0:
        return value

    month_index = (value.month - 1) + months
    year = value.year + month_index // 12
    month = (month_index % 12) + 1
    day = min(value.day, monthrange(year, month)[1])
    return value.replace(year=year, month=month, day=day)


def get_next_issue_ready_date(issued_at: dt.datetime, renewal_months: int) -> dt.datetime:
    adjusted_months = max(int(renewal_months or 0) - 1, 0)
    return add_calendar_months(issued_at, adjusted_months)


def get_months_remaining(now_dt: dt.datetime, due_dt: dt.datetime) -> int:
    if now_dt >= due_dt:
        return 0

    months = (due_dt.year - now_dt.year) * 12 + (due_dt.month - now_dt.month)
    projected = add_calendar_months(now_dt, months)
    if projected < due_dt:
        months += 1
    return max(months, 1)


def _ru_plural(value: int, one: str, few: str, many: str) -> str:
    mod10 = value % 10
    mod100 = value % 100
    if mod10 == 1 and mod100 != 11:
        return one
    if 2 <= mod10 <= 4 and not (12 <= mod100 <= 14):
        return few
    return many


def format_remaining_period_ru(months: int) -> str:
    total_months = max(int(months or 0), 0)
    years = total_months // 12
    rem_months = total_months % 12

    parts = []
    if years > 0:
        parts.append(f"{years} {_ru_plural(years, 'год', 'года', 'лет')}")
    if rem_months > 0:
        parts.append(f"{rem_months} {_ru_plural(rem_months, 'месяц', 'месяца', 'месяцев')}")
    if not parts:
        parts.append("0 месяцев")

    return " ".join(parts)


def _build_rules_dict_for_product(product_id):
    """Pre-fetch renewal rules for one product into a (dept_id, pos_key) → months dict."""
    rules = {}
    for rule in PositionPPERenewalRule.objects.filter(ppeproduct_id=product_id).only(
        'department_service_id', 'position_key', 'renewal_months'
    ):
        rules[(rule.department_service_id, rule.position_key)] = int(rule.renewal_months or 0)
    return rules


def _renewal_months_from_snapshot(snapshot, rules_by_key, default_months):
    """O(1) renewal-months lookup using pre-fetched rules dict."""
    dept = (snapshot or {}).get('department') or {}
    try:
        dept_id = int(dept.get('id') or 0) or None
    except (TypeError, ValueError):
        dept_id = None
    pos_key = normalize_employee_position((snapshot or {}).get('position', ''))
    if pos_key:
        if dept_id is not None:
            v = rules_by_key.get((dept_id, pos_key))
            if v is not None:
                return v
        v = rules_by_key.get((None, pos_key))
        if v is not None:
            return v
    return default_months


def get_due_soon_product_latest_item_ids(days: int = 30, product_name: str = 'Spez odejda', product_id: int | None = None):
    now_dt = timezone.now()
    deadline = now_dt + dt.timedelta(days=days)

    target_product = None
    if product_id is not None:
        target_product = PPEProduct.objects.filter(id=product_id, is_active=True).first()
    elif product_name:
        target_product = PPEProduct.objects.filter(name__iexact=product_name, is_active=True).first()

    if not target_product:
        return []

    # 1 query: all rules for this product → dict
    rules_by_key = _build_rules_dict_for_product(target_product.id)
    default_months = int(target_product.renewal_months or 0)

    latest_item_with_product_subquery = (
        Item.objects
        .filter(employee_service_id=OuterRef('employee_service_id'), ppeproduct__id=target_product.id, is_deleted=False)
        .order_by('-issued_at', '-id')
        .values('id')[:1]
    )

    latest_items_with_product = (
        Item.objects
        .filter(ppeproduct__id=target_product.id, is_deleted=False)
        .annotate(_latest_item_with_product_id=Subquery(latest_item_with_product_subquery))
        .filter(id=F('_latest_item_with_product_id'))
        .only('id', 'issued_at', 'employee_snapshot')
        .distinct()
    )

    result_ids = []
    for item in latest_items_with_product:
        if not item.issued_at:
            continue
        renewal_months = _renewal_months_from_snapshot(item.employee_snapshot, rules_by_key, default_months)
        if renewal_months <= 0:
            continue
        due_date = add_calendar_months(item.issued_at, renewal_months)
        if now_dt <= due_date < deadline:
            result_ids.append(item.id)

    return result_ids


def get_overdue_product_latest_item_ids(product_id: int | None = None):
    """Returns item IDs for which the Следующая выдача date has already passed."""
    now_dt = timezone.now()

    if product_id is not None:
        target_product = PPEProduct.objects.filter(id=product_id, is_active=True).first()
        if not target_product:
            return []

        # 1 query: all rules for this product → dict
        rules_by_key = _build_rules_dict_for_product(target_product.id)
        default_months = int(target_product.renewal_months or 0)

        latest_item_with_product_subquery = (
            Item.objects
            .filter(employee_service_id=OuterRef('employee_service_id'), ppeproduct__id=target_product.id, is_deleted=False)
            .order_by('-issued_at', '-id')
            .values('id')[:1]
        )

        latest_items_with_product = (
            Item.objects
            .filter(ppeproduct__id=target_product.id, is_deleted=False)
            .annotate(_latest_item_with_product_id=Subquery(latest_item_with_product_subquery))
            .filter(id=F('_latest_item_with_product_id'))
            .only('id', 'issued_at', 'employee_snapshot')
            .distinct()
        )

        result_ids = []
        for item in latest_items_with_product:
            if not item.issued_at:
                continue
            renewal_months = _renewal_months_from_snapshot(item.employee_snapshot, rules_by_key, default_months)
            if renewal_months <= 0:
                continue
            due_date = add_calendar_months(item.issued_at, renewal_months)
            if due_date < now_dt:
                result_ids.append(item.id)

        return result_ids
    else:
        # Get all overdue items (any product)
        # 2 queries: all rules + all active products → dicts
        rules_by_key = {}
        for rule in PositionPPERenewalRule.objects.only(
            'department_service_id', 'position_key', 'ppeproduct_id', 'renewal_months'
        ):
            key = (rule.department_service_id, rule.position_key, rule.ppeproduct_id)
            rules_by_key[key] = int(rule.renewal_months or 0)

        product_default_months = {
            p.id: int(p.renewal_months or 0)
            for p in PPEProduct.objects.filter(is_active=True).only('id', 'renewal_months')
        }
        active_product_ids = set(product_default_months.keys())

        def _renewal_months_global(product_id, snapshot):
            dept = (snapshot or {}).get('department') or {}
            try:
                dept_id = int(dept.get('id') or 0) or None
            except (TypeError, ValueError):
                dept_id = None
            pos_key = normalize_employee_position((snapshot or {}).get('position', ''))
            if pos_key:
                if dept_id is not None:
                    v = rules_by_key.get((dept_id, pos_key, product_id))
                    if v is not None:
                        return v
                v = rules_by_key.get((None, pos_key, product_id))
                if v is not None:
                    return v
            return product_default_months.get(product_id, 0)

        latest_item_subquery = (
            Item.objects
            .filter(employee_service_id=OuterRef('employee_service_id'), is_deleted=False)
            .order_by('-issued_at', '-id')
            .values('id')[:1]
        )

        latest_items = (
            Item.objects
            .filter(is_deleted=False)
            .annotate(_latest_item_id=Subquery(latest_item_subquery))
            .filter(id=F('_latest_item_id'))
            .prefetch_related('ppeproduct')
            .only('id', 'issued_at', 'employee_snapshot')
            .distinct()
        )

        result_ids = []
        for item in latest_items:
            if not item.issued_at:
                continue
            for product in item.ppeproduct.all():
                if product.id not in active_product_ids:
                    continue
                renewal_months = _renewal_months_global(product.id, item.employee_snapshot)
                if renewal_months <= 0:
                    continue
                due_date = add_calendar_months(item.issued_at, renewal_months)
                if due_date < now_dt:
                    result_ids.append(item.id)
                    break

        return result_ids


def build_employee_table_rows(employee_queryset, include_issue_history=False):
    employees = [build_employee_snapshot(employee) for employee in employee_queryset]
    if not employees:
        return []

    latest_item_ids = [
        employee.get('latest_item_id')
        for employee in employees
        if employee.get('latest_item_id')
    ]

    latest_items = (
        Item.objects
        .filter(id__in=latest_item_ids, is_deleted=False)
        .select_related('issued_by')
        .prefetch_related('ppeproduct')
    )
    attach_employee_snapshots(latest_items)
    latest_item_map = {item.id: item for item in latest_items}

    employee_only_ids = [
        str(employee.get('id'))
        for employee in employees
        if not employee.get('latest_item_id') or employee.get('latest_item_id') not in latest_item_map
    ]
    employee_only_map = {
        str(employee_data.get('id')): employee_data
        for employee_data in employees
        if str(employee_data.get('id')) in employee_only_ids
    }

    rows = []
    for employee in employees:
        latest_item_id = employee.get('latest_item_id')
        if latest_item_id and latest_item_id in latest_item_map:
            serializer_context = {}
            if include_issue_history:
                serializer_context['include_issue_history'] = True
            rows.append(ItemSerializer(latest_item_map[latest_item_id], context=serializer_context).data)
            continue

        employee_data = employee_only_map.get(str(employee.get('id')))
        if not employee_data:
            continue

        rows.append({
            'id': employee_data.get('id'),
            'slug': None,
            'employee_slug': employee_data.get('slug'),
            'employee': employee_data,
            'issued_at': None,
            'next_due_date': None,
            'issued_by_info': None,
            'ppeproduct_info': [],
            'issue_history': [],
            'history_date': employee_data.get('history_date'),
            'history_user': employee_data.get('history_user'),
            'isActive': employee_data.get('is_active', employee_data.get('isActive', True)),
        })

    return rows


def get_due_soon_employee_ppe_rows(days: int = 30, product_id: int | None = None, search: str = ''):
    now_dt = timezone.now()
    deadline = now_dt + dt.timedelta(days=days)
    search_value = str(search or '').strip().lower()

    latest_items = (
        Item.objects
        .filter(is_deleted=False, ppeproduct__is_active=True)
        .select_related('issued_by')
        .prefetch_related('ppeproduct')
        .order_by('-issued_at', '-id')
        .distinct()
    )
    attach_employee_snapshots(latest_items)

    latest_by_pair = {}
    for item in latest_items:
        products = [product for product in item.ppeproduct.all() if product.is_active]
        for product in products:
            if product_id is not None and product.id != product_id:
                continue

            pair_key = (item.employee_service_id, product.id)
            if pair_key not in latest_by_pair:
                latest_by_pair[pair_key] = (item, product)

    rows = []
    for item, product in latest_by_pair.values():
        renewal_months = get_effective_product_renewal_months(product, item.employee)
        if renewal_months <= 0 or not item.issued_at:
            continue

        due_date = add_calendar_months(item.issued_at, renewal_months)
        if not (now_dt <= due_date < deadline):
            continue

        employee = item.employee
        employee_name = ' '.join(
            part for part in [employee.last_name, employee.first_name, employee.surname] if part
        ).strip()
        size_value = ''
        if isinstance(item.ppe_sizes, dict):
            size_value = str(item.ppe_sizes.get(str(product.id)) or '').strip()

        days_remaining = max((due_date.date() - now_dt.date()).days, 0)
        if days_remaining == 0:
            remaining_text = 'Сегодня'
        elif days_remaining < 32:
            remaining_text = f'{days_remaining} дн.'
        else:
            remaining_text = format_remaining_period_ru(get_months_remaining(now_dt, due_date))

        row = {
            'item_id': item.id,
            'item_slug': item.slug,
            'employee_id': item.employee_service_id,
            'employee_slug': item.employee_slug,
            'employee_name': employee_name,
            'tabel_number': employee.tabel_number,
            'department_name': employee.department.name if getattr(employee, 'department', None) else '',
            'section_name': employee.section.name if getattr(employee, 'section', None) else '',
            'position': employee.position or '',
            'product_id': product.id,
            'product_name': product.name,
            'size': size_value,
            'issued_at': item.issued_at.isoformat() if item.issued_at else None,
            'due_date': due_date.isoformat() if due_date else None,
            'days_remaining': days_remaining,
            'remaining_text': remaining_text,
        }

        if search_value:
            haystack = ' '.join([
                row['employee_name'],
                row['tabel_number'],
                row['department_name'],
                row['section_name'],
                row['position'],
                row['product_name'],
                row['size'],
            ]).lower()
            if search_value not in haystack:
                continue

        rows.append(row)

    rows.sort(
        key=lambda row: (
            row['days_remaining'],
            row['due_date'] or '',
            row['department_name'],
            row['section_name'],
            row['employee_name'],
            row['product_name'],
        )
    )
    return rows


def filter_due_soon_employee_ppe_rows(rows, product_id: int | None = None, search: str = ''):
    search_value = str(search or '').strip().lower()
    filtered_rows = []

    for row in rows:
        if product_id is not None and row['product_id'] != product_id:
            continue

        if search_value:
            haystack = ' '.join([
                row['employee_name'],
                row['tabel_number'],
                row['department_name'],
                row['section_name'],
                row['position'],
                row['product_name'],
                row['size'],
            ]).lower()
            if search_value not in haystack:
                continue

        filtered_rows.append(row)

    return filtered_rows


def build_employee_only_item_payload(employee):
    employee_data = build_employee_snapshot(employee)
    return {
        'id': None,
        'slug': None,
        'employee_slug': employee_data.get('slug'),
        'employee': employee_data,
        'issued_at': None,
        'next_due_date': None,
        'issued_by': None,
        'issued_by_info': None,
        'isActive': employee_data.get('is_active', employee_data.get('isActive', True)),
        'ppeproduct': [],
        'ppeproduct_info': [],
        'issue_history': [],
        'history_date': employee_data.get('history_date'),
        'history_user': employee_data.get('history_user'),
    }




from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class EmployeePagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 1000


class ItemsPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 1000


from transliterate import translit


class AllEmployeeApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    pagination_class = EmployeePagination

    def get(self, request, *args, **kwargs):
        search = request.GET.get('search', '').strip()
        tabel_number = request.GET.get('tabel_number')
        department = str(request.GET.get('department', '')).strip().lower()
        section = str(request.GET.get('section', '')).strip().lower()
        history_date = request.GET.get('history_date')
        history_user = request.GET.get('history_user')

        employees_payload = list_employees_bootstrapped(search=search or None, tabel_number=tabel_number or None)
        employees = [build_employee_snapshot(employee) for employee in extract_employee_results(employees_payload)]

        if department:
            employees = [
                employee for employee in employees
                if department in str((employee.get('department') or {}).get('name') or '').lower()
            ]

        if section:
            employees = [
                employee for employee in employees
                if section in str((employee.get('section') or {}).get('name') or '').lower()
            ]

        if history_date:
            employees = [
                employee for employee in employees
                if str(employee.get('history_date') or '').startswith(history_date)
            ]

        if history_user:
            history_user_value = history_user.lower()
            employees = [
                employee for employee in employees
                if history_user_value in str(employee.get('history_user') or '').lower()
            ]

        no_pagination = request.GET.get('no_pagination', '').lower() == 'true'
        if no_pagination:
            return Response(employees)

        paginator = self.pagination_class()
        result_page = paginator.paginate_queryset(employees, request)
        return paginator.get_paginated_response(result_page)


def _compute_info_employee_counts(due_days: int):
    """
    Computes due-soon and overdue PPE counts in 3 DB queries instead of N*M queries.

    Previously: N products × (1 PPEProduct query + 1 subquery + M items × 2 rule queries).
    Now: 1 rules query + 1 products query + 1 items query with prefetch = done.
    """
    now_dt = timezone.now()
    deadline = now_dt + dt.timedelta(days=due_days)

    # Query 1: all renewal rules — prefetch into memory
    rules_by_key = {}
    for rule in PositionPPERenewalRule.objects.only(
        'department_service_id', 'position_key', 'ppeproduct_id', 'renewal_months'
    ):
        key = (rule.department_service_id, rule.position_key, rule.ppeproduct_id)
        rules_by_key[key] = int(rule.renewal_months or 0)

    # Query 2: all active products
    products = list(PPEProduct.objects.filter(is_active=True).order_by('name'))
    active_product_ids = {p.id for p in products}
    product_default_months = {p.id: int(p.renewal_months or 0) for p in products}

    def _renewal_months(product_id, dept_id, pos_key):
        """O(1) lookup — no DB query."""
        if pos_key:
            if dept_id is not None:
                v = rules_by_key.get((dept_id, pos_key, product_id))
                if v is not None:
                    return v
            v = rules_by_key.get((None, pos_key, product_id))
            if v is not None:
                return v
        return product_default_months.get(product_id, 0)

    def _parse_snapshot(item):
        snapshot = item.employee_snapshot or {}
        dept = snapshot.get('department') or {}
        try:
            dept_id = int(dept.get('id') or 0) or None
        except (TypeError, ValueError):
            dept_id = None
        pos_key = normalize_employee_position(snapshot.get('position', ''))
        return dept_id, pos_key

    # Query 3: all non-deleted items + prefetch products (2 SQL queries total)
    all_items = list(
        Item.objects
        .filter(is_deleted=False)
        .prefetch_related('ppeproduct')
        .only('id', 'employee_service_id', 'issued_at', 'employee_snapshot')
        .order_by('employee_service_id', '-issued_at', '-id')
    )

    # Single pass: build latest-item maps
    latest_by_emp_product = {}  # (emp_id, prod_id) → latest item for due-soon
    latest_by_emp = {}          # emp_id → globally latest item for overdue

    for item in all_items:
        if not item.issued_at:
            continue
        emp_id = item.employee_service_id
        if emp_id not in latest_by_emp:
            latest_by_emp[emp_id] = item
        for product in item.ppeproduct.all():  # uses prefetch cache, no extra query
            if product.id not in active_product_ids:
                continue
            key = (emp_id, product.id)
            if key not in latest_by_emp_product:
                latest_by_emp_product[key] = item

    # Compute due-soon counts per product
    product_due_counts = {}
    for (emp_id, prod_id), item in latest_by_emp_product.items():
        dept_id, pos_key = _parse_snapshot(item)
        months = _renewal_months(prod_id, dept_id, pos_key)
        if months <= 0:
            continue
        due_date = add_calendar_months(item.issued_at, months)
        if now_dt <= due_date < deadline:
            product_due_counts[prod_id] = product_due_counts.get(prod_id, 0) + 1

    # Compute overdue count
    overdue_count = 0
    for emp_id, item in latest_by_emp.items():
        if not item.issued_at:
            continue
        dept_id, pos_key = _parse_snapshot(item)
        for product in item.ppeproduct.all():  # uses prefetch cache
            if product.id not in active_product_ids:
                continue
            months = _renewal_months(product.id, dept_id, pos_key)
            if months <= 0:
                continue
            if add_calendar_months(item.issued_at, months) < now_dt:
                overdue_count += 1
                break

    return products, product_due_counts, overdue_count


class InfoEmployeeApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    @staticmethod
    def get(request, *args, **kwargs):
        try:
            employees_payload = list_employees_bootstrapped(no_pagination=False, page=1, page_size=1)
            if isinstance(employees_payload, dict):
                all_employees_count = int(employees_payload.get('count', 0) or 0)
            else:
                all_employees_count = len(extract_employee_results(employees_payload))
        except EmployeeServiceClientError:
            all_employees_count = Employee.objects.filter(is_deleted=False).count()

        raw_due_days = request.query_params.get('due_days', '30')
        try:
            due_days = int(raw_due_days)
        except (TypeError, ValueError):
            due_days = 30
        due_days = max(1, due_days)

        products, product_due_counts, overdue_count = _compute_info_employee_counts(due_days)

        ppe_product_name = request.query_params.get('ppe_product_name', '')
        due_spez_count = 0
        if ppe_product_name:
            spez = next((p for p in products if p.name.lower() == ppe_product_name.lower()), None)
            if spez:
                due_spez_count = product_due_counts.get(spez.id, 0)

        due_products = [
            {"id": p.id, "name": p.name, "due_count": product_due_counts.get(p.id, 0)}
            for p in products
        ]
        due_counts = {p.name: product_due_counts.get(p.id, 0) for p in products}

        return Response({
            "due_days": due_days,
            "all_employee_count": all_employees_count,
            "all_active_employee_count": due_spez_count,
            "due_spez_item_count": due_spez_count,
            "due_product_counts": due_counts,
            "due_products": due_products,
            "overdue_count": overdue_count,
            "all_compyuters_count": all_employees_count,
            "all_worked_compyuters_count": due_spez_count,
        })


class DueSoonEmployeePPEApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    @staticmethod
    def get(request, *args, **kwargs):
        permission_error = ensure_can_view_dashboard_due_cards(request)
        if permission_error:
            return permission_error

        raw_due_days = request.query_params.get('due_days', '30')
        try:
            due_days = int(raw_due_days)
        except (TypeError, ValueError):
            due_days = 30
        due_days = max(1, due_days)

        raw_product_id = request.query_params.get('product_id')
        try:
            product_id = int(raw_product_id) if raw_product_id not in [None, ''] else None
        except (TypeError, ValueError):
            product_id = None

        search = str(request.query_params.get('search', '')).strip()

        all_rows = get_due_soon_employee_ppe_rows(days=due_days)
        product_counts = {}
        for row in all_rows:
            current = product_counts.get(row['product_id'])
            if current is None:
                product_counts[row['product_id']] = {
                    'id': row['product_id'],
                    'name': row['product_name'],
                    'due_count': 1,
                }
            else:
                current['due_count'] += 1

        filtered_rows = filter_due_soon_employee_ppe_rows(
            all_rows,
            product_id=product_id,
            search=search,
        )

        products = sorted(product_counts.values(), key=lambda product: product['name'].lower())

        return Response({
            'due_days': due_days,
            'selected_product_id': product_id,
            'search': search,
            'total_count': len(filtered_rows),
            'products': products,
            'results': filtered_rows,
        })


class EmployeeImportExcelApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _cell_value(row, key, default=''):
        value = row.get(key, default)
        if pd.isna(value):
            return default
        return value

    @staticmethod
    def _cell_str(row, key, default=''):
        value = EmployeeImportExcelApiView._cell_value(row, key, default)
        return str(value).strip()

    @staticmethod
    def _cell_date(row, key):
        value = EmployeeImportExcelApiView._cell_value(row, key, None)
        if value in [None, '']:
            return None

        parsed = pd.to_datetime(value, errors='coerce')
        if pd.isna(parsed):
            return None
        return parsed.date()

    @staticmethod
    def post(request, *args, **kwargs):
        permission_error = ensure_can_manage_employees(request)
        if permission_error:
            return permission_error

        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'Excel fayl topilmadi (file).'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            dataframe = pd.read_excel(file_obj)
        except Exception as exc:
            return Response({'error': f'Excel faylni o\'qib bo\'lmadi: {exc}'}, status=status.HTTP_400_BAD_REQUEST)

        required_columns = [
            'Фамилия',
            'Имя',
            'Отчество',
            'Табельный номер',
            'Пол',
            'Рост',
            'Размер одежды',
            'Размер обуви',
            'Цех',
            'Отдел',
            'Должность',
            'Дата приема на работу',
            'Дата последнего изменения должности',
        ]

        missing_columns = [column for column in required_columns if column not in dataframe.columns]
        if missing_columns:
            return Response(
                {'error': f'Majburiy ustunlar topilmadi: {", ".join(missing_columns)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        created_count = 0
        updated_count = 0
        skipped_count = 0
        row_errors = []

        for index, row in dataframe.iterrows():
            row_number = index + 2
            try:
                tabel_number = EmployeeImportExcelApiView._cell_str(row, 'Табельный номер')
                if not tabel_number:
                    skipped_count += 1
                    continue

                last_name = EmployeeImportExcelApiView._cell_str(row, 'Фамилия')
                first_name = EmployeeImportExcelApiView._cell_str(row, 'Имя')
                surname = EmployeeImportExcelApiView._cell_str(row, 'Отчество')

                gender_raw = EmployeeImportExcelApiView._cell_str(row, 'Пол').upper()
                if gender_raw in ['M', 'М', 'МУЖ', 'МУЖСКОЙ', 'MALE']:
                    gender_value = 'M'
                elif gender_raw in ['F', 'Ж', 'ЖЕН', 'ЖЕНСКИЙ', 'FEMALE']:
                    gender_value = 'F'
                else:
                    gender_value = 'M'

                department_name = EmployeeImportExcelApiView._cell_str(row, 'Цех')
                section_name = EmployeeImportExcelApiView._cell_str(row, 'Отдел')
                boss_full_name = EmployeeImportExcelApiView._cell_str(row, 'Руководитель цеха', '-')

                if not department_name or not section_name:
                    raise ValueError('Ustunlar "Цех" va "Отдел" bo\'sh bo\'lmasligi kerak')

                payload = {
                    'source_system': 'tb-project',
                    'first_name': first_name,
                    'last_name': last_name,
                    'surname': surname,
                    'tabel_number': tabel_number,
                    'gender': gender_value,
                    'height': EmployeeImportExcelApiView._cell_str(row, 'Рост'),
                    'clothe_size': EmployeeImportExcelApiView._cell_str(row, 'Размер одежды'),
                    'shoe_size': EmployeeImportExcelApiView._cell_str(row, 'Размер обуви'),
                    'position': EmployeeImportExcelApiView._cell_str(row, 'Должность'),
                    'date_of_employment': EmployeeImportExcelApiView._cell_date(row, 'Дата приема на работу'),
                    'date_of_change_position': EmployeeImportExcelApiView._cell_date(row, 'Дата последнего изменения должности'),
                    'department_name': department_name,
                    'section_name': section_name,
                    'boss_full_name': boss_full_name,
                    'is_deleted': 'false',
                    'is_active': 'true',
                }

                employee_exists = bool(extract_employee_results(list_employees_bootstrapped(tabel_number=tabel_number)))
                upsert_employee_payload(payload)
                if employee_exists:
                    updated_count += 1
                else:
                    created_count += 1

            except Exception as exc:
                row_errors.append(f'Qator {row_number}: {exc}')

        return Response({
            'created': created_count,
            'updated': updated_count,
            'skipped': skipped_count,
            'errors': row_errors,
            'message': f'Import yakunlandi. Yangi: {created_count}, Yangilandi: {updated_count}, O\'tkazib yuborildi: {skipped_count}',
        })


class EmployeeFaceVerifyApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    @staticmethod
    def post(request, *args, **kwargs):
        permission_error = ensure_can_modify(request)
        if permission_error:
            return permission_error

        if is_employee_service_enabled():
            try:
                employee_service_slug = resolve_employee_service_slug(kwargs.get('slug'))
                return Response(verify_employee_face_remote(employee_service_slug, request.data), status=status.HTTP_200_OK)
            except EmployeeServiceClientError as exc:
                if not should_fallback_from_employee_service_error(exc):
                    return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        slug = kwargs.get('slug')
        if not slug:
            return Response({"error": "Slug not found"}, status=status.HTTP_400_BAD_REQUEST)

        employee = resolve_employee_from_slug(slug)
        if not employee:
            return Response({"error": "Сотрудник не найден"}, status=status.HTTP_404_NOT_FOUND)

        reference_image, reference_error = load_employee_reference_image(employee)
        if reference_image is None:
            return Response(
                {"error": reference_error or "Сотрудник не имеет базового изображения для сравнения"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        captured_payloads = []
        captured_image_payload = request.data.get('captured_image')
        if captured_image_payload:
            captured_payloads.append(captured_image_payload)

        captured_images_payload = request.data.get('captured_images')
        if isinstance(captured_images_payload, list):
            captured_payloads.extend(captured_images_payload)

        captured_payloads = [payload for payload in captured_payloads if payload][:5]
        if not captured_payloads:
            return Response({"error": "captured_image не отправлено"}, status=status.HTTP_400_BAD_REQUEST)

        captured_images = []
        for payload in captured_payloads:
            image = decode_image_to_pil(payload)
            if image is not None:
                captured_images.append(image)

        if not captured_images:
            return Response({"error": "Не удалось прочитать формат изображения с камеры"}, status=status.HTTP_400_BAD_REQUEST)

        threshold = 72.0
        similarities = []
        for image in captured_images:
            try:
                similarities.append(calculate_face_similarity(reference_image, image))
            except ValueError:
                continue

        if not similarities:
            return Response({"error": "Лицо не обнаружено на видеозаписи с камеры."}, status=status.HTTP_400_BAD_REQUEST)

        similarity = max(similarities)

        verified = similarity >= threshold

        return Response({
            "verified": verified,
            "similarity": round(similarity, 2),
            "samples": len(similarities),
            "threshold": threshold,
            "message": "Сотрудник подтвержден" if verified else "Сотрудник не подтвержден",
        })


class EmployeeFaceDetectBoxesApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    @staticmethod
    def post(request, *args, **kwargs):
        permission_error = ensure_can_modify(request)
        if permission_error:
            return permission_error

        if is_employee_service_enabled():
            try:
                return Response(detect_face_boxes_remote(request.data), status=status.HTTP_200_OK)
            except EmployeeServiceClientError as exc:
                if not should_fallback_from_employee_service_error(exc):
                    return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        captured_image_payload = request.data.get('captured_image')
        if not captured_image_payload:
            return Response({"error": "captured_image не отправлено"}, status=status.HTTP_400_BAD_REQUEST)

        captured_image = decode_image_to_pil(captured_image_payload)
        if captured_image is None:
            return Response({"error": "Не удалось прочитать формат изображения с камеры"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            boxes = detect_face_boxes(captured_image)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'boxes': boxes,
            'count': len(boxes),
        })


class FilterDataApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    @staticmethod
    def get(request, *args, **kwargs):
        products = PPEProduct.objects.filter(is_active=True).order_by('name')
        return Response({
            'ppeproducts': [
                {
                    'id': product.id,
                    'name': product.name,
                }
                for product in products
            ]
        }, status=status.HTTP_200_OK)

    @staticmethod
    def post(request, *args, **kwargs):

        key = request.data.get('key')
        ppe_product_name = request.data.get('ppe_product_name', 'Spez odejda')
        raw_due_days = request.data.get('due_days', 30)
        try:
            due_days = int(raw_due_days)
        except (TypeError, ValueError):
            due_days = 30
        due_days = max(1, due_days)

        raw_product_id = request.data.get('ppe_product_id')
        try:
            ppe_product_id = int(raw_product_id) if raw_product_id not in [None, ''] else None
        except (TypeError, ValueError):
            ppe_product_id = None

        base_items_qs = (
            Item.objects
            .filter(is_deleted=False)
            .select_related('issued_by')
            .prefetch_related('ppeproduct')
            .distinct()
        )

        latest_item_subquery = (
            Item.objects
            .filter(employee_service_id=OuterRef('employee_service_id'), is_deleted=False)
            .order_by('-issued_at', '-id')
            .values('id')[:1]
        )

        items_qs = base_items_qs.annotate(
            _latest_item_id=Subquery(latest_item_subquery)
        ).filter(id=F('_latest_item_id'))

        if key == "Все сотрудники":
            employees = [build_employee_snapshot(employee) for employee in extract_employee_results(list_employees_bootstrapped())]
            latest_items = list(items_qs.order_by('-issued_at', '-id'))
            attach_employee_snapshots(latest_items)
            latest_item_by_slug = {
                str(item.employee_slug).strip(): item
                for item in latest_items
                if str(item.employee_slug or '').strip()
            }
            latest_item_by_employee = {
                str(item.employee_service_id): item
                for item in latest_items
                if str(item.employee_service_id or '').strip()
            }
            for employee in employees:
                latest_item = latest_item_by_slug.get(get_employee_lookup_slug(employee))
                if latest_item is None:
                    latest_item = latest_item_by_employee.get(get_employee_service_reference(employee))
                employee['latest_item_id'] = latest_item.id if latest_item else None
            return Response(build_employee_table_rows(employees))

        elif key == "overdue":
            overdue_item_ids = get_overdue_product_latest_item_ids(product_id=None)
            items = base_items_qs.filter(id__in=overdue_item_ids).distinct()

        elif key:
            due_item_ids = get_due_soon_product_latest_item_ids(
                days=due_days,
                product_name=ppe_product_name,
                product_id=ppe_product_id,
            )
            items = base_items_qs.filter(id__in=due_item_ids).distinct()

        # elif key == "Принтеры":
        #     computers = base_qs.filter(printer__isnull=False).exclude(printer__name="Нет").distinct()

        # elif key == "Сканеры":
        #     computers = base_qs.filter(scaner__isnull=False).exclude(scaner__name="Нет").distinct()

        # elif key == "МФУ":
        #     computers = base_qs.filter(mfo__isnull=False).exclude(mfo__name="Нет").distinct()

        # elif key == "Интернет":
        #     computers = base_qs.filter(internet=True).distinct()

        # elif key == "Нет интернета":
        #     computers = base_qs.filter(internet=False).distinct()

        # elif key == "Веб-камеры":
        #     computers = base_qs.filter(type_webcamera__isnull=False).exclude(
        #         type_webcamera__name="Нет").distinct()

        else:
            return Response({"error": "Invalid key value"}, status=400)

        items = list(items.order_by('-issued_at', '-id'))
        attach_employee_snapshots(items)
        serializer = ItemSerializer(items, many=True)

        return Response(serializer.data)




class AllItemsApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    pagination_class = ItemsPagination

    def get(self, request, *args, **kwargs):
        employee_id = request.GET.get('employee_id')
        include_issue_history = request.GET.get('include_issue_history', '').lower() == 'true'
        serializer_context = {'include_issue_history': True} if include_issue_history else {}

        department_id_raw = str(request.GET.get('department_id', '')).strip()
        try:
            department_id = int(department_id_raw) if department_id_raw else None
        except (TypeError, ValueError):
            department_id = None
        department = str(request.GET.get('department', '')).strip().lower()
        section = str(request.GET.get('section', '')).strip().lower()
        tabel_number = str(request.GET.get('tabel_number', '')).strip().lower()
        user = str(request.GET.get('user', '')).strip().lower()
        position = str(request.GET.get('position', '')).strip().lower()
        search = request.GET.get('search', '').strip().lower()
        history_date = request.GET.get('history_date')
        history_user = str(request.GET.get('history_user', '')).strip().lower()
        issued_at = request.GET.get('issued_at')

        latest_item_history = (
            Item.history.model.objects
            .filter(id=OuterRef('pk'))
            .order_by('-history_date', '-history_id')
        )

        if employee_id:
            queryset = (
                Item.objects
                .filter(is_deleted=False, employee_service_id=employee_id)
                .annotate(
                    latest_history_date=Subquery(latest_item_history.values('history_date')[:1]),
                    latest_history_user=Subquery(latest_item_history.values('history_user__username')[:1]),
                )
                .select_related('issued_by')
                .prefetch_related('ppeproduct')
                .order_by('-issued_at', '-id')
            )
            items = list(queryset)
            attach_employee_snapshots(items)
            rows = ItemSerializer(items, many=True, context=serializer_context).data

            if department_id is not None:
                rows = [
                    row for row in rows
                    if str((((row.get('employee') or {}).get('department') or {}).get('id') or '')).strip() == str(department_id)
                ]
            if department:
                rows = [row for row in rows if department in str(((row.get('employee') or {}).get('department') or {}).get('name') or '').lower()]
            if section:
                rows = [row for row in rows if section in str(((row.get('employee') or {}).get('section') or {}).get('name') or '').lower()]
            if tabel_number:
                rows = [row for row in rows if tabel_number in str((row.get('employee') or {}).get('tabel_number') or '').lower()]
            if user:
                rows = [
                    row for row in rows
                    if user in ' '.join([
                        str((row.get('employee') or {}).get('last_name') or ''),
                        str((row.get('employee') or {}).get('first_name') or ''),
                        str((row.get('employee') or {}).get('surname') or ''),
                    ]).lower()
                ]
            if position:
                rows = [row for row in rows if position in str((row.get('employee') or {}).get('position') or '').lower()]
            if search:
                filtered_rows = []
                for row in rows:
                    employee = row.get('employee') or {}
                    haystack = ' '.join([
                        str(((employee.get('department') or {}).get('name')) or ''),
                        str(((employee.get('section') or {}).get('name')) or ''),
                        str(employee.get('first_name') or ''),
                        str(employee.get('last_name') or ''),
                        str(employee.get('surname') or ''),
                        str(employee.get('tabel_number') or ''),
                        str(employee.get('position') or ''),
                    ]).lower()
                    if search in haystack:
                        filtered_rows.append(row)
                rows = filtered_rows
            if history_date:
                rows = [row for row in rows if str(row.get('history_date') or '').startswith(history_date)]
            if history_user:
                rows = [row for row in rows if history_user in str(row.get('history_user') or '').lower()]

            no_pagination = request.GET.get('no_pagination', '').lower() == 'true'
            if no_pagination:
                return Response(rows)

            paginator = self.pagination_class()
            result_page = paginator.paginate_queryset(rows, request)
            return paginator.get_paginated_response(result_page)

        no_pagination = request.GET.get('no_pagination', '').lower() == 'true'
        page = request.GET.get('page')
        page_size = request.GET.get('page_size')
        user_name_only_search = bool(user) and not any([search, department, section, position, history_date, history_user, issued_at])
        remote_only_filters = not any([department, section, user, position, history_date, history_user, issued_at])

        if (remote_only_filters or user_name_only_search) and not no_pagination:
            employees_payload = list_employees_bootstrapped(
            search=user if user_name_only_search else (search or None),
                tabel_number=tabel_number or None,
                department_id=department_id,
                no_pagination=False,
                page=page,
                page_size=page_size,
            )
            employee_rows = [build_employee_snapshot(employee) for employee in extract_employee_results(employees_payload)]
            total_count = int((employees_payload or {}).get('count', len(employee_rows))) if isinstance(employees_payload, dict) else len(employee_rows)

            employee_service_ids = [
                str(employee.get('external_id') or employee.get('id'))
                for employee in employee_rows
                if str(employee.get('external_id') or employee.get('id')).strip()
            ]
            latest_items = []
            latest_item_by_employee = {}
            if employee_service_ids:
                latest_item_base = (
                    Item.objects
                    .filter(employee_service_id=OuterRef('employee_service_id'), is_deleted=False)
                    .order_by('-issued_at', '-id')
                )
                latest_items_queryset = (
                    Item.objects
                    .filter(is_deleted=False, employee_service_id__in=employee_service_ids)
                    .annotate(_latest_item_id=Subquery(latest_item_base.values('id')[:1]))
                    .filter(id=F('_latest_item_id'))
                    .annotate(
                        latest_history_date=Subquery(latest_item_history.values('history_date')[:1]),
                        latest_history_user=Subquery(latest_item_history.values('history_user__username')[:1]),
                    )
                    .select_related('issued_by')
                    .prefetch_related('ppeproduct')
                )
                latest_items = list(latest_items_queryset)
                attach_employee_snapshots(latest_items)
                latest_item_by_employee = {str(item.employee_service_id): item for item in latest_items}

            enriched_employees = []
            for employee in employee_rows:
                employee_copy = dict(employee)
                latest_item = latest_item_by_employee.get(str(employee_copy.get('external_id') or employee_copy.get('id')))
                employee_copy['latest_item_id'] = latest_item.id if latest_item else None
                employee_copy['latest_item_issued_at'] = latest_item.issued_at if latest_item else None
                employee_copy['history_date'] = employee_copy.get('history_date') or (getattr(latest_item, 'latest_history_date', None) if latest_item else None)
                employee_copy['history_user'] = employee_copy.get('history_user') or (getattr(latest_item, 'latest_history_user', None) if latest_item else None)
                enriched_employees.append(employee_copy)

            rows = build_employee_table_rows(enriched_employees, include_issue_history=include_issue_history)
            return Response({
                'count': total_count,
                'next': employees_payload.get('next') if isinstance(employees_payload, dict) else None,
                'previous': employees_payload.get('previous') if isinstance(employees_payload, dict) else None,
                'results': rows,
            })

        employees_payload = list_employees_bootstrapped(
            search=search or None,
            tabel_number=tabel_number or None,
            department_id=department_id,
        )
        employee_rows = [build_employee_snapshot(employee) for employee in extract_employee_results(employees_payload)]

        if department_id is not None:
            employee_rows = [
                employee for employee in employee_rows
                if str(((employee.get('department') or {}).get('id') or '')).strip() == str(department_id)
            ]

        if department:
            employee_rows = [
                employee for employee in employee_rows
                if department in str((employee.get('department') or {}).get('name') or '').lower()
            ]

        if section:
            employee_rows = [
                employee for employee in employee_rows
                if section in str((employee.get('section') or {}).get('name') or '').lower()
            ]

        if user:
            employee_rows = [
                employee for employee in employee_rows
                if user in ' '.join([
                    str(employee.get('last_name') or ''),
                    str(employee.get('first_name') or ''),
                    str(employee.get('surname') or ''),
                ]).lower()
            ]

        if position:
            employee_rows = [
                employee for employee in employee_rows
                if position in str(employee.get('position') or '').lower()
            ]

        latest_item_base = (
            Item.objects
            .filter(employee_service_id=OuterRef('employee_service_id'), is_deleted=False)
            .order_by('-issued_at', '-id')
        )
        latest_items_queryset = (
            Item.objects
            .filter(is_deleted=False, employee_service_id__isnull=False)
            .annotate(_latest_item_id=Subquery(latest_item_base.values('id')[:1]))
            .filter(id=F('_latest_item_id'))
            .annotate(
                latest_history_date=Subquery(latest_item_history.values('history_date')[:1]),
                latest_history_user=Subquery(latest_item_history.values('history_user__username')[:1]),
            )
            .select_related('issued_by')
            .prefetch_related('ppeproduct')
        )
        latest_items = list(latest_items_queryset)
        attach_employee_snapshots(latest_items)
        latest_item_by_employee = {str(item.employee_service_id): item for item in latest_items}

        enriched_employees = []
        for employee in employee_rows:
            employee_copy = dict(employee)
            latest_item = latest_item_by_employee.get(str(employee_copy.get('external_id') or employee_copy.get('id')))
            employee_copy['latest_item_id'] = latest_item.id if latest_item else None
            employee_copy['latest_item_issued_at'] = latest_item.issued_at if latest_item else None
            employee_copy['history_date'] = employee_copy.get('history_date') or (getattr(latest_item, 'latest_history_date', None) if latest_item else None)
            employee_copy['history_user'] = employee_copy.get('history_user') or (getattr(latest_item, 'latest_history_user', None) if latest_item else None)
            enriched_employees.append(employee_copy)

        if issued_at:
            enriched_employees = [
                employee for employee in enriched_employees
                if employee.get('latest_item_issued_at') and str(employee.get('latest_item_issued_at')).startswith(issued_at)
            ]

        if history_date:
            enriched_employees = [
                employee for employee in enriched_employees
                if str(employee.get('history_date') or '').startswith(history_date)
            ]

        if history_user:
            enriched_employees = [
                employee for employee in enriched_employees
                if history_user in str(employee.get('history_user') or '').lower()
            ]

        if no_pagination:
            return Response(build_employee_table_rows(enriched_employees, include_issue_history=include_issue_history))

        paginator = self.pagination_class()
        result_page = paginator.paginate_queryset(enriched_employees, request)
        rows = build_employee_table_rows(result_page)

        return paginator.get_paginated_response(rows)


class DailyIssuedItemsApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        issued_at_raw = str(request.GET.get('issued_at') or request.GET.get('date') or '').strip()
        from_date_raw = str(request.GET.get('from_date') or '').strip()
        to_date_raw = str(request.GET.get('to_date') or '').strip()
        tabel_number = str(request.GET.get('tabel_number') or '').strip()
        product_name = str(request.GET.get('product_name') or '').strip()
        no_pagination = str(request.GET.get('no_pagination') or '').strip().lower() == 'true'

        try:
            page = max(1, int(request.GET.get('page', 1)))
        except (TypeError, ValueError):
            page = 1
        try:
            page_size = min(200, max(10, int(request.GET.get('page_size', 25))))
        except (TypeError, ValueError):
            page_size = 25

        qs = Item.objects.filter(is_deleted=False)

        if issued_at_raw:
            target_date = parse_date(issued_at_raw)
            if target_date is None:
                return Response({'error': 'Дата указана некорректно.'}, status=status.HTTP_400_BAD_REQUEST)
            qs = qs.filter(issued_at__date=target_date)
        elif from_date_raw or to_date_raw:
            if from_date_raw:
                from_date = parse_date(from_date_raw)
                if from_date is None:
                    return Response({'error': 'from_date указана некорректно.'}, status=status.HTTP_400_BAD_REQUEST)
                qs = qs.filter(issued_at__date__gte=from_date)
            if to_date_raw:
                to_date = parse_date(to_date_raw)
                if to_date is None:
                    return Response({'error': 'to_date указана некорректно.'}, status=status.HTTP_400_BAD_REQUEST)
                qs = qs.filter(issued_at__date__lte=to_date)

        if tabel_number:
            qs = qs.filter(employee_snapshot__tabel_number__icontains=tabel_number)

        if product_name:
            qs = qs.filter(ppeproduct__name__icontains=product_name)

        total_count = qs.count()

        confirmed_pending_prefetch = Prefetch(
            'pending_source',
            queryset=PendingItemIssue.objects.filter(
                status=PendingItemIssue.STATUS_CONFIRMED
            ).order_by('-confirmed_at'),
            to_attr='_confirmed_pending',
        )

        base_qs = (
            qs
            .prefetch_related('ppeproduct', confirmed_pending_prefetch)
            .only('id', 'issued_at', 'employee_snapshot', 'ppe_sizes')
            .order_by('-issued_at', '-id')
            .distinct()
        )

        if no_pagination:
            items = list(base_qs)
        else:
            offset = (page - 1) * page_size
            items = list(base_qs[offset:offset + page_size])

        rows = []
        for item in items:
            emp = build_employee_snapshot(item.employee_snapshot)

            size_map = item.ppe_sizes or {}
            ppeproduct_info = [
                {
                    'id': p.id,
                    'name': p.name,
                    'size': size_map.get(str(p.id), ''),
                    'type_product_display': p.get_type_product_display() if p.type_product else None,
                }
                for p in item.ppeproduct.all()
            ]

            pending_obj = item._confirmed_pending[0] if item._confirmed_pending else None
            signature_url = None
            qr_code_image_url = None
            qr_scan_url = None
            if pending_obj is not None:
                if pending_obj.signature_image:
                    try:
                        signature_url = pending_obj.signature_image.url
                    except Exception:
                        signature_url = None
                if pending_obj.qr_code_image:
                    try:
                        qr_code_image_url = pending_obj.qr_code_image.url
                    except Exception:
                        qr_code_image_url = None
                qr_frontend_path = pending_obj.get_qr_frontend_path()
                if qr_frontend_path:
                    try:
                        qr_scan_url = request.build_absolute_uri(qr_frontend_path)
                    except Exception:
                        qr_scan_url = qr_frontend_path

            rows.append({
                'id': item.id,
                'issued_at': item.issued_at.isoformat() if item.issued_at else None,
                'employee': emp,
                'ppeproduct_info': ppeproduct_info,
                'signature_image': signature_url,
                'qr_code_image': qr_code_image_url,
                'qr_scan_url': qr_scan_url,
            })

        return Response({'count': total_count, 'results': rows})


class ItemHistoryUsersApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        users = (
            Item.history.model.objects
            .exclude(history_user__isnull=True)
            .exclude(history_user__username__exact='')
            .values_list('history_user__username', flat=True)
            .distinct()
            .order_by(Lower('history_user__username'))
        )
        return Response({"users": list(users)})


class ItemDetailApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    @staticmethod
    def get(request, *args, **kwargs):
        slug = kwargs.get('slug')
        if not slug:
            return Response({"error": "Slug not found"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            item = Item.objects.select_related('issued_by').prefetch_related(
                'ppeproduct'
            ).get(slug=slug, is_deleted=False)
            attach_employee_snapshots([item])
            serializer = ItemSerializer(item, context={'include_ppe_split': True, 'include_issue_history': True, 'request': request})
            payload = serializer.data
        except Item.DoesNotExist:
            employee = fetch_employee_by_slug_or_404(slug)
            if not employee:
                return Response({"error": "Slug bo'yicha ma'lumot topilmadi"}, status=status.HTTP_404_NOT_FOUND)

            latest_item = (
                get_employee_items_queryset(employee)
                .select_related('issued_by')
                .prefetch_related('ppeproduct')
                .order_by('-issued_at', '-id')
                .first()
            )
            if latest_item:
                attach_employee_snapshots([latest_item])
                serializer = ItemSerializer(latest_item, context={'include_ppe_split': True, 'include_issue_history': True, 'request': request})
                payload = serializer.data
            else:
                payload = build_employee_only_item_payload(employee)
        try:
            departments = sorted(
                [normalize_department_payload(item) for item in extract_service_results(list_departments())],
                key=department_sort_key,
            )
            sections = sorted(
                [normalize_section_payload(item) for item in extract_service_results(list_sections())],
                key=lambda item: (item.get('name') or '').lower(),
            )
        except EmployeeServiceClientError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        responsible_persons = ResponsiblePerson.objects.all().order_by('id')
        employee_payload = payload.get('employee') or {}
        ppe_products = filter_ppe_products_for_employee_gender(
            PPEProduct.objects.filter(is_active=True).order_by('name'),
            employee_payload,
        )
        ppe_products_payload = []
        for product in ppe_products:
            if not is_product_allowed_for_employee(product, employee_payload):
                continue
            ppe_products_payload.append({
                "id": product.id,
                "name": product.name,
                "type_product": product.type_product,
                "renewal_months": get_effective_product_renewal_months(product, employee_payload),
            })

        return Response({
            **payload,
            "departments": departments,
            "sections": [
                {
                    "id": section.get('id'),
                    "name": section.get('name', ''),
                    "department_id": section.get('department'),
                }
                for section in sections
            ],
            "responsible_persons": [
                {
                    "id": person.id,
                    "full_name": person.full_name,
                    "position": person.position,
                }
                for person in responsible_persons
            ],
            "ppe_products": ppe_products_payload,
        })


class ItemHistoryCreateApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _parse_issued_at_or_error(issued_at_raw):
        raw_value = str(issued_at_raw or '').strip()
        if not raw_value:
            return None, Response({"error": "Дата выдачи обязательна."}, status=status.HTTP_400_BAD_REQUEST)

        issued_at = parse_datetime(raw_value)
        if issued_at is None:
            issued_date = parse_date(raw_value)
            if issued_date is None:
                try:
                    issued_date = datetime.datetime.strptime(raw_value, '%d/%m/%Y').date()
                except ValueError:
                    issued_date = None
            if issued_date is None:
                return None, Response({"error": "Дата указана некорректно. Используйте формат dd/mm/yyyy."}, status=status.HTTP_400_BAD_REQUEST)
            issued_at = datetime.datetime.combine(issued_date, datetime.time.min)

        if timezone.is_naive(issued_at):
            issued_at = timezone.make_aware(issued_at, timezone.get_current_timezone())

        return issued_at, None

    @staticmethod
    def post(request, *args, **kwargs):
        permission_error = ensure_can_add_issue_history(request)
        if permission_error:
            return permission_error

        slug = kwargs.get('slug')
        if not slug:
            return Response({"error": "Slug not found"}, status=status.HTTP_400_BAD_REQUEST)

        source_item = Item.objects.filter(slug=slug, is_deleted=False).first()
        source_employee = None
        if source_item:
            attach_employee_snapshots([source_item])
            source_employee = build_employee_snapshot(
                getattr(source_item, '_employee_snapshot_override', None) or source_item.employee_snapshot
            )

        if source_employee is None:
            source_employee = fetch_employee_by_slug_or_404(slug)

        if source_employee is None:
            return Response({"error": "Slug bo'yicha ma'lumot topilmadi"}, status=status.HTTP_404_NOT_FOUND)

        raw_product_entries = request.data.get('product_entries')
        product_entries = []
        seen_product_ids = set()

        if raw_product_entries is not None:
            if not isinstance(raw_product_entries, list):
                return Response({"error": "product_entries list bo'lishi kerak"}, status=status.HTTP_400_BAD_REQUEST)

            for raw_entry in raw_product_entries:
                if not isinstance(raw_entry, dict):
                    continue

                try:
                    product_id = int(raw_entry.get('product_id'))
                except (TypeError, ValueError):
                    continue

                if product_id in seen_product_ids:
                    continue

                issued_at, parse_error = ItemHistoryCreateApiView._parse_issued_at_or_error(raw_entry.get('issued_at'))
                if parse_error:
                    return parse_error

                seen_product_ids.add(product_id)
                product_entries.append({
                    'product_id': product_id,
                    'issued_at': issued_at,
                })
        else:
            raw_product_ids = request.data.get('ppeproduct', [])
            if not isinstance(raw_product_ids, list):
                return Response({"error": "ppeproduct list bo'lishi kerak"}, status=status.HTTP_400_BAD_REQUEST)

            issued_at, parse_error = ItemHistoryCreateApiView._parse_issued_at_or_error(request.data.get('issued_at'))
            if parse_error:
                return parse_error

            for raw_id in raw_product_ids:
                try:
                    product_id = int(raw_id)
                except (TypeError, ValueError):
                    continue
                if product_id in seen_product_ids:
                    continue
                seen_product_ids.add(product_id)
                product_entries.append({
                    'product_id': product_id,
                    'issued_at': issued_at,
                })

        if not product_entries:
            return Response({"error": "Kamida bitta Средство защиты tanlang"}, status=status.HTTP_400_BAD_REQUEST)

        product_ids = [entry['product_id'] for entry in product_entries]

        products = list(PPEProduct.objects.filter(id__in=product_ids, is_active=True))
        if len(products) != len(product_ids):
            return Response({"error": "Часть выбранных СИЗ не найдена."}, status=status.HTTP_400_BAD_REQUEST)
        products_by_id = {product.id: product for product in products}

        employee_gender = get_employee_gender_code(source_employee)
        incompatible_products = []
        disallowed_products = []

        for product in products:
            if not is_product_allowed_for_employee(product, source_employee):
                disallowed_products.append(product.name)
                continue

            if employee_gender:
                target_gender = str(product.target_gender or PPEProduct.TARGET_GENDER_ALL).strip().upper()
                if target_gender not in {PPEProduct.TARGET_GENDER_ALL, employee_gender}:
                    incompatible_products.append(product.name)

        if disallowed_products:
            return Response(
                {
                    "error": "Выбраны СИЗ, не разрешённые для должности сотрудника: " + ", ".join(disallowed_products),
                    "products": disallowed_products,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if incompatible_products:
            return Response(
                {
                    "error": "Выбраны СИЗ, не подходящие по полу сотрудника: " + ", ".join(incompatible_products),
                    "products": incompatible_products,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        raw_sizes = request.data.get('ppe_sizes', {})
        if raw_sizes is None:
            raw_sizes = {}
        if not isinstance(raw_sizes, dict):
            return Response({"error": "ppe_sizes object bo'lishi kerak"}, status=status.HTTP_400_BAD_REQUEST)

        selected_product_ids = {str(product.id) for product in products}
        normalized_sizes = {}
        for key, value in raw_sizes.items():
            product_id = str(key)
            if product_id not in selected_product_ids:
                continue
            size_value = str(value).strip()
            if size_value:
                normalized_sizes[product_id] = size_value[:64]

        grouped_entries = {}
        for entry in product_entries:
            product = products_by_id.get(entry['product_id'])
            if not product:
                continue
            group_key = entry['issued_at'].isoformat()
            if group_key not in grouped_entries:
                grouped_entries[group_key] = {
                    'issued_at': entry['issued_at'],
                    'products': [],
                }
            grouped_entries[group_key]['products'].append(product)

        created_items = []
        for group in sorted(grouped_entries.values(), key=lambda item: item['issued_at']):
            group_products = group['products']
            group_issued_at = group['issued_at']
            group_size_keys = {str(product.id) for product in group_products}
            group_sizes = {
                key: value
                for key, value in normalized_sizes.items()
                if key in group_size_keys
            }

            item = Item(
                issued_at=group_issued_at,
                issued_by=request.user,
                addedUser=request.user,
                updatedUser=request.user,
                affects_stock=False,
                ppe_sizes=group_sizes,
            )
            item.set_employee_snapshot(source_employee)
            item._history_user = request.user
            item.save()
            item.ppeproduct.set(group_products)

            max_renewal_months = max(
                [get_effective_product_renewal_months(product, source_employee) for product in group_products] or [0]
            )
            if max_renewal_months > 0:
                item.next_due_date = add_calendar_months(group_issued_at, max_renewal_months - 1)
                item.save(update_fields=['next_due_date'])

            pending_issue = PendingItemIssue(
                ppeproduct_ids=[product.id for product in group_products],
                ppe_sizes=group_sizes,
                status=PendingItemIssue.STATUS_CONFIRMED,
                created_by=request.user,
                employee_signed_at=group_issued_at,
                warehouse_signed_at=group_issued_at,
                confirmed_at=group_issued_at,
                confirmed_item=item,
            )
            pending_issue.set_employee_snapshot(source_employee)
            try:
                pending_issue.generate_qr_code(request.build_absolute_uri(pending_issue.get_qr_frontend_path()))
            except Exception:
                pass
            pending_issue.save()

            update_change_reason(item, f"История выдачи добавлена пользователем {request.user.username}")
            created_items.append(item)

        attach_employee_snapshots(created_items)
        latest_item = created_items[-1]

        return Response(
            {
                'success': True,
                'message': 'История выдачи добавлена',
                'created_count': len(created_items),
                'item_slug': latest_item.slug,
                'item_slugs': [item.slug for item in created_items],
                'item': ItemSerializer(latest_item, context={'request': request}).data,
            },
            status=status.HTTP_201_CREATED,
        )



class ItemDeleteApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    @staticmethod
    def delete(request, *args, **kwargs):
        permission_error = ensure_can_delete_employees(request)
        if permission_error:
            return permission_error

        slug = kwargs.get('slug')

        if not slug:
            return Response({"error": "Slug not found"}, status=status.HTTP_400_BAD_REQUEST)
        item = Item.objects.filter(slug=slug, is_deleted=False).first()
        employee_payload = None
        employee_service_id = None

        if item:
            employee_service_id = item.employee_service_id
        else:
            employee_payload = fetch_employee_by_slug_or_404(slug)
            external_id = (employee_payload or {}).get('external_id') or (employee_payload or {}).get('id')
            if not str(external_id or '').strip():
                return Response({"error": "Slug bo'yicha ma'lumot topilmadi"}, status=status.HTTP_404_NOT_FOUND)
            employee_service_id = int(external_id)

        with transaction.atomic():
            Item.objects.filter(employee_service_id=employee_service_id, is_deleted=False).update(is_deleted=True, isActive=False)

        return Response({"message": "Moved to archive successfully"})


class ItemVerifyImageApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    @staticmethod
    def delete(request, *args, **kwargs):
        permission_error = ensure_can_modify(request)
        if permission_error:
            return permission_error

        slug = kwargs.get('slug')
        if not slug:
            return Response({"error": "Slug not found"}, status=status.HTTP_400_BAD_REQUEST)

        item = (
            Item.objects
            .filter(slug=slug, is_deleted=False)
            .first()
        )
        if not item:
            return Response({"error": "Item topilmadi"}, status=status.HTTP_404_NOT_FOUND)

        if item.image:
            item.image.delete(save=False)
            item.image = None
            item.updatedUser = request.user
            item._history_user = request.user
            item.save()
            update_change_reason(item, f"Verify image o'chirildi: {request.user.username}")

        return Response({"message": "Rasm o'chirildi"}, status=status.HTTP_200_OK)


class PPEStatisticsApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    @staticmethod
    def get(request, *args, **kwargs):
        if not user_has_page_access(request.user, 'statistics'):
            return Response(
                {"error": "У вас нет прав для просмотра статистики."},
                status=status.HTTP_403_FORBIDDEN
            )

        today = timezone.localdate()

        from_raw = request.query_params.get('from')
        to_raw = request.query_params.get('to')

        from_date = None
        to_date = None

        if from_raw:
            try:
                from_date = dt.date.fromisoformat(from_raw)
            except ValueError:
                return Response({'error': "Noto'g'ri from sana formati. YYYY-MM-DD yuboring"}, status=status.HTTP_400_BAD_REQUEST)

        if to_raw:
            try:
                to_date = dt.date.fromisoformat(to_raw)
            except ValueError:
                return Response({'error': "Noto'g'ri to sana formati. YYYY-MM-DD yuboring"}, status=status.HTTP_400_BAD_REQUEST)

        if from_date and to_date and from_date > to_date:
            return Response({'error': 'Дата начала не может быть больше даты окончания.'}, status=status.HTTP_400_BAD_REQUEST)

        effective_to = to_date or today

        from_dt = timezone.make_aware(dt.datetime.combine(from_date, dt.time.min)) if from_date else None
        to_dt = timezone.make_aware(dt.datetime.combine(effective_to, dt.time.max))

        products = PPEProduct.objects.filter(is_active=True).order_by('name')

        through_model = Item.ppeproduct.through
        rows = []

        def iter_arrival_size_entries(arrival):
            breakdown = arrival.size_breakdown if isinstance(arrival.size_breakdown, dict) else {}
            if breakdown:
                for raw_size, raw_qty in breakdown.items():
                    normalized_size = normalize_size_value(raw_size)
                    if not normalized_size:
                        continue
                    try:
                        quantity = int(raw_qty)
                    except (TypeError, ValueError):
                        continue
                    if quantity <= 0:
                        continue
                    display_size = str(raw_size).strip() or normalized_size
                    yield normalized_size, display_size, quantity
                return

            normalized_size = normalize_size_value(arrival.size)
            if not normalized_size:
                return

            try:
                quantity = int(arrival.quantity or 0)
            except (TypeError, ValueError):
                quantity = 0

            if quantity <= 0:
                return

            display_size = str(arrival.size).strip() if arrival.size else normalized_size
            yield normalized_size, display_size, quantity

        for product in products:
            arrivals_to = list(
                PPEArrival.objects
                .filter(ppeproduct_id=product.id, received_at__lte=effective_to)
                .order_by('id')
            )

            issued_items_to = list(
                Item.objects
                .filter(
                    ppeproduct__id=product.id,
                    issued_at__lte=to_dt,
                    is_deleted=False,
                    affects_stock=True,
                )
                .distinct()
            )

            size_label_map = {}

            for arrival in arrivals_to:
                for normalized_size, display_size, _ in iter_arrival_size_entries(arrival):
                    if normalized_size not in size_label_map:
                        size_label_map[normalized_size] = display_size

            product_key = str(product.id)
            for issued_item in issued_items_to:
                size_map = issued_item.ppe_sizes if isinstance(issued_item.ppe_sizes, dict) else {}
                raw_size = size_map.get(product_key, '')
                normalized_size = normalize_size_value(raw_size)
                if not normalized_size:
                    continue
                if normalized_size not in size_label_map:
                    size_label_map[normalized_size] = str(raw_size).strip() or normalized_size

            if size_label_map:
                for normalized_size in sorted(size_label_map.keys()):
                    arrived_period = 0
                    arrived_total_to = 0

                    for arrival in arrivals_to:
                        for entry_size, _, quantity in iter_arrival_size_entries(arrival):
                            if entry_size != normalized_size:
                                continue
                            arrived_total_to += quantity
                            if from_date and arrival.received_at < from_date:
                                continue
                            arrived_period += quantity

                    issued_period = 0
                    issued_total_to = 0

                    for issued_item in issued_items_to:
                        size_map = issued_item.ppe_sizes if isinstance(issued_item.ppe_sizes, dict) else {}
                        issued_size = normalize_size_value(size_map.get(product_key, ''))
                        if issued_size != normalized_size:
                            continue

                        issued_total_to += 1
                        if from_dt and issued_item.issued_at < from_dt:
                            continue
                        issued_period += 1

                    remaining = max(arrived_total_to - issued_total_to, 0)
                    display_size = size_label_map.get(normalized_size, normalized_size)

                    rows.append({
                        'product_id': product.id,
                        'product_name': f'{product.name} (Размер {display_size})',
                        'arrived': int(arrived_period),
                        'issued': int(issued_period),
                        'remaining': int(remaining),
                        'low_stock_threshold': int(product.low_stock_threshold or 0),
                    })
            else:
                arrived_period_qs = PPEArrival.objects.filter(ppeproduct_id=product.id)
                if from_date:
                    arrived_period_qs = arrived_period_qs.filter(received_at__gte=from_date)
                arrived_period_qs = arrived_period_qs.filter(received_at__lte=effective_to)
                arrived_period = (
                    arrived_period_qs
                    .aggregate(total=Sum('quantity'))
                    .get('total') or 0
                )

                issued_period_qs = through_model.objects.filter(
                    ppeproduct_id=product.id,
                    item__is_deleted=False,
                    item__affects_stock=True,
                )
                if from_dt:
                    issued_period_qs = issued_period_qs.filter(item__issued_at__gte=from_dt)
                issued_period_qs = issued_period_qs.filter(item__issued_at__lte=to_dt)
                issued_period = issued_period_qs.count()

                arrived_total_to = (
                    PPEArrival.objects
                    .filter(ppeproduct_id=product.id, received_at__lte=effective_to)
                    .aggregate(total=Sum('quantity'))
                    .get('total') or 0
                )

                issued_total_to = (
                    through_model.objects
                    .filter(
                        ppeproduct_id=product.id,
                        item__issued_at__lte=to_dt,
                        item__is_deleted=False,
                        item__affects_stock=True,
                    )
                    .count()
                )

                remaining = max(arrived_total_to - issued_total_to, 0)

                rows.append({
                    'product_id': product.id,
                    'product_name': product.name,
                    'arrived': int(arrived_period),
                    'issued': int(issued_period),
                    'remaining': int(remaining),
                    'low_stock_threshold': int(product.low_stock_threshold or 0),
                })

        totals = {
            'arrived': sum(row['arrived'] for row in rows),
            'issued': sum(row['issued'] for row in rows),
            'remaining': sum(row['remaining'] for row in rows),
        }

        return Response({
            'date_from': from_date.isoformat() if from_date else '',
            'date_to': effective_to.isoformat(),
            'totals': totals,
            'rows': rows,
        }, status=status.HTTP_200_OK)


class PPEStatisticsArrivalDetailsApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    @staticmethod
    def get(request, *args, **kwargs):
        if not user_has_page_access(request.user, 'statistics'):
            return Response(
                {"error": "У вас нет прав для просмотра деталей статистики."},
                status=status.HTTP_403_FORBIDDEN
            )

        product_id_raw = request.query_params.get('product_id')
        if not product_id_raw:
            return Response({'error': 'product_id обязателен.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            product_id = int(product_id_raw)
        except (TypeError, ValueError):
            return Response({'error': 'product_id должен быть числом.'}, status=status.HTTP_400_BAD_REQUEST)

        from_raw = request.query_params.get('from')
        to_raw = request.query_params.get('to')
        size_raw = request.query_params.get('size', '')

        from_date = None
        to_date = None

        if from_raw:
            try:
                from_date = dt.date.fromisoformat(from_raw)
            except ValueError:
                return Response({'error': "Noto'g'ri from sana formati. YYYY-MM-DD yuboring"}, status=status.HTTP_400_BAD_REQUEST)

        if to_raw:
            try:
                to_date = dt.date.fromisoformat(to_raw)
            except ValueError:
                return Response({'error': "Noto'g'ri to sana formati. YYYY-MM-DD yuboring"}, status=status.HTTP_400_BAD_REQUEST)

        if from_date and to_date and from_date > to_date:
            return Response({'error': 'Дата начала не может быть больше даты окончания.'}, status=status.HTTP_400_BAD_REQUEST)

        product = get_object_or_404(PPEProduct, pk=product_id)
        normalized_size = normalize_size_value(size_raw)

        arrivals_qs = (
            PPEArrival.objects
            .filter(ppeproduct_id=product_id)
            .select_related('addedUser')
            .order_by('-received_at', '-id')
        )

        if from_date:
            arrivals_qs = arrivals_qs.filter(received_at__gte=from_date)

        if to_date:
            arrivals_qs = arrivals_qs.filter(received_at__lte=to_date)

        arrivals = []
        total_arrived = 0

        for arrival in arrivals_qs:
            breakdown = arrival.size_breakdown if isinstance(arrival.size_breakdown, dict) else {}
            entries = []

            if breakdown:
                for raw_size, raw_qty in breakdown.items():
                    entry_size = normalize_size_value(raw_size)
                    if normalized_size and entry_size != normalized_size:
                        continue

                    try:
                        quantity = int(raw_qty)
                    except (TypeError, ValueError):
                        continue

                    if quantity <= 0:
                        continue

                    entries.append({
                        'size': str(raw_size).strip() or entry_size,
                        'quantity': quantity,
                    })
            else:
                entry_size = normalize_size_value(arrival.size)
                if not normalized_size or entry_size == normalized_size:
                    try:
                        quantity = int(arrival.quantity or 0)
                    except (TypeError, ValueError):
                        quantity = 0

                    if quantity > 0:
                        entries.append({
                            'size': str(arrival.size).strip() if arrival.size else '',
                            'quantity': quantity,
                        })

            for entry in entries:
                accepted_by = arrival.addedUser
                accepted_by_name = ''
                if accepted_by:
                    accepted_by_name = ' '.join(
                        part for part in [accepted_by.last_name, accepted_by.first_name] if part
                    ).strip()

                arrivals.append({
                    'arrival_id': arrival.id,
                    'received_at': arrival.received_at,
                    'quantity': entry['quantity'],
                    'size': entry['size'],
                    'note': arrival.note or '',
                    'accepted_by': {
                        'id': accepted_by.id if accepted_by else None,
                        'username': accepted_by.username if accepted_by else '',
                        'full_name': accepted_by_name or (accepted_by.username if accepted_by else ''),
                    },
                })
                total_arrived += entry['quantity']

        return Response({
            'product_id': product.id,
            'product_name': product.name,
            'size': size_raw,
            'date_from': from_date.isoformat() if from_date else '',
            'date_to': to_date.isoformat() if to_date else '',
            'total_arrived': total_arrived,
            'arrivals': arrivals,
        }, status=status.HTTP_200_OK)


class PPEStatisticsIssuedDetailsApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    @staticmethod
    def get(request, *args, **kwargs):
        if not user_has_page_access(request.user, 'statistics'):
            return Response(
                {"error": "У вас нет прав для просмотра деталей выдачи."},
                status=status.HTTP_403_FORBIDDEN
            )

        product_id_raw = request.query_params.get('product_id')
        if not product_id_raw:
            return Response({'error': 'product_id обязателен.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            product_id = int(product_id_raw)
        except (TypeError, ValueError):
            return Response({'error': 'product_id должен быть числом.'}, status=status.HTTP_400_BAD_REQUEST)

        from_raw = request.query_params.get('from')
        to_raw = request.query_params.get('to')
        size_raw = request.query_params.get('size', '')

        from_date = None
        to_date = None

        if from_raw:
            try:
                from_date = dt.date.fromisoformat(from_raw)
            except ValueError:
                return Response({'error': "Noto'g'ri from sana formati. YYYY-MM-DD yuboring"}, status=status.HTTP_400_BAD_REQUEST)

        if to_raw:
            try:
                to_date = dt.date.fromisoformat(to_raw)
            except ValueError:
                return Response({'error': "Noto'g'ri to sana formati. YYYY-MM-DD yuboring"}, status=status.HTTP_400_BAD_REQUEST)

        if from_date and to_date and from_date > to_date:
            return Response({'error': 'Дата начала не может быть больше даты окончания.'}, status=status.HTTP_400_BAD_REQUEST)

        product = get_object_or_404(PPEProduct, pk=product_id)
        normalized_size = normalize_size_value(size_raw)
        product_key = str(product_id)

        items_qs = (
            Item.objects
            .filter(
                ppeproduct__id=product_id,
                is_deleted=False,
                affects_stock=True,
            )
            .select_related('issued_by')
            .distinct()
            .order_by('-issued_at', '-id')
        )
        items = list(items_qs)
        attach_employee_snapshots(items)

        if from_date:
            from_dt = timezone.make_aware(dt.datetime.combine(from_date, dt.time.min))
            items = [item for item in items if item.issued_at and item.issued_at >= from_dt]

        if to_date:
            to_dt = timezone.make_aware(dt.datetime.combine(to_date, dt.time.max))
            items = [item for item in items if item.issued_at and item.issued_at <= to_dt]

        issues = []
        for item in items:
            size_map = item.ppe_sizes if isinstance(item.ppe_sizes, dict) else {}
            raw_item_size = size_map.get(product_key, '')
            item_size = normalize_size_value(raw_item_size)

            if normalized_size and item_size != normalized_size:
                continue

            employee = item.employee
            issued_by = item.issued_by
            employee_full_name = ' '.join(
                part for part in [employee.last_name, employee.first_name, employee.surname] if part
            ).strip()
            issuer_full_name = ''
            if issued_by:
                issuer_full_name = ' '.join(
                    part for part in [issued_by.last_name, issued_by.first_name] if part
                ).strip()

            issues.append({
                'item_id': item.id,
                'employee_id': item.employee_service_id,
                'employee_slug': item.employee_slug or getattr(employee, 'slug', ''),
                'employee_name': employee_full_name,
                'tabel_number': employee.tabel_number,
                'department_name': employee.department.name if getattr(employee, 'department', None) else '',
                'section_name': employee.section.name if getattr(employee, 'section', None) else '',
                'position': employee.position or '',
                'issued_at': item.issued_at,
                'issued_by': {
                    'id': issued_by.id if issued_by else None,
                    'username': issued_by.username if issued_by else '',
                    'full_name': issuer_full_name or (issued_by.username if issued_by else ''),
                },
                'size': str(raw_item_size).strip() or item_size or '',
            })

        return Response({
            'product_id': product.id,
            'product_name': product.name,
            'size': size_raw,
            'date_from': from_date.isoformat() if from_date else '',
            'date_to': to_date.isoformat() if to_date else '',
            'total_issued': len(issues),
            'issues': issues,
        }, status=status.HTTP_200_OK)


class PPEArrivalListCreateApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    @staticmethod
    def get(request, *args, **kwargs):
        if not user_has_page_access(request.user, 'ppe_arrival'):
            return Response(
                {"error": "У вас нет прав для просмотра приема СИЗ."},
                status=status.HTTP_403_FORBIDDEN
            )

        arrivals = (
            PPEArrival.objects
            .select_related('ppeproduct', 'addedUser')
            .order_by('-received_at', '-id')
        )
        serializer = PPEArrivalSerializer(arrivals, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @staticmethod
    def post(request, *args, **kwargs):
        permission_error = ensure_can_submit_ppe_arrival(request)
        if permission_error:
            return permission_error

        serializer = PPEArrivalSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        arrival = serializer.save(addedUser=request.user)
        return Response(PPEArrivalSerializer(arrival).data, status=status.HTTP_201_CREATED)


class ItemAddApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    @staticmethod
    def get(request, *args, **kwargs):
        slug = kwargs.get('slug')
        if not slug:
            return Response({"error": "Slug not found"}, status=status.HTTP_400_BAD_REQUEST)

        source_item = (
            Item.objects
            .select_related('issued_by')
            .prefetch_related('ppeproduct')
            .filter(slug=slug, is_deleted=False)
            .first()
        )

        payload_item = None
        source_employee = None
        if source_item:
            attach_employee_snapshots([source_item])
            source_employee = build_employee_snapshot(
                getattr(source_item, '_employee_snapshot_override', None) or source_item.employee_snapshot
            )
            payload_item = ItemSerializer(
                source_item,
                context={'include_ppe_split': True, 'include_issue_history': True}
            ).data
        else:
            employee = fetch_employee_by_slug_or_404(slug)
            if not employee:
                return Response({"error": "Slug bo'yicha ma'lumot topilmadi"}, status=status.HTTP_404_NOT_FOUND)

            source_employee = employee
            _, payload_item = build_latest_item_payload_for_employee(employee)

        ppe_products_payload = build_employee_ppe_products_payload(source_employee)

        employee_sizes = None
        if source_employee:
            employee_sizes = {
                "clothe_size": source_employee.get('clothe_size') or None,
                "shoe_size": source_employee.get('shoe_size') or None,
            }

        departments = list_departments()
        sections = list_sections()

        return Response({
            "item": payload_item,
            "ppe_products": ppe_products_payload,
            "employee_sizes": employee_sizes,
            "departments": departments,
            "sections": sections,
        })


    @staticmethod
    def post(request, *args, **kwargs):
        permission_error = ensure_can_modify(request)
        if permission_error:
            return permission_error

        slug = kwargs.get('slug')
        if not slug:
            return Response({"error": "Slug not found"}, status=status.HTTP_400_BAD_REQUEST)

        source_item = (
            Item.objects
            .filter(slug=slug, is_deleted=False)
            .first()
        )
        source_employee = None
        if source_item:
            attach_employee_snapshots([source_item])
            source_employee = build_employee_snapshot(source_item.employee_snapshot)

        if source_employee is None:
            source_employee = fetch_employee_by_slug_or_404(slug)

        if source_employee is None:
            return Response({"error": "Slug bo'yicha ma'lumot topilmadi"}, status=status.HTTP_404_NOT_FOUND)

        source_employee_id = source_employee.get('external_id') or source_employee.get('id')

        ppeproduct_ids = request.data.get('ppeproduct', [])
        if not isinstance(ppeproduct_ids, list):
            return Response({"error": "ppeproduct list bo'lishi kerak"}, status=status.HTTP_400_BAD_REQUEST)
        if not ppeproduct_ids:
            return Response({"error": "Kamida bitta Средство защиты tanlang"}, status=status.HTTP_400_BAD_REQUEST)

        issued_at = timezone.now()

        products = list(PPEProduct.objects.filter(id__in=ppeproduct_ids))
        if not products:
            return Response({"error": "Tanlangan Средства защиты topilmadi"}, status=status.HTTP_400_BAD_REQUEST)

        employee_gender = get_employee_gender_code(source_employee)
        incompatible_products = []
        disallowed_products = []
        if employee_gender:
            for product in products:
                target_gender = str(product.target_gender or PPEProduct.TARGET_GENDER_ALL).strip().upper()
                if target_gender not in {PPEProduct.TARGET_GENDER_ALL, employee_gender}:
                    incompatible_products.append(product.name)

        for product in products:
            if not is_product_allowed_for_employee(product, source_employee):
                disallowed_products.append(product.name)

        if disallowed_products:
            return Response(
                {
                    "error": "Выбраны СИЗ, не разрешённые для должности сотрудника: " + ", ".join(disallowed_products),
                    "error_code": "ppe_not_allowed",
                    "products": disallowed_products,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if incompatible_products:
            return Response(
                {
                    "error": "Выбраны СИЗ, не подходящие по полу сотрудника: " + ", ".join(incompatible_products),
                    "error_code": "ppe_gender_mismatch",
                    "products": incompatible_products,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        blocked_products = []
        for product in products:
            renewal_months = get_effective_product_renewal_months(product, source_employee)
            if renewal_months <= 0:
                continue

            latest_issue_with_product = (
                Item.objects
                .filter(
                    employee_service_id=source_employee_id,
                    ppeproduct__id=product.id,
                    is_deleted=False,
                )
                .order_by('-issued_at', '-id')
                .first()
            )

            if not latest_issue_with_product or not latest_issue_with_product.issued_at:
                continue

            due_date = add_calendar_months(latest_issue_with_product.issued_at, renewal_months - 1)
            if issued_at < due_date:
                months_left = get_months_remaining(issued_at, due_date)
                blocked_products.append({
                    "product_id": product.id,
                    "name": product.name,
                    "months_left": months_left,
                    "due_date": timezone.localtime(due_date).strftime('%d.%m.%Y'),
                })

        if blocked_products:
            details = "; ".join(
                f"{entry['name']} — еще {entry['months_left']} мес. (до {entry['due_date']})"
                for entry in blocked_products
            )
            return Response(
                {
                    "error": f"Выдача недоступна: {details}",
                    "error_code": "ppe_not_due",
                    "not_due_products": blocked_products,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        raw_sizes = request.data.get('ppe_sizes', {})
        if raw_sizes is None:
            raw_sizes = {}
        if not isinstance(raw_sizes, dict):
            return Response({"error": "ppe_sizes object bo'lishi kerak"}, status=status.HTTP_400_BAD_REQUEST)

        selected_product_ids = {str(product.id) for product in products}
        normalized_sizes = {}
        for key, value in raw_sizes.items():
            product_id = str(key)
            if product_id not in selected_product_ids:
                continue
            size_value = str(value).strip()
            if size_value:
                normalized_sizes[product_id] = size_value[:64]

        unavailable_sizes = []
        for product in products:
            size_value = normalized_sizes.get(str(product.id), '').strip()
            if not size_value:
                continue

            remaining_quantity = get_product_size_remaining_quantity(product.id, size_value)
            if remaining_quantity <= 0:
                unavailable_sizes.append({
                    'product_id': product.id,
                    'name': product.name,
                    'size': size_value,
                    'remaining': 0,
                })

        if unavailable_sizes:
            details = '; '.join(
                f"{entry['name']} (размер {entry['size']}) yo'q"
                for entry in unavailable_sizes
            )
            return Response(
                {
                    'error': f"На складе нет нужного размера: {details}",
                    'error_code': 'ppe_size_out_of_stock',
                    'out_of_stock': unavailable_sizes,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create pending issue instead of directly creating Item
        pending_issue = PendingItemIssue(
            ppeproduct_ids=[p.id for p in products],
            ppe_sizes=normalized_sizes,
            status=PendingItemIssue.STATUS_PENDING,
            created_by=request.user,
        )
        pending_issue.set_employee_snapshot(source_employee)

        verified_image_payload = request.data.get('verified_image')
        if verified_image_payload:
            try:
                # Save verified image to pending issue
                if verified_image_payload.startswith('data:image'):
                    header, base64_data = verified_image_payload.split(',', 1)
                else:
                    base64_data = verified_image_payload
                image_data = base64.b64decode(base64_data)
                pending_issue.verified_image.save(
                    f'pending_verified_{source_employee_id}_{timezone.now().strftime("%Y%m%d%H%M%S")}.jpg',
                    ContentFile(image_data),
                    save=False
                )
            except Exception:
                pass  # Not critical for pending issue

        pending_issue.save()

        return Response({
            'pending_issue_id': pending_issue.id,
            'expires_at': pending_issue.expires_at.isoformat(),
            'redirect_url': f'/signature/{pending_issue.id}',
        }, status=status.HTTP_201_CREATED)


class TelegramBotLookupRequestSerializer(serializers.Serializer):
    phone_number = serializers.CharField(help_text='Xodim Telegram orqali share qilgan telefon raqami.')
    tabel_number = serializers.CharField(help_text='Xodim kiritgan tabel raqami.')


class TelegramBotDepartmentSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=False, allow_null=True)
    name = serializers.CharField(allow_blank=True)
    boss_fullName = serializers.CharField(allow_blank=True, required=False)


class TelegramBotSectionSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=False, allow_null=True)
    name = serializers.CharField(allow_blank=True)
    department_id = serializers.IntegerField(required=False, allow_null=True)


class TelegramBotEmployeeSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=False, allow_null=True)
    external_id = serializers.CharField(allow_blank=True)
    slug = serializers.CharField(allow_blank=True)
    full_name = serializers.CharField(allow_blank=True)
    tabel_number = serializers.CharField(allow_blank=True)
    phone_number_1 = serializers.CharField(allow_blank=True)
    phone_number_2 = serializers.CharField(allow_blank=True)
    position = serializers.CharField(allow_blank=True)
    department = TelegramBotDepartmentSerializer(required=False)
    section = TelegramBotSectionSerializer(required=False)


class TelegramBotLastReceivedProductSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    type_product = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    type_product_display = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    renewal_months = serializers.IntegerField(required=False)
    size = serializers.CharField(allow_blank=True, required=False)
    is_new = serializers.BooleanField(allow_null=True, required=False)


class TelegramBotPPEProductSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    type_product = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    type_product_display = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    renewal_months = serializers.IntegerField()
    can_issue = serializers.BooleanField()
    months_left = serializers.IntegerField()
    remaining_text = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    not_due_message = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    last_issued_at = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    next_due_date = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    default_size = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    size_type = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    default_size_remaining = serializers.IntegerField(allow_null=True, required=False)
    stock_available = serializers.BooleanField(allow_null=True, required=False)
    stock_message = serializers.CharField(allow_blank=True, allow_null=True, required=False)


class TelegramBotLookupErrorSerializer(serializers.Serializer):
    error = serializers.CharField()


class TelegramBotLookupResponseSerializer(serializers.Serializer):
    employee = TelegramBotEmployeeSerializer()
    last_received_at = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    last_received_products = TelegramBotLastReceivedProductSerializer(many=True)
    available_now_products = TelegramBotPPEProductSerializer(many=True)
    upcoming_products = TelegramBotPPEProductSerializer(many=True)
    all_ppe_products = TelegramBotPPEProductSerializer(many=True)
    item = serializers.JSONField()


class TelegramBotEmployeePPELookupApiView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        tags=['Telegram Bot'],
        operation_id='telegram_bot_employee_ppe_lookup',
        summary='Telefon va tabel bo‘yicha xodimning PPE holatini olish',
        description=(
            'Telegram bot integratsiyasi uchun endpoint. '\
            'Xodim avval telefon raqamini share qiladi, keyin tabel raqamini yuboradi. '\
            'Endpoint xodimni employee_service dan topadi va quyidagilarni qaytaradi: '\
            'oxirgi olingan PPE mahsulotlari, hozir olish mumkin bo‘lgan mahsulotlar, '\
            'hamda keyinroq olish mumkin bo‘ladigan mahsulotlar va ularning muddatlari.'
        ),
        request=TelegramBotLookupRequestSerializer,
        responses={
            200: OpenApiResponse(response=TelegramBotLookupResponseSerializer, description='Xodim topildi va PPE maʼlumotlari qaytarildi.'),
            400: OpenApiResponse(response=TelegramBotLookupErrorSerializer, description='So‘rov noto‘g‘ri: phone_number yoki tabel_number yuborilmagan.'),
            404: OpenApiResponse(response=TelegramBotLookupErrorSerializer, description='Xodim topilmadi yoki telefon raqami mos kelmadi.'),
            503: OpenApiResponse(response=TelegramBotLookupErrorSerializer, description='employee_service vaqtincha ishlamayapti.'),
        },
        examples=[
            OpenApiExample(
                'Request example',
                value={'phone_number': '+998901234567', 'tabel_number': 'TG-501'},
                request_only=True,
            ),
            OpenApiExample(
                'Success example',
                value={
                    'employee': {
                        'id': 501,
                        'external_id': '501',
                        'slug': 'telegram-employee-501',
                        'full_name': 'Valiyev Ali Botovich',
                        'tabel_number': 'TG-501',
                        'phone_number_1': '+998 90 123 45 67',
                        'phone_number_2': '',
                        'position': 'Engineer',
                        'department': {'id': 12, 'name': '12-Telegram Department', 'boss_fullName': 'Chief User'},
                        'section': {'id': 3, 'name': 'Bot Section', 'department_id': 12},
                    },
                    'last_received_at': '05.03.2026',
                    'last_received_products': [
                        {'id': 1, 'name': 'Helmet', 'type_product': 'unit', 'type_product_display': 'Штучный', 'renewal_months': 12, 'size': '', 'is_new': False}
                    ],
                    'available_now_products': [
                        {'id': 3, 'name': 'Gloves', 'type_product': 'unit', 'type_product_display': 'Штучный', 'renewal_months': 0, 'can_issue': True, 'months_left': 0, 'remaining_text': None, 'not_due_message': None, 'last_issued_at': None, 'next_due_date': None, 'default_size': None, 'size_type': None, 'default_size_remaining': None, 'stock_available': None, 'stock_message': None}
                    ],
                    'upcoming_products': [
                        {'id': 2, 'name': 'Safety Boots', 'type_product': 'unit', 'type_product_display': 'Штучный', 'renewal_months': 6, 'can_issue': False, 'months_left': 4, 'remaining_text': '4 мес.', 'not_due_message': 'Для получения этого продукта осталось 4 мес.', 'last_issued_at': '05.03.2026', 'next_due_date': '05.08.2026', 'default_size': '42', 'size_type': 'shoe', 'default_size_remaining': 0, 'stock_available': False, 'stock_message': 'Нет на складе'}
                    ],
                    'all_ppe_products': [],
                    'item': {'id': 10, 'issued_at': '2026-03-05T10:00:00Z'},
                },
                response_only=True,
                status_codes=['200'],
            ),
        ],
    )
    @staticmethod
    def post(request, *args, **kwargs):
        phone_number = str(request.data.get('phone_number') or '').strip()
        tabel_number = str(request.data.get('tabel_number') or '').strip()

        if not phone_number:
            return Response({'error': 'phone_number majburiy'}, status=status.HTTP_400_BAD_REQUEST)
        if not tabel_number:
            return Response({'error': 'tabel_number majburiy'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            employee = find_employee_for_telegram_lookup(phone_number, tabel_number)
        except EmployeeServiceClientError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        if not employee:
            return Response({'error': 'Xodim topilmadi yoki telefon raqami mos emas'}, status=status.HTTP_404_NOT_FOUND)

        latest_item, item_payload = build_latest_item_payload_for_employee(employee, request=request)
        ppe_products = build_employee_ppe_products_payload(employee)

        last_received_products = []
        last_received_at = None
        if latest_item is not None:
            last_received_at = format_local_date_value(latest_item.issued_at)
            last_received_products = item_payload.get('ppeproduct_info') or []

        available_now_products = [row for row in ppe_products if row.get('can_issue')]
        upcoming_products = [row for row in ppe_products if not row.get('can_issue')]

        return Response({
            'employee': {
                'id': employee.get('id'),
                'external_id': employee.get('external_id'),
                'slug': employee.get('slug'),
                'full_name': employee.get('full_name'),
                'tabel_number': employee.get('tabel_number'),
                'phone_number_1': employee.get('phone_number_1') or '',
                'phone_number_2': employee.get('phone_number_2') or '',
                'position': employee.get('position') or '',
                'department': employee.get('department') or {},
                'section': employee.get('section') or {},
            },
            'last_received_at': last_received_at,
            'last_received_products': last_received_products,
            'available_now_products': available_now_products,
            'upcoming_products': upcoming_products,
            'all_ppe_products': ppe_products,
            'item': item_payload,
        })


class ItemStockCheckApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    @staticmethod
    def post(request, *args, **kwargs):
        permission_error = ensure_can_modify(request)
        if permission_error:
            return permission_error

        raw_product_id = request.data.get('ppeproduct_id')
        size_value = str(request.data.get('size', '')).strip()

        try:
            product_id = int(raw_product_id)
        except (TypeError, ValueError):
            return Response({'error': 'ppeproduct_id noto\'g\'ri'}, status=status.HTTP_400_BAD_REQUEST)

        if not PPEProduct.objects.filter(id=product_id, is_active=True).exists():
            return Response({'error': 'Средство защиты topilmadi'}, status=status.HTTP_404_NOT_FOUND)

        if not size_value:
            return Response({'error': 'Размер kiriting'}, status=status.HTTP_400_BAD_REQUEST)

        remaining_quantity = get_product_size_remaining_quantity(product_id, size_value)
        return Response(
            {
                'ppeproduct_id': product_id,
                'size': size_value,
                'remaining': remaining_quantity,
                'available': remaining_quantity > 0,
            },
            status=status.HTTP_200_OK,
        )


class ItemAvailableSizesApiView(APIView):
    """Returns all available sizes for a PPE product with their remaining quantities."""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    @staticmethod
    def get(request, product_id, *args, **kwargs):
        try:
            product_id = int(product_id)
        except (TypeError, ValueError):
            return Response({'error': 'ppeproduct_id noto\'g\'ri'}, status=status.HTTP_400_BAD_REQUEST)

        if not PPEProduct.objects.filter(id=product_id, is_active=True).exists():
            return Response({'error': 'Средство защиты topilmadi'}, status=status.HTTP_404_NOT_FOUND)

        available_sizes = get_product_available_sizes(product_id)
        return Response({
            'ppeproduct_id': product_id,
            'available_sizes': available_sizes,
        }, status=status.HTTP_200_OK)


# class FilterOptionsAPIView(APIView):
#     permission_classes = [AllowAny]

#     def get(self, request, *args, **kwargs):
#         departments = Department.objects.all().values('id', 'name')
#         sections = Section.objects.all().values('id', 'name')
#         ip_addresses = (
#             Compyuter.objects
#             .exclude(ipadresss__isnull=True)
#             .exclude(ipadresss__exact='')
#             .values_list('ipadresss', flat=True)
#             .distinct()
#         )
#         type_compyuters = TypeCompyuter.objects.all().values('id', 'name')
#         history_model = Compyuter.history.model
#         users = (
#             history_model.objects
#             .exclude(history_user__isnull=True)
#             .values_list('history_user__username', flat=True)
#             .distinct()
#             .order_by(Lower('history_user__username'))
#         )
#         data = {
#             'departments': list(departments),
#             'sections': list(sections),
#             'ip_addresses': list(ip_addresses),
#             'type_compyuters': list(type_compyuters),
#             'users': list(users),
#         }
#         return Response(data)



#

# class AddCompyuterApiView(APIView):
#     authentication_classes = [TokenAuthentication]
#     permission_classes = [IsAuthenticated]

#     @staticmethod
#     def post(request, *args, **kwargs):
#         request.data['addedUser'] = request.user.id
#         serializer = AddCompyuterSerializer(data=request.data, context={'request': request})
#         if serializer.is_valid():
#             instance = serializer.save()
#             update_change_reason(instance, f"Создано пользователем {request.user.username}")
#             return Response(serializer.data, status=status.HTTP_201_CREATED)
#         return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# def get_or_create_safe(model, name):
#     if not name:
#         return None
#     obj = model.objects.filter(name=name.strip()).first()
#     if not obj:
#         obj = model.objects.create(name=name.strip())
#     return obj


# class AddCompyuterWithJsonApiView(APIView):
#     def post(self, request):
#         data = request.data

#         try:
#             type_compyuter = get_or_create_safe(TypeCompyuter, data.get("type_compyuter"))
#             motherboard = get_or_create_safe(Motherboard, data.get("motherboard"))
#             motherboard_model = get_or_create_safe(MotherboardModel, data.get("motherboard_model"))
#             CPU_obj = get_or_create_safe(CPU, data.get("CPU"))
#             generation = get_or_create_safe(Generation, data.get("generation"))
#             frequency = get_or_create_safe(Frequency, data.get("frequency"))
#             SSD_obj = get_or_create_safe(SSD, data.get("SSD"))
#             disk_type = get_or_create_safe(DiskType, data.get("disk_type"))
#             RAM_type = get_or_create_safe(RAMType, data.get("RAM_type"))
#             ram_size = get_or_create_safe(RAMSize, data.get("RAMSize"))
#         except Exception as e:
#             return Response({"error": f"ForeignKey obyektlarini yaratishda xatolik: {str(e)}"},
#                             status=status.HTTP_400_BAD_REQUEST)

#         try:
#             internet = data.get("Internet")
#             seal_number = data.get("seal_number")

#             comp = Compyuter.objects.create(
#                 user=data.get("user") or None,
#                 ipadresss=data.get("ipadresss") or None,
#                 mac_adress=data.get("mac_adress") or None,
#                 seal_number=seal_number.strip() if seal_number else "",
#                 slug=slugify(f"computers/{data.get('mac_adress')}"),
#                 type_compyuter=type_compyuter,
#                 motherboard=motherboard,
#                 motherboard_model=motherboard_model,
#                 CPU=CPU_obj,
#                 generation=generation,
#                 frequency=frequency,
#                 SSD=SSD_obj,
#                 disk_type=disk_type,
#                 RAM_type=RAM_type,
#                 RAMSize=ram_size,
#                 internet=internet,
#                 departament=get_or_create_safe(Department, data.get("departament")),
#                 warehouse_manager=get_or_create_safe(WarehouseManager, data.get("warehouse_manager")),
#                 GPU=get_or_create_safe(GPU, data.get("GPU")),
#             )
#         except Exception as e:
#             return Response({"error": f"Kompyuter obyektini yaratishda xatolik: {str(e)}"},
#                             status=status.HTTP_400_BAD_REQUEST)

#         try:
#             def handle_m2m(field_name, model_class):
#                 items = data.get(field_name)
#                 if not items:
#                     return
#                 if isinstance(items, str):
#                     items = [x.strip() for x in items.split(",")]
#                 for item in items:
#                     if item and item.lower() != "none":
#                         obj = get_or_create_safe(model_class, item)
#                         getattr(comp, field_name).add(obj)

#             handle_m2m("type_webcamera", TypeWebCamera)
#             handle_m2m("model_webcam", ModelWebCamera)
#             handle_m2m("type_monitor", Monitor)

#             comp.save()
#         except Exception as e:
#             return Response({"error": f"ManyToMany ma'lumotlarni qo'shishda xatolik: {str(e)}"},
#                             status=status.HTTP_400_BAD_REQUEST)

#         serializer = CompyuterSerializer(comp)
#         return Response(serializer.data, status=status.HTTP_201_CREATED)


# def get_or_create_model(model, field_name, value):
#     if not value:
#         return None
#     obj, created = model.objects.get_or_create(**{field_name: value})
#     return obj


# class GetTexnologyFromAgent(APIView):
#     permission_classes = [AllowAny]

#     def post(self, request, *args, **kwargs):
#         data = request.data
#         ipadresss = data.get("ipadresss")
#         mac_address = data.get("mac_adress")
#         print(data)
#         if not mac_address or not ipadresss:
#             return Response({"error": "IP and MAC address are required"}, status=400)

#         with transaction.atomic():
#             # Find existing computer by mac_address and ipadresss
#             comp = Compyuter.objects.filter(mac_adress=mac_address, ipadresss=ipadresss).first()
#             created = False

#             if not comp:
#                 # Create new computer if not found
#                 comp = Compyuter(mac_adress=mac_address, ipadresss=ipadresss)
#                 created = True

#             # Simple fields
#             simple_fields = ["user", "slug", "internet"]
#             for field in simple_fields:
#                 if field in data:
#                     setattr(comp, field, data.get(field, None))

#             # ForeignKey fields (create if not exists)
#             fk_fields = {
#                 "departament": Department,
#                 "warehouse_manager": WarehouseManager,
#                 "type_compyuter": TypeCompyuter,
#                 "motherboard": Motherboard,
#                 "motherboard_model": MotherboardModel,
#                 "CPU": CPU,
#                 "generation": Generation,
#                 "frequency": Frequency,
#                 "HDD": HDD,
#                 "SSD": SSD,
#                 "disk_type": DiskType,
#                 "RAM_type": RAMType,
#                 "RAMSize": RAMSize,
#                 "GPU": GPU,
#             }

#             for field, model in fk_fields.items():
#                 value = data.get(field)
#                 if value:
#                     obj = model.objects.filter(name=value).first()
#                     if not obj:
#                         obj = model.objects.create(name=value)
#                     setattr(comp, field, obj)
#                 elif not getattr(comp, field):
#                     obj = model.objects.filter(name="Нет").first()
#                     if not obj:
#                         obj = model.objects.create(name="Нет")
#                     setattr(comp, field, obj)

#             if not comp.slug:
#                 # comp.slug = f"computers/{comp.mac_adress}"
#                 comp.slug = slugify(f"computers/{mac_address}")

#             comp.internet = data.get("Internet")
#             print(comp)
#             # Get any admin user as a fallback for the agent
#             admin_user = User.objects.filter(is_staff=True).first()
#             if admin_user:
#                 # Set for history
#                 comp._history_user = admin_user
#                 # Set as updated user
#                 comp.updatedUser = admin_user

#             # Set appropriate change reason
#             # update_change_reason(comp, f"Автоматическое обновление через агент")

#             comp.save()
#             # ManyToMany fields (clear and add new)
#             m2m_fields = {
#                 # "printer": Printer,
#                 # "scaner": Scaner,
#                 "type_webcamera": TypeWebCamera,
#                 "model_webcam": ModelWebCamera,
#                 "type_monitor": Monitor,
#             }

#             for field, model in m2m_fields.items():
#                 values = data.get(field, [])
#                 if isinstance(values, str):
#                     values = [values]  # Convert single string to list

#                 if values:
#                     objs = [model.objects.get_or_create(name=value)[0] for value in values]
#                     getattr(comp, field).set(objs)

#         message = "Update successful" if not created else "OK"
#         return Response({"message": message, "created": created})




# class EditCompyuterApiView(APIView):
#     authentication_classes = [TokenAuthentication]
#     permission_classes = [IsAuthenticated]

#     @staticmethod
#     def put(request, *args, **kwargs):
#         instance = get_object_or_404(Compyuter, slug=kwargs.get('slug'))
#         serializer = AddCompyuterSerializer(instance, data=request.data, context={'request': request})
#         if serializer.is_valid():
#             update_change_reason(instance, f"Обновлено пользователем {request.user.username}")
#             serializer.save()
#             return Response(serializer.data, status=status.HTTP_200_OK)
#         return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PendingIssueDetailApiView(APIView):
    """Get pending issue details for signature page."""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _build_pending_response(request, pending: PendingItemIssue):
        """Shared serializer for pending issue details."""
        now = timezone.now()

        # Check if expired
        if pending.status == PendingItemIssue.STATUS_PENDING and now > pending.expires_at:
            pending.status = PendingItemIssue.STATUS_EXPIRED
            pending.save(update_fields=["status"])

        if pending.status == PendingItemIssue.STATUS_EXPIRED:
            return Response({"error": "Время истекло. Начните заново.", "expired": True}, status=status.HTTP_400_BAD_REQUEST)

        if pending.status == PendingItemIssue.STATUS_CONFIRMED:
            return Response({
                "error": "Уже подтверждено",
                "confirmed": True,
                "item_slug": pending.confirmed_item.slug if pending.confirmed_item else None,
            }, status=status.HTTP_400_BAD_REQUEST)

        products = PPEProduct.objects.filter(id__in=pending.ppeproduct_ids)
        products_list = []
        for p in products:
            size = pending.ppe_sizes.get(str(p.id), "")
            products_list.append({
                "id": p.id,
                "name": p.name,
                "type_product_display": p.get_type_product_display() if p.type_product else None,
                "size": size,
            })

        employee_payload = build_employee_snapshot(
            getattr(pending, '_employee_snapshot_override', None) or pending.employee_snapshot
        )
        employee = pending.employee
        time_remaining = max(0, (pending.expires_at - now).total_seconds())

        base_image_url = employee_payload.get('base_image') or employee_payload.get('base_image_url')
        base_image_data = employee_payload.get('base_image_data')

        return Response(
            {
                "id": pending.id,
                "status": pending.status,
                "employee_signature_present": bool(pending.signature_image),
                "warehouse_signature_present": bool(pending.warehouse_signature_image),
                "requires_warehouse_signature": bool(pending.signature_image and not pending.warehouse_signature_image),
                "expires_at": pending.expires_at.isoformat(),
                "time_remaining_seconds": int(time_remaining),
                "employee": {
                    "id": employee.id,
                    "slug": employee.slug,
                    "first_name": employee.first_name,
                    "last_name": employee.last_name,
                    "surname": employee.surname,
                    "full_name": f"{employee.last_name} {employee.first_name} {employee.surname}",
                    "tabel_number": employee.tabel_number,
                    "position": employee.position,
                    "requires_face_id_checkout": employee.requires_face_id_checkout,
                    "base_image": base_image_url,
                    "base_image_data": base_image_data,
                },
                "products": products_list,
                "created_at": pending.created_at.isoformat(),
            }
        )

    @staticmethod
    def get(request, *args, **kwargs):
        permission_error = ensure_can_modify(request)
        if permission_error:
            return permission_error

        pending_id = kwargs.get("pk")
        if not pending_id:
            return Response({"error": "ID not found"}, status=status.HTTP_400_BAD_REQUEST)

        pending = (
            PendingItemIssue.objects.select_related("created_by")
            .filter(id=pending_id)
            .first()
        )
        if not pending:
            return Response({"error": "Запись не найдена"}, status=status.HTTP_404_NOT_FOUND)

        return PendingIssueDetailApiView._build_pending_response(request, pending)


class PendingIssueForEmployeeApiView(APIView):
    """Get active pending issue for a specific employee (for timer/button on list page)."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    @staticmethod
    def get(request, *args, **kwargs):
        permission_error = ensure_can_modify(request)
        if permission_error:
            return permission_error

        employee_id = kwargs.get("employee_id") or kwargs.get("pk")
        if not employee_id:
            return Response({"pending": None}, status=status.HTTP_200_OK)

        pending = (
            PendingItemIssue.objects.select_related("created_by")
            .filter(employee_service_id=employee_id, status=PendingItemIssue.STATUS_PENDING)
            .order_by("-created_at")
            .first()
        )

        if not pending:
            return Response({"pending": None}, status=status.HTTP_200_OK)

        # Reuse shared serializer; if expired/confirmed it will return error, so handle that case here.
        now = timezone.now()
        if pending.status == PendingItemIssue.STATUS_PENDING and now > pending.expires_at:
            pending.status = PendingItemIssue.STATUS_EXPIRED
            pending.save(update_fields=["status"])
            return Response({"pending": None}, status=status.HTTP_200_OK)

        if pending.status != PendingItemIssue.STATUS_PENDING:
            return Response({"pending": None}, status=status.HTTP_200_OK)

        time_remaining = max(0, (pending.expires_at - now).total_seconds())

        return Response(
            {
                "pending": {
                    "id": pending.id,
                    "expires_at": pending.expires_at.isoformat(),
                    "time_remaining_seconds": int(time_remaining),
                }
            },
            status=status.HTTP_200_OK,
        )


class IssueQRCodeDetailApiView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @staticmethod
    def get(request, *args, **kwargs):
        qr_token = kwargs.get('token')
        if not qr_token:
            return Response({'error': 'QR token not found'}, status=status.HTTP_400_BAD_REQUEST)

        pending = (
            PendingItemIssue.objects
            .select_related('created_by', 'confirmed_item__issued_by')
            .prefetch_related('confirmed_item__ppeproduct')
            .filter(
                qr_token=qr_token,
                status=PendingItemIssue.STATUS_CONFIRMED,
                confirmed_item__isnull=False,
            )
            .first()
        )
        if not pending:
            return Response({'error': 'QR код выдачи не найден'}, status=status.HTTP_404_NOT_FOUND)

        item = pending.confirmed_item
        employee = item.employee
        employee_payload = build_employee_snapshot(
            getattr(item, '_employee_snapshot_override', None) or item.employee_snapshot
        )
        issued_by = item.issued_by or pending.created_by
        issued_by_full_name = ''
        issued_by_position = ''
        issued_by_avatar = None
        if issued_by:
            issued_by_full_name = ' '.join(
                part for part in [issued_by.last_name, issued_by.first_name] if part
            ).strip()
            issued_by_profile = getattr(issued_by, 'role_profile', None)
            if issued_by_profile and issued_by_profile.role:
                issued_by_position = issued_by_profile.get_role_display()
            if issued_by_profile and issued_by_profile.base_avatar:
                try:
                    issued_by_avatar = request.build_absolute_uri(issued_by_profile.base_avatar.url)
                except Exception:
                    issued_by_avatar = None
            if issued_by_profile and issued_by_profile.employee_slug and is_employee_service_enabled():
                try:
                    issuer_employee_payload = get_employee_by_slug(issued_by_profile.employee_slug)
                    issued_by_position = str((issuer_employee_payload or {}).get('position', '')).strip() or issued_by_position
                except EmployeeServiceClientError:
                    pass

        qr_code_image = None
        if pending.qr_code_image:
            try:
                qr_code_image = pending.qr_code_image.url
            except Exception:
                qr_code_image = None

        signature_image = None
        if pending.signature_image:
            try:
                signature_image = pending.signature_image.url
            except Exception:
                signature_image = None

        warehouse_signature_image = None
        if pending.warehouse_signature_image:
            try:
                warehouse_signature_image = pending.warehouse_signature_image.url
            except Exception:
                warehouse_signature_image = None

        size_map = item.ppe_sizes if isinstance(item.ppe_sizes, dict) else {}
        products = [
            {
                'id': product.id,
                'name': product.name,
                'type_product': product.type_product,
                'type_product_display': product.get_type_product_display() if product.type_product else None,
                'renewal_months': int(product.renewal_months or 0),
                'size': size_map.get(str(product.id)) or '',
            }
            for product in item.ppeproduct.all()
        ]

        timeline = [
            {
                'key': 'created',
                'label': 'Заявка на выдачу создана',
                'timestamp': pending.created_at.isoformat() if pending.created_at else None,
                'actor': {
                    'id': pending.created_by.id if pending.created_by else None,
                    'username': pending.created_by.username if pending.created_by else '',
                    'full_name': ' '.join(
                        part for part in [
                            getattr(pending.created_by, 'last_name', ''),
                            getattr(pending.created_by, 'first_name', ''),
                        ] if part
                    ).strip() or (pending.created_by.username if pending.created_by else ''),
                },
                'description': 'Инициирована выдача СИЗ для сотрудника.',
            },
            {
                'key': 'employee_signed',
                'label': 'Сотрудник подписал выдачу',
                'timestamp': pending.employee_signed_at.isoformat() if pending.employee_signed_at else None,
                'actor': {
                    'id': employee.id,
                    'username': employee.tabel_number,
                    'full_name': ' '.join(
                        part for part in [employee.last_name, employee.first_name, employee.surname] if part
                    ).strip(),
                },
                'description': 'Сотрудник подтвердил получение СИЗ своей подписью.',
            },
            {
                'key': 'warehouse_signed',
                'label': 'Кладовщик подтвердил выдачу',
                'timestamp': pending.warehouse_signed_at.isoformat() if pending.warehouse_signed_at else None,
                'actor': {
                    'id': issued_by.id if issued_by else None,
                    'username': issued_by.username if issued_by else '',
                    'full_name': issued_by_full_name or (issued_by.username if issued_by else ''),
                },
                'description': 'Кладовщик завершил оформление и подтвердил выдачу.',
            },
            {
                'key': 'confirmed',
                'label': 'Выдача проведена в системе',
                'timestamp': pending.confirmed_at.isoformat() if pending.confirmed_at else None,
                'actor': {
                    'id': issued_by.id if issued_by else None,
                    'username': issued_by.username if issued_by else '',
                    'full_name': issued_by_full_name or (issued_by.username if issued_by else ''),
                },
                'description': 'Запись сохранена как итоговая выдача СИЗ.',
            },
        ]

        return Response(
            {
                'qr_token': str(pending.qr_token),
                'qr_frontend_path': pending.get_qr_frontend_path(),
                'qr_scan_url': request.build_absolute_uri(pending.get_qr_frontend_path()),
                'qr_code_image': qr_code_image,
                'employee': {
                    'id': employee.id,
                    'slug': employee.slug,
                    'first_name': employee.first_name,
                    'last_name': employee.last_name,
                    'surname': employee.surname,
                    'full_name': ' '.join(
                        part for part in [employee.last_name, employee.first_name, employee.surname] if part
                    ).strip(),
                    'tabel_number': employee.tabel_number,
                    'position': employee.position,
                    'department_name': employee.department.name if getattr(employee, 'department', None) else '',
                    'section_name': employee.section.name if getattr(employee, 'section', None) else '',
                    'base_image': employee_payload.get('base_image') or employee_payload.get('base_image_url'),
                    'base_image_data': employee_payload.get('base_image_data'),
                },
                'issue': {
                    'item_id': item.id,
                    'item_slug': item.slug,
                    'issued_at': item.issued_at.isoformat() if item.issued_at else None,
                    'confirmed_at': pending.confirmed_at.isoformat() if pending.confirmed_at else None,
                    'employee_signed_at': pending.employee_signed_at.isoformat() if pending.employee_signed_at else None,
                    'warehouse_signed_at': pending.warehouse_signed_at.isoformat() if pending.warehouse_signed_at else None,
                    'created_at': pending.created_at.isoformat() if pending.created_at else None,
                    'issued_by_info': {
                        'id': issued_by.id if issued_by else None,
                        'username': issued_by.username if issued_by else '',
                        'full_name': issued_by_full_name or (issued_by.username if issued_by else ''),
                        'first_name': issued_by.first_name if issued_by else '',
                        'last_name': issued_by.last_name if issued_by else '',
                        'position': issued_by_position,
                        'base_avatar': issued_by_avatar,
                    },
                    'created_by_info': {
                        'id': pending.created_by.id if pending.created_by else None,
                        'username': pending.created_by.username if pending.created_by else '',
                        'full_name': ' '.join(
                            part for part in [
                                getattr(pending.created_by, 'last_name', ''),
                                getattr(pending.created_by, 'first_name', ''),
                            ] if part
                        ).strip() or (pending.created_by.username if pending.created_by else ''),
                    },
                    'signature_image': signature_image,
                    'warehouse_signature_image': warehouse_signature_image,
                    'verified_image': item.image.url if item.image else None,
                },
                'products': products,
                'timeline': timeline,
            },
            status=status.HTTP_200_OK,
        )


class EmployeeFaceIdExemptionApiView(APIView):
    """
    Bo'lim boshliqlari (shift_head, sttl_head, czl_head, dispatcher) hodimlarning Face ID talab qilinishi holatini boshqarish uchun API.
    Faqat can_manage_face_id_control feature access'i yoqilgan rollar (admin va UserRole.MANAGER_TIER_ROLES) bu optsiyani change qila oladi.
    """
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _parse_requires_face_id_filter(raw_value):
        value = str(raw_value or '').strip().lower()
        if value in {'true', '1', 'yes'}:
            return True
        if value in {'false', '0', 'no'}:
            return False
        return None

    @staticmethod
    def get(request, *args, **kwargs):
        """Get list of employees with their Face ID requirement status."""
        permission_error = ensure_can_manage_face_id_control(request)
        if permission_error:
            return permission_error

        requires_face_id_filter = EmployeeFaceIdExemptionApiView._parse_requires_face_id_filter(
            request.query_params.get('requires_face_id_checkout')
        )

        if is_employee_service_enabled():
            try:
                payload = list_face_id_exemptions(
                    search=request.query_params.get('search', '').strip() or None,
                    page=request.query_params.get('page'),
                    page_size=request.query_params.get('page_size'),
                    requires_face_id_checkout=requires_face_id_filter,
                )
                if isinstance(payload, dict):
                    employees = [apply_local_face_id_override(employee) for employee in (payload.get('employees') or payload.get('results') or [])]
                    return Response({
                        'count': payload.get('count', 0),
                        'next': payload.get('next'),
                        'previous': payload.get('previous'),
                        'employees': employees,
                    }, status=status.HTTP_200_OK)
                employees = [apply_local_face_id_override(employee) for employee in (payload if isinstance(payload, list) else [])]
                if requires_face_id_filter is not None:
                    employees = [
                        employee for employee in employees
                        if bool(employee.get('requires_face_id_checkout')) is requires_face_id_filter
                    ]
                return Response({'count': len(employees), 'next': None, 'previous': None, 'employees': employees}, status=status.HTTP_200_OK)
            except EmployeeServiceClientError as exc:
                return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"count": 0, "next": None, "previous": None, "employees": []}, status=status.HTTP_200_OK)

    @staticmethod
    def patch(request, *args, **kwargs):
        """Update Face ID requirement status for an employee."""
        permission_error = ensure_can_manage_face_id_control(request)
        if permission_error:
            return permission_error

        employee_slug = kwargs.get('employee_slug')
        employee_id = kwargs.get('employee_id')
        if not employee_slug and not employee_id:
            return Response(
                {"error": "employee_slug или employee_id не передан"},
                status=status.HTTP_400_BAD_REQUEST
            )

        requires_face_id = request.data.get('requires_face_id_checkout')
        if requires_face_id is None:
            return Response(
                {"error": "requires_face_id_checkout не передан"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            employee = None
            target_slug = str(employee_slug or '').strip()
            if target_slug:
                employee = fetch_employee_by_slug_or_404(target_slug)
            elif employee_id:
                employee = fetch_employee_by_external_id_safe(employee_id)
                target_slug = str((employee or {}).get('slug', '')).strip()

            if not employee or not target_slug:
                return Response({"error": "Сотрудник не найден"}, status=status.HTTP_404_NOT_FOUND)

            remote_payload = update_face_id_exemption(target_slug, bool(requires_face_id))
            return Response(remote_payload, status=status.HTTP_200_OK)
        except EmployeeServiceClientError as exc:
            if should_fallback_from_employee_service_error(exc):
                local_payload = update_local_face_id_exemption(employee or {}, bool(requires_face_id))
                if local_payload is not None:
                    return Response(local_payload, status=status.HTTP_200_OK)
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class PendingIssueConfirmApiView(APIView):
    """Confirm pending issue with signature."""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _save_signature(image_field, signature_data: str, filename_prefix: str, timestamp):
        if not signature_data:
            raise ValueError("Подпись обязательна")

        if signature_data.startswith('data:image'):
            _, base64_data = signature_data.split(',', 1)
        else:
            base64_data = signature_data

        image_data = base64.b64decode(base64_data)
        image_field.save(
            f'{filename_prefix}_{timestamp.strftime("%Y%m%d%H%M%S")}.png',
            ContentFile(image_data),
            save=False,
        )

    @staticmethod
    def post(request, *args, **kwargs):
        pending_id = kwargs.get('pk')
        if not pending_id:
            return Response({"error": "ID not found"}, status=status.HTTP_400_BAD_REQUEST)

        pending = PendingItemIssue.objects.filter(id=pending_id).first()
        if not pending:
            return Response({"error": "Запись не найдена"}, status=status.HTTP_404_NOT_FOUND)

        # Check if expired
        now = timezone.now()
        if pending.status == PendingItemIssue.STATUS_PENDING and now > pending.expires_at:
            pending.status = PendingItemIssue.STATUS_EXPIRED
            pending.save(update_fields=['status'])

        if pending.status == PendingItemIssue.STATUS_EXPIRED:
            return Response({"error": "Время истекло. Начните заново.", "expired": True}, status=status.HTTP_400_BAD_REQUEST)

        if pending.status == PendingItemIssue.STATUS_CONFIRMED:
            return Response({
                "error": "Уже подтверждено",
                "confirmed": True,
                "item_slug": pending.confirmed_item.slug if pending.confirmed_item else None
            }, status=status.HTTP_400_BAD_REQUEST)

        # Get signature from request
        signature_data = request.data.get('signature')
        if not signature_data:
            return Response({"error": "Подпись обязательна"}, status=status.HTTP_400_BAD_REQUEST)

        # Step 1: employee signature
        if not pending.signature_image:
            try:
                PendingIssueConfirmApiView._save_signature(
                    pending.signature_image,
                    signature_data,
                    f'signature_employee_{pending.employee_service_id}',
                    now,
                )
                pending.employee_signed_at = now
                pending.save(update_fields=['signature_image', 'employee_signed_at'])
            except Exception as e:
                return Response({"error": f"Ошибка сохранения подписи: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

            return Response({
                'success': True,
                'step': 'employee_signed',
                'requires_warehouse_signature': True,
                'message': 'Подпись сотрудника сохранена. Требуется подпись кладовщика.',
            }, status=status.HTTP_200_OK)

        # Step 2: warehouse signature + final confirmation
        role = get_effective_user_role(request.user)
        if role not in [UserRole.ADMIN, UserRole.IT_CENTER, *UserRole.MANAGER_TIER_ROLES]:
            return Response(
                {"error": "Только администратор, IT Center или руководитель смены/ЦЗЛ/СТТЛ/диспетчер может подтверждать выдачу."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if pending.warehouse_signature_image:
            return Response({"error": "Подпись кладовщика уже сохранена"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            PendingIssueConfirmApiView._save_signature(
                pending.warehouse_signature_image,
                signature_data,
                f'signature_warehouse_{pending.employee_service_id}',
                now,
            )
        except Exception as e:
            return Response({"error": f"Ошибка сохранения подписи: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        # Now create the actual Item
        products = list(PPEProduct.objects.filter(id__in=pending.ppeproduct_ids))
        if not products:
            return Response({"error": "Средства защиты не найдены"}, status=status.HTTP_400_BAD_REQUEST)

        issued_at = now
        item = Item(
            issued_at=issued_at,
            issued_by=pending.created_by,
            addedUser=pending.created_by,
            updatedUser=pending.created_by,
            ppe_sizes=pending.ppe_sizes,
        )
        item.set_employee_snapshot(pending.employee_snapshot)

        # Copy verified image if exists
        if pending.verified_image:
            try:
                item.image.save(
                    f'item_{pending.employee_service_id}_{now.strftime("%Y%m%d%H%M%S")}.jpg',
                    pending.verified_image.file,
                    save=False
                )
            except Exception:
                pass

        item._history_user = pending.created_by
        item.save()
        item.ppeproduct.set(products)
        update_change_reason(item, f"Подтверждено с подписью сотрудника {pending.employee}")

        pending.warehouse_signed_at = now
        try:
            pending.generate_qr_code(request.build_absolute_uri(pending.get_qr_frontend_path()))
        except Exception:
            pass

        # Update pending issue
        pending.status = PendingItemIssue.STATUS_CONFIRMED
        pending.confirmed_at = now
        pending.confirmed_item = item
        pending.save(
            update_fields=[
                'warehouse_signature_image',
                'warehouse_signed_at',
                'qr_code_image',
                'status',
                'confirmed_at',
                'confirmed_item',
            ]
        )

        return Response({
            'success': True,
            'step': 'warehouse_signed',
            'item_slug': item.slug,
            'qr_token': str(pending.qr_token),
            'qr_frontend_path': pending.get_qr_frontend_path(),
            'qr_scan_url': request.build_absolute_uri(pending.get_qr_frontend_path()),
            'message': 'Выдача подтверждена',
        }, status=status.HTTP_200_OK)


class PendingIssueDirectConfirmApiView(APIView):
    """Direct confirmation without signatures, used by temporary modal flow."""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    @staticmethod
    def post(request, *args, **kwargs):
        pending_id = kwargs.get('pk')
        if not pending_id:
            return Response({"error": "ID not found"}, status=status.HTTP_400_BAD_REQUEST)

        permission_error = ensure_can_modify(request)
        if permission_error:
            return permission_error

        pending = PendingItemIssue.objects.filter(id=pending_id).first()
        if not pending:
            return Response({"error": "Запись не найдена"}, status=status.HTTP_404_NOT_FOUND)

        now = timezone.now()
        if pending.status == PendingItemIssue.STATUS_PENDING and now > pending.expires_at:
            pending.status = PendingItemIssue.STATUS_EXPIRED
            pending.save(update_fields=['status'])

        if pending.status == PendingItemIssue.STATUS_EXPIRED:
            return Response({"error": "Время истекло. Начните заново.", "expired": True}, status=status.HTTP_400_BAD_REQUEST)

        if pending.status == PendingItemIssue.STATUS_CONFIRMED:
            return Response({
                "error": "Уже подтверждено",
                "confirmed": True,
                "item_slug": pending.confirmed_item.slug if pending.confirmed_item else None,
            }, status=status.HTTP_400_BAD_REQUEST)

        products = list(PPEProduct.objects.filter(id__in=pending.ppeproduct_ids))
        if not products:
            return Response({"error": "Средства защиты не найдены"}, status=status.HTTP_400_BAD_REQUEST)

        item = Item(
            issued_at=now,
            issued_by=request.user,
            addedUser=request.user,
            updatedUser=request.user,
            ppe_sizes=pending.ppe_sizes,
        )
        item.set_employee_snapshot(pending.employee_snapshot)

        if pending.verified_image:
            try:
                item.image.save(
                    f'item_{pending.employee_service_id}_{now.strftime("%Y%m%d%H%M%S")}.jpg',
                    pending.verified_image.file,
                    save=False,
                )
            except Exception:
                pass

        item._history_user = request.user
        item.save()
        item.ppeproduct.set(products)
        update_change_reason(item, f"Подтверждено без подписи {pending.employee}")

        pending.employee_signed_at = now
        pending.warehouse_signed_at = now
        try:
            pending.generate_qr_code(request.build_absolute_uri(pending.get_qr_frontend_path()))
        except Exception:
            pass

        pending.status = PendingItemIssue.STATUS_CONFIRMED
        pending.confirmed_at = now
        pending.confirmed_item = item
        pending.save(
            update_fields=[
                'employee_signed_at',
                'warehouse_signed_at',
                'qr_code_image',
                'status',
                'confirmed_at',
                'confirmed_item',
            ]
        )

        return Response({
            'success': True,
            'step': 'direct_confirmed',
            'item_slug': item.slug,
            'qr_token': str(pending.qr_token),
            'qr_frontend_path': pending.get_qr_frontend_path(),
            'qr_scan_url': request.build_absolute_uri(pending.get_qr_frontend_path()),
            'message': 'Выдача подтверждена',
        }, status=status.HTTP_200_OK)


# class GetDataByIPApiView(APIView):
#     permission_classes = [AllowAny]

#     @staticmethod
#     def get(request, *args, **kwargs):
#         compyuter = get_object_or_404(Compyuter, ipadresss=kwargs.get('ip'))
#         serializer = AddCompyuterSerializer(compyuter)
#         return Response(serializer.data, status=status.HTTP_200_OK)


# def upload_excel(request):
#     if request.method == "POST" and request.FILES.get("file"):
#         file = request.FILES["file"]
#         try:
#             import_computers_from_excel(file)
#             messages.success(request, "✅ Excel ma'lumotlari yuklandi!")
#         except Exception as e:
#             messages.error(request, f"❌ Xatolik: {e}")
#         return redirect("upload-excel")
#     return render(request, "upload.html")


# # class GetComputerWithMac(APIView):
# #     authentication_classes = [TokenAuthentication]
# #     permission_classes = [IsAuthenticated]

# #     @staticmethod
# #     def get(request, *args, **kwargs):
# #         mac = getmac.get_mac_address()
# #         computer = Compyuter.objects.filter(mac_adress=mac)
# #         print(mac, "1111111111")
# #         serializer = CompyuterSerializer(computer, many=True)
# #         return Response(serializer.data, status=status.HTTP_200_OK)

# class GetComputerWithMac(APIView):
#     authentication_classes = [TokenAuthentication]
#     permission_classes = [IsAuthenticated]

#     @staticmethod
#     def get(request, *args, **kwargs):
#         # Foydalanuvchi IP manzilini olish
#         ip = request.META.get('REMOTE_ADDR')

#         # IP orqali MAC olish (Linux yoki Windows uchun)
#         import subprocess
#         import platform

#         if platform.system() == "Windows":
#             result = subprocess.run(["arp", "-a"], capture_output=True, text=True)
#             mac = None
#             for line in result.stdout.splitlines():
#                 if ip in line:
#                     mac = line.split()[1]
#                     break
#         else:
#             result = subprocess.run(["arp", "-n", ip], capture_output=True, text=True)
#             mac = result.stdout.split()[3] if result.stdout else None

#         # Kompyuter qidirish с оптимизацией
#         computer = Employee.objects.select_related(
#             'departament', 
#             'section', 
#             'warehouse_manager',
#             'type_compyuter',
#             'motherboard',
#             'motherboard_model',
#             'CPU',
#             'generation',
#             'frequency',
#             'HDD',
#             'SSD',
#             'disk_type',
#             'RAM_type',
#             'RAMSize',
#             'GPU',
#             'addedUser',
#             'updatedUser'
#         ).prefetch_related(
#             'printer',
#             'scaner',
#             'mfo',
#             'type_webcamera',
#             'model_webcam',
#             'type_monitor',
#             'program'
#         ).filter(mac_adress=mac)
        
#         serializer = EmployeeSerializer(computer, many=True)
#         return Response(serializer.data, status=status.HTTP_200_OK)

