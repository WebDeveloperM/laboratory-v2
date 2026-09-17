from io import BytesIO
import logging
import json as json_lib

import requests
from django.conf import settings


logger = logging.getLogger(__name__)


class EmployeeServiceClientError(Exception):
    pass


def is_employee_service_enabled() -> bool:
    return bool(getattr(settings, 'EMPLOYEE_SERVICE_ENABLED', False) and getattr(settings, 'EMPLOYEE_SERVICE_BASE_URL', '').strip())


def _get_base_url() -> str:
    return str(getattr(settings, 'EMPLOYEE_SERVICE_BASE_URL', '')).rstrip('/')


def _get_timeout() -> int:
    return int(getattr(settings, 'EMPLOYEE_SERVICE_TIMEOUT', 15))


def _get_verify_ssl() -> bool:
    return bool(getattr(settings, 'EMPLOYEE_SERVICE_VERIFY_SSL', False))


def _build_headers(extra_headers=None) -> dict:
    headers = {'Accept': 'application/json'}
    api_key = str(getattr(settings, 'EMPLOYEE_SERVICE_API_KEY', '')).strip()
    if api_key:
        headers['X-Employee-Service-Key'] = api_key
    if extra_headers:
        headers.update({key: value for key, value in extra_headers.items() if value not in [None, '']})
    return headers


def _request(method: str, path: str, *, data=None, json=None, files=None, params=None, extra_headers=None):
    if not is_employee_service_enabled():
        raise EmployeeServiceClientError('Employee service is not enabled.')

    url = f'{_get_base_url()}{path}'
    try:
        response = requests.request(
            method=method,
            url=url,
            headers=_build_headers(extra_headers),
            data=data,
            json=json,
            files=files,
            params=params,
            timeout=_get_timeout(),
            verify=_get_verify_ssl(),
        )
    except requests.RequestException as exc:
        raise EmployeeServiceClientError(f'Employee service request failed: {exc}') from exc

    content_type = response.headers.get('Content-Type', '')
    payload = response.json() if 'application/json' in content_type else {'detail': response.text}
    if response.status_code >= 400:
        raise EmployeeServiceClientError(payload.get('error') or payload.get('detail') or f'Employee service returned {response.status_code}')
    return payload


def _stringify_list(values):
    normalized = [str(value).strip() for value in values if str(value).strip()]
    return ','.join(normalized)


def _image_to_file_tuple(image_field):
    if not image_field:
        return None
    try:
        image_field.open('rb')
        content = image_field.read()
    finally:
        try:
            image_field.close()
        except Exception:
            pass

    if not content:
        return None

    filename = image_field.name.split('/')[-1] or 'employee.jpg'
    return filename, BytesIO(content), 'image/jpeg'


def build_employee_service_payload(employee):
    return {
        'source_system': 'tb-project',
        'external_id': str(employee.id),
        'first_name': employee.first_name,
        'last_name': employee.last_name,
        'surname': employee.surname,
        'tabel_number': employee.tabel_number,
        'gender': employee.gender,
        'height': employee.height,
        'clothe_size': employee.clothe_size,
        'shoe_size': employee.shoe_size,
        'position': employee.position or '',
        'date_of_employment': employee.date_of_employment.isoformat() if employee.date_of_employment else '',
        'date_of_change_position': employee.date_of_change_position.isoformat() if employee.date_of_change_position else '',
        'requires_face_id_checkout': str(bool(employee.requires_face_id_checkout)).lower(),
        'is_active': str(bool(employee.isActive)).lower(),
        'is_deleted': str(bool(employee.is_deleted)).lower(),
        'department_name': employee.department.name if employee.department_id else '',
        'boss_full_name': employee.department.boss_fullName if employee.department_id else '',
        'section_name': employee.section.name if employee.section_id else '',
        'metadata': json_lib.dumps({'origin': 'tb-project'}),
    }


def sync_employee_to_service(employee):
    if not is_employee_service_enabled():
        return None

    payload = build_employee_service_payload(employee)

    files = None
    image_tuple = _image_to_file_tuple(getattr(employee, 'base_image', None))
    if image_tuple is not None:
        files = {'base_image': image_tuple}

    try:
        return _request('POST', '/api/v1/employees/upsert/', data=payload, files=files)
    except EmployeeServiceClientError:
        logger.exception('Employee sync to external service failed for employee_id=%s', employee.id)
        raise


def verify_employee_face(slug: str, payload: dict):
    return _request('POST', f'/api/v1/employees/{slug}/face-verify/', json=payload)


def detect_face_boxes(payload: dict):
    return _request('POST', '/api/v1/face/detect-boxes/', json=payload)


def list_face_id_exemptions(*, search=None, page=None, page_size=None, no_pagination=False, requires_face_id_checkout=None):
    params = {}
    if search:
        params['search'] = search
    if page is not None:
        params['page'] = str(page)
    if page_size is not None:
        params['page_size'] = str(page_size)
    if requires_face_id_checkout is not None:
        params['requires_face_id_checkout'] = str(bool(requires_face_id_checkout)).lower()
    if no_pagination:
        params['no_pagination'] = 'true'
    return _request('GET', '/api/v1/employees/face-id-exemptions/', params=params)


def list_employee_base_image_change_logs(*, search=None, changed_by_username=None, employee_slug=None, date_from=None, date_to=None, page=None, page_size=None):
    params = {}
    if search:
        params['search'] = search
    if changed_by_username:
        params['changed_by_username'] = changed_by_username
    if employee_slug:
        params['employee_slug'] = employee_slug
    if date_from:
        params['date_from'] = date_from
    if date_to:
        params['date_to'] = date_to
    if page is not None:
        params['page'] = str(page)
    if page_size is not None:
        params['page_size'] = str(page_size)
    return _request('GET', '/api/v1/employees/base-image-change-logs/', params=params)


def delete_employee_base_image_change_log(log_id, *, actor_user_id=None, actor_username=None, actor_role=None):
    return _request(
        'DELETE',
        f'/api/v1/employees/base-image-change-logs/{log_id}/',
        extra_headers={
            'X-Actor-User-Id': str(actor_user_id or '').strip(),
            'X-Actor-Username': str(actor_username or '').strip(),
            'X-Actor-Role': str(actor_role or '').strip(),
        },
    )


def update_face_id_exemption(slug: str, requires_face_id_checkout: bool):
    return _request(
        'PATCH',
        f'/api/v1/employees/{slug}/face-id-exemption/',
        json={'requires_face_id_checkout': requires_face_id_checkout},
    )


def list_employees(*, search=None, tabel_number=None, external_id=None, external_ids=None, slugs=None, department_id=None, source_system='tb-project', no_pagination=True, page=None, page_size=None):
    params = {}
    if source_system:
        params['source_system'] = source_system
    if no_pagination:
        params['no_pagination'] = 'true'
    if search:
        params['search'] = search
    if tabel_number:
        params['tabel_number'] = tabel_number
    if external_id:
        params['external_id'] = str(external_id)
    if external_ids:
        params['external_ids'] = _stringify_list(external_ids)
    if slugs:
        params['slugs'] = _stringify_list(slugs)
    if department_id is not None and str(department_id).strip():
        params['department_id'] = str(department_id).strip()
    if page is not None:
        params['page'] = str(page)
    if page_size is not None:
        params['page_size'] = str(page_size)
    return _request('GET', '/api/v1/employees/', params=params)


def list_departments():
    return _request('GET', '/api/v1/departments/')


def create_department(payload: dict):
    return _request('POST', '/api/v1/departments/', json=payload)


def update_department(department_id, payload: dict):
    return _request('PUT', f'/api/v1/departments/{department_id}/', json=payload)


def delete_department(department_id):
    return _request('DELETE', f'/api/v1/departments/{department_id}/')


def list_sections():
    return _request('GET', '/api/v1/sections/')


def create_section(payload: dict):
    return _request('POST', '/api/v1/sections/', json=payload)


def update_section(section_id, payload: dict):
    return _request('PUT', f'/api/v1/sections/{section_id}/', json=payload)


def delete_section(section_id):
    return _request('DELETE', f'/api/v1/sections/{section_id}/')


def download_employee_image(image_url):
    if not image_url or not is_employee_service_enabled():
        return None

    base_url = _get_base_url()
    if image_url.startswith('/'):
        image_url = f'{base_url}{image_url}'
    elif not image_url.startswith('http'):
        image_url = f'{base_url}/{image_url}'

    try:
        response = requests.get(
            image_url,
            headers=_build_headers(),
            timeout=_get_timeout(),
            verify=_get_verify_ssl(),
        )
        if response.status_code == 200 and response.content:
            return response.content
    except requests.RequestException:
        pass
    return None


def get_employee_by_slug(slug):
    if not slug:
        return None
    result = list_employees(slugs=slug)
    employees = result if isinstance(result, list) else result.get('results', []) if isinstance(result, dict) else []
    for emp in employees:
        if emp.get('slug') == slug:
            return emp
    return None


def get_employee_by_slug(slug: str):
    return _request('GET', f'/api/v1/employees/{slug}/')


def get_employee_by_external_id(external_id, *, source_system='tb-project'):
    payload = list_employees(external_id=external_id, source_system=source_system)
    employees = payload if isinstance(payload, list) else payload.get('results') or payload.get('employees') or payload.get('data') or payload
    if isinstance(employees, list) and employees:
        return employees[0]
    return None


def get_employees_by_external_ids(external_ids, *, source_system='tb-project'):
    payload = list_employees(external_ids=external_ids, source_system=source_system)
    employees = payload if isinstance(payload, list) else payload.get('results') or payload.get('employees') or payload.get('data') or payload
    if not isinstance(employees, list):
        return {}
    return {str(employee.get('external_id') or employee.get('id')): employee for employee in employees}


def get_employees_by_slugs(slugs, *, source_system='tb-project'):
    payload = list_employees(slugs=slugs, source_system=source_system)
    employees = payload if isinstance(payload, list) else payload.get('results') or payload.get('employees') or payload.get('data') or payload
    if not isinstance(employees, list):
        return {}
    return {str(employee.get('slug')): employee for employee in employees if employee.get('slug')}


def upsert_employee_payload(payload: dict, files=None):
    return _request('POST', '/api/v1/employees/upsert/', data=payload, files=files)


def update_employee_payload(slug: str, payload: dict, files=None):
    return _request('PATCH', f'/api/v1/employees/{slug}/', data=payload, files=files)


def update_employee_base_image(slug: str, file_obj, *, actor_user_id='', actor_username='', actor_role=''):
    extra_headers = {
        'X-Actor-User-Id': str(actor_user_id or '').strip(),
        'X-Actor-Username': str(actor_username or '').strip(),
        'X-Actor-Role': str(actor_role or '').strip(),
    }
    return _request(
        'PATCH',
        f'/api/v1/employees/{slug}/base-image/',
        files={'base_image': file_obj},
        extra_headers=extra_headers,
    )


def exchange_bnpzid_code(code: str, *, redirect_uri: str = ''):
    return _request(
        'POST',
        '/api/v1/auth/bnpzid/exchange/',
        json={
            'client_id': str(getattr(settings, 'BNPZID_CLIENT_ID', '')).strip(),
            'client_secret': str(getattr(settings, 'BNPZID_CLIENT_SECRET', '')).strip(),
            'redirect_uri': redirect_uri,
            'code': code,
        },
    )