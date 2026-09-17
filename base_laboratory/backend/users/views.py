from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from django.core.files.base import ContentFile
from django.shortcuts import get_object_or_404
from django.utils.text import slugify
import base64
import binascii
import re
import secrets
import string
from io import BytesIO
from PIL import Image
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from base.employee_service_client import exchange_bnpzid_code, EmployeeServiceClientError, is_employee_service_enabled, list_employees, get_employee_by_slug, get_employees_by_slugs, download_employee_image, verify_employee_face
from .authentication import ExpiringTokenAuthentication as TokenAuthentication
from rest_framework.permissions import IsAuthenticated, AllowAny

from django.utils.timezone import now
from rest_framework.response import Response
from rest_framework.views import APIView
from transliterate import translit
from .models import (
    CustomToken,
    ROLE_FEATURE_ACCESS_FIELD_MAP,
    ROLE_PAGE_ACCESS_FIELD_MAP,
    get_effective_user_role,
    get_feature_access_for_role,
    get_page_access_for_role,
    get_role_page_access_instance,
    UserRole,
)


FACE_ID_VERIFY_THRESHOLD = float(getattr(settings, 'FACE_SIMILARITY_THRESHOLD', 72.0))
FACE_ID_MATCH_THRESHOLD = float(getattr(settings, 'FACE_ID_LOGIN_THRESHOLD', FACE_ID_VERIFY_THRESHOLD))
FACE_ID_MATCH_MIN_GAP = float(getattr(settings, 'FACE_ID_LOGIN_MIN_GAP', 6.0))
FACE_ID_CAPTURE_REQUIRED_MESSAGE = 'Посмотрите в камеру и сделайте один четкий снимок лица.'


def build_login_response(user):
    token, created = CustomToken.objects.get_or_create(user=user)

    if not created and token.is_expired():
        token.delete()
        token = CustomToken.objects.create(user=user)
    else:
        token.expires_at = now() + CustomToken.get_session_ttl()
        token.save(update_fields=['expires_at'])

    role = get_effective_user_role(user)
    return {
        'token': token.key,
        'expires_at': token.expires_at,
        'firstname': user.first_name,
        'lastname': user.last_name,
        'username': user.username,
        'role': role,
        'page_access': get_page_access_for_role(role),
        'feature_access': get_feature_access_for_role(role),
        'permissions': {
            'can_edit': role in [UserRole.ADMIN, UserRole.IT_CENTER, *UserRole.MANAGER_TIER_ROLES],
            'can_delete': role in [UserRole.ADMIN, UserRole.IT_CENTER],
            'view_only': role == UserRole.USER,
            'can_manage_employees': role in [UserRole.ADMIN, UserRole.IT_CENTER],
            'can_manage_page_access': role == UserRole.ADMIN,
        },
    }


def generate_user_password(length=10):
    alphabet = string.ascii_letters + string.digits
    while True:
        password = ''.join(secrets.choice(alphabet) for _ in range(length))
        if any(char.islower() for char in password) and any(char.isupper() for char in password) and any(char.isdigit() for char in password):
            return password


def normalize_username_piece(value: str) -> str:
    text = str(value or '').strip()
    if not text:
        return ''

    try:
        text = translit(text, 'ru', reversed=True)
    except Exception:
        pass

    normalized = slugify(text).replace('-', '_')
    normalized = re.sub(r'_+', '_', normalized).strip('_')
    return normalized


def build_settings_username(employee: dict) -> str:
    first_name = normalize_username_piece(str(employee.get('first_name', '')).strip())
    last_name = normalize_username_piece(str(employee.get('last_name', '')).strip())
    employee_login = normalize_username_piece(str(employee.get('login', '')).strip())
    tabel_number = normalize_username_piece(str(employee.get('tabel_number', '')).strip())
    employee_slug = normalize_username_piece(str(employee.get('slug', '')).strip())

    base_username = '_'.join(part for part in [first_name, last_name] if part)
    return base_username or employee_login or tabel_number or employee_slug or 'user'


def ensure_unique_settings_username(base_username: str) -> str:
    candidate = base_username
    suffix = 1
    while User.objects.filter(username=candidate).exists():
        suffix += 1
        candidate = f'{base_username}_{suffix}'
    return candidate


def rewrite_employee_image_url(url: str | None) -> str | None:
    normalized = str(url or '').strip()
    if not normalized:
        return None

    internal_base = str(getattr(settings, 'EMPLOYEE_SERVICE_BASE_URL', '')).rstrip('/')
    public_base = str(getattr(settings, 'EMPLOYEE_SERVICE_PUBLIC_URL', '')).rstrip('/')
    if internal_base and public_base and normalized.startswith(internal_base):
        return normalized.replace(internal_base, public_base, 1)

    return normalized


def validate_settings_username(username: str, *, exclude_user_id: int | None = None) -> str:
    normalized = str(username or '').strip()
    if not normalized:
        raise ValueError('Логин обязателен.')
    if len(normalized) < 3:
        raise ValueError('Логин должен содержать минимум 3 символа.')

    queryset = User.objects.filter(username=normalized)
    if exclude_user_id is not None:
        queryset = queryset.exclude(pk=exclude_user_id)
    if queryset.exists():
        raise ValueError(f'Пользователь с логином «{normalized}» уже существует.')

    return normalized


def validate_settings_password(password: str) -> str:
    normalized = str(password or '')
    if len(normalized) < 6:
        raise ValueError('Пароль должен содержать минимум 6 символов.')
    if not any(char.isdigit() for char in normalized):
        raise ValueError('Пароль должен содержать хотя бы одну цифру.')
    if not any(char.isalpha() for char in normalized):
        raise ValueError('Пароль должен содержать хотя бы одну букву.')
    return normalized


def sync_profile_avatar_from_employee_data(user, profile, employee=None, *, force=False):
    if not profile or not profile.employee_slug or not is_employee_service_enabled():
        return profile, employee

    employee_data = employee
    if employee_data is None:
        try:
            employee_data = get_employee_by_slug(profile.employee_slug)
        except EmployeeServiceClientError:
            return profile, employee

    base_image_url = str((employee_data or {}).get('base_image_url', '')).strip()
    if not base_image_url:
        return profile, employee_data

    if profile.base_avatar and not force:
        return profile, employee_data

    image_bytes = download_employee_image(base_image_url)
    if not image_bytes:
        return profile, employee_data

    profile.base_avatar = ContentFile(image_bytes, name=f'user-avatar-{user.username}.jpg')
    profile.save(update_fields=['base_avatar'])
    return profile, employee_data


def sync_profile_avatar_from_employee_service(user, profile):
    profile, _ = sync_profile_avatar_from_employee_data(user, profile, force=True)
    return profile


def map_bnpzid_role_to_tb_role(raw_role):
    normalized_role = str(raw_role or '').strip().lower()
    if normalized_role == 'admin':
        return UserRole.ADMIN
    return UserRole.USER


class BnpzIdAccessDeniedError(PermissionError):
    pass


def find_bnpzid_allowed_profile(identity: dict):
    employee_slug = str(identity.get('employee_slug', '')).strip()
    tabel_number = str(identity.get('tabel_number', '')).strip()
    username = str(identity.get('username', '')).strip()

    if employee_slug:
        profile = UserRole.objects.select_related('user').filter(employee_slug=employee_slug).first()
        if profile is not None:
            return profile

    candidate_usernames = [value for value in [tabel_number, username] if value]
    if candidate_usernames:
        return UserRole.objects.select_related('user').filter(
            employee_slug__isnull=False,
            user__username__in=candidate_usernames,
        ).exclude(employee_slug='').first()

    return None


def sync_bnpzid_user(identity: dict):
    username = str(identity.get('username', '')).strip()
    if not username:
        raise ValueError('bnpzID username is missing.')

    first_name = str(identity.get('first_name', '')).strip()
    last_name = str(identity.get('last_name', '')).strip()
    profile = find_bnpzid_allowed_profile(identity)
    if profile is None:
        raise BnpzIdAccessDeniedError('Вам не разрешен доступ в эту систему.')

    user = profile.user
    fields_to_update = []
    if first_name != user.first_name:
        user.first_name = first_name
        fields_to_update.append('first_name')
    if last_name != user.last_name:
        user.last_name = last_name
        fields_to_update.append('last_name')
    if not user.is_active:
        user.is_active = True
        fields_to_update.append('is_active')
    if fields_to_update:
        user.save(update_fields=fields_to_update)

    return user


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


def decode_image_to_bytes(image_payload: str):
    if not image_payload:
        return None

    encoded = str(image_payload)
    if ',' in encoded:
        encoded = encoded.split(',', 1)[1]

    try:
        image_bytes = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError):
        return None

    return image_bytes if image_bytes else None


def calculate_face_similarity_score(base_image, captured_image):
    from base.views import calculate_face_identity_similarity

    return float(calculate_face_identity_similarity(base_image, captured_image))


def issue_face_id_challenge():
    return {
        'face_challenge_instruction': FACE_ID_CAPTURE_REQUIRED_MESSAGE,
    }


def decode_face_challenge_token(token):
    return None


def get_faceid_login_candidate_profiles():
    raw_profiles = UserRole.objects.select_related('user').filter(
        user__is_active=True,
        face_id_required=True,
        employee_slug__isnull=False,
    ).exclude(employee_slug='')

    candidate_profiles = []
    for profile in raw_profiles.iterator():
        if profile.employee_slug:
            profile = sync_profile_avatar_from_employee_service(profile.user, profile)
        if profile and profile.base_avatar:
            candidate_profiles.append(profile)

    return candidate_profiles


def match_user_by_face_capture(face_capture):
    if not face_capture:
        return None, Response(
            {'error': 'Face ID изображение обязательно.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    captured_image = decode_image_to_pil(face_capture)
    if captured_image is None:
        return None, Response(
            {'error': 'Face ID изображение некорректно.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    candidate_profiles = get_faceid_login_candidate_profiles()

    ranked_profiles = []
    compared_profiles = 0

    for profile in candidate_profiles:
        similarity = None

        if is_employee_service_enabled() and profile.employee_slug:
            try:
                verify_result = verify_employee_face(profile.employee_slug, {'captured_image': face_capture})
                similarity = float(verify_result.get('similarity', 0.0))
            except EmployeeServiceClientError:
                similarity = None

        if similarity is None:
            try:
                base_image = Image.open(profile.base_avatar).convert('RGB')
            except Exception:
                continue

            try:
                similarity = calculate_face_similarity_score(base_image, captured_image)
            except ValueError:
                continue
            except Exception:
                return None, Response(
                    {'error': 'Ошибка Face ID проверки.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        compared_profiles += 1
        ranked_profiles.append((similarity, profile))

    if compared_profiles == 0:
        return None, Response(
            {'error': 'Для Face ID входа не найдено ни одного разрешенного сотрудника с базовым аватаром.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    ranked_profiles.sort(key=lambda item: item[0], reverse=True)
    best_similarity, best_profile = ranked_profiles[0]

    if best_similarity < FACE_ID_MATCH_THRESHOLD:
        return None, Response(
            {
                'error': 'Face ID не подтвержден. Лицо не совпало.',
                'verified': False,
                'similarity': round(best_similarity, 2),
                'threshold': FACE_ID_MATCH_THRESHOLD,
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    second_best_similarity = ranked_profiles[1][0] if len(ranked_profiles) > 1 else None
    if second_best_similarity is not None and (best_similarity - second_best_similarity) < FACE_ID_MATCH_MIN_GAP:
        return None, Response(
            {
                'error': 'Face ID не подтвержден. Найдено неоднозначное совпадение.',
                'verified': False,
                'similarity': round(best_similarity, 2),
                'second_best_similarity': round(second_best_similarity, 2),
                'threshold': FACE_ID_MATCH_THRESHOLD,
                'min_gap': FACE_ID_MATCH_MIN_GAP,
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    return best_profile.user, None


def verify_login_face_id(user, profile, face_capture):
    user_face_id_required = bool(profile.face_id_required) if profile else True
    if not user_face_id_required:
        return None

    if profile and profile.employee_slug:
        profile = sync_profile_avatar_from_employee_service(user, profile)

    face_id_context = {
        'requires_face_id': True,
        'username': user.username,
        'firstname': user.first_name,
        'lastname': user.last_name,
    }

    challenge_payload = issue_face_id_challenge()

    if not face_capture:
        return Response(
            {
                'error': 'Для этой роли требуется Face ID подтверждение.',
                **face_id_context,
                **challenge_payload,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not profile or not profile.base_avatar:
        return Response(
            {
                'error': 'У пользователя отсутствует базовый аватар для Face ID проверки.',
                **face_id_context,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        base_image = Image.open(profile.base_avatar).convert('RGB')
    except Exception:
        return Response(
            {
                'error': 'Не удалось прочитать базовый аватар пользователя.',
                **face_id_context,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    captured_image = decode_image_to_pil(face_capture)
    if captured_image is None:
        return Response(
            {
                'error': 'Face ID изображение некорректно.',
                **face_id_context,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        similarity = calculate_face_similarity_score(base_image, captured_image)
    except ValueError as exc:
        return Response(
            {
                'error': str(exc),
                **face_id_context,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception:
        return Response(
            {
                'error': 'Ошибка Face ID проверки.',
                **face_id_context,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if similarity < FACE_ID_VERIFY_THRESHOLD:
        return Response(
            {
                'error': 'Face ID не подтвержден. Лицо не совпало.',
                **face_id_context,
                'verified': False,
                'similarity': round(similarity, 2),
                'threshold': FACE_ID_VERIFY_THRESHOLD,
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    return None


class LoginAPIView(APIView):
    permission_classes = [AllowAny]

    @staticmethod
    def post(request, *args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')
        face_capture = request.data.get('face_capture')

        user = authenticate(username=username, password=password)

        if user:
            role = get_effective_user_role(user)

            profile = getattr(user, 'role_profile', None)
            face_verification_response = verify_login_face_id(user, profile, face_capture)
            if face_verification_response is not None:
                return face_verification_response

            return Response(build_login_response(user), status=status.HTTP_200_OK)

        return Response({'error': 'Неправильный логин или пароль'}, status=status.HTTP_401_UNAUTHORIZED)


class FaceIdLoginAPIView(APIView):
    permission_classes = [AllowAny]

    @staticmethod
    def post(request, *args, **kwargs):
        if not bool(getattr(settings, 'FACE_ID_DIRECT_LOGIN_ENABLED', False)):
            return Response(
                {
                    'error': 'Прямой вход через Face ID отключен из соображений безопасности. Используйте логин и пароль с Face ID подтверждением.',
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        face_capture = request.data.get('face_capture')

        user, error_response = match_user_by_face_capture(face_capture)
        if error_response is not None:
            return error_response

        return Response(build_login_response(user), status=status.HTTP_200_OK)


class BnpzIdLoginAPIView(APIView):
    permission_classes = [AllowAny]

    @staticmethod
    def post(request, *args, **kwargs):
        if not is_employee_service_enabled():
            return Response({'error': 'bnpzID сервис не настроен.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        code = str(request.data.get('code', '')).strip()
        redirect_uri = str(request.data.get('redirect_uri', '')).strip()
        if not code:
            return Response({'error': 'Код bnpzID обязателен.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            identity = exchange_bnpzid_code(code, redirect_uri=redirect_uri)
            user = sync_bnpzid_user(identity)
        except BnpzIdAccessDeniedError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except EmployeeServiceClientError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(build_login_response(user), status=status.HTTP_200_OK)


class BnpzIdAccessCheckAPIView(APIView):
    permission_classes = [AllowAny]

    @staticmethod
    def post(request, *args, **kwargs):
        client_id = str(request.data.get('client_id', '')).strip()
        client_secret = str(request.data.get('client_secret', '')).strip()

        if client_id != str(getattr(settings, 'BNPZID_CLIENT_ID', '')).strip() or client_secret != str(getattr(settings, 'BNPZID_CLIENT_SECRET', '')).strip():
            return Response({'error': 'Некорректный клиент bnpzID.'}, status=status.HTTP_403_FORBIDDEN)

        identity = {
            'username': str(request.data.get('username', '')).strip(),
            'employee_slug': str(request.data.get('employee_slug', '')).strip(),
            'tabel_number': str(request.data.get('tabel_number', '')).strip(),
        }

        profile = find_bnpzid_allowed_profile(identity)
        if profile is None or not profile.user.is_active:
            return Response({'error': 'Вам не разрешен доступ в эту систему.'}, status=status.HTTP_403_FORBIDDEN)

        return Response({
            'allowed': True,
            'username': profile.user.username,
            'employee_slug': profile.employee_slug,
            'face_id_required': bool(profile.face_id_required),
            'role': profile.role,
        }, status=status.HTTP_200_OK)


class UserInfoView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    @staticmethod
    def get(request, *args, **kwargs):
        user = request.user
        role = get_effective_user_role(user)
        profile = getattr(user, 'role_profile', None)
        profile = sync_profile_avatar_from_employee_service(user, profile)
        position = None
        if profile and profile.role:
            position = profile.get_role_display()
        return Response({
            "id": user.id,
            "username": user.username,
            "firstname": user.first_name,
            "lastname": user.last_name,
            "role": role,
            "position": position,
            "employee_slug": profile.employee_slug if profile else None,
            "base_avatar": request.build_absolute_uri(profile.base_avatar.url) if profile and profile.base_avatar else None,
            "page_access": get_page_access_for_role(role),
            "feature_access": get_feature_access_for_role(role),
            "permissions": {
                "can_edit": role in [UserRole.ADMIN, UserRole.IT_CENTER, *UserRole.MANAGER_TIER_ROLES],
                "can_delete": role in [UserRole.ADMIN, UserRole.IT_CENTER],
                "view_only": role == UserRole.USER,
                "can_manage_employees": role in [UserRole.ADMIN, UserRole.IT_CENTER],
                "can_manage_page_access": role == UserRole.ADMIN,
            }
        }, status=status.HTTP_200_OK)


class RegisterAPIView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    @staticmethod
    def post(request, *args, **kwargs):
        requester_role = get_effective_user_role(request.user)
        if requester_role != UserRole.ADMIN:
            return Response({"error": "Только администратор может регистрировать пользователей."}, status=status.HTTP_403_FORBIDDEN)

        username = str(request.data.get('username', '')).strip()
        password = str(request.data.get('password', '')).strip()
        password_confirm = str(request.data.get('password_confirm', '')).strip()
        first_name = str(request.data.get('first_name', '')).strip()
        last_name = str(request.data.get('last_name', '')).strip()
        role = str(request.data.get('role', UserRole.USER)).strip().lower()
        face_capture = request.data.get('face_capture')
        avatar_file = request.FILES.get('base_avatar')
        avatar_data = request.data.get('base_avatar_data')

        if not username or not password:
            return Response({"error": "Логин и пароль обязательны."}, status=status.HTTP_400_BAD_REQUEST)

        if len(username) < 3:
            return Response({"error": "Логин должен содержать минимум 3 символа."}, status=status.HTTP_400_BAD_REQUEST)

        if len(password) < 6:
            return Response({"error": "Пароль должен содержать минимум 6 символов."}, status=status.HTTP_400_BAD_REQUEST)

        if not password_confirm:
            return Response({"error": "Подтверждение пароля обязательно."}, status=status.HTTP_400_BAD_REQUEST)

        if password != password_confirm:
            return Response({"error": "Пароль и подтверждение пароля не совпадают."}, status=status.HTTP_400_BAD_REQUEST)

        if role not in [UserRole.ADMIN, UserRole.IT_CENTER, UserRole.USER]:
            return Response({"error": "Недопустимая роль."}, status=status.HTTP_400_BAD_REQUEST)

        if role == UserRole.ADMIN and not request.user.is_superuser:
            return Response(
                {"error": "Создавать пользователей с ролью Администратор может только суперпользователь."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if User.objects.filter(username=username).exists():
            return Response({"error": "Пользователь с таким логином уже существует."}, status=status.HTTP_400_BAD_REQUEST)

        if not avatar_file and not avatar_data:
            return Response({"error": "Базовый аватар обязателен (файл или снимок с камеры)."}, status=status.HTTP_400_BAD_REQUEST)

        if not face_capture:
            return Response({"error": "Face ID подтверждение обязательно."}, status=status.HTTP_400_BAD_REQUEST)

        avatar_to_save = None
        avatar_image = None

        if avatar_file:
            try:
                avatar_image = Image.open(avatar_file).convert('RGB')
                avatar_file.seek(0)
                avatar_to_save = avatar_file
            except Exception:
                return Response({"error": "Базовый аватар не удалось прочитать."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            avatar_image = decode_image_to_pil(avatar_data)
            avatar_bytes = decode_image_to_bytes(avatar_data)
            if avatar_image is None or avatar_bytes is None:
                return Response({"error": "Снимок аватара с камеры некорректен."}, status=status.HTTP_400_BAD_REQUEST)

            extension = 'jpg'
            payload_str = str(avatar_data or '')
            if payload_str.startswith('data:image/png'):
                extension = 'png'
            elif payload_str.startswith('data:image/webp'):
                extension = 'webp'

            avatar_to_save = ContentFile(
                avatar_bytes,
                name=f'user-avatar-{username}.{extension}',
            )

        captured_image = decode_image_to_pil(face_capture)
        if captured_image is None:
            return Response({"error": "Face ID изображение некорректно."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from base.views import calculate_face_similarity
            similarity = float(calculate_face_similarity(avatar_image, captured_image))
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({"error": "Ошибка Face ID проверки."}, status=status.HTTP_400_BAD_REQUEST)

        if similarity < FACE_ID_VERIFY_THRESHOLD:
            return Response(
                {
                    "error": "Face ID не подтвержден. Лицо не совпало.",
                    "verified": False,
                    "similarity": round(similarity, 2),
                    "threshold": FACE_ID_VERIFY_THRESHOLD,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            user = User.objects.create_user(
                username=username,
                password=password,
                first_name=first_name,
                last_name=last_name,
            )
            profile, _ = UserRole.objects.get_or_create(user=user)
            profile.role = role
            profile.base_avatar = avatar_to_save
            profile.save()

        return Response(
            {
                "success": True,
                "id": user.id,
                "username": user.username,
                "role": role,
                "verified": True,
                "similarity": round(similarity, 2),
                "threshold": FACE_ID_VERIFY_THRESHOLD,
                "message": "Пользователь успешно зарегистрирован.",
            },
            status=status.HTTP_201_CREATED,
        )


class TokenStatusAPIView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    @staticmethod
    def get(request, *args, **kwargs):
        # Tokenni olish
        token = kwargs.get('token')

        try:
            token = CustomToken.objects.get(key=token)
        except CustomToken.DoesNotExist:
            return Response({'error': 'Token not found'}, status=404)

        # Tokenning amal qilish muddatini tekshirish
        if token.expires_at and now() > token.expires_at:
            return Response({'is_expired': True, 'message': 'Token has expired'}, status=200)

        # Token hali amal qiladi
        return Response({'is_expired': False, 'message': 'Token is still valid'}, status=200)


def ensure_admin(request):
    role = get_effective_user_role(request.user)
    if role == UserRole.ADMIN:
        return None
    return Response({"error": "Только администратор имеет доступ."}, status=status.HTTP_403_FORBIDDEN)


def parse_boolean_flag(value, default=True):
    if value is None:
        return default

    if isinstance(value, bool):
        return value

    if isinstance(value, (int, float)):
        return value != 0

    normalized = str(value).strip().lower()
    if normalized in {'true', '1', 'yes', 'on'}:
        return True
    if normalized in {'false', '0', 'no', 'off', ''}:
        return False
    return default


def get_settings_employee_map(users):
    if not is_employee_service_enabled():
        return {}

    slugs = []
    for user in users:
        profile = getattr(user, 'role_profile', None)
        if profile and profile.employee_slug:
            slugs.append(profile.employee_slug)

    if not slugs:
        return {}

    try:
        return get_employees_by_slugs(slugs, source_system=None)
    except EmployeeServiceClientError:
        return {}


def get_settings_employee_slugs_for_search(search_term):
    if not search_term or not is_employee_service_enabled():
        return set()

    matched_slugs = set()
    try:
        payload = list_employees(
            search=search_term,
            tabel_number=search_term,
            source_system=None,
            no_pagination=True,
        )
    except EmployeeServiceClientError:
        return matched_slugs

    employees = payload if isinstance(payload, list) else payload.get('results', []) if isinstance(payload, dict) else []
    for employee in employees:
        employee_slug = str(employee.get('slug', '')).strip()
        if employee_slug:
            matched_slugs.add(employee_slug)
    return matched_slugs


class SettingsUsersPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200


def serialize_settings_employee(employee_data=None):
    if not employee_data:
        return None

    last_name = str(employee_data.get('last_name', '')).strip()
    first_name = str(employee_data.get('first_name', '')).strip()
    surname = str(employee_data.get('surname', '')).strip()
    full_name = ' '.join(part for part in [last_name, first_name, surname] if part)

    return {
        'slug': employee_data.get('slug'),
        'full_name': full_name,
        'tabel_number': employee_data.get('tabel_number', ''),
        'login': employee_data.get('login', ''),
        'position': employee_data.get('position', ''),
        'base_image_url': rewrite_employee_image_url(employee_data.get('base_image_url')),
        'department': employee_data.get('department'),
        'section': employee_data.get('section'),
    }


def serialize_settings_user(user, request=None, employee_data=None):
    profile = UserRole.objects.filter(user_id=user.id).first()
    role = profile.role if profile and profile.role else get_effective_user_role(user)
    avatar = None
    if profile and profile.base_avatar:
        try:
            avatar = request.build_absolute_uri(profile.base_avatar.url) if request else profile.base_avatar.url
        except Exception:
            avatar = None

    return {
        "id": user.id,
        "username": user.username,
        "auth_username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": role,
        "base_avatar": avatar,
        "is_superuser": bool(user.is_superuser),
        "is_active": bool(user.is_active),
        "employee_slug": profile.employee_slug if profile else None,
        "face_id_required": bool(profile.face_id_required) if profile else True,
        "employee": serialize_settings_employee(employee_data),
    }


def serialize_role_page_access(role):
    role_key = str(role).strip().lower()
    page_access = get_page_access_for_role(role_key)
    feature_access = get_feature_access_for_role(role_key)
    role_labels = dict(UserRole.ROLE_CHOICES)
    return {
        "role": role_key,
        "role_label": role_labels.get(role_key, role_key),
        "pages": page_access,
        "features": feature_access,
        "is_locked": role_key == UserRole.ADMIN,
    }


class SettingsUsersListCreateAPIView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    pagination_class = SettingsUsersPagination

    def get(self, request, *args, **kwargs):
        permission_error = ensure_admin(request)
        if permission_error:
            return permission_error

        users = User.objects.all().order_by('username')
        search = request.query_params.get('search', '').strip()
        from django.db.models import Q
        if search:
            matched_employee_slugs = get_settings_employee_slugs_for_search(search)
            users = users.filter(
                Q(username__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(role_profile__employee_slug__in=matched_employee_slugs)
            )

        users = users.distinct()

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(users, request, view=self)
        current_users = list(page) if page is not None else list(users)
        employee_map = get_settings_employee_map(current_users)
        payload = []
        for user in current_users:
            profile = getattr(user, 'role_profile', None)
            employee_data = employee_map.get(getattr(profile, 'employee_slug', None))
            if profile is not None:
                profile, employee_data = sync_profile_avatar_from_employee_data(user, profile, employee=employee_data)
            payload.append(serialize_settings_user(user, request, employee_data))

        if page is not None:
            return paginator.get_paginated_response(payload)

        return Response(payload, status=status.HTTP_200_OK)

    @staticmethod
    def post(request, *args, **kwargs):
        permission_error = ensure_admin(request)
        if permission_error:
            return permission_error

        employee_slug = str(request.data.get('employee_slug', '')).strip()
        role = str(request.data.get('role', UserRole.USER)).strip().lower()
        face_id_required = parse_boolean_flag(request.data.get('face_id_required'), default=True)

        if not employee_slug:
            return Response({"error": "Выберите сотрудника."}, status=status.HTTP_400_BAD_REQUEST)

        if role not in [UserRole.ADMIN, UserRole.IT_CENTER, *UserRole.MANAGER_TIER_ROLES, UserRole.USER]:
            return Response({"error": "Недопустимая роль."}, status=status.HTTP_400_BAD_REQUEST)
        if role == UserRole.ADMIN and not request.user.is_superuser:
            return Response({"error": "Только суперпользователь может создать администратора."}, status=status.HTTP_403_FORBIDDEN)

        if UserRole.objects.filter(employee_slug=employee_slug).exists():
            return Response({"error": "Этот сотрудник уже привязан к другому пользователю."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            employee = get_employee_by_slug(employee_slug)
        except EmployeeServiceClientError as exc:
            return Response({"error": f"Ошибка получения данных сотрудника: {exc}"}, status=status.HTTP_400_BAD_REQUEST)

        if not employee:
            return Response({"error": "Сотрудник не найден в Employee Service."}, status=status.HTTP_400_BAD_REQUEST)

        first_name = str(employee.get('first_name', '')).strip()
        last_name = str(employee.get('last_name', '')).strip()
        username = ensure_unique_settings_username(build_settings_username(employee))

        generated_password = generate_user_password()

        with transaction.atomic():
            user = User.objects.create_user(
                username=username,
                first_name=first_name,
                last_name=last_name,
                password=generated_password,
            )

            profile, _ = UserRole.objects.get_or_create(user=user)
            profile.role = role
            profile.employee_slug = employee_slug
            profile.face_id_required = face_id_required

            base_image_url = employee.get('base_image_url') or ''
            if base_image_url:
                image_bytes = download_employee_image(base_image_url)
                if image_bytes:
                    profile.base_avatar = ContentFile(image_bytes, name=f'user-avatar-{username}.jpg')

            profile.save()

        response_payload = serialize_settings_user(user, request, employee)
        response_payload['generated_password'] = generated_password
        return Response(response_payload, status=status.HTTP_201_CREATED)


class SyncEmployeeRoleAPIView(APIView):
    """
    Keeps a linked user account's role in sync with a Ответственное лицо record's
    Должность after it's edited (creation already sets the role via the POST above).
    """
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    @staticmethod
    def patch(request, *args, **kwargs):
        permission_error = ensure_admin(request)
        if permission_error:
            return permission_error

        employee_slug = str(request.data.get('employee_slug', '')).strip()
        role = str(request.data.get('role', '')).strip().lower()
        if not employee_slug or not role:
            return Response({"error": "employee_slug и role обязательны."}, status=status.HTTP_400_BAD_REQUEST)
        if role not in [choice[0] for choice in UserRole.ROLE_CHOICES]:
            return Response({"error": "Недопустимая роль."}, status=status.HTTP_400_BAD_REQUEST)

        profile = UserRole.objects.filter(employee_slug=employee_slug).first()
        if not profile or profile.role == UserRole.ADMIN:
            return Response({"synced": False}, status=status.HTTP_200_OK)

        profile.role = role
        profile.save(update_fields=['role'])
        return Response({"synced": True}, status=status.HTTP_200_OK)


class RolePageAccessSettingsAPIView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    @staticmethod
    def get(request, *args, **kwargs):
        permission_error = ensure_admin(request)
        if permission_error:
            return permission_error

        role_entries = [
            serialize_role_page_access(role_value)
            for role_value, _ in UserRole.ROLE_CHOICES
        ]
        return Response(role_entries, status=status.HTTP_200_OK)

    @staticmethod
    def patch(request, *args, **kwargs):
        permission_error = ensure_admin(request)
        if permission_error:
            return permission_error

        role = str(request.data.get('role', '')).strip().lower()
        pages = request.data.get('pages') or {}
        features = request.data.get('features') or {}

        if role not in [choice[0] for choice in UserRole.ROLE_CHOICES]:
            return Response({"error": "Недопустимая роль."}, status=status.HTTP_400_BAD_REQUEST)

        if role == UserRole.ADMIN:
            return Response({"error": "Права администратора для страниц заблокированы и всегда включены."}, status=status.HTTP_400_BAD_REQUEST)

        if not isinstance(pages, dict):
            return Response({"error": "Поле pages должно быть объектом."}, status=status.HTTP_400_BAD_REQUEST)

        if not isinstance(features, dict):
            return Response({"error": "Поле features должно быть объектом."}, status=status.HTTP_400_BAD_REQUEST)

        role_access = get_role_page_access_instance(role)
        fields_to_update = []

        for page_key, field_name in ROLE_PAGE_ACCESS_FIELD_MAP.items():
            if page_key not in pages:
                continue
            next_value = bool(pages.get(page_key))
            if getattr(role_access, field_name) != next_value:
                setattr(role_access, field_name, next_value)
                fields_to_update.append(field_name)

        for feature_key, field_name in ROLE_FEATURE_ACCESS_FIELD_MAP.items():
            if feature_key not in features:
                continue
            next_value = bool(features.get(feature_key))
            if getattr(role_access, field_name) != next_value:
                setattr(role_access, field_name, next_value)
                fields_to_update.append(field_name)

        if fields_to_update:
            role_access.save(update_fields=fields_to_update + ['updated_at'])

        return Response(serialize_role_page_access(role), status=status.HTTP_200_OK)


class SettingsUsersDetailAPIView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    @staticmethod
    def put(request, pk, *args, **kwargs):
        permission_error = ensure_admin(request)
        if permission_error:
            return permission_error

        user = get_object_or_404(User, pk=pk)
        if user.id == request.user.id and str(request.data.get('role', '')).strip().lower() == UserRole.USER:
            return Response({"error": "Нельзя понизить собственную роль до пользователя."}, status=status.HTTP_400_BAD_REQUEST)

        role = str(request.data.get('role', '')).strip().lower()
        employee_slug = request.data.get('employee_slug')
        face_id_required = request.data.get('face_id_required')
        username = request.data.get('username')
        password = request.data.get('password')

        profile, _ = UserRole.objects.get_or_create(user=user)

        if username is not None:
            try:
                user.username = validate_settings_username(str(username), exclude_user_id=user.id)
            except ValueError as exc:
                return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if password is not None and str(password).strip():
            try:
                validated_password = validate_settings_password(str(password).strip())
            except ValueError as exc:
                return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(validated_password)

        if role:
            if role not in [UserRole.ADMIN, UserRole.IT_CENTER, *UserRole.MANAGER_TIER_ROLES, UserRole.USER]:
                return Response({"error": "Недопустимая роль."}, status=status.HTTP_400_BAD_REQUEST)
            if role == UserRole.ADMIN and not request.user.is_superuser:
                return Response({"error": "Только суперпользователь может назначить роль администратора."}, status=status.HTTP_403_FORBIDDEN)
            profile.role = role

        if face_id_required is not None:
            profile.face_id_required = parse_boolean_flag(face_id_required, default=profile.face_id_required)

        new_slug = str(employee_slug).strip() if employee_slug is not None else None
        if new_slug is not None and new_slug != (profile.employee_slug or ''):
            if new_slug:
                dup = UserRole.objects.filter(employee_slug=new_slug).exclude(user_id=user.id).exists()
                if dup:
                    return Response({"error": "Этот сотрудник уже привязан к другому пользователю."}, status=status.HTTP_400_BAD_REQUEST)

                try:
                    employee = get_employee_by_slug(new_slug)
                except EmployeeServiceClientError as exc:
                    return Response({"error": f"Ошибка получения данных сотрудника: {exc}"}, status=status.HTTP_400_BAD_REQUEST)

                if not employee:
                    return Response({"error": "Сотрудник не найден в Employee Service."}, status=status.HTTP_400_BAD_REQUEST)

                user.first_name = str(employee.get('first_name', '')).strip()
                user.last_name = str(employee.get('last_name', '')).strip()

                base_image_url = employee.get('base_image_url') or ''
                if base_image_url:
                    image_bytes = download_employee_image(base_image_url)
                    if image_bytes:
                        profile.base_avatar = ContentFile(image_bytes, name=f'user-avatar-{user.username}.jpg')

            profile.employee_slug = new_slug or None

        with transaction.atomic():
            user.save()
            profile.save()

        employee_data = None
        if profile.employee_slug:
            try:
                employee_data = get_employee_by_slug(profile.employee_slug)
            except EmployeeServiceClientError:
                employee_data = None

        return Response(serialize_settings_user(user, request, employee_data), status=status.HTTP_200_OK)

    @staticmethod
    def post(request, pk, *args, **kwargs):
        permission_error = ensure_admin(request)
        if permission_error:
            return permission_error

        if not str(request.path).rstrip('/').endswith('reset-password'):
            return Response({'error': 'Недопустимое действие.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

        user = get_object_or_404(User, pk=pk)
        generated_password = generate_user_password()
        user.set_password(generated_password)
        user.save(update_fields=['password'])

        profile = UserRole.objects.filter(user=user).first()
        employee_data = None
        if profile and profile.employee_slug:
            try:
                employee_data = get_employee_by_slug(profile.employee_slug)
            except EmployeeServiceClientError:
                employee_data = None

        payload = serialize_settings_user(user, request, employee_data)
        payload['generated_password'] = generated_password
        return Response(payload, status=status.HTTP_200_OK)

    @staticmethod
    def delete(request, pk, *args, **kwargs):
        permission_error = ensure_admin(request)
        if permission_error:
            return permission_error

        user = get_object_or_404(User, pk=pk)
        if user.id == request.user.id:
            return Response({"error": "Нельзя удалить собственный аккаунт."}, status=status.HTTP_400_BAD_REQUEST)

        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EmployeeListProxyAPIView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _rewrite_image_urls(employees):
        internal_base = str(getattr(settings, 'EMPLOYEE_SERVICE_BASE_URL', '')).rstrip('/')
        if not internal_base:
            return employees
        public_base = getattr(settings, 'EMPLOYEE_SERVICE_PUBLIC_URL', '').rstrip('/')
        if not public_base:
            return employees
        for emp in employees:
            url = emp.get('base_image_url') or ''
            if url and internal_base in url:
                emp['base_image_url'] = url.replace(internal_base, public_base, 1)
        return employees

    @staticmethod
    def _local_employees(search='', page=1, page_size=50):
        from django.db.models import Q
        from base.models import Employee as LocalEmployee
        qs = LocalEmployee.objects.select_related('department', 'section').filter(
            is_deleted=False, isActive=True
        )
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) | Q(last_name__icontains=search) |
                Q(surname__icontains=search) | Q(tabel_number__icontains=search) |
                Q(position__icontains=search)
            )
        count = qs.count()
        offset = (page - 1) * page_size
        results = []
        for emp in qs[offset:offset + page_size]:
            full_name = ' '.join(part for part in [emp.last_name, emp.first_name, emp.surname] if part)
            results.append({
                'slug': emp.slug,
                'full_name': full_name,
                'tabel_number': emp.tabel_number,
                'position': emp.position or '',
                'department': {'name': emp.department.name} if emp.department_id else None,
                'section': {'name': emp.section.name} if emp.section_id else None,
                'base_image_url': None,
            })
        return count, results

    @staticmethod
    def get(request, *args, **kwargs):
        permission_error = ensure_admin(request)
        if permission_error:
            return permission_error

        search = request.query_params.get('search', '').strip()
        page = int(request.query_params.get('page') or 1)
        page_size = int(request.query_params.get('page_size') or 50)

        if is_employee_service_enabled():
            try:
                employees = list_employees(
                    search=search or None,
                    source_system=None,
                    no_pagination=False,
                    page=page,
                    page_size=page_size,
                )
                count = 0
                next_link = None
                previous_link = None
                if isinstance(employees, dict):
                    count = int(employees.get('count') or 0)
                    next_link = employees.get('next')
                    previous_link = employees.get('previous')
                    employees = employees.get('results', [])
                elif isinstance(employees, list):
                    count = len(employees)
                else:
                    employees = []

                EmployeeListProxyAPIView._rewrite_image_urls(employees)
                return Response({
                    'count': count,
                    'next': next_link,
                    'previous': previous_link,
                    'results': employees,
                    '_source': 'employee_service',
                }, status=status.HTTP_200_OK)
            except EmployeeServiceClientError:
                pass

        count, results = EmployeeListProxyAPIView._local_employees(search, page, page_size)
        return Response({
            'count': count,
            'next': None,
            'previous': None,
            'results': results,
            '_source': 'local',
        }, status=status.HTTP_200_OK)
