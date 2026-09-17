from base.models import ResponsiblePerson
from users.models import UserRole, get_effective_user_role


class SignerResolutionError(Exception):
    def __init__(self, message):
        self.message = message
        super().__init__(message)


def resolve_signer(full_name, role_label):
    """Resolve the ResponsiblePerson named `full_name` to the UserRole/User allowed to sign at that step."""
    full_name = (full_name or '').strip()
    if not full_name:
        raise SignerResolutionError(f'Не выбран сотрудник для роли «{role_label}».')

    matches = list(ResponsiblePerson.objects.filter(full_name=full_name))
    if not matches:
        raise SignerResolutionError(
            f'Ответственное лицо «{full_name}» ({role_label}) не найдено в справочнике «Ответственное лицо».'
        )
    if len(matches) > 1:
        raise SignerResolutionError(
            f'В справочнике «Ответственное лицо» несколько записей с ФИО «{full_name}» ({role_label}). '
            'Обратитесь к администратору для устранения дубликата.'
        )

    person = matches[0]
    if not person.employee_slug:
        raise SignerResolutionError(
            f'«{full_name}» ({role_label}) не привязан к сотруднику. '
            'Администратор должен указать сотрудника в разделе Настройки → Ответственное лицо.'
        )

    profile = UserRole.objects.select_related('user').filter(employee_slug=person.employee_slug).first()
    if not profile:
        raise SignerResolutionError(
            f'Для «{full_name}» ({role_label}) не создана учётная запись пользователя. '
            'Обратитесь к администратору для создания логина.'
        )

    return profile.user, person.employee_slug


def can_user_submit(user, passport):
    """Whether `user` may submit `passport` for approval: admin, or the exact assigned Начальник смены."""
    if get_effective_user_role(user) == UserRole.ADMIN:
        return True
    shift_head_name = (passport.field_values or {}).get('shift_head')
    try:
        shift_head_user, _ = resolve_signer(shift_head_name, 'Начальник смены')
    except SignerResolutionError:
        return False
    return shift_head_user == user


def can_act_on_step(user, passport, step):
    """Whether `user` may approve/reject `passport` at `step`: admin, or the exact assigned signer."""
    if get_effective_user_role(user) == UserRole.ADMIN:
        return True
    assigned_slug = getattr(passport, f'{step}_employee_slug')
    if not assigned_slug:
        return False
    return UserRole.objects.filter(user=user, employee_slug=assigned_slug).exists()


def resolve_next_status(passport, after_step=None):
    """
    Next approval status after `after_step` (or from the start, if None), skipping
    any step whose `<step>_employee_slug` is blank (role left unassigned on the passport).
    Falls through to STATUS_APPROVED once every remaining step has been skipped/passed.
    """
    from .models import Passport

    order = [Passport.STEP_STTL, Passport.STEP_CZL, Passport.STEP_DISPATCHER]
    status_by_step = {
        Passport.STEP_STTL: Passport.STATUS_PENDING_STTL,
        Passport.STEP_CZL: Passport.STATUS_PENDING_CZL,
        Passport.STEP_DISPATCHER: Passport.STATUS_PENDING_DISPATCHER,
    }
    start_index = order.index(after_step) + 1 if after_step else 0
    for step in order[start_index:]:
        if getattr(passport, f'{step}_employee_slug'):
            return status_by_step[step]
    return Passport.STATUS_APPROVED


def can_user_submit_spravka(user, spravka):
    """Whether `user` may submit `spravka` for approval: admin, or the exact assigned Начальник смены."""
    if get_effective_user_role(user) == UserRole.ADMIN:
        return True
    try:
        shift_head_user, _ = resolve_signer(spravka.shift_head, 'Начальник смены')
    except SignerResolutionError:
        return False
    return shift_head_user == user


def resolve_next_spravka_status(spravka, after_step=None):
    """Same skip-logic as resolve_next_status, for Spravka's own STEP_*/STATUS_* constants."""
    from .models import Spravka

    order = [Spravka.STEP_STTL, Spravka.STEP_CZL, Spravka.STEP_DISPATCHER]
    status_by_step = {
        Spravka.STEP_STTL: Spravka.STATUS_PENDING_STTL,
        Spravka.STEP_CZL: Spravka.STATUS_PENDING_CZL,
        Spravka.STEP_DISPATCHER: Spravka.STATUS_PENDING_DISPATCHER,
    }
    start_index = order.index(after_step) + 1 if after_step else 0
    for step in order[start_index:]:
        if getattr(spravka, f'{step}_employee_slug'):
            return status_by_step[step]
    return Spravka.STATUS_APPROVED
