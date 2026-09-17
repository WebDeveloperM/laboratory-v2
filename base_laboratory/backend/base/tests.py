from datetime import timedelta

from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase

from .models import Department, Section, Employee, EmployeeFaceIdOverride, PPEProduct, PositionPPERenewalRule, PendingItemIssue, Item, PPEArrival
from .employee_data import build_employee_snapshot
from .employee_service_client import EmployeeServiceClientError
from .views import build_employee_ppe_products_payload
from users.models import RolePageAccess, UserRole
from unittest.mock import patch
from requests import RequestException


class PendingIssueTwoStepSignatureTests(APITestCase):
	SIGNATURE_DATA_URL = (
		"data:image/png;base64,"
		"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9p0lY3sAAAAASUVORK5CYII="
	)

	def setUp(self):
		self.user = User.objects.create_user(username='regular_user', password='test12345')
		self.created_by = User.objects.create_user(username='issuer_user', password='test12345')

		department = Department.objects.create(name='Test Department', boss_fullName='Boss Name')
		section = Section.objects.create(name='Test Section', department=department)

		self.employee = Employee.objects.create(
			first_name='Ali',
			last_name='Valiyev',
			surname='Testovich',
			tabel_number='T-100500',
			gender='M',
			height='180',
			clothe_size='52',
			shoe_size='42',
			section=section,
			department=department,
			position='Engineer',
		)

		self.product = PPEProduct.objects.create(name='Helmet')

		self.pending = PendingItemIssue.objects.create(
			employee_service_id=self.employee.id,
			employee_slug=self.employee.slug,
			employee_snapshot={
				'id': self.employee.id,
				'external_id': str(self.employee.id),
				'slug': self.employee.slug,
				'first_name': self.employee.first_name,
				'last_name': self.employee.last_name,
				'surname': self.employee.surname,
				'tabel_number': self.employee.tabel_number,
				'gender': self.employee.gender,
				'height': self.employee.height,
				'clothe_size': self.employee.clothe_size,
				'shoe_size': self.employee.shoe_size,
				'position': self.employee.position,
				'requires_face_id_checkout': True,
				'department': {
					'id': self.employee.department_id,
					'name': self.employee.department.name,
					'boss_fullName': self.employee.department.boss_fullName,
				},
				'section': {
					'id': self.employee.section_id,
					'name': self.employee.section.name,
					'department_id': self.employee.department_id,
				},
			},
			ppeproduct_ids=[self.product.id],
			ppe_sizes={str(self.product.id): 'L'},
			expires_at=timezone.now() + timedelta(minutes=3),
			created_by=self.created_by,
		)

		self.confirm_url = f'/api/v1/pending-issue/{self.pending.id}/confirm/'
		manager_profile, _ = UserRole.objects.get_or_create(user=self.created_by)
		manager_profile.role = UserRole.SHIFT_HEAD
		manager_profile.save(update_fields=['role'])

	def test_non_warehouse_user_cannot_complete_second_step(self):
		self.client.force_authenticate(user=self.user)

		first_response = self.client.post(
			self.confirm_url,
			{'signature': self.SIGNATURE_DATA_URL},
			format='json',
		)
		self.assertEqual(first_response.status_code, 200)
		self.assertEqual(first_response.data.get('step'), 'employee_signed')

		second_response = self.client.post(
			self.confirm_url,
			{'signature': self.SIGNATURE_DATA_URL},
			format='json',
		)
		self.assertEqual(second_response.status_code, 403)

		self.pending.refresh_from_db()
		self.assertEqual(self.pending.status, PendingItemIssue.STATUS_PENDING)
		self.assertIsNotNone(self.pending.signature_image)
		self.assertFalse(bool(self.pending.warehouse_signature_image))


class EmployeeServiceEmployeeBaseImagePermissionTests(APITestCase):
	def setUp(self):
		self.employee_slug = 'remote-employee-1'
		self.url = f'/api/v1/employee-service/employees/{self.employee_slug}/'
		self.admin_user = User.objects.create_user(username='admin_user', password='test12345')
		self.staff_user = User.objects.create_user(username='shift_head_user', password='test12345')
		self.it_center_user = User.objects.create_user(username='it_center_user', password='test12345')

		admin_profile, _ = UserRole.objects.get_or_create(user=self.admin_user)
		admin_profile.role = UserRole.ADMIN
		admin_profile.save(update_fields=['role'])

		staff_profile, _ = UserRole.objects.get_or_create(user=self.staff_user)
		staff_profile.role = UserRole.SHIFT_HEAD
		staff_profile.save(update_fields=['role'])

		it_center_profile, _ = UserRole.objects.get_or_create(user=self.it_center_user)
		it_center_profile.role = UserRole.IT_CENTER
		it_center_profile.save(update_fields=['role'])

	def _build_upload(self, name='avatar.png'):
		return SimpleUploadedFile(name, b'fake-image-bytes', content_type='image/png')

	@patch('base.employee_service_views.is_employee_service_enabled', return_value=True)
	@patch('base.employee_service_views.update_employee_base_image')
	def test_admin_can_update_employee_base_image(self, update_employee_base_image_mock, _enabled_mock):
		update_employee_base_image_mock.return_value = {
			'id': 1,
			'slug': self.employee_slug,
			'first_name': 'Ali',
			'base_image': '/media/employee_base_images/new-avatar.png',
			'base_image_url': '/media/employee_base_images/new-avatar.png',
		}

		self.client.force_authenticate(user=self.admin_user)
		response = self.client.put(self.url, {'base_image': self._build_upload()}, format='multipart')

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['base_image_url'], '/media/employee_base_images/new-avatar.png')
		update_employee_base_image_mock.assert_called_once()
		self.assertEqual(update_employee_base_image_mock.call_args.args[0], self.employee_slug)
		self.assertEqual(update_employee_base_image_mock.call_args.args[1].name, 'avatar.png')
		self.assertEqual(update_employee_base_image_mock.call_args.kwargs['actor_username'], 'admin_user')
		self.assertEqual(update_employee_base_image_mock.call_args.kwargs['actor_role'], UserRole.ADMIN)

	@patch('base.employee_service_views.is_employee_service_enabled', return_value=True)
	@patch('base.employee_service_views.update_employee_base_image')
	def test_shift_head_can_update_employee_base_image(self, update_employee_base_image_mock, _enabled_mock):
		update_employee_base_image_mock.return_value = {
			'id': 1,
			'slug': self.employee_slug,
			'base_image': '/media/employee_base_images/staff-avatar.png',
			'base_image_url': '/media/employee_base_images/staff-avatar.png',
		}

		self.client.force_authenticate(user=self.staff_user)
		response = self.client.put(self.url, {'base_image': self._build_upload('staff.png')}, format='multipart')

		self.assertEqual(response.status_code, 200)
		update_employee_base_image_mock.assert_called_once()

	@patch('base.employee_service_views.is_employee_service_enabled', return_value=True)
	@patch('base.employee_service_views.update_employee_base_image')
	def test_it_center_cannot_update_employee_base_image(self, update_employee_base_image_mock, _enabled_mock):
		self.client.force_authenticate(user=self.it_center_user)
		response = self.client.put(self.url, {'base_image': self._build_upload('blocked.png')}, format='multipart')

		self.assertEqual(response.status_code, 403)
		update_employee_base_image_mock.assert_not_called()


class EmployeeServiceBaseImageChangeLogAccessTests(APITestCase):
	def setUp(self):
		self.url = '/api/v1/employee-service/base-image-change-logs/'
		self.admin_user = User.objects.create_user(username='admin_report_user', password='test12345')
		self.manager_user = User.objects.create_user(username='shift_head_report', password='test12345')
		self.plain_user = User.objects.create_user(username='plain_user_report', password='test12345')

		admin_profile, _ = UserRole.objects.get_or_create(user=self.admin_user)
		admin_profile.role = UserRole.ADMIN
		admin_profile.save(update_fields=['role'])

		manager_profile, _ = UserRole.objects.get_or_create(user=self.manager_user)
		manager_profile.role = UserRole.SHIFT_HEAD
		manager_profile.save(update_fields=['role'])

		plain_profile, _ = UserRole.objects.get_or_create(user=self.plain_user)
		plain_profile.role = UserRole.USER
		plain_profile.save(update_fields=['role'])

	@patch('base.employee_service_views.is_employee_service_enabled', return_value=True)
	@patch('base.employee_service_views.list_employee_base_image_change_logs')
	def test_admin_can_list_employee_base_image_change_logs(self, list_logs_mock, _enabled_mock):
		list_logs_mock.return_value = {
			'count': 1,
			'next': None,
			'previous': None,
			'results': [
				{
					'id': 7,
					'employee_slug': 'default-5413-a',
					'employee_full_name': 'Matruf Shabonov',
					'employee_tabel_number': '5413',
					'changed_by_username': 'warehouse_user',
					'changed_by_user_id': '42',
					'changed_by_role': 'shift_head',
					'old_image': 'employee_base_images/old.jpg',
					'old_image_url': '/media/employee_base_images/old.jpg',
					'new_image': 'employee_base_images/new.jpg',
					'new_image_url': '/media/employee_base_images/new.jpg',
					'created_at': '2026-04-30T10:15:00Z',
				}
			],
		}

		self.client.force_authenticate(user=self.admin_user)
		response = self.client.get(self.url, {'search': '5413'})

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['count'], 1)
		self.assertEqual(
			response.data['results'][0]['new_image_url'],
			'/api/v1/employee-service/media-proxy/?path=%2Fmedia%2Femployee_base_images%2Fnew.jpg',
		)
		list_logs_mock.assert_called_once_with(
			search='5413',
			changed_by_username=None,
			employee_slug=None,
			date_from=None,
			date_to=None,
			page=None,
			page_size=None,
		)

	@patch('base.employee_service_views.is_employee_service_enabled', return_value=True)
	@patch('base.employee_service_views.list_employee_base_image_change_logs', return_value={'count': 0, 'next': None, 'previous': None, 'results': []})
	def test_shift_head_can_list_employee_base_image_change_logs(self, list_logs_mock, _enabled_mock):
		self.client.force_authenticate(user=self.manager_user)
		response = self.client.get(self.url)

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['count'], 0)
		list_logs_mock.assert_called_once()

	@patch('base.employee_service_views.is_employee_service_enabled', return_value=True)
	@patch('base.employee_service_views.list_employee_base_image_change_logs')
	def test_plain_user_cannot_list_employee_base_image_change_logs(self, list_logs_mock, _enabled_mock):
		self.client.force_authenticate(user=self.plain_user)
		response = self.client.get(self.url)

		self.assertEqual(response.status_code, 403)
		list_logs_mock.assert_not_called()


class TelegramBotEmployeePPELookupApiTests(APITestCase):
	def setUp(self):
		self.url = '/api/v1/telegram-bot/employee-ppe-lookup/'
		self.department = Department.objects.create(name='12-Telegram Department', boss_fullName='Chief User')
		self.section = Section.objects.create(name='Bot Section', department=self.department)
		self.user = User.objects.create_user(username='ppe_issuer', password='test12345')

		self.helmet = PPEProduct.objects.create(name='Helmet', type_product='unit', renewal_months=12)
		self.boots = PPEProduct.objects.create(name='Safety Boots', type_product='unit', renewal_months=6)
		self.gloves = PPEProduct.objects.create(name='Gloves', type_product='unit', renewal_months=0)
		self.jacket = PPEProduct.objects.create(name='Куртка', type_product='unit', renewal_months=12)
		self.tshirt = PPEProduct.objects.create(name='Футболка', type_product='unit', renewal_months=6)
		self.suit = PPEProduct.objects.create(name='Костюм с брюками (мужское)', type_product='unit', renewal_months=12)

		self.employee_payload = {
			'id': 501,
			'external_id': '501',
			'source_system': 'employee-service',
			'slug': 'telegram-employee-501',
			'first_name': 'Ali',
			'last_name': 'Valiyev',
			'surname': 'Botovich',
			'full_name': 'Valiyev Ali Botovich',
			'tabel_number': 'TG-501',
			'phone_number_1': '+998 90 123 45 67',
			'phone_number_2': '',
			'gender': 'M',
			'clothe_size': '54',
			'special_clothing_size': '52',
			'shoe_size': '42',
			'jacket_size': '56',
			'tshirt_size': 'L',
			'position': 'Engineer',
			'department': {
				'id': self.department.id,
				'name': self.department.name,
				'boss_fullName': self.department.boss_fullName,
			},
			'section': {
				'id': self.section.id,
				'name': self.section.name,
				'department_id': self.department.id,
			},
		}

		self.latest_item = Item.objects.create(
			employee_service_id=501,
			employee_slug='telegram-employee-501',
			employee_snapshot=build_employee_snapshot(self.employee_payload),
			issued_at=timezone.now() - timedelta(days=60),
			issued_by=self.user,
		)
		self.latest_item.ppeproduct.set([self.helmet, self.boots])

		PositionPPERenewalRule.objects.create(
			department_service_id=self.department.id,
			department_name=self.department.name,
			position_name='Engineer',
			position_key='engineer',
			ppeproduct=self.helmet,
			renewal_months=12,
			is_allowed=True,
		)
		PositionPPERenewalRule.objects.create(
			department_service_id=self.department.id,
			department_name=self.department.name,
			position_name='Engineer',
			position_key='engineer',
			ppeproduct=self.boots,
			renewal_months=6,
			is_allowed=True,
		)
		PositionPPERenewalRule.objects.create(
			department_service_id=self.department.id,
			department_name=self.department.name,
			position_name='Engineer',
			position_key='engineer',
			ppeproduct=self.gloves,
			renewal_months=0,
			is_allowed=True,
		)
		PositionPPERenewalRule.objects.create(
			department_service_id=self.department.id,
			department_name=self.department.name,
			position_name='Engineer',
			position_key='engineer',
			ppeproduct=self.jacket,
			renewal_months=12,
			is_allowed=True,
		)
		PositionPPERenewalRule.objects.create(
			department_service_id=self.department.id,
			department_name=self.department.name,
			position_name='Engineer',
			position_key='engineer',
			ppeproduct=self.tshirt,
			renewal_months=6,
			is_allowed=True,
		)
		PositionPPERenewalRule.objects.create(
			department_service_id=self.department.id,
			department_name=self.department.name,
			position_name='Engineer',
			position_key='engineer',
			ppeproduct=self.suit,
			renewal_months=12,
			is_allowed=True,
		)

	@patch('base.views.list_employees')
	def test_returns_last_received_and_next_available_products_for_matching_phone_and_tabel(self, list_employees_mock):
		list_employees_mock.return_value = [self.employee_payload]

		response = self.client.post(
			self.url,
			{'phone_number': '+998901234567', 'tabel_number': 'TG-501'},
			format='json',
		)

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['employee']['tabel_number'], 'TG-501')
		self.assertEqual(len(response.data['last_received_products']), 2)
		self.assertEqual({row['name'] for row in response.data['last_received_products']}, {'Helmet', 'Safety Boots'})
		self.assertEqual({row['name'] for row in response.data['available_now_products']}, {'Gloves'})
		self.assertEqual({row['name'] for row in response.data['upcoming_products']}, {'Helmet', 'Safety Boots'})
		boots_row = next(row for row in response.data['upcoming_products'] if row['name'] == 'Safety Boots')
		self.assertFalse(boots_row['can_issue'])
		self.assertIsNotNone(boots_row['next_due_date'])

	@patch('base.views.list_employees')
	def test_returns_404_when_phone_does_not_match_employee(self, list_employees_mock):
		list_employees_mock.return_value = [self.employee_payload]

		response = self.client.post(
			self.url,
			{'phone_number': '+998 91 000 00 00', 'tabel_number': 'TG-501'},
			format='json',
		)

		self.assertEqual(response.status_code, 404)

	def test_build_employee_ppe_products_payload_uses_specific_employee_service_size_fields(self):
		PPEArrival.objects.create(ppeproduct=self.boots, quantity=5, size='41')
		PPEArrival.objects.create(ppeproduct=self.jacket, quantity=3, size='56')
		PPEArrival.objects.create(ppeproduct=self.tshirt, quantity=4, size='l')

		rows = build_employee_ppe_products_payload(self.employee_payload)
		rows_by_name = {row['name']: row for row in rows}

		self.assertEqual(rows_by_name['Safety Boots']['default_size'], '42')
		self.assertEqual(rows_by_name['Куртка']['default_size'], '56')
		self.assertEqual(rows_by_name['Футболка']['default_size'], 'L')
		self.assertEqual(rows_by_name['Костюм с брюками (мужское)']['default_size'], '52')
		self.assertFalse(rows_by_name['Safety Boots']['stock_available'])
		self.assertEqual(rows_by_name['Safety Boots']['stock_message'], 'Нет на складе')

	def test_second_step_generates_qr_and_public_detail_payload(self):
		self.client.force_authenticate(user=self.created_by)

		first_response = self.client.post(
			self.confirm_url,
			{'signature': self.SIGNATURE_DATA_URL},
			format='json',
		)
		self.assertEqual(first_response.status_code, 200)
		self.assertEqual(first_response.data.get('step'), 'employee_signed')

		second_response = self.client.post(
			self.confirm_url,
			{'signature': self.SIGNATURE_DATA_URL},
			format='json',
		)
		self.assertEqual(second_response.status_code, 200)
		self.assertEqual(second_response.data.get('step'), 'warehouse_signed')
		self.assertTrue(second_response.data.get('qr_token'))
		self.assertTrue(second_response.data.get('qr_frontend_path', '').startswith('/issue-qr/'))

		self.pending.refresh_from_db()
		self.assertEqual(self.pending.status, PendingItemIssue.STATUS_CONFIRMED)
		self.assertIsNotNone(self.pending.employee_signed_at)
		self.assertIsNotNone(self.pending.warehouse_signed_at)
		self.assertIsNotNone(self.pending.confirmed_at)
		self.assertTrue(bool(self.pending.qr_code_image))

		public_response = self.client.get(f'/api/v1/issue-qr/{self.pending.qr_token}/')
		self.assertEqual(public_response.status_code, 200)
		self.assertEqual(public_response.data['employee']['tabel_number'], self.employee.tabel_number)
		self.assertEqual(public_response.data['products'][0]['name'], self.product.name)
		self.assertEqual(public_response.data['timeline'][1]['key'], 'employee_signed')


class DueSoonEmployeePPETests(APITestCase):
	def setUp(self):
		self.admin = User.objects.create_superuser(username='due_admin', password='test12345')
		self.viewer = User.objects.create_user(username='due_viewer', password='test12345')
		viewer_profile, _ = UserRole.objects.get_or_create(user=self.viewer)
		viewer_profile.role = UserRole.USER
		viewer_profile.save(update_fields=['role'])

		department = Department.objects.create(name='Main Department', boss_fullName='Boss Name')
		section = Section.objects.create(name='Section A', department=department)

		self.employee = Employee.objects.create(
			first_name='Ali',
			last_name='Valiyev',
			surname='Karimovich',
			tabel_number='DUE-001',
			gender='M',
			height='180',
			clothe_size='52',
			shoe_size='42',
			section=section,
			department=department,
			position='Operator',
		)

		self.product = PPEProduct.objects.create(name='Куртка', renewal_months=1)
		issued_at = timezone.now() - timedelta(days=20)
		from .models import Item

		self.item = Item.objects.create(
			employee_service_id=self.employee.id,
			employee_slug=self.employee.slug,
			employee_snapshot={
				'id': self.employee.id,
				'external_id': str(self.employee.id),
				'slug': self.employee.slug,
				'first_name': self.employee.first_name,
				'last_name': self.employee.last_name,
				'surname': self.employee.surname,
				'tabel_number': self.employee.tabel_number,
				'position': self.employee.position,
				'clothe_size': self.employee.clothe_size,
				'shoe_size': self.employee.shoe_size,
				'department': {
					'id': self.employee.department_id,
					'name': self.employee.department.name,
					'boss_fullName': self.employee.department.boss_fullName,
				},
				'section': {
					'id': self.employee.section_id,
					'name': self.employee.section.name,
					'department_id': self.employee.department_id,
				},
			},
			issued_at=issued_at,
			is_deleted=False,
		)
		self.item.ppeproduct.add(self.product)
		self.item.ppe_sizes = {str(self.product.id): 'XL'}
		self.item.save(update_fields=['ppe_sizes'])

	def test_due_soon_endpoint_returns_employee_product_and_size(self):
		self.client.force_authenticate(user=self.admin)

		response = self.client.get('/api/v1/due-soon-employees/?due_days=30')

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['total_count'], 1)
		self.assertEqual(response.data['products'][0]['name'], 'Куртка')
		self.assertEqual(response.data['products'][0]['due_count'], 1)
		self.assertEqual(response.data['results'][0]['employee_name'], 'Valiyev Ali Karimovich')
		self.assertEqual(response.data['results'][0]['product_name'], 'Куртка')
		self.assertEqual(response.data['results'][0]['size'], 'XL')

	def test_due_soon_endpoint_respects_due_cards_permission(self):
		RolePageAccess.objects.update_or_create(
			role=UserRole.USER,
			defaults={'can_view_dashboard_due_cards': False},
		)
		self.client.force_authenticate(user=self.viewer)

		response = self.client.get('/api/v1/due-soon-employees/?due_days=30')

		self.assertEqual(response.status_code, 403)


class FaceIdExemptionAccessTests(APITestCase):
	def setUp(self):
		self.manager = User.objects.create_user(username='wm_face', password='test12345')
		profile, _ = UserRole.objects.get_or_create(user=self.manager)
		profile.role = UserRole.SHIFT_HEAD
		profile.save(update_fields=['role'])
		self.client.force_authenticate(user=self.manager)
		department = Department.objects.create(name='Face Department', boss_fullName='Boss Name')
		section = Section.objects.create(name='Face Section', department=department)
		self.local_employee = Employee.objects.create(
			first_name='Timur',
			last_name='Bakayev',
			surname='Ruslanovich',
			tabel_number='7777',
			gender='M',
			height='180',
			clothe_size='52',
			shoe_size='42',
			section=section,
			department=department,
			position='Engineer',
			requires_face_id_checkout=True,
		)

	@patch('base.views.update_face_id_exemption')
	@patch('base.views.fetch_employee_by_slug_or_404')
	def test_shift_head_can_update_face_id_exemption_by_slug(self, fetch_employee_mock, update_face_id_mock):
		fetch_employee_mock.return_value = {'slug': 'default-7777-timur-bakayev'}
		update_face_id_mock.return_value = {
			'success': True,
			'employee': {
				'slug': 'default-7777-timur-bakayev',
				'full_name': 'Bakayev Timur Ruslanovich',
				'requires_face_id_checkout': False,
			},
		}

		response = self.client.patch(
			'/api/v1/employees/default-7777-timur-bakayev/face-id-exemption/',
			{'requires_face_id_checkout': False},
			format='json',
		)

		self.assertEqual(response.status_code, 200)
		fetch_employee_mock.assert_called_once_with('default-7777-timur-bakayev')
		update_face_id_mock.assert_called_once_with('default-7777-timur-bakayev', False)

	@patch('base.views.update_face_id_exemption')
	@patch('base.views.fetch_employee_by_slug_or_404')
	def test_shift_head_falls_back_to_local_face_id_update_when_service_key_is_read_only(self, fetch_employee_mock, update_face_id_mock):
		fetch_employee_mock.return_value = {
			'slug': 'default-7777-timur-bakayev',
			'tabel_number': '7777',
			'first_name': 'Timur',
			'last_name': 'Bakayev',
			'surname': 'Ruslanovich',
		}
		update_face_id_mock.side_effect = EmployeeServiceClientError('Сервисный API-ключ поддерживает только операции чтения.')

		response = self.client.patch(
			'/api/v1/employees/default-7777-timur-bakayev/face-id-exemption/',
			{'requires_face_id_checkout': False},
			format='json',
		)

		self.assertEqual(response.status_code, 200)
		self.local_employee.refresh_from_db()
		self.assertFalse(self.local_employee.requires_face_id_checkout)
		self.assertEqual(response.data['employee']['slug'], self.local_employee.slug)
		self.assertFalse(response.data['employee']['requires_face_id_checkout'])

	@patch('base.views.update_face_id_exemption')
	@patch('base.views.fetch_employee_by_slug_or_404')
	def test_shift_head_persists_override_for_remote_employee_when_local_record_missing(self, fetch_employee_mock, update_face_id_mock):
		fetch_employee_mock.return_value = {
			'id': 9112,
			'external_id': '9112',
			'slug': 'default-9112-maruf-shabonov',
			'tabel_number': '9112',
			'first_name': 'Maruf',
			'last_name': 'Shabonov',
			'surname': 'Bahriddin Ugli',
		}
		update_face_id_mock.side_effect = EmployeeServiceClientError('Сервисный API-ключ поддерживает только операции чтения.')

		response = self.client.patch(
			'/api/v1/employees/default-9112-maruf-shabonov/face-id-exemption/',
			{'requires_face_id_checkout': False},
			format='json',
		)

		self.assertEqual(response.status_code, 200)
		override = EmployeeFaceIdOverride.objects.get(employee_slug='default-9112-maruf-shabonov')
		self.assertEqual(override.employee_service_id, 9112)
		self.assertFalse(override.requires_face_id_checkout)
		self.assertFalse(response.data['employee']['requires_face_id_checkout'])

	@patch('base.views.list_face_id_exemptions')
	def test_face_id_list_applies_local_override_to_remote_employees(self, list_face_id_exemptions_mock):
		EmployeeFaceIdOverride.objects.create(
			employee_service_id=9112,
			employee_slug='default-9112-maruf-shabonov',
			tabel_number='9112',
			full_name='Shabonov Maruf Bahriddin Ugli',
			requires_face_id_checkout=False,
		)
		list_face_id_exemptions_mock.return_value = {
			'count': 1,
			'next': None,
			'previous': None,
			'employees': [
				{
					'id': 9112,
					'external_id': '9112',
					'slug': 'default-9112-maruf-shabonov',
					'first_name': 'Maruf',
					'last_name': 'Shabonov',
					'surname': 'Bahriddin Ugli',
					'tabel_number': '9112',
					'position': 'Engineer',
					'requires_face_id_checkout': True,
				},
			],
		}

		response = self.client.get('/api/v1/employees/face-id-exemption/')

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['count'], 1)
		self.assertFalse(response.data['employees'][0]['requires_face_id_checkout'])

	@patch('base.views.list_face_id_exemptions')
	def test_face_id_list_filters_only_not_required_employees(self, list_face_id_exemptions_mock):
		list_face_id_exemptions_mock.return_value = {
			'count': 2,
			'next': None,
			'previous': None,
			'employees': [
				{
					'id': 9112,
					'external_id': '9112',
					'slug': 'default-9112-maruf-shabonov',
					'first_name': 'Maruf',
					'last_name': 'Shabonov',
					'surname': 'Bahriddin Ugli',
					'tabel_number': '9112',
					'position': 'Engineer',
					'requires_face_id_checkout': False,
				},
				{
					'id': 7777,
					'external_id': '7777',
					'slug': 'default-7777-timur-bakayev',
					'first_name': 'Timur',
					'last_name': 'Bakayev',
					'surname': 'Ruslanovich',
					'tabel_number': '7777',
					'position': 'Engineer',
					'requires_face_id_checkout': True,
				},
			],
		}

		response = self.client.get('/api/v1/employees/face-id-exemption/?requires_face_id_checkout=false')

		self.assertEqual(response.status_code, 200)
		list_face_id_exemptions_mock.assert_called_once_with(
			search=None,
			page='1',
			page_size='50',
			no_pagination=False,
			requires_face_id_checkout=False,
		)
		self.assertEqual(response.data['count'], 1)
		self.assertEqual(len(response.data['employees']), 1)
		self.assertFalse(response.data['employees'][0]['requires_face_id_checkout'])


class ItemAddGenderFilteringTests(APITestCase):
	def setUp(self):
		self.admin = User.objects.create_superuser(username='gender_admin', password='test12345')
		self.client.force_authenticate(user=self.admin)

		department = Department.objects.create(name='Gender Department', boss_fullName='Boss Name')
		section = Section.objects.create(name='Gender Section', department=department)

		self.employee = Employee.objects.create(
			first_name='Ali',
			last_name='Valiyev',
			surname='Karimovich',
			tabel_number='GENDER-001',
			gender='M',
			height='180',
			clothe_size='52',
			shoe_size='42',
			section=section,
			department=department,
			position='Operator',
		)

		self.unisex_product = PPEProduct.objects.create(name='Каска', target_gender='ALL')
		self.male_product = PPEProduct.objects.create(name='Спецодежда мужская', target_gender='M')
		self.female_product = PPEProduct.objects.create(name='Спецодежда женская', target_gender='F')

		self.item = Item.objects.create(
			employee_service_id=self.employee.id,
			employee_slug=self.employee.slug,
			slug=self.employee.slug,
			employee_snapshot={
				'id': self.employee.id,
				'external_id': str(self.employee.id),
				'slug': self.employee.slug,
				'first_name': self.employee.first_name,
				'last_name': self.employee.last_name,
				'surname': self.employee.surname,
				'tabel_number': self.employee.tabel_number,
				'gender': self.employee.gender,
				'height': self.employee.height,
				'clothe_size': self.employee.clothe_size,
				'shoe_size': self.employee.shoe_size,
				'position': self.employee.position,
				'department': {
					'id': self.employee.department_id,
					'name': self.employee.department.name,
					'boss_fullName': self.employee.department.boss_fullName,
				},
				'section': {
					'id': self.employee.section_id,
					'name': self.employee.section.name,
					'department_id': self.employee.department_id,
				},
			},
			is_deleted=False,
		)

	def test_add_item_get_filters_products_by_employee_gender(self):
		response = self.client.get(f'/api/v1/add-item/{self.employee.slug}')

		self.assertEqual(response.status_code, 200)
		product_names = {product['name'] for product in response.data['ppe_products']}
		self.assertIn('Каска', product_names)
		self.assertIn('Спецодежда мужская', product_names)
		self.assertNotIn('Спецодежда женская', product_names)

	def test_add_item_post_rejects_product_with_wrong_gender(self):
		response = self.client.post(
			f'/api/v1/add-item/{self.employee.slug}',
			{'ppeproduct': [self.female_product.id], 'ppe_sizes': {}},
			format='json',
		)

		self.assertEqual(response.status_code, 400)
		self.assertEqual(response.data['error_code'], 'ppe_gender_mismatch')
		self.assertIn('Спецодежда женская', response.data['error'])


class DepartmentPPERenewalRuleTests(APITestCase):
	def setUp(self):
		self.admin = User.objects.create_superuser(username='rule_admin', password='test12345')
		self.client.force_authenticate(user=self.admin)

		department = Department.objects.create(name='1-Цех', boss_fullName='Boss Name')
		section = Section.objects.create(name='Section A', department=department)

		self.employee = Employee.objects.create(
			first_name='Ali',
			last_name='Valiyev',
			surname='Karimovich',
			tabel_number='RULE-001',
			gender='M',
			height='180',
			clothe_size='52',
			shoe_size='42',
			section=section,
			department=department,
			position='Operator',
		)

		self.product = PPEProduct.objects.create(name='Спецодежда (мужское)', renewal_months=6, target_gender='M')
		PositionPPERenewalRule.objects.create(
			department_service_id=1,
			department_name='1-Цех',
			position_name='Operator',
			ppeproduct=self.product,
			renewal_months=12,
		)

		self.item = Item.objects.create(
			employee_service_id=self.employee.id,
			employee_slug=self.employee.slug,
			slug=self.employee.slug,
			employee_snapshot={
				'id': self.employee.id,
				'external_id': str(self.employee.id),
				'slug': self.employee.slug,
				'first_name': self.employee.first_name,
				'last_name': self.employee.last_name,
				'surname': self.employee.surname,
				'tabel_number': self.employee.tabel_number,
				'gender': self.employee.gender,
				'height': self.employee.height,
				'clothe_size': self.employee.clothe_size,
				'shoe_size': self.employee.shoe_size,
				'position': self.employee.position,
				'department': {
					'id': 1,
					'name': '1-Цех',
					'boss_fullName': self.employee.department.boss_fullName,
				},
				'section': {
					'id': self.employee.section_id,
					'name': self.employee.section.name,
					'department_id': 1,
				},
			},
			issued_at=timezone.now() - timedelta(days=240),
			is_deleted=False,
		)
		self.item.ppeproduct.add(self.product)

	def test_add_item_get_returns_position_override_months(self):
		response = self.client.get(f'/api/v1/add-item/{self.employee.slug}')

		self.assertEqual(response.status_code, 200)
		product_payload = next(item for item in response.data['ppe_products'] if item['id'] == self.product.id)
		self.assertEqual(product_payload['renewal_months'], 12)

	def test_add_item_get_hides_products_disallowed_for_position(self):
		blocked_product = PPEProduct.objects.create(name='Запрещённая каска', renewal_months=5, target_gender='ALL')
		PositionPPERenewalRule.objects.create(
			department_service_id=1,
			department_name='1-Цех',
			position_name='Operator',
			ppeproduct=blocked_product,
			is_allowed=False,
			renewal_months=0,
		)

		response = self.client.get(f'/api/v1/add-item/{self.employee.slug}')

		self.assertEqual(response.status_code, 200)
		product_names = {item['name'] for item in response.data['ppe_products']}
		self.assertNotIn('Запрещённая каска', product_names)

	def test_add_item_get_hides_new_product_when_position_has_other_rules_but_no_rule_for_it(self):
		new_product = PPEProduct.objects.create(name='Новый плащ', renewal_months=5, target_gender='ALL')

		response = self.client.get(f'/api/v1/add-item/{self.employee.slug}')

		self.assertEqual(response.status_code, 200)
		product_names = {item['name'] for item in response.data['ppe_products']}
		self.assertNotIn('Новый плащ', product_names)

	def test_add_item_post_rejects_products_disallowed_for_position(self):
		blocked_product = PPEProduct.objects.create(name='Запрещённые перчатки', renewal_months=1, target_gender='ALL')
		PositionPPERenewalRule.objects.create(
			department_service_id=1,
			department_name='1-Цех',
			position_name='Operator',
			ppeproduct=blocked_product,
			is_allowed=False,
			renewal_months=0,
		)

		response = self.client.post(
			f'/api/v1/add-item/{self.employee.slug}',
			{'ppeproduct': [blocked_product.id], 'ppe_sizes': {}},
			format='json',
		)

		self.assertEqual(response.status_code, 400)
		self.assertEqual(response.data['error_code'], 'ppe_not_allowed')
		self.assertIn('Запрещённые перчатки', response.data['error'])

	def test_add_item_post_blocks_until_position_override_period_expires(self):
		response = self.client.post(
			f'/api/v1/add-item/{self.employee.slug}',
			{'ppeproduct': [self.product.id], 'ppe_sizes': {str(self.product.id): '52'}},
			format='json',
		)

		self.assertEqual(response.status_code, 400)
		self.assertEqual(response.data['error_code'], 'ppe_not_due')
		self.assertIn('Спецодежда (мужское)', response.data['error'])

	def test_settings_rules_post_creates_multiple_positions_in_one_request(self):
		bulk_product = PPEProduct.objects.create(name='Каска bulk', renewal_months=9, target_gender='ALL')

		response = self.client.post(
			'/api/v1/settings/ppe-department-rules/',
			{
				'position_names': ['Operator', 'Welder'],
				'ppeproduct': bulk_product.id,
				'renewal_months': 9,
			},
			format='json',
		)

		self.assertEqual(response.status_code, 201)
		self.assertEqual(len(response.data), 2)
		self.assertCountEqual(
			PositionPPERenewalRule.objects.filter(ppeproduct=bulk_product).values_list('position_name', flat=True),
			['Operator', 'Welder'],
		)
		self.assertCountEqual(
			[item['position_name'] for item in response.data],
			['Operator', 'Welder'],
		)

	def test_settings_rules_post_creates_multiple_products_for_multiple_positions(self):
		bulk_product_1 = PPEProduct.objects.create(name='Перчатки bulk', renewal_months=3, target_gender='ALL')
		bulk_product_2 = PPEProduct.objects.create(name='Каска bulk 2', renewal_months=8, target_gender='ALL')

		response = self.client.post(
			'/api/v1/settings/ppe-department-rules/',
			{
				'position_names': ['Operator', 'Welder'],
				'product_rules': [
					{'ppeproduct': bulk_product_1.id, 'renewal_months': 3},
					{'ppeproduct': bulk_product_2.id, 'renewal_months': 8},
				],
			},
			format='json',
		)

		self.assertEqual(response.status_code, 201)
		self.assertEqual(len(response.data), 4)
		self.assertEqual(
			PositionPPERenewalRule.objects.filter(position_name='Operator', ppeproduct=bulk_product_1).get().renewal_months,
			3,
		)
		self.assertEqual(
			PositionPPERenewalRule.objects.filter(position_name='Welder', ppeproduct=bulk_product_2).get().renewal_months,
			8,
		)

	def test_settings_rules_post_persists_product_allowed_flag(self):
		blocked_product = PPEProduct.objects.create(name='Сапоги blocked', renewal_months=4, target_gender='ALL')

		response = self.client.post(
			'/api/v1/settings/ppe-department-rules/',
			{
				'position_entries': [
					{'department_service_id': 1, 'department_name': '1-Цех', 'position_name': 'Operator'},
				],
				'product_rules': [
					{'ppeproduct': blocked_product.id, 'renewal_months': 0, 'is_allowed': False},
				],
			},
			format='json',
		)

		self.assertEqual(response.status_code, 201)
		rule = PositionPPERenewalRule.objects.get(position_name='Operator', ppeproduct=blocked_product)
		self.assertFalse(rule.is_allowed)
		self.assertFalse(response.data[0]['is_allowed'])

	@patch('base.views.list_sections', return_value=[])
	@patch('base.views.list_departments', return_value=[])
	def test_item_view_hides_products_disallowed_for_position(self, departments_mock, sections_mock):
		blocked_product = PPEProduct.objects.create(name='Скрытая обувь', renewal_months=7, target_gender='ALL')
		PositionPPERenewalRule.objects.create(
			department_service_id=1,
			department_name='1-Цех',
			position_name='Operator',
			ppeproduct=blocked_product,
			is_allowed=False,
			renewal_months=0,
		)

		response = self.client.get(f'/api/v1/item-view/{self.employee.slug}')

		self.assertEqual(response.status_code, 200)
		product_names = {product['name'] for product in response.data['ppe_products']}
		self.assertNotIn('Скрытая обувь', product_names)

	@patch('base.views.list_sections', return_value=[])
	@patch('base.views.list_departments', return_value=[])
	def test_item_view_hides_new_product_when_position_has_other_rules_but_no_rule_for_it(self, departments_mock, sections_mock):
		new_product = PPEProduct.objects.create(name='Новый жилет', renewal_months=9, target_gender='ALL')

		response = self.client.get(f'/api/v1/item-view/{self.employee.slug}')

		self.assertEqual(response.status_code, 200)
		product_names = {product['name'] for product in response.data['ppe_products']}
		self.assertNotIn('Новый жилет', product_names)

	def test_settings_rules_post_creates_same_position_in_different_departments_separately(self):
		duplicate_product = PPEProduct.objects.create(name='Сапоги bulk', renewal_months=4, target_gender='ALL')

		response = self.client.post(
			'/api/v1/settings/ppe-department-rules/',
			{
				'position_entries': [
					{'department_service_id': 1, 'department_name': '1-Цех', 'position_name': 'Economist'},
					{'department_service_id': 3, 'department_name': '3-Цех', 'position_name': 'Economist'},
				],
				'product_rules': [
					{'ppeproduct': duplicate_product.id, 'renewal_months': 7},
				],
			},
			format='json',
		)

		self.assertEqual(response.status_code, 201)
		self.assertEqual(len(response.data), 2)
		self.assertEqual(
			PositionPPERenewalRule.objects.filter(position_name='Economist', ppeproduct=duplicate_product).count(),
			2,
		)
		self.assertCountEqual(
			PositionPPERenewalRule.objects.filter(position_name='Economist', ppeproduct=duplicate_product).values_list('department_service_id', flat=True),
			[1, 3],
		)

	@patch('base.views.list_employees', return_value=[
		{
			'id': 1,
			'external_id': '1',
			'position': 'Economist',
			'department': {'id': 1, 'name': '1-Цех'},
		},
		{
			'id': 2,
			'external_id': '2',
			'position': 'Economist',
			'department': {'id': 3, 'name': '3-Цех'},
		},
	])
	def test_settings_positions_endpoint_returns_distinct_positions(self, _employees_mock):
		response = self.client.get('/api/v1/settings/employee-positions/')

		self.assertEqual(response.status_code, 200)
		self.assertEqual(len(response.data), 2)
		self.assertEqual([item['position_name'] for item in response.data], ['Economist', 'Economist'])
		self.assertCountEqual([item['department_id'] for item in response.data], [1, 3])

	@patch('base.views.list_departments', return_value=[
		{'id': 3, 'name': '3-Цех', 'sort_order': 3},
		{'id': 1, 'name': '1-Цех', 'sort_order': 1},
	])
	def test_settings_rules_get_restores_department_names_and_service_order(self, _departments_mock):
		PositionPPERenewalRule.objects.all().delete()
		second_product = PPEProduct.objects.create(name='Каска test', renewal_months=5, target_gender='ALL')

		PositionPPERenewalRule.objects.create(
			department_service_id=3,
			department_name='',
			position_name='Economist',
			ppeproduct=self.product,
			renewal_months=10,
		)
		PositionPPERenewalRule.objects.create(
			department_service_id=1,
			department_name='',
			position_name='Operator',
			ppeproduct=second_product,
			renewal_months=8,
		)

		response = self.client.get('/api/v1/settings/ppe-department-rules/')

		self.assertEqual(response.status_code, 200)
		self.assertEqual([item['department_name'] for item in response.data], ['1-Цех', '3-Цех'])
		self.assertEqual([item['department_service_id'] for item in response.data], [1, 3])

	@patch('base.views.list_sections', return_value=[])
	@patch('base.views.list_departments', return_value=[])
	def test_item_view_uses_position_rule_for_product_renewal_months(self, departments_mock, sections_mock):
		response = self.client.get(f'/api/v1/item-view/{self.employee.slug}')

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['ppeproduct_info'][0]['renewal_months'], 12)
		self.assertEqual(response.data['issue_history'][0]['ppeproduct_info'][0]['renewal_months'], 12)


class EmployeeServiceFaceFallbackTests(APITestCase):
	def setUp(self):
		self.admin = User.objects.create_superuser(username='face_fallback_admin', password='test12345')
		self.client.force_authenticate(user=self.admin)

	@patch('base.views.calculate_face_similarity', return_value=88.5)
	@patch('base.views.decode_image_to_pil', return_value=object())
	@patch('base.views.load_employee_reference_image', return_value=(object(), ''))
	@patch('base.views.resolve_employee_from_slug', return_value={'slug': 'default-9112-maruf-shabonov'})
	@patch('base.views.verify_employee_face_remote', side_effect=Exception)
	def test_verify_employee_face_falls_back_when_service_key_is_read_only(self, verify_remote_mock, resolve_mock, load_mock, decode_mock, similarity_mock):
		verify_remote_mock.side_effect = EmployeeServiceClientError('Сервисный API-ключ поддерживает только операции чтения.')

		with patch('base.views.is_employee_service_enabled', return_value=True):
			response = self.client.post(
				'/api/v1/verify-employee-face/default-9112-maruf-shabonov',
				{'captured_image': 'data:image/jpeg;base64,ZmFrZQ=='},
				format='json',
			)

		self.assertEqual(response.status_code, 200)
		self.assertTrue(response.data['verified'])
		self.assertEqual(response.data['message'], 'Сотрудник подтвержден')
		resolve_mock.assert_called_once_with('default-9112-maruf-shabonov')
		load_mock.assert_called_once()
		decode_mock.assert_called_once()
		similarity_mock.assert_called_once()

	@patch('base.views.detect_face_boxes', return_value=[{'x': 10, 'y': 20, 'width': 30, 'height': 40}])
	@patch('base.views.decode_image_to_pil', return_value=object())
	@patch('base.views.detect_face_boxes_remote', side_effect=Exception)
	def test_detect_face_boxes_falls_back_when_service_key_is_read_only(self, detect_remote_mock, decode_mock, detect_local_mock):
		detect_remote_mock.side_effect = EmployeeServiceClientError('Сервисный API-ключ поддерживает только операции чтения.')

		with patch('base.views.is_employee_service_enabled', return_value=True):
			response = self.client.post(
				'/api/v1/detect-face-boxes/',
				{'captured_image': 'data:image/jpeg;base64,ZmFrZQ=='},
				format='json',
			)

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['count'], 1)
		self.assertEqual(response.data['boxes'][0]['x'], 10)
		decode_mock.assert_called_once()
		detect_local_mock.assert_called_once()


class AllItemsDepartmentFilterTests(APITestCase):
	def setUp(self):
		self.admin = User.objects.create_superuser(username='all_items_admin', password='test12345')
		self.client.force_authenticate(user=self.admin)

	@patch('base.views.list_employees_bootstrapped')
	def test_all_items_forwards_department_id_to_remote_employee_query(self, employees_mock):
		employees_mock.return_value = {
			'count': 1,
			'next': None,
			'previous': None,
			'results': [
				{
					'id': 101,
					'external_id': '101',
					'slug': 'default-101-ali-valiyev',
					'first_name': 'Ali',
					'last_name': 'Valiyev',
					'surname': 'Karimovich',
					'tabel_number': '101',
					'position': 'Operator',
					'department': {'id': 7, 'name': '7-Цех'},
					'section': {'id': 3, 'name': 'Section A', 'department_id': 7},
				},
			],
		}

		response = self.client.get('/api/v1/all-items/?department_id=7&page=1&page_size=10')

		self.assertEqual(response.status_code, 200)
		employees_mock.assert_called_once_with(
			search=None,
			tabel_number=None,
			department_id=7,
			no_pagination=False,
			page='1',
			page_size='10',
		)
		self.assertEqual(response.data['count'], 1)
		self.assertEqual(response.data['results'][0]['employee']['department']['id'], 7)

	@patch('base.views.list_employees_bootstrapped')
	def test_all_items_forwards_user_name_filter_to_remote_employee_query(self, employees_mock):
		employees_mock.return_value = {
			'count': 1,
			'next': None,
			'previous': None,
			'results': [
				{
					'id': 102,
					'external_id': '102',
					'slug': 'default-102-ali-valiyev',
					'first_name': 'Ali',
					'last_name': 'Valiyev',
					'surname': 'Karimovich',
					'tabel_number': '102',
					'position': 'Operator',
					'department': {'id': 7, 'name': '7-Цех'},
					'section': {'id': 3, 'name': 'Section A', 'department_id': 7},
				},
			],
		}

		response = self.client.get('/api/v1/all-items/?user=ali&page=1&page_size=10')

		self.assertEqual(response.status_code, 200)
		employees_mock.assert_called_once_with(
			search='ali',
			tabel_number=None,
			department_id=None,
			no_pagination=False,
			page='1',
			page_size='10',
		)
		self.assertEqual(response.data['count'], 1)
		self.assertEqual(response.data['results'][0]['employee']['first_name'], 'Ali')


class PPEStatisticsIssuedDetailsTests(APITestCase):
	def setUp(self):
		self.admin = User.objects.create_superuser(username='issued_stats_admin', password='test12345')
		self.client.force_authenticate(user=self.admin)

		department = Department.objects.create(name='Stats Department', boss_fullName='Boss Name')
		section = Section.objects.create(name='Stats Section', department=department)

		self.employee = Employee.objects.create(
			first_name='Ali',
			last_name='Valiyev',
			surname='Karimovich',
			tabel_number='STAT-001',
			gender='M',
			height='180',
			clothe_size='52',
			shoe_size='42',
			section=section,
			department=department,
			position='Operator',
		)

		self.product = PPEProduct.objects.create(name='Stats Helmet', renewal_months=6)
		self.item = Item.objects.create(
			employee_service_id=self.employee.id,
			employee_slug=self.employee.slug,
			employee_snapshot={
				'id': self.employee.id,
				'external_id': str(self.employee.id),
				'slug': self.employee.slug,
				'first_name': self.employee.first_name,
				'last_name': self.employee.last_name,
				'surname': self.employee.surname,
				'tabel_number': self.employee.tabel_number,
				'position': self.employee.position,
				'department': {
					'id': self.employee.department_id,
					'name': self.employee.department.name,
					'boss_fullName': self.employee.department.boss_fullName,
				},
				'section': {
					'id': self.employee.section_id,
					'name': self.employee.section.name,
					'department_id': self.employee.department_id,
				},
			},
			issued_at=timezone.now(),
			is_deleted=False,
			issued_by=self.admin,
		)
		self.item.ppeproduct.add(self.product)
		self.item.ppe_sizes = {str(self.product.id): '52'}
		self.item.save(update_fields=['ppe_sizes'])

	def test_issued_details_response_contains_employee_slug(self):
		response = self.client.get(f'/api/v1/statistics/ppe-issued-details/?product_id={self.product.id}')

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['total_issued'], 1)
		self.assertEqual(response.data['issues'][0]['employee_slug'], self.employee.slug)


class ItemDetailEmployeeSnapshotRefreshTests(APITestCase):
	def setUp(self):
		self.admin = User.objects.create_superuser(username='item_detail_admin', password='test12345')
		self.client.force_authenticate(user=self.admin)
		self.product = PPEProduct.objects.create(name='Helmet')
		self.item = Item.objects.create(
			employee_service_id=3,
			employee_slug='default-7777-timur-bakayev',
			employee_snapshot={
				'id': 3,
				'external_id': '',
				'slug': 'default-7777-timur-bakayev',
				'first_name': 'Timur',
				'last_name': 'Bakayev',
				'surname': 'Ruslanovich',
				'tabel_number': '7777',
				'base_image': '/api/v1/employee-service/media-proxy/?path=%2Fmedia%2Femployee_base_images%2Fold-photo.jpg',
				'base_image_url': '/api/v1/employee-service/media-proxy/?path=%2Fmedia%2Femployee_base_images%2Fold-photo.jpg',
				'department': {'id': 1, 'name': '28-цех Связь', 'boss_fullName': 'Old Boss'},
				'section': {'id': 1, 'name': 'AKT', 'department_id': 1},
			},
		)
		self.item.ppeproduct.add(self.product)

	@patch('base.views.get_employees_by_slugs')
	@patch('base.views.get_employees_by_external_ids', return_value={})
	@patch('base.views.list_sections', return_value=[])
	@patch('base.views.list_departments', return_value=[])
	def test_item_detail_uses_live_employee_image_from_slug_lookup(self, list_departments_mock, list_sections_mock, by_ids_mock, by_slugs_mock):
		by_slugs_mock.return_value = {
			'default-7777-timur-bakayev': {
				'id': 3,
				'external_id': '',
				'source_system': 'default',
				'slug': 'default-7777-timur-bakayev',
				'first_name': 'Timur',
				'last_name': 'Bakayev',
				'surname': 'Ruslanovich',
				'tabel_number': '7777',
				'base_image': '/api/v1/employee-service/media-proxy/?path=%2Fmedia%2Femployee_base_images%2Fbakayev-live.jpg',
				'base_image_url': '/api/v1/employee-service/media-proxy/?path=%2Fmedia%2Femployee_base_images%2Fbakayev-live.jpg',
				'department': {'id': 2, 'name': '1-Цех. Технология', 'boss_fullName': 'Norov Navoiy'},
				'section': {'id': 3, 'name': 'Блок 2', 'department_id': 2},
			},
		}

		response = self.client.get(f'/api/v1/item-view/{self.item.slug}')

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['employee']['base_image'], '/api/v1/employee-service/media-proxy/?path=%2Fmedia%2Femployee_base_images%2Fbakayev-live.jpg')
		self.assertEqual(response.data['employee']['department']['name'], '1-Цех. Технология')
		by_ids_mock.assert_called_once()
		by_slugs_mock.assert_called_once()


class EmployeeServiceMediaProxyTests(APITestCase):
	def test_build_employee_snapshot_rewrites_host_docker_internal_media_to_proxy_path(self):
		payload = build_employee_snapshot({
			'base_image': 'https://host.docker.internal:5000/media/employee_base_images/5413-a.jpg',
			'base_image_url': 'https://host.docker.internal:5000/media/employee_base_images/5413-a.jpg',
		})

		self.assertEqual(
			payload['base_image'],
			'/api/v1/employee-service/media-proxy/?path=%2Fmedia%2Femployee_base_images%2F5413-a.jpg',
		)
		self.assertEqual(
			payload['base_image_url'],
			'/api/v1/employee-service/media-proxy/?path=%2Fmedia%2Femployee_base_images%2F5413-a.jpg',
		)

	def test_build_employee_snapshot_preserves_employee_service_size_fields(self):
		payload = build_employee_snapshot({
			'special_clothing_size': '54',
			'clothe_size': '56',
			'shoe_size': '42',
			'jacket_size': '58',
			'tshirt_size': 'L',
		})

		self.assertEqual(payload['special_clothing_size'], '54')
		self.assertEqual(payload['clothe_size'], '56')
		self.assertEqual(payload['shoe_size'], '42')
		self.assertEqual(payload['jacket_size'], '58')
		self.assertEqual(payload['tshirt_size'], 'L')

	@patch('base.employee_service_views.requests.get')
	@patch('base.employee_service_views.settings')
	def test_media_proxy_falls_back_to_public_origin_when_internal_media_is_unavailable(self, settings_mock, requests_get_mock):
		settings_mock.EMPLOYEE_SERVICE_BASE_URL = 'http://employee-service:8010'
		settings_mock.EMPLOYEE_SERVICE_PUBLIC_URL = 'https://192.168.2.72:5001'
		settings_mock.EMPLOYEE_SERVICE_TIMEOUT = 15

		public_response = type('Response', (), {
			'status_code': 200,
			'content': b'image-bytes',
			'headers': {'Content-Type': 'image/jpeg', 'Cache-Control': 'max-age=60'},
		})()
		requests_get_mock.side_effect = [
			RequestException('internal media unavailable'),
			public_response,
		]

		response = self.client.get('/api/v1/employee-service/media-proxy/?path=%2Fmedia%2Femployee_base_images%2Fphoto.jpg')

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.content, b'image-bytes')
		self.assertEqual(response['Content-Type'], 'image/jpeg')
		self.assertEqual(response['Cache-Control'], 'max-age=60')
		self.assertEqual(requests_get_mock.call_count, 2)
		self.assertEqual(requests_get_mock.call_args_list[0].args[0], 'http://employee-service:8010/media/employee_base_images/photo.jpg')
		self.assertEqual(requests_get_mock.call_args_list[1].args[0], 'https://192.168.2.72:5001/media/employee_base_images/photo.jpg')
