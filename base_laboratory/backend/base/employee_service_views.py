from urllib.parse import quote, unquote, urlsplit

import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from users.authentication import ExpiringTokenAuthentication as TokenAuthentication
from users.models import UserRole, get_effective_user_role

from .employee_service_client import (
    list_departments,
    create_department,
    update_department,
    delete_department,
    list_sections,
    create_section,
    update_section,
    delete_section,
    list_employees,
    list_employee_base_image_change_logs,
    delete_employee_base_image_change_log,
    get_employee_by_slug,
    upsert_employee_payload,
    update_employee_payload,
    update_employee_base_image,
    EmployeeServiceClientError,
    is_employee_service_enabled,
)


User = get_user_model()


class EmployeeServicePagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class EmployeeServiceMediaProxyApiView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @staticmethod
    def get(request, *args, **kwargs):
        raw_path = unquote(str(request.query_params.get('path') or '').strip())
        if not raw_path or not raw_path.startswith('/media/') or '..' in raw_path:
            return Response({'error': 'Invalid media path'}, status=status.HTTP_400_BAD_REQUEST)

        service_base = str(getattr(settings, 'EMPLOYEE_SERVICE_BASE_URL', '') or '').strip()
        service_public = str(getattr(settings, 'EMPLOYEE_SERVICE_PUBLIC_URL', '') or '').strip()
        candidate_origins = []
        for raw_base in [service_base, service_public]:
            if not raw_base:
                continue
            parsed = urlsplit(raw_base)
            if not parsed.scheme or not parsed.netloc:
                continue
            origin = f'{parsed.scheme}://{parsed.netloc}'
            if origin not in candidate_origins:
                candidate_origins.append(origin)

        if not candidate_origins:
            return Response({'error': 'Employee service base URL is not configured'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        timeout = getattr(settings, 'EMPLOYEE_SERVICE_TIMEOUT', 15)
        verify_ssl = bool(getattr(settings, 'EMPLOYEE_SERVICE_VERIFY_SSL', False))
        upstream = None
        last_exception = None
        for origin in candidate_origins:
            media_url = f'{origin}{raw_path}'
            try:
                upstream = requests.get(media_url, timeout=timeout, stream=False, verify=verify_ssl)
            except requests.RequestException as exc:
                last_exception = exc
                continue

            if upstream.status_code < 400 and upstream.content:
                break

        if upstream is None:
            return Response({'error': f'Employee service media request failed: {last_exception}'}, status=status.HTTP_502_BAD_GATEWAY)

        if upstream.status_code >= 400 or not upstream.content:
            return Response({'error': 'Employee service media not found'}, status=upstream.status_code or status.HTTP_404_NOT_FOUND)

        response = HttpResponse(
            upstream.content,
            content_type=upstream.headers.get('Content-Type', 'application/octet-stream'),
            status=upstream.status_code,
        )
        cache_control = upstream.headers.get('Cache-Control')
        if cache_control:
            response['Cache-Control'] = cache_control
        return response


def normalize_employee_service_employee(employee):
    return {
        'id': employee.get('id'),
        'slug': employee.get('slug'),
        'external_id': employee.get('external_id'),
        'first_name': employee.get('first_name', ''),
        'last_name': employee.get('last_name', ''),
        'surname': employee.get('surname', ''),
        'tabel_number': employee.get('tabel_number', ''),
        'gender': employee.get('gender', ''),
        'height': employee.get('height'),
        'special_clothing_size': employee.get('special_clothing_size'),
        'clothe_size': employee.get('clothe_size'),
        'shoe_size': employee.get('shoe_size'),
        'jacket_size': employee.get('jacket_size'),
        'tshirt_size': employee.get('tshirt_size'),
        'position': employee.get('position', ''),
        'date_of_employment': employee.get('date_of_employment'),
        'date_of_change_position': employee.get('date_of_change_position'),
        'requires_face_id_checkout': employee.get('requires_face_id_checkout', False),
        'is_active': employee.get('is_active', True),
        'is_deleted': employee.get('is_deleted', False),
        'department_name': employee.get('department_name', ''),
        'boss_full_name': employee.get('boss_full_name', ''),
        'section_name': employee.get('section_name', ''),
        'base_image': employee.get('base_image'),
        'base_image_url': employee.get('base_image_url') or employee.get('base_image'),
        'metadata': employee.get('metadata', {}),
        'created_at': employee.get('created_at'),
        'updated_at': employee.get('updated_at'),
    }


def normalize_employee_service_department(department):
    return {
        'id': department.get('id'),
        'name': department.get('name', ''),
        'boss_full_name': department.get('boss_full_name', ''),
        'sort_order': department.get('sort_order', 0) or 0,
        'created_at': department.get('created_at'),
        'updated_at': department.get('updated_at'),
    }


def normalize_employee_service_section(section):
    return {
        'id': section.get('id'),
        'name': section.get('name', ''),
        'department': section.get('department'),
        'created_at': section.get('created_at'),
        'updated_at': section.get('updated_at'),
    }


def normalize_employee_service_log_image(value):
    raw = str(value or '').strip()
    if not raw:
        return ''
    if raw.startswith('/api/v1/employee-service/media-proxy/'):
        return raw
    if raw.startswith('/media/'):
        return f"/api/v1/employee-service/media-proxy/?path={quote(raw, safe='')}"
    if raw.startswith('http://') or raw.startswith('https://'):
        parsed = urlsplit(raw)
        if parsed.path.startswith('/media/'):
            path = parsed.path or '/'
            if parsed.query:
                path = f'{path}?{parsed.query}'
            return f"/api/v1/employee-service/media-proxy/?path={quote(path, safe='')}"
    return raw


def build_employee_service_actor_full_name(user):
    if user is None:
        return ''

    full_name = ' '.join(part for part in [str(getattr(user, 'first_name', '')).strip(), str(getattr(user, 'last_name', '')).strip()] if part)
    return full_name.strip()


def normalize_employee_service_base_image_change_log(entry, users_by_id=None, users_by_username=None):
    users_by_id = users_by_id or {}
    users_by_username = users_by_username or {}

    changed_by_user_id = str(entry.get('changed_by_user_id', '') or '').strip()
    changed_by_username = str(entry.get('changed_by_username', '') or '').strip()

    actor = None
    if changed_by_user_id:
        actor = users_by_id.get(changed_by_user_id)
    if actor is None and changed_by_username:
        actor = users_by_username.get(changed_by_username)

    return {
        'id': entry.get('id'),
        'employee_slug': entry.get('employee_slug', ''),
        'employee_full_name': entry.get('employee_full_name', ''),
        'employee_tabel_number': entry.get('employee_tabel_number', ''),
        'changed_by_username': changed_by_username,
        'changed_by_user_id': changed_by_user_id,
        'changed_by_full_name': build_employee_service_actor_full_name(actor),
        'changed_by_role': entry.get('changed_by_role', ''),
        'old_image': entry.get('old_image', ''),
        'old_image_url': normalize_employee_service_log_image(entry.get('old_image_url') or entry.get('old_image')),
        'new_image': entry.get('new_image', ''),
        'new_image_url': normalize_employee_service_log_image(entry.get('new_image_url') or entry.get('new_image')),
        'created_at': entry.get('created_at'),
    }


class EmployeeServiceDepartmentListApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    pagination_class = EmployeeServicePagination

    def get(self, request, *args, **kwargs):
        if not is_employee_service_enabled():
            return Response(
                {"error": "Employee service is not enabled"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        try:
            departments = list_departments()
            paginator = self.pagination_class()
            page = paginator.paginate_queryset(departments)
            
            if page is not None:
                return paginator.get_paginated_response([
                    normalize_employee_service_department(dept) for dept in page
                ])
            
            return Response([
                normalize_employee_service_department(dept) for dept in departments
            ])
        except EmployeeServiceClientError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request, *args, **kwargs):
        if not is_employee_service_enabled():
            return Response(
                {"error": "Employee service is not enabled"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        data = request.data
        payload = {
            'name': data.get('name', '').strip(),
            'boss_full_name': data.get('boss_full_name', '').strip(),
        }

        try:
            department = create_department(payload)
            return Response(
                normalize_employee_service_department(department),
                status=status.HTTP_201_CREATED
            )
        except EmployeeServiceClientError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class EmployeeServiceDepartmentDetailApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, department_id, *args, **kwargs):
        if not is_employee_service_enabled():
            return Response(
                {"error": "Employee service is not enabled"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        try:
            departments = list_departments()
            department = next((d for d in departments if str(d.get('id')) == str(department_id)), None)
            
            if not department:
                return Response({"error": "Department not found"}, status=status.HTTP_404_NOT_FOUND)
            
            return Response(normalize_employee_service_department(department))
        except EmployeeServiceClientError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, department_id, *args, **kwargs):
        if not is_employee_service_enabled():
            return Response(
                {"error": "Employee service is not enabled"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        data = request.data
        payload = {
            'name': data.get('name', '').strip(),
            'boss_full_name': data.get('boss_full_name', '').strip(),
        }

        try:
            department = update_department(department_id, payload)
            return Response(normalize_employee_service_department(department))
        except EmployeeServiceClientError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, department_id, *args, **kwargs):
        if not is_employee_service_enabled():
            return Response(
                {"error": "Employee service is not enabled"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        try:
            delete_department(department_id)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except EmployeeServiceClientError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class EmployeeServiceSectionListApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    pagination_class = EmployeeServicePagination

    def get(self, request, *args, **kwargs):
        if not is_employee_service_enabled():
            return Response(
                {"error": "Employee service is not enabled"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        try:
            sections = list_sections()
            paginator = self.pagination_class()
            page = paginator.paginate_queryset(sections)
            
            if page is not None:
                return paginator.get_paginated_response([
                    normalize_employee_service_section(section) for section in page
                ])
            
            return Response([
                normalize_employee_service_section(section) for section in sections
            ])
        except EmployeeServiceClientError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request, *args, **kwargs):
        if not is_employee_service_enabled():
            return Response(
                {"error": "Employee service is not enabled"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        data = request.data
        payload = {
            'name': data.get('name', '').strip(),
            'department_id': data.get('department_id'),
        }

        try:
            section = create_section(payload)
            return Response(
                normalize_employee_service_section(section),
                status=status.HTTP_201_CREATED
            )
        except EmployeeServiceClientError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class EmployeeServiceSectionDetailApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, section_id, *args, **kwargs):
        if not is_employee_service_enabled():
            return Response(
                {"error": "Employee service is not enabled"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        try:
            sections = list_sections()
            section = next((s for s in sections if str(s.get('id')) == str(section_id)), None)
            
            if not section:
                return Response({"error": "Section not found"}, status=status.HTTP_404_NOT_FOUND)
            
            return Response(normalize_employee_service_section(section))
        except EmployeeServiceClientError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, section_id, *args, **kwargs):
        if not is_employee_service_enabled():
            return Response(
                {"error": "Employee service is not enabled"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        data = request.data
        payload = {
            'name': data.get('name', '').strip(),
            'department_id': data.get('department_id'),
        }

        try:
            section = update_section(section_id, payload)
            return Response(normalize_employee_service_section(section))
        except EmployeeServiceClientError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, section_id, *args, **kwargs):
        if not is_employee_service_enabled():
            return Response(
                {"error": "Employee service is not enabled"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        try:
            delete_section(section_id)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except EmployeeServiceClientError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class EmployeeServiceEmployeeListApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    pagination_class = EmployeeServicePagination

    def get(self, request, *args, **kwargs):
        if not is_employee_service_enabled():
            return Response(
                {"error": "Employee service is not enabled"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        search = request.query_params.get('search', '').strip()
        try:
            payload = list_employees(
                search=search if search else None,
                source_system=None,
                no_pagination=False,
                page=request.query_params.get('page'),
                page_size=request.query_params.get('page_size'),
            )
            if isinstance(payload, dict):
                employees = payload.get('results', [])
                return Response({
                    'count': payload.get('count', 0),
                    'next': payload.get('next'),
                    'previous': payload.get('previous'),
                    'results': [normalize_employee_service_employee(emp) for emp in employees],
                })

            employees = payload if isinstance(payload, list) else []
            paginator = self.pagination_class()
            page = paginator.paginate_queryset(employees, request, view=self)

            if page is not None:
                return paginator.get_paginated_response([
                    normalize_employee_service_employee(emp) for emp in page
                ])

            return Response([
                normalize_employee_service_employee(emp) for emp in employees
            ])
        except EmployeeServiceClientError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class EmployeeServiceBaseImageChangeLogListApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _build_actor_maps(results):
        raw_user_ids = {
            str(item.get('changed_by_user_id', '') or '').strip()
            for item in results
            if str(item.get('changed_by_user_id', '') or '').strip()
        }
        raw_usernames = {
            str(item.get('changed_by_username', '') or '').strip()
            for item in results
            if str(item.get('changed_by_username', '') or '').strip()
        }

        users_by_id = {}
        if raw_user_ids:
            for user in User.objects.filter(pk__in=raw_user_ids).only('id', 'username', 'first_name', 'last_name'):
                users_by_id[str(user.pk)] = user

        users_by_username = {}
        unresolved_usernames = raw_usernames - {str(user.username).strip() for user in users_by_id.values() if str(user.username).strip()}
        if unresolved_usernames:
            for user in User.objects.filter(username__in=unresolved_usernames).only('id', 'username', 'first_name', 'last_name'):
                users_by_username[str(user.username).strip()] = user

        return users_by_id, users_by_username

    def get(self, request, *args, **kwargs):
        if not is_employee_service_enabled():
            return Response(
                {"error": "Employee service is not enabled"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        role = get_effective_user_role(request.user)
        if role not in [UserRole.ADMIN, *UserRole.MANAGER_TIER_ROLES]:
            return Response(
                {"error": "Only admin and shift/sttl/czl head or dispatcher can view employee base image change logs"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            payload = list_employee_base_image_change_logs(
                search=str(request.query_params.get('search', '') or '').strip() or None,
                changed_by_username=str(request.query_params.get('changed_by_username', '') or '').strip() or None,
                employee_slug=str(request.query_params.get('employee_slug', '') or '').strip() or None,
                date_from=str(request.query_params.get('date_from', '') or '').strip() or None,
                date_to=str(request.query_params.get('date_to', '') or '').strip() or None,
                page=request.query_params.get('page') or None,
                page_size=request.query_params.get('page_size') or None,
            )
            results = payload.get('results') if isinstance(payload, dict) else payload
            if not isinstance(results, list):
                results = []

            users_by_id, users_by_username = self._build_actor_maps(results)
            normalized_results = [
                normalize_employee_service_base_image_change_log(item, users_by_id=users_by_id, users_by_username=users_by_username)
                for item in results
            ]
            return Response({
                'count': int(payload.get('count', len(normalized_results))) if isinstance(payload, dict) else len(normalized_results),
                'next': payload.get('next') if isinstance(payload, dict) else None,
                'previous': payload.get('previous') if isinstance(payload, dict) else None,
                'results': normalized_results,
            })
        except EmployeeServiceClientError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class EmployeeServiceBaseImageChangeLogDetailApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request, log_id, *args, **kwargs):
        if not is_employee_service_enabled():
            return Response(
                {"error": "Employee service is not enabled"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        role = get_effective_user_role(request.user)
        if role != UserRole.ADMIN:
            return Response(
                {"error": "Only admin can delete employee base image change logs"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            delete_employee_base_image_change_log(
                log_id,
                actor_user_id=request.user.pk,
                actor_username=getattr(request.user, 'username', ''),
                actor_role=role,
            )
            return Response(status=status.HTTP_204_NO_CONTENT)
        except EmployeeServiceClientError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request, *args, **kwargs):
        if not is_employee_service_enabled():
            return Response(
                {"error": "Employee service is not enabled"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        data = request.data
        payload = {
            'source_system': 'tb-project',
            'first_name': data.get('first_name', '').strip(),
            'last_name': data.get('last_name', '').strip(),
            'surname': data.get('surname', '').strip(),
            'tabel_number': data.get('tabel_number', '').strip(),
            'gender': data.get('gender', '').strip(),
            'height': data.get('height'),
            'clothe_size': data.get('clothe_size', '').strip(),
            'shoe_size': data.get('shoe_size', '').strip(),
            'position': data.get('position', '').strip(),
            'date_of_employment': data.get('date_of_employment', ''),
            'date_of_change_position': data.get('date_of_change_position', ''),
            'requires_face_id_checkout': str(bool(data.get('requires_face_id_checkout', False))).lower(),
            'is_active': str(bool(data.get('is_active', True))).lower(),
            'is_deleted': str(bool(data.get('is_deleted', False))).lower(),
            'department_name': data.get('department_name', '').strip(),
            'boss_full_name': data.get('boss_full_name', '').strip(),
            'section_name': data.get('section_name', '').strip(),
            'metadata': '{"origin": "tb-project"}',
        }

        # Remove None values
        payload = {k: v for k, v in payload.items() if v is not None and v != ''}

        files = None
        if 'base_image' in request.FILES:
            files = {'base_image': request.FILES['base_image']}

        try:
            employee = upsert_employee_payload(payload, files)
            return Response(
                normalize_employee_service_employee(employee),
                status=status.HTTP_201_CREATED
            )
        except EmployeeServiceClientError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class EmployeeServiceEmployeeDetailApiView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, slug, *args, **kwargs):
        if not is_employee_service_enabled():
            return Response(
                {"error": "Employee service is not enabled"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        try:
            employee = get_employee_by_slug(slug)
            if not employee:
                return Response({"error": "Employee not found"}, status=status.HTTP_404_NOT_FOUND)
            
            return Response(normalize_employee_service_employee(employee))
        except EmployeeServiceClientError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, slug, *args, **kwargs):
        if not is_employee_service_enabled():
            return Response(
                {"error": "Employee service is not enabled"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        if 'base_image' in request.FILES:
            role = get_effective_user_role(request.user)
            if role not in [UserRole.ADMIN, *UserRole.MANAGER_TIER_ROLES]:
                return Response(
                    {"error": "Only admin and shift/sttl/czl head or dispatcher can update employee base image"},
                    status=status.HTTP_403_FORBIDDEN,
                )

        data = request.data
        payload = {
            'first_name': data.get('first_name', '').strip(),
            'last_name': data.get('last_name', '').strip(),
            'surname': data.get('surname', '').strip(),
            'tabel_number': data.get('tabel_number', '').strip(),
            'gender': data.get('gender', '').strip(),
            'height': data.get('height'),
            'clothe_size': data.get('clothe_size', '').strip(),
            'shoe_size': data.get('shoe_size', '').strip(),
            'position': data.get('position', '').strip(),
            'date_of_employment': data.get('date_of_employment', ''),
            'date_of_change_position': data.get('date_of_change_position', ''),
            'requires_face_id_checkout': str(bool(data.get('requires_face_id_checkout', False))).lower(),
            'is_active': str(bool(data.get('is_active', True))).lower(),
            'is_deleted': str(bool(data.get('is_deleted', False))).lower(),
            'department_name': data.get('department_name', '').strip(),
            'boss_full_name': data.get('boss_full_name', '').strip(),
            'section_name': data.get('section_name', '').strip(),
        }

        # Remove None values
        payload = {k: v for k, v in payload.items() if v is not None and v != ''}

        files = None
        if 'base_image' in request.FILES:
            try:
                employee = update_employee_base_image(
                    slug,
                    request.FILES['base_image'],
                    actor_user_id=str(getattr(request.user, 'pk', '') or ''),
                    actor_username=str(getattr(request.user, 'username', '') or ''),
                    actor_role=str(get_effective_user_role(request.user) or ''),
                )
                return Response(normalize_employee_service_employee(employee))
            except EmployeeServiceClientError as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        try:
            employee = update_employee_payload(slug, payload, files)
            return Response(normalize_employee_service_employee(employee))
        except EmployeeServiceClientError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, slug, *args, **kwargs):
        if not is_employee_service_enabled():
            return Response(
                {"error": "Employee service is not enabled"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        try:
            # Soft delete by setting is_deleted to true
            payload = {'is_deleted': 'true'}
            update_employee_payload(slug, payload)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except EmployeeServiceClientError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
