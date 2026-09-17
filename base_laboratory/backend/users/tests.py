import base64
from datetime import timedelta

from django.contrib.auth.models import User
from django.test import override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils.timezone import now
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch
from io import BytesIO
from PIL import Image

from .models import CustomToken, RolePageAccess, UserRole


def build_test_image(name='face.jpg'):
	buffer = BytesIO()
	Image.new('RGB', (32, 32), color='white').save(buffer, format='JPEG')
	buffer.seek(0)
	return SimpleUploadedFile(name, buffer.getvalue(), content_type='image/jpeg')


def build_test_image_data_url(name='face.jpg'):
	image_file = build_test_image(name)
	encoded = base64.b64encode(image_file.read()).decode('ascii')
	return f'data:image/jpeg;base64,{encoded}'


class RolePageAccessSettingsTests(APITestCase):
	def setUp(self):
		self.admin = User.objects.create_superuser(username='admin_user', password='test12345')
		self.manager = User.objects.create_user(username='manager_user', password='test12345')
		manager_profile, _ = UserRole.objects.get_or_create(user=self.manager)
		manager_profile.role = UserRole.SHIFT_HEAD
		manager_profile.save(update_fields=['role'])
		self.manager.refresh_from_db()

	def test_admin_can_update_role_page_access(self):
		self.client.force_authenticate(user=self.admin)

		response = self.client.patch(
			'/api/v1/users/page-access-settings/',
			{
				'role': UserRole.SHIFT_HEAD,
				'pages': {
					'dashboard': True,
					'ppe_arrival': False,
					'statistics': False,
					'settings': True,
				},
				'features': {
					'dashboard_due_cards': False,
					'dashboard_export_excel': False,
					'dashboard_delete_employee': False,
					'employee_ppe_tab': False,
					'face_id_control': True,
					'ppe_arrival_intake': True,
				},
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['role'], UserRole.SHIFT_HEAD)
		self.assertFalse(response.data['pages']['ppe_arrival'])
		self.assertFalse(response.data['pages']['statistics'])
		self.assertFalse(response.data['features']['employee_ppe_tab'])
		self.assertTrue(response.data['features']['face_id_control'])
		self.assertTrue(response.data['features']['ppe_arrival_intake'])

		role_access = RolePageAccess.objects.get(role=UserRole.SHIFT_HEAD)
		self.assertFalse(role_access.can_view_ppe_arrival)
		self.assertFalse(role_access.can_view_statistics)
		self.assertTrue(role_access.can_edit_employee)
		self.assertFalse(role_access.can_view_employee_ppe_tab)
		self.assertTrue(role_access.can_manage_face_id_control)
		self.assertTrue(role_access.can_submit_ppe_arrival)

	def test_user_info_returns_page_access_from_settings(self):
		RolePageAccess.objects.update_or_create(
			role=UserRole.SHIFT_HEAD,
			defaults={
				'can_view_dashboard': True,
				'can_view_ppe_arrival': False,
				'can_view_statistics': True,
				'can_view_settings': False,
				'can_view_dashboard_due_cards': False,
				'can_export_dashboard_excel': False,
				'can_delete_employee': False,
				'can_view_employee_ppe_tab': False,
				'can_manage_face_id_control': True,
				'can_submit_ppe_arrival': True,
			},
		)

		self.client.force_authenticate(user=self.manager)
		response = self.client.get('/api/v1/users/user/')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['role'], UserRole.SHIFT_HEAD)
		self.assertEqual(
			response.data['page_access'],
			{
				'dashboard': True,
				'ppe_arrival': False,
				'statistics': True,
				'settings': False,
			},
		)
		self.assertEqual(
			response.data['feature_access'],
			{
				'dashboard_due_cards': False,
				'dashboard_export_excel': False,
				'dashboard_delete_employee': False,
				'employee_ppe_tab': False,
				'face_id_control': True,
				'ppe_arrival_intake': True,
			},
		)

	def test_it_center_gets_admin_like_defaults_except_face_id_and_page_access_management(self):
		it_user = User.objects.create_user(username='it_center_user', password='test12345')
		profile, _ = UserRole.objects.get_or_create(user=it_user)
		profile.role = UserRole.IT_CENTER
		profile.save(update_fields=['role'])

		self.client.force_authenticate(user=it_user)
		response = self.client.get('/api/v1/users/user/')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['role'], UserRole.IT_CENTER)
		self.assertEqual(
			response.data['page_access'],
			{
				'dashboard': True,
				'ppe_arrival': True,
				'statistics': True,
				'settings': True,
			},
		)
		self.assertEqual(
			response.data['feature_access'],
			{
				'dashboard_due_cards': True,
				'dashboard_export_excel': True,
				'dashboard_delete_employee': True,
				'employee_ppe_tab': True,
				'face_id_control': False,
				'ppe_arrival_intake': True,
			},
		)
		self.assertEqual(
			response.data['permissions'],
			{
				'can_edit': True,
				'can_delete': True,
				'view_only': False,
				'can_manage_employees': True,
				'can_manage_page_access': False,
			},
		)

	@override_settings(TOKEN_SESSION_TTL_SECONDS=7200)
	def test_password_login_refreshes_token_expiry_to_two_hours(self):
		user = User.objects.create_user(username='session_user', password='test12345')
		token = CustomToken.objects.create(user=user)
		old_expiry = now() + timedelta(minutes=10)
		CustomToken.objects.filter(pk=token.pk).update(expires_at=old_expiry)

		response = self.client.post(
			'/api/v1/users/login/',
			{
				'username': 'session_user',
				'password': 'test12345',
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		token.refresh_from_db()
		remaining_seconds = (token.expires_at - now()).total_seconds()
		self.assertGreater(remaining_seconds, 7100)
		self.assertLess(remaining_seconds, 7205)
		self.assertEqual(response.data['token'], token.key)

	@patch('users.views.calculate_face_similarity_score')
	def test_password_login_rejects_when_face_does_not_match_base_avatar(self, similarity_mock):
		user = User.objects.create_user(username='face_session_user', password='test12345')
		profile, _ = UserRole.objects.get_or_create(user=user)
		profile.role = UserRole.USER
		profile.face_id_required = True
		profile.base_avatar = build_test_image('avatar.jpg')
		profile.save(update_fields=['role', 'face_id_required', 'base_avatar'])

		similarity_mock.return_value = 41.0

		response = self.client.post(
			'/api/v1/users/login/',
			{
				'username': 'face_session_user',
				'password': 'test12345',
				'face_capture': build_test_image_data_url('captured-face.jpg'),
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
		self.assertEqual(response.data['verified'], False)
		self.assertIn('Лицо не совпало', response.data['error'])

	@patch('users.views.calculate_face_similarity_score')
	def test_password_login_requires_face_capture_when_face_id_enabled(self, similarity_mock):
		user = User.objects.create_user(username='face_fail_user', password='test12345')
		profile, _ = UserRole.objects.get_or_create(user=user)
		profile.role = UserRole.USER
		profile.face_id_required = True
		profile.base_avatar = build_test_image('avatar-fail.jpg')
		profile.save(update_fields=['role', 'face_id_required', 'base_avatar'])

		response = self.client.post(
			'/api/v1/users/login/',
			{
				'username': 'face_fail_user',
				'password': 'test12345',
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertIn('требуется Face ID подтверждение', response.data['error'])

	@patch('users.views.calculate_face_similarity_score')
	def test_password_login_succeeds_with_matching_base_avatar(self, similarity_mock):
		user = User.objects.create_user(username='face_live_user', password='test12345')
		profile, _ = UserRole.objects.get_or_create(user=user)
		profile.role = UserRole.USER
		profile.face_id_required = True
		profile.base_avatar = build_test_image('avatar-live.jpg')
		profile.save(update_fields=['role', 'face_id_required', 'base_avatar'])

		similarity_mock.return_value = 95.0

		response = self.client.post(
			'/api/v1/users/login/',
			{
				'username': 'face_live_user',
				'password': 'test12345',
				'face_capture': build_test_image_data_url('captured-front.jpg'),
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['username'], 'face_live_user')

	@override_settings(EMPLOYEE_SERVICE_ENABLED=True)
	@patch('users.views.download_employee_image')
	@patch('users.views.get_employee_by_slug')
	@patch('users.views.calculate_face_similarity_score')
	def test_password_login_syncs_base_avatar_from_employee_service_before_face_verification(
		self,
		similarity_mock,
		get_employee_mock,
		download_image_mock,
	):
		user = User.objects.create_user(username='face_sync_login_user', password='test12345')
		profile, _ = UserRole.objects.get_or_create(user=user)
		profile.role = UserRole.USER
		profile.employee_slug = 'emp-face-login-sync'
		profile.face_id_required = True
		profile.base_avatar = None
		profile.save(update_fields=['role', 'employee_slug', 'face_id_required', 'base_avatar'])

		get_employee_mock.return_value = {
			'slug': 'emp-face-login-sync',
			'first_name': 'Face',
			'last_name': 'Login Sync',
			'tabel_number': '7788',
			'base_image_url': 'http://employee-service:8010/media/employee_base_images/7788.jpg',
		}
		download_image_mock.return_value = build_test_image('7788.jpg').read()
		similarity_mock.return_value = 95.0

		response = self.client.post(
			'/api/v1/users/login/',
			{
				'username': 'face_sync_login_user',
				'password': 'test12345',
				'face_capture': build_test_image_data_url('captured-front.jpg'),
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['username'], 'face_sync_login_user')
		profile.refresh_from_db()
		self.assertTrue(bool(profile.base_avatar))
		download_image_mock.assert_called_once_with('http://employee-service:8010/media/employee_base_images/7788.jpg')

	@override_settings(EMPLOYEE_SERVICE_ENABLED=True, EMPLOYEE_SERVICE_BASE_URL='http://employee-service:8010')
	@patch('users.views.download_employee_image')
	@patch('users.views.get_employee_by_slug')
	def test_user_info_refreshes_avatar_from_employee_service(self, get_employee_mock, download_image_mock):
		profile = self.manager.role_profile
		profile.employee_slug = 'emp-1'
		profile.base_avatar = build_test_image('old-avatar.jpg')
		profile.save(update_fields=['employee_slug', 'base_avatar'])

		get_employee_mock.return_value = {
			'slug': 'emp-1',
			'base_image_url': 'http://employee-service:8010/media/employee_base_images/new-avatar.jpg',
		}
		download_image_mock.return_value = build_test_image('new-avatar.jpg').read()

		self.client.force_authenticate(user=self.manager)
		response = self.client.get('/api/v1/users/user/')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIn('user-avatar-manager_user', response.data['base_avatar'])
		profile.refresh_from_db()
		self.assertIn('user-avatar-manager_user', profile.base_avatar.name)


class BnpzIdLoginTests(APITestCase):
	def test_bnpzid_access_check_returns_face_id_requirement_for_allowlisted_user(self):
		allowed_user = User.objects.create_user(username='9669', password='test12345')
		allowed_profile, _ = UserRole.objects.get_or_create(user=allowed_user)
		allowed_profile.role = UserRole.SHIFT_HEAD
		allowed_profile.employee_slug = 'emp-1'
		allowed_profile.face_id_required = True
		allowed_profile.save(update_fields=['role', 'employee_slug', 'face_id_required'])

		response = self.client.post(
			'/api/v1/users/bnpzid/access-check/',
			{
				'client_id': 'tb-project',
				'client_secret': 'dev-bnpzid-secret',
				'employee_slug': 'emp-1',
				'tabel_number': '9669',
				'username': 'provider_user',
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertTrue(response.data['allowed'])
		self.assertTrue(response.data['face_id_required'])

	def test_bnpzid_access_check_rejects_unknown_user(self):
		response = self.client.post(
			'/api/v1/users/bnpzid/access-check/',
			{
				'client_id': 'tb-project',
				'client_secret': 'dev-bnpzid-secret',
				'employee_slug': 'missing-emp',
				'tabel_number': '0000',
				'username': 'unknown_user',
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
		self.assertEqual(response.data['error'], 'Вам не разрешен доступ в эту систему.')

	@override_settings(EMPLOYEE_SERVICE_ENABLED=True)
	@patch('users.views.exchange_bnpzid_code')
	def test_bnpzid_login_allows_only_allowlisted_user_and_returns_token(self, exchange_mock):
		allowed_user = User.objects.create_user(username='9669', password='test12345')
		allowed_profile, _ = UserRole.objects.get_or_create(user=allowed_user)
		allowed_profile.role = UserRole.SHIFT_HEAD
		allowed_profile.employee_slug = 'emp-1'
		allowed_profile.face_id_required = False
		allowed_profile.save(update_fields=['role', 'employee_slug', 'face_id_required'])

		exchange_mock.return_value = {
			'username': 'provider_user',
			'first_name': 'Ali',
			'last_name': 'Valiyev',
			'role': 'user',
			'employee_slug': 'emp-1',
			'tabel_number': '9669',
		}

		response = self.client.post(
			'/api/v1/users/bnpzid/login/',
			{
				'code': 'dummy-code',
				'redirect_uri': 'http://localhost:5175/auth/signin',
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIn('token', response.data)
		self.assertEqual(response.data['username'], '9669')
		self.assertEqual(response.data['role'], UserRole.SHIFT_HEAD)

		allowed_user.refresh_from_db()
		self.assertEqual(allowed_user.first_name, 'Ali')
		self.assertEqual(allowed_user.last_name, 'Valiyev')
		self.assertEqual(allowed_user.role_profile.role, UserRole.SHIFT_HEAD)
		self.assertFalse(User.objects.filter(username='provider_user').exists())

	@override_settings(EMPLOYEE_SERVICE_ENABLED=True)
	@patch('users.views.exchange_bnpzid_code')
	def test_bnpzid_login_rejects_user_without_tb_access(self, exchange_mock):
		exchange_mock.return_value = {
			'username': 'unauthorized_user',
			'first_name': 'Ali',
			'last_name': 'Valiyev',
			'role': 'user',
			'employee_slug': 'emp-missing',
			'tabel_number': '4040',
		}

		response = self.client.post(
			'/api/v1/users/bnpzid/login/',
			{
				'code': 'dummy-code',
				'redirect_uri': 'http://localhost:5175/auth/signin',
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
		self.assertEqual(response.data['error'], 'Вам не разрешен доступ в эту систему.')
		self.assertFalse(User.objects.filter(username='unauthorized_user').exists())


class FaceIdDirectLoginDisabledTests(APITestCase):
	def test_faceid_direct_login_is_disabled_by_default(self):
		response = self.client.post(
			'/api/v1/users/faceid/login/',
			{'face_capture': build_test_image_data_url('captured-face.jpg')},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
		self.assertEqual(
			response.data['error'],
			'Прямой вход через Face ID отключен из соображений безопасности. Используйте логин и пароль с Face ID подтверждением.',
		)


@override_settings(FACE_ID_DIRECT_LOGIN_ENABLED=True)
class FaceIdLoginTests(APITestCase):
	@patch('users.views.list_employees')
	@patch('users.views.calculate_face_similarity_score')
	def test_faceid_login_matches_tb_user_only(self, similarity_mock, list_employees_mock):
		first_user = User.objects.create_user(username='first_user', password='test12345', first_name='First', last_name='User')
		first_profile, _ = UserRole.objects.get_or_create(user=first_user)
		first_profile.role = UserRole.USER
		first_profile.employee_slug = 'emp-first'
		first_profile.face_id_required = True
		first_profile.base_avatar = build_test_image('first-avatar.jpg')
		first_profile.save(update_fields=['role', 'employee_slug', 'face_id_required', 'base_avatar'])

		matched_user = User.objects.create_user(username='matched_user', password='test12345', first_name='Matched', last_name='User')
		matched_profile, _ = UserRole.objects.get_or_create(user=matched_user)
		matched_profile.role = UserRole.SHIFT_HEAD
		matched_profile.employee_slug = 'emp-matched'
		matched_profile.face_id_required = True
		matched_profile.base_avatar = build_test_image('matched-avatar.jpg')
		matched_profile.save(update_fields=['role', 'employee_slug', 'face_id_required', 'base_avatar'])

		similarity_mock.side_effect = [54.0, 91.0]

		response = self.client.post(
			'/api/v1/users/faceid/login/',
			{'face_capture': build_test_image_data_url('captured-face.jpg')},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['username'], 'matched_user')
		self.assertEqual(response.data['role'], UserRole.SHIFT_HEAD)
		list_employees_mock.assert_not_called()

	@override_settings(FACE_ID_LOGIN_THRESHOLD=88.0, FACE_ID_LOGIN_MIN_GAP=6.0)
	@patch('users.views.calculate_face_similarity_score')
	def test_faceid_login_rejects_ambiguous_close_match(self, similarity_mock):
		first_user = User.objects.create_user(username='first_user', password='test12345')
		first_profile, _ = UserRole.objects.get_or_create(user=first_user)
		first_profile.role = UserRole.USER
		first_profile.employee_slug = 'emp-first'
		first_profile.face_id_required = True
		first_profile.base_avatar = build_test_image('first-user.jpg')
		first_profile.save(update_fields=['role', 'employee_slug', 'face_id_required', 'base_avatar'])

		second_user = User.objects.create_user(username='second_user', password='test12345')
		second_profile, _ = UserRole.objects.get_or_create(user=second_user)
		second_profile.role = UserRole.USER
		second_profile.employee_slug = 'emp-second'
		second_profile.face_id_required = True
		second_profile.base_avatar = build_test_image('second-user.jpg')
		second_profile.save(update_fields=['role', 'employee_slug', 'face_id_required', 'base_avatar'])

		similarity_mock.side_effect = [92.0, 89.5]

		response = self.client.post(
			'/api/v1/users/faceid/login/',
			{'face_capture': build_test_image_data_url('captured-face.jpg')},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
		self.assertEqual(response.data['error'], 'Face ID не подтвержден. Найдено неоднозначное совпадение.')

	@patch('users.views.calculate_face_similarity_score')
	def test_faceid_login_rejects_when_no_user_matches(self, similarity_mock):
		user = User.objects.create_user(username='face_user', password='test12345')
		profile, _ = UserRole.objects.get_or_create(user=user)
		profile.role = UserRole.USER
		profile.employee_slug = 'emp-face'
		profile.face_id_required = True
		profile.base_avatar = build_test_image('face-user.jpg')
		profile.save(update_fields=['role', 'employee_slug', 'face_id_required', 'base_avatar'])

		similarity_mock.return_value = 41.0

		response = self.client.post(
			'/api/v1/users/faceid/login/',
			{'face_capture': build_test_image_data_url('captured-face.jpg')},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
		self.assertEqual(response.data['error'], 'Face ID не подтвержден. Лицо не совпало.')

	@patch('users.views.calculate_face_similarity_score')
	def test_faceid_login_ignores_users_not_allowed_on_settings_page(self, similarity_mock):
		blocked_user = User.objects.create_user(username='blocked_user', password='test12345')
		blocked_profile, _ = UserRole.objects.get_or_create(user=blocked_user)
		blocked_profile.role = UserRole.USER
		blocked_profile.face_id_required = False
		blocked_profile.base_avatar = build_test_image('blocked-user.jpg')
		blocked_profile.save(update_fields=['role', 'face_id_required', 'base_avatar'])

		response = self.client.post(
			'/api/v1/users/faceid/login/',
			{'face_capture': build_test_image_data_url('captured-face.jpg')},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(response.data['error'], 'Для Face ID входа не найдено ни одного разрешенного сотрудника с базовым аватаром.')
		similarity_mock.assert_not_called()

	@override_settings(EMPLOYEE_SERVICE_ENABLED=True)
	@patch('users.views.download_employee_image')
	@patch('users.views.get_employee_by_slug')
	@patch('users.views.calculate_face_similarity_score')
	def test_faceid_login_syncs_missing_base_avatar_from_employee_service(self, similarity_mock, get_employee_mock, download_image_mock):
		user = User.objects.create_user(username='face_sync_user', password='test12345')
		profile, _ = UserRole.objects.get_or_create(user=user)
		profile.role = UserRole.USER
		profile.employee_slug = 'emp-face-sync'
		profile.face_id_required = True
		profile.base_avatar = None
		profile.save(update_fields=['role', 'employee_slug', 'face_id_required', 'base_avatar'])

		get_employee_mock.return_value = {
			'slug': 'emp-face-sync',
			'first_name': 'Face',
			'last_name': 'Sync',
			'tabel_number': '7777',
			'base_image_url': 'http://employee-service:8010/media/employee_base_images/7777.jpg',
		}
		download_image_mock.return_value = build_test_image('7777.jpg').read()
		similarity_mock.return_value = 95.0

		response = self.client.post(
			'/api/v1/users/faceid/login/',
			{'face_capture': build_test_image_data_url('captured-face.jpg')},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['username'], 'face_sync_user')
		profile.refresh_from_db()
		self.assertTrue(bool(profile.base_avatar))
		download_image_mock.assert_called_once_with('http://employee-service:8010/media/employee_base_images/7777.jpg')


class SettingsUsersFaceIdRequiredTests(APITestCase):
	def setUp(self):
		self.admin = User.objects.create_superuser(username='face_admin', password='test12345')
		self.client.force_authenticate(user=self.admin)

	@override_settings(EMPLOYEE_SERVICE_ENABLED=True)
	@patch('users.views.download_employee_image')
	@patch('users.views.get_employees_by_slugs')
	def test_settings_users_list_syncs_missing_base_avatar_from_employee_service(self, get_employees_by_slugs_mock, download_image_mock):
		target_user = User.objects.create_user(username='avatar_user', password='test12345', first_name='Avatar', last_name='User')
		profile, _ = UserRole.objects.get_or_create(user=target_user)
		profile.role = UserRole.USER
		profile.employee_slug = 'emp-avatar'
		profile.face_id_required = True
		profile.base_avatar = None
		profile.save(update_fields=['role', 'employee_slug', 'face_id_required', 'base_avatar'])

		get_employees_by_slugs_mock.return_value = {
			'emp-avatar': {
				'slug': 'emp-avatar',
				'first_name': 'Avatar',
				'last_name': 'User',
				'tabel_number': 'A-100',
				'base_image_url': 'http://employee-service:8010/media/employee_base_images/A-100.jpg',
			}
		}
		download_image_mock.return_value = build_test_image('A-100.jpg').read()

		response = self.client.get('/api/v1/users/settings-users/')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		target_payload = next(item for item in response.data['results'] if item['username'] == 'avatar_user')
		self.assertIn('user-avatar-avatar_user', target_payload['base_avatar'])
		profile.refresh_from_db()
		self.assertIn('user-avatar-avatar_user', profile.base_avatar.name)
		download_image_mock.assert_called_once_with('http://employee-service:8010/media/employee_base_images/A-100.jpg')

	@override_settings(EMPLOYEE_SERVICE_ENABLED=True)
	@patch('users.views.get_employees_by_slugs')
	@patch('users.views.list_employees')
	def test_settings_users_list_supports_search_by_employee_tabel_number(self, list_employees_mock, get_employees_by_slugs_mock):
		target_user = User.objects.create_user(username='timur_bakayev', password='test12345', first_name='Timur', last_name='Bakayev')
		profile, _ = UserRole.objects.get_or_create(user=target_user)
		profile.role = UserRole.USER
		profile.employee_slug = 'emp-777'
		profile.face_id_required = True
		profile.save(update_fields=['role', 'employee_slug', 'face_id_required'])

		list_employees_mock.return_value = [
			{
				'slug': 'emp-777',
				'first_name': 'Timur',
				'last_name': 'Bakayev',
				'tabel_number': '777',
				'base_image_url': '',
			}
		]
		get_employees_by_slugs_mock.return_value = {
			'emp-777': {
				'slug': 'emp-777',
				'first_name': 'Timur',
				'last_name': 'Bakayev',
				'tabel_number': '777',
				'base_image_url': '',
			}
		}

		response = self.client.get('/api/v1/users/settings-users/', {'search': '777'})

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['count'], 1)
		self.assertEqual(response.data['results'][0]['username'], 'timur_bakayev')
		self.assertEqual(response.data['results'][0]['employee']['tabel_number'], '777')
		list_employees_mock.assert_called()

	def test_settings_user_update_allows_changing_login_and_password(self):
		target_user = User.objects.create_user(username='timur_bakayev', password='Oldpass1')
		profile, _ = UserRole.objects.get_or_create(user=target_user)
		profile.role = UserRole.USER
		profile.save(update_fields=['role'])

		response = self.client.put(
			f'/api/v1/users/settings-users/{target_user.id}/',
			{
				'role': UserRole.USER,
				'username': 'timur_bakayev_new',
				'password': 'Newpass2',
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		target_user.refresh_from_db()
		self.assertEqual(target_user.username, 'timur_bakayev_new')
		self.assertTrue(target_user.check_password('Newpass2'))

	def test_settings_user_reset_password_returns_generated_password(self):
		target_user = User.objects.create_user(username='timur_reset', password='Oldpass1')
		profile, _ = UserRole.objects.get_or_create(user=target_user)
		profile.role = UserRole.USER
		profile.save(update_fields=['role'])

		response = self.client.post(f'/api/v1/users/settings-users/{target_user.id}/reset-password/')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['username'], 'timur_reset')
		self.assertTrue(bool(response.data['generated_password']))
		target_user.refresh_from_db()
		self.assertTrue(target_user.check_password(response.data['generated_password']))

	@patch('users.views.download_employee_image')
	@patch('users.views.get_employee_by_slug')
	def test_create_user_preserves_false_face_id_required(self, get_employee_mock, download_image_mock):
		get_employee_mock.return_value = {
			'slug': 'emp-1',
			'first_name': 'Abdullo',
			'last_name': 'Kurbanov',
			'tabel_number': '9669',
			'base_image_url': '',
		}
		download_image_mock.return_value = None

		response = self.client.post(
			'/api/v1/users/settings-users/',
			{
				'employee_slug': 'emp-1',
				'role': UserRole.USER,
				'face_id_required': False,
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertIs(response.data['face_id_required'], False)
		self.assertTrue(bool(response.data['generated_password']))

		created_user = User.objects.get(username=response.data['username'])
		self.assertIs(created_user.role_profile.face_id_required, False)
		self.assertTrue(created_user.check_password(response.data['generated_password']))

	@patch('users.views.get_employee_by_slug')
	def test_update_user_preserves_false_face_id_required(self, get_employee_mock):
		get_employee_mock.return_value = None
		target_user = User.objects.create_user(username='user9669', password='test12345')
		profile, _ = UserRole.objects.get_or_create(user=target_user)
		profile.role = UserRole.USER
		profile.employee_slug = 'emp-1'
		profile.face_id_required = True
		profile.save(update_fields=['role', 'employee_slug', 'face_id_required'])

		response = self.client.put(
			f'/api/v1/users/settings-users/{target_user.id}/',
			{
				'employee_slug': 'emp-1',
				'role': UserRole.USER,
				'face_id_required': False,
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIs(response.data['face_id_required'], False)

		profile.refresh_from_db()
		self.assertIs(profile.face_id_required, False)

	@patch('users.views.download_employee_image')
	@patch('users.views.get_employee_by_slug')
	def test_create_user_generates_username_from_employee_name(self, get_employee_mock, download_image_mock):
		get_employee_mock.return_value = {
			'slug': 'emp-2',
			'first_name': 'Ilxom',
			'last_name': 'Igamberdiyev',
			'tabel_number': '3032',
			'login': 'ilxom_i',
			'base_image_url': '',
		}
		download_image_mock.return_value = None

		response = self.client.post(
			'/api/v1/users/settings-users/',
			{
				'employee_slug': 'emp-2',
				'role': UserRole.USER,
				'face_id_required': True,
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(response.data['username'], 'ilxom_igamberdiyev')
		self.assertTrue(bool(response.data['generated_password']))
		self.assertTrue(User.objects.filter(username='ilxom_igamberdiyev').exists())
		self.assertTrue(User.objects.get(username='ilxom_igamberdiyev').check_password(response.data['generated_password']))
