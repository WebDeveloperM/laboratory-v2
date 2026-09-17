from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from base.models import ResponsiblePerson
from users.models import UserRole
from .models import Passport, PassportTemplate, Spravka


class PassportApprovalChainTests(APITestCase):
    def setUp(self):
        self.template = PassportTemplate.objects.create(
            name='АИ-91- К2-Л', category='Бензин', product_standard="O'zDSt 3031:2015",
            reservoir_type='reservoir', header_html='', footer_html='',
        )

        self.shift_head_person = ResponsiblePerson.objects.create(
            full_name='Отабоев О.О', position='Начальник смены', employee_slug='submitter-slug',
        )
        self.sttl_person = ResponsiblePerson.objects.create(
            full_name='Жумаев Ж.А', position='Начальник СТТЛ', employee_slug='sttl-slug-1',
        )
        self.czl_person = ResponsiblePerson.objects.create(
            full_name='Товбоев Ш', position='Начальник ЦЗЛ', employee_slug='czl-slug-1',
        )
        self.dispatcher_person = ResponsiblePerson.objects.create(
            full_name='Ахмедова Х.И', position='Диспетчер', employee_slug='dispatcher-slug-1',
        )

        self.sttl_user = User.objects.create_user(username='sttl_user', password='test12345')
        self.other_sttl_user = User.objects.create_user(username='other_sttl_user', password='test12345')
        self.czl_user = User.objects.create_user(username='czl_user', password='test12345')
        self.dispatcher_user = User.objects.create_user(username='dispatcher_user', password='test12345')
        self.admin_user = User.objects.create_superuser(username='admin_user', password='test12345')
        self.submitter = User.objects.create_user(username='submitter_user', password='test12345')

        self._set_role(self.sttl_user, UserRole.STTL_HEAD, 'sttl-slug-1')
        self._set_role(self.other_sttl_user, UserRole.STTL_HEAD, 'other-sttl-slug')
        self._set_role(self.czl_user, UserRole.CZL_HEAD, 'czl-slug-1')
        self._set_role(self.dispatcher_user, UserRole.DISPATCHER, 'dispatcher-slug-1')
        self._set_role(self.submitter, UserRole.SHIFT_HEAD, 'submitter-slug')

        self.passport = Passport.objects.create(
            template=self.template,
            field_values={
                'passport_no': '1',
                'shift_head': 'Отабоев О.О',
                'sttl_head': 'Жумаев Ж.А',
                'czl_head': 'Товбоев Ш',
                'dispatcher_head': 'Ахмедова Х.И',
            },
        )

        self.submit_url = f'/api/v1/passports/{self.passport.id}/submit/'
        self.approve_url = f'/api/v1/passports/{self.passport.id}/approve/'
        self.reject_url = f'/api/v1/passports/{self.passport.id}/reject/'
        self.detail_url = f'/api/v1/passports/{self.passport.id}/'

    def _set_role(self, user, role, employee_slug):
        profile, _ = UserRole.objects.get_or_create(user=user)
        profile.role = role
        profile.employee_slug = employee_slug
        profile.save(update_fields=['role', 'employee_slug'])

    def _submit(self):
        self.client.force_authenticate(user=self.submitter)
        return self.client.post(self.submit_url)

    def test_sttl_user_can_approve_assigned_passport(self):
        self._submit()
        self.client.force_authenticate(user=self.sttl_user)
        response = self.client.post(self.approve_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.passport.refresh_from_db()
        self.assertEqual(self.passport.approval_status, Passport.STATUS_PENDING_CZL)
        self.assertEqual(self.passport.sttl_approved_by, self.sttl_user)
        self.assertIsNotNone(self.passport.sttl_approved_at)

    def test_unassigned_sttl_user_cannot_approve(self):
        self._submit()
        self.client.force_authenticate(user=self.other_sttl_user)
        response = self.client.post(self.approve_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.passport.refresh_from_db()
        self.assertEqual(self.passport.approval_status, Passport.STATUS_PENDING_STTL)

    def test_admin_can_override_approve_at_any_step(self):
        self._submit()
        self.client.force_authenticate(user=self.sttl_user)
        self.client.post(self.approve_url)

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(self.approve_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.passport.refresh_from_db()
        self.assertEqual(self.passport.approval_status, Passport.STATUS_PENDING_DISPATCHER)
        self.assertEqual(self.passport.czl_approved_by, self.admin_user)

    def test_full_chain_reaches_approved(self):
        self._submit()
        self.client.force_authenticate(user=self.sttl_user)
        self.client.post(self.approve_url)
        self.client.force_authenticate(user=self.czl_user)
        self.client.post(self.approve_url)
        self.client.force_authenticate(user=self.dispatcher_user)
        response = self.client.post(self.approve_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.passport.refresh_from_db()
        self.assertEqual(self.passport.approval_status, Passport.STATUS_APPROVED)
        self.assertEqual(self.passport.dispatcher_approved_by, self.dispatcher_user)

    def _approve_full_chain(self):
        self._submit()
        self.client.force_authenticate(user=self.sttl_user)
        self.client.post(self.approve_url)
        self.client.force_authenticate(user=self.czl_user)
        self.client.post(self.approve_url)
        self.client.force_authenticate(user=self.dispatcher_user)
        self.client.post(self.approve_url)
        self.passport.refresh_from_db()

    def test_verify_endpoint_404s_before_full_approval(self):
        self._submit()
        self.client.logout()
        verify_url = f'/api/v1/passports/verify/{self.passport.qr_token}/'
        response = self.client.get(verify_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_verify_endpoint_returns_signer_data_after_full_approval(self):
        self._approve_full_chain()
        self.client.logout()
        verify_url = f'/api/v1/passports/verify/{self.passport.qr_token}/'
        response = self.client.get(verify_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['passport_number'], '1')
        steps = {step['role']: step for step in response.data['steps']}
        self.assertEqual(steps['Начальник СТТЛ']['full_name'], 'Жумаев Ж.А')
        self.assertEqual(steps['Начальник СТТЛ']['approved_by_username'], 'sttl_user')
        self.assertIsNotNone(steps['Начальник СТТЛ']['approved_at'])
        self.assertEqual(steps['Начальник ЦЗЛ']['approved_by_username'], 'czl_user')
        self.assertEqual(steps['Диспетчер']['approved_by_username'], 'dispatcher_user')

    def test_verify_endpoint_404s_for_unknown_token(self):
        self._approve_full_chain()
        self.client.logout()
        response = self.client.get('/api/v1/passports/verify/00000000-0000-0000-0000-000000000000/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_reject_with_comment_unlocks_editing(self):
        self._submit()
        self.client.force_authenticate(user=self.sttl_user)

        response = self.client.post(self.reject_url, {'comment': 'Неверная дата'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.passport.refresh_from_db()
        self.assertEqual(self.passport.approval_status, Passport.STATUS_REJECTED)
        self.assertEqual(self.passport.rejected_step, Passport.STEP_STTL)
        self.assertEqual(self.passport.rejection_comment, 'Неверная дата')

        self.client.force_authenticate(user=self.submitter)
        patch_response = self.client.patch(
            self.detail_url, {'field_values': {**self.passport.field_values, 'passport_no': '2'}}, format='json',
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)

    def test_reject_without_comment_succeeds(self):
        self._submit()
        self.client.force_authenticate(user=self.sttl_user)

        response = self.client.post(self.reject_url, {'comment': ''}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.passport.refresh_from_db()
        self.assertEqual(self.passport.approval_status, Passport.STATUS_REJECTED)
        self.assertEqual(self.passport.rejection_comment, '')

    def test_edit_blocked_while_pending(self):
        self._submit()
        self.client.force_authenticate(user=self.submitter)
        response = self.client.patch(
            self.detail_url, {'field_values': {**self.passport.field_values, 'passport_no': '2'}}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.passport.refresh_from_db()
        self.assertEqual(self.passport.field_values.get('passport_no'), '1')

    def test_submit_fails_when_signer_has_no_linked_account(self):
        self.sttl_person.employee_slug = ''
        self.sttl_person.save(update_fields=['employee_slug'])

        response = self._submit()
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.passport.refresh_from_db()
        self.assertEqual(self.passport.approval_status, Passport.STATUS_DRAFT)

    def test_submit_fails_on_duplicate_responsible_person_name(self):
        ResponsiblePerson.objects.create(
            full_name='Жумаев Ж.А', position='Начальник СТТЛ', employee_slug='sttl-slug-2',
        )

        response = self._submit()
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.passport.refresh_from_db()
        self.assertEqual(self.passport.approval_status, Passport.STATUS_DRAFT)

    def test_pending_approvals_scoped_to_assigned_user(self):
        self._submit()

        self.client.force_authenticate(user=self.sttl_user)
        response = self.client.get('/api/v1/passports/pending-approvals/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], self.passport.id)

        self.client.force_authenticate(user=self.other_sttl_user)
        other_response = self.client.get('/api/v1/passports/pending-approvals/')
        self.assertEqual(other_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(other_response.data), 0)

    def test_shift_head_cannot_delete_passport(self):
        self.client.force_authenticate(user=self.submitter)
        response = self.client.delete(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.passport.refresh_from_db()
        self.assertFalse(self.passport.is_delete)
        self.assertTrue(Passport.objects.filter(id=self.passport.id).exists())

    def test_admin_can_soft_delete_passport(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.passport.refresh_from_db()
        self.assertTrue(self.passport.is_delete)

    def test_non_shift_head_role_cannot_delete_passport(self):
        self.client.force_authenticate(user=self.sttl_user)
        response = self.client.delete(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.passport.refresh_from_db()
        self.assertFalse(self.passport.is_delete)

    def test_deleted_passport_excluded_from_list(self):
        self.client.force_authenticate(user=self.admin_user)
        self.client.delete(self.detail_url)

        response = self.client.get('/api/v1/passports/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data if isinstance(response.data, list) else response.data.get('results', [])
        ids = [item['id'] for item in results]
        self.assertNotIn(self.passport.id, ids)

    def test_locked_passport_cannot_be_soft_deleted(self):
        self._submit()

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.passport.refresh_from_db()
        self.assertFalse(self.passport.is_delete)

    def test_unassigned_user_cannot_submit_passport(self):
        self.client.force_authenticate(user=self.sttl_user)
        response = self.client.post(self.submit_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.passport.refresh_from_db()
        self.assertEqual(self.passport.approval_status, Passport.STATUS_DRAFT)

    def test_admin_can_submit_any_passport(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(self.submit_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.passport.refresh_from_db()
        self.assertEqual(self.passport.approval_status, Passport.STATUS_PENDING_STTL)

    def test_can_submit_field_reflects_assigned_shift_head(self):
        self.client.force_authenticate(user=self.submitter)
        assigned_response = self.client.get(self.detail_url)
        self.assertTrue(assigned_response.data['can_submit'])

        self.client.force_authenticate(user=self.sttl_user)
        unassigned_response = self.client.get(self.detail_url)
        self.assertFalse(unassigned_response.data['can_submit'])

        self.client.force_authenticate(user=self.admin_user)
        admin_response = self.client.get(self.detail_url)
        self.assertTrue(admin_response.data['can_submit'])

    def test_can_submit_false_once_pending(self):
        self._submit()

        self.client.force_authenticate(user=self.submitter)
        response = self.client.get(self.detail_url)
        self.assertFalse(response.data['can_submit'])

    def test_can_approve_current_step_false_while_draft(self):
        self.client.force_authenticate(user=self.sttl_user)
        response = self.client.get(self.detail_url)
        self.assertFalse(response.data['can_approve_current_step'])

    def test_can_approve_current_step_reflects_assigned_signer(self):
        self._submit()

        self.client.force_authenticate(user=self.sttl_user)
        assigned_response = self.client.get(self.detail_url)
        self.assertTrue(assigned_response.data['can_approve_current_step'])

        self.client.force_authenticate(user=self.other_sttl_user)
        unassigned_response = self.client.get(self.detail_url)
        self.assertFalse(unassigned_response.data['can_approve_current_step'])

        self.client.force_authenticate(user=self.admin_user)
        admin_response = self.client.get(self.detail_url)
        self.assertTrue(admin_response.data['can_approve_current_step'])

    def test_submit_skips_unassigned_sttl_step(self):
        self.passport.field_values['sttl_head'] = ''
        self.passport.save(update_fields=['field_values'])

        response = self._submit()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.passport.refresh_from_db()
        self.assertEqual(self.passport.approval_status, Passport.STATUS_PENDING_CZL)
        self.assertEqual(self.passport.sttl_employee_slug, '')

    def test_submit_skips_unassigned_sttl_and_czl_steps(self):
        self.passport.field_values['sttl_head'] = ''
        self.passport.field_values['czl_head'] = ''
        self.passport.save(update_fields=['field_values'])

        response = self._submit()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.passport.refresh_from_db()
        self.assertEqual(self.passport.approval_status, Passport.STATUS_PENDING_DISPATCHER)
        self.assertEqual(self.passport.sttl_employee_slug, '')
        self.assertEqual(self.passport.czl_employee_slug, '')

    def test_submit_allows_unassigned_dispatcher(self):
        self.passport.field_values['dispatcher_head'] = ''
        self.passport.save(update_fields=['field_values'])

        response = self._submit()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.passport.refresh_from_db()
        self.assertEqual(self.passport.approval_status, Passport.STATUS_PENDING_STTL)
        self.assertEqual(self.passport.dispatcher_employee_slug, '')

    def test_approve_skips_unassigned_czl_step_to_dispatcher(self):
        self.passport.field_values['czl_head'] = ''
        self.passport.save(update_fields=['field_values'])
        self._submit()

        self.client.force_authenticate(user=self.sttl_user)
        response = self.client.post(self.approve_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.passport.refresh_from_db()
        self.assertEqual(self.passport.approval_status, Passport.STATUS_PENDING_DISPATCHER)

        self.client.force_authenticate(user=self.dispatcher_user)
        response = self.client.post(self.approve_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.passport.refresh_from_db()
        self.assertEqual(self.passport.approval_status, Passport.STATUS_APPROVED)


class SpravkaApprovalChainTests(APITestCase):
    def setUp(self):
        self.shift_head_person = ResponsiblePerson.objects.create(
            full_name='Отабоев О.О', position='Начальник смены', employee_slug='sp-submitter-slug',
        )
        self.sttl_person = ResponsiblePerson.objects.create(
            full_name='Жумаев Ж.А', position='Начальник СТТЛ', employee_slug='sp-sttl-slug-1',
        )
        self.czl_person = ResponsiblePerson.objects.create(
            full_name='Товбоев Ш', position='Начальник ЦЗЛ', employee_slug='sp-czl-slug-1',
        )
        self.dispatcher_person = ResponsiblePerson.objects.create(
            full_name='Ахмедова Х.И', position='Диспетчер', employee_slug='sp-dispatcher-slug-1',
        )

        self.sttl_user = User.objects.create_user(username='sp_sttl_user', password='test12345')
        self.other_sttl_user = User.objects.create_user(username='sp_other_sttl_user', password='test12345')
        self.czl_user = User.objects.create_user(username='sp_czl_user', password='test12345')
        self.dispatcher_user = User.objects.create_user(username='sp_dispatcher_user', password='test12345')
        self.admin_user = User.objects.create_superuser(username='sp_admin_user', password='test12345')
        self.submitter = User.objects.create_user(username='sp_submitter_user', password='test12345')

        self._set_role(self.sttl_user, UserRole.STTL_HEAD, 'sp-sttl-slug-1')
        self._set_role(self.other_sttl_user, UserRole.STTL_HEAD, 'sp-other-sttl-slug')
        self._set_role(self.czl_user, UserRole.CZL_HEAD, 'sp-czl-slug-1')
        self._set_role(self.dispatcher_user, UserRole.DISPATCHER, 'sp-dispatcher-slug-1')
        self._set_role(self.submitter, UserRole.SHIFT_HEAD, 'sp-submitter-slug')

        self.spravka = Spravka.objects.create(
            spravka_number='1',
            shift_head='Отабоев О.О',
            sttl_head='Жумаев Ж.А',
            czl_head='Товбоев Ш',
            dispatcher_head='Ахмедова Х.И',
        )

        self.submit_url = f'/api/v1/spravki/{self.spravka.id}/submit/'
        self.approve_url = f'/api/v1/spravki/{self.spravka.id}/approve/'
        self.reject_url = f'/api/v1/spravki/{self.spravka.id}/reject/'
        self.detail_url = f'/api/v1/spravki/{self.spravka.id}/'

    def _set_role(self, user, role, employee_slug):
        profile, _ = UserRole.objects.get_or_create(user=user)
        profile.role = role
        profile.employee_slug = employee_slug
        profile.save(update_fields=['role', 'employee_slug'])

    def _submit(self):
        self.client.force_authenticate(user=self.submitter)
        return self.client.post(self.submit_url)

    def _approve_full_chain(self):
        self._submit()
        self.client.force_authenticate(user=self.sttl_user)
        self.client.post(self.approve_url)
        self.client.force_authenticate(user=self.czl_user)
        self.client.post(self.approve_url)
        self.client.force_authenticate(user=self.dispatcher_user)
        self.client.post(self.approve_url)
        self.spravka.refresh_from_db()

    def test_sttl_user_can_approve_assigned_spravka(self):
        self._submit()
        self.client.force_authenticate(user=self.sttl_user)
        response = self.client.post(self.approve_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.spravka.refresh_from_db()
        self.assertEqual(self.spravka.approval_status, Spravka.STATUS_PENDING_CZL)
        self.assertEqual(self.spravka.sttl_approved_by, self.sttl_user)
        self.assertIsNotNone(self.spravka.sttl_approved_at)

    def test_unassigned_sttl_user_cannot_approve(self):
        self._submit()
        self.client.force_authenticate(user=self.other_sttl_user)
        response = self.client.post(self.approve_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.spravka.refresh_from_db()
        self.assertEqual(self.spravka.approval_status, Spravka.STATUS_PENDING_STTL)

    def test_admin_can_override_approve_at_any_step(self):
        self._submit()
        self.client.force_authenticate(user=self.sttl_user)
        self.client.post(self.approve_url)

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(self.approve_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.spravka.refresh_from_db()
        self.assertEqual(self.spravka.approval_status, Spravka.STATUS_PENDING_DISPATCHER)
        self.assertEqual(self.spravka.czl_approved_by, self.admin_user)

    def test_full_chain_reaches_approved(self):
        self._approve_full_chain()
        self.assertEqual(self.spravka.approval_status, Spravka.STATUS_APPROVED)
        self.assertEqual(self.spravka.dispatcher_approved_by, self.dispatcher_user)

    def test_verify_endpoint_404s_before_full_approval(self):
        self._submit()
        self.client.logout()
        verify_url = f'/api/v1/spravki/verify/{self.spravka.qr_token}/'
        response = self.client.get(verify_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_verify_endpoint_returns_signer_data_after_full_approval(self):
        self._approve_full_chain()
        self.client.logout()
        verify_url = f'/api/v1/spravki/verify/{self.spravka.qr_token}/'
        response = self.client.get(verify_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['spravka_number'], '1')
        steps = {step['role']: step for step in response.data['steps']}
        self.assertEqual(steps['Начальник СТТЛ']['full_name'], 'Жумаев Ж.А')
        self.assertEqual(steps['Начальник СТТЛ']['approved_by_username'], 'sp_sttl_user')
        self.assertIsNotNone(steps['Начальник СТТЛ']['approved_at'])
        self.assertEqual(steps['Начальник ЦЗЛ']['approved_by_username'], 'sp_czl_user')
        self.assertEqual(steps['Диспетчер']['approved_by_username'], 'sp_dispatcher_user')

    def test_verify_endpoint_404s_for_unknown_token(self):
        self._approve_full_chain()
        self.client.logout()
        response = self.client.get('/api/v1/spravki/verify/00000000-0000-0000-0000-000000000000/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_reject_with_comment_unlocks_editing(self):
        self._submit()
        self.client.force_authenticate(user=self.sttl_user)

        response = self.client.post(self.reject_url, {'comment': 'Неверная дата'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.spravka.refresh_from_db()
        self.assertEqual(self.spravka.approval_status, Spravka.STATUS_REJECTED)
        self.assertEqual(self.spravka.rejected_step, Spravka.STEP_STTL)
        self.assertEqual(self.spravka.rejection_comment, 'Неверная дата')

        self.client.force_authenticate(user=self.submitter)
        patch_response = self.client.patch(
            self.detail_url, {'spravka_number': '2'}, format='json',
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)

    def test_edit_blocked_while_pending(self):
        self._submit()
        self.client.force_authenticate(user=self.submitter)
        response = self.client.patch(self.detail_url, {'spravka_number': '2'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.spravka.refresh_from_db()
        self.assertEqual(self.spravka.spravka_number, '1')

    def test_submit_fails_when_signer_has_no_linked_account(self):
        self.sttl_person.employee_slug = ''
        self.sttl_person.save(update_fields=['employee_slug'])

        response = self._submit()
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.spravka.refresh_from_db()
        self.assertEqual(self.spravka.approval_status, Spravka.STATUS_DRAFT)

    def test_pending_approvals_scoped_to_assigned_user(self):
        self._submit()

        self.client.force_authenticate(user=self.sttl_user)
        response = self.client.get('/api/v1/spravki/pending-approvals/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], self.spravka.id)

        self.client.force_authenticate(user=self.other_sttl_user)
        other_response = self.client.get('/api/v1/spravki/pending-approvals/')
        self.assertEqual(other_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(other_response.data), 0)

    def test_unassigned_user_cannot_submit_spravka(self):
        self.client.force_authenticate(user=self.sttl_user)
        response = self.client.post(self.submit_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.spravka.refresh_from_db()
        self.assertEqual(self.spravka.approval_status, Spravka.STATUS_DRAFT)

    def test_admin_can_submit_any_spravka(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(self.submit_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.spravka.refresh_from_db()
        self.assertEqual(self.spravka.approval_status, Spravka.STATUS_PENDING_STTL)

    def test_can_submit_field_reflects_assigned_shift_head(self):
        self.client.force_authenticate(user=self.submitter)
        assigned_response = self.client.get(self.detail_url)
        self.assertTrue(assigned_response.data['can_submit'])

        self.client.force_authenticate(user=self.sttl_user)
        unassigned_response = self.client.get(self.detail_url)
        self.assertFalse(unassigned_response.data['can_submit'])

    def test_can_approve_current_step_reflects_assigned_signer(self):
        self._submit()

        self.client.force_authenticate(user=self.sttl_user)
        assigned_response = self.client.get(self.detail_url)
        self.assertTrue(assigned_response.data['can_approve_current_step'])

        self.client.force_authenticate(user=self.other_sttl_user)
        unassigned_response = self.client.get(self.detail_url)
        self.assertFalse(unassigned_response.data['can_approve_current_step'])

    def test_submit_skips_unassigned_sttl_step(self):
        self.spravka.sttl_head = ''
        self.spravka.save(update_fields=['sttl_head'])

        response = self._submit()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.spravka.refresh_from_db()
        self.assertEqual(self.spravka.approval_status, Spravka.STATUS_PENDING_CZL)
        self.assertEqual(self.spravka.sttl_employee_slug, '')

    def test_submit_skips_unassigned_sttl_and_czl_steps(self):
        self.spravka.sttl_head = ''
        self.spravka.czl_head = ''
        self.spravka.save(update_fields=['sttl_head', 'czl_head'])

        response = self._submit()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.spravka.refresh_from_db()
        self.assertEqual(self.spravka.approval_status, Spravka.STATUS_PENDING_DISPATCHER)

    def test_submit_allows_unassigned_dispatcher(self):
        self.spravka.dispatcher_head = ''
        self.spravka.save(update_fields=['dispatcher_head'])

        response = self._submit()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.spravka.refresh_from_db()
        self.assertEqual(self.spravka.approval_status, Spravka.STATUS_PENDING_STTL)
        self.assertEqual(self.spravka.dispatcher_employee_slug, '')

    def test_approve_skips_unassigned_czl_step_to_dispatcher(self):
        self.spravka.czl_head = ''
        self.spravka.save(update_fields=['czl_head'])
        self._submit()

        self.client.force_authenticate(user=self.sttl_user)
        response = self.client.post(self.approve_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.spravka.refresh_from_db()
        self.assertEqual(self.spravka.approval_status, Spravka.STATUS_PENDING_DISPATCHER)
