from types import SimpleNamespace
from urllib.parse import quote, urlparse


def _normalize_remote_media_reference(value):
    if not value:
        return value

    raw = str(value).strip()
    if not raw or raw.startswith('data:'):
        return raw

    try:
        parsed = urlparse(raw)
    except Exception:
        return raw

    internal_hosts = {'employee-service', 'host.docker.internal', 'localhost', '127.0.0.1'}
    is_internal_media = (
        parsed.scheme in {'http', 'https'}
        and parsed.netloc
        and parsed.hostname in internal_hosts
        and parsed.path.startswith('/media/')
    )

    if not is_internal_media:
        return raw

    path = parsed.path or '/'
    if parsed.query:
        path = f'{path}?{parsed.query}'

    return f"/api/v1/employee-service/media-proxy/?path={quote(path, safe='')}"


def _as_namespace(value):
    if isinstance(value, dict):
        return SnapshotNamespace({key: _as_namespace(item) for key, item in value.items()})
    if isinstance(value, list):
        return [_as_namespace(item) for item in value]
    return value


class SnapshotNamespace(SimpleNamespace):
    def __init__(self, source=None, **kwargs):
        payload = dict(source or {})
        payload.update(kwargs)
        super().__init__(**payload)

    def __bool__(self):
        return bool(self.__dict__)

    def __str__(self):
        full_name = getattr(self, 'full_name', '').strip()
        if full_name:
            return full_name
        parts = [
            str(getattr(self, 'last_name', '') or '').strip(),
            str(getattr(self, 'first_name', '') or '').strip(),
            str(getattr(self, 'surname', '') or '').strip(),
        ]
        label = ' '.join(part for part in parts if part).strip()
        return label or str(getattr(self, 'tabel_number', '') or '').strip() or 'Employee'


def _serialize_model_employee(payload):
    department = getattr(payload, 'department', None)
    section = getattr(payload, 'section', None)
    base_image_field = getattr(payload, 'base_image', None)
    base_image_url = None
    if base_image_field:
        try:
            base_image_url = base_image_field.url
        except ValueError:
            base_image_url = None

    return {
        'id': getattr(payload, 'id', None),
        'external_id': str(getattr(payload, 'employee_service_id', None) or getattr(payload, 'id', '') or '').strip(),
        'source_system': 'tb-project',
        'slug': getattr(payload, 'slug', '') or '',
        'first_name': getattr(payload, 'first_name', '') or '',
        'last_name': getattr(payload, 'last_name', '') or '',
        'surname': getattr(payload, 'surname', '') or '',
        'tabel_number': getattr(payload, 'tabel_number', '') or '',
        'gender': getattr(payload, 'gender', '') or '',
        'height': getattr(payload, 'height', '') or '',
        'special_clothing_size': getattr(payload, 'special_clothing_size', '') or '',
        'clothe_size': getattr(payload, 'clothe_size', '') or '',
        'shoe_size': getattr(payload, 'shoe_size', '') or '',
        'jacket_size': getattr(payload, 'jacket_size', '') or '',
        'tshirt_size': getattr(payload, 'tshirt_size', '') or '',
        'phone_number_1': getattr(payload, 'phone_number_1', '') or '',
        'phone_number_2': getattr(payload, 'phone_number_2', '') or '',
        'position': getattr(payload, 'position', '') or '',
        'date_of_employment': getattr(payload, 'date_of_employment', None),
        'date_of_change_position': getattr(payload, 'date_of_change_position', None),
        'requires_face_id_checkout': bool(getattr(payload, 'requires_face_id_checkout', True)),
        'base_image': base_image_url,
        'base_image_url': base_image_url,
        'base_image_data': None,
        'department': {
            'id': getattr(department, 'id', None),
            'name': getattr(department, 'name', '') or '',
            'boss_fullName': getattr(department, 'boss_fullName', '') or '',
            'sort_order': getattr(department, 'sort_order', 0) or 0,
        },
        'section': {
            'id': getattr(section, 'id', None),
            'name': getattr(section, 'name', '') or '',
            'department_id': getattr(section, 'department_id', None) or getattr(department, 'id', None),
        },
        'metadata': {},
    }


def normalize_employee_payload(payload):
    if payload is not None and not isinstance(payload, dict):
        payload = _serialize_model_employee(payload)

    source = dict(payload or {})
    department = source.get('department') or {}
    section = source.get('section') or {}
    full_name = source.get('full_name')
    if not full_name:
        full_name = ' '.join(
            part for part in [
                str(source.get('last_name') or '').strip(),
                str(source.get('first_name') or '').strip(),
                str(source.get('surname') or '').strip(),
            ]
            if part
        ).strip()

    base_image = _normalize_remote_media_reference(source.get('base_image') or source.get('base_image_url'))
    base_image_url = _normalize_remote_media_reference(source.get('base_image_url') or source.get('base_image'))

    normalized = {
        'id': source.get('id'),
        'external_id': str(source.get('external_id') or '').strip(),
        'source_system': source.get('source_system') or 'tb-project',
        'slug': source.get('slug') or '',
        'first_name': source.get('first_name') or '',
        'last_name': source.get('last_name') or '',
        'surname': source.get('surname') or '',
        'full_name': full_name,
        'tabel_number': source.get('tabel_number') or '',
        'gender': source.get('gender') or '',
        'height': source.get('height') or '',
        'special_clothing_size': source.get('special_clothing_size') or '',
        'clothe_size': source.get('clothe_size') or '',
        'shoe_size': source.get('shoe_size') or '',
        'jacket_size': source.get('jacket_size') or '',
        'tshirt_size': source.get('tshirt_size') or '',
        'phone_number_1': source.get('phone_number_1') or '',
        'phone_number_2': source.get('phone_number_2') or '',
        'position': source.get('position') or '',
        'date_of_employment': source.get('date_of_employment'),
        'date_of_change_position': source.get('date_of_change_position'),
        'requires_face_id_checkout': bool(source.get('requires_face_id_checkout', True)),
        'base_image': base_image,
        'base_image_url': base_image_url,
        'base_image_data': source.get('base_image_data'),
        'department': {
            'id': department.get('id'),
            'name': department.get('name') or source.get('department_name') or '',
            'boss_fullName': department.get('boss_fullName') or department.get('boss_full_name') or source.get('boss_full_name') or '',
            'sort_order': department.get('sort_order') or source.get('department_sort_order') or 0,
        },
        'section': {
            'id': section.get('id'),
            'name': section.get('name') or source.get('section_name') or '',
            'department_id': section.get('department_id') or department.get('id'),
        },
        'metadata': source.get('metadata') or {},
    }
    return normalized


def build_employee_snapshot(payload):
    return normalize_employee_payload(payload)


def build_employee_namespace(payload):
    return _as_namespace(normalize_employee_payload(payload))