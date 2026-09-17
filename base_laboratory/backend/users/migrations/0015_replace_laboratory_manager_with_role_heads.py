from django.db import migrations, models


MANAGER_TIER_DEFAULTS = {
    'can_view_dashboard': True,
    'can_view_ppe_arrival': True,
    'can_view_statistics': True,
    'can_view_settings': True,
    'can_view_dashboard_due_cards': True,
    'can_add_employee': False,
    'can_export_dashboard_excel': True,
    'can_edit_employee': True,
    'can_delete_employee': False,
    'can_view_employee_ppe_tab': True,
    'can_manage_face_id_control': True,
    'can_submit_ppe_arrival': True,
}

NEW_ROLES = ['shift_head', 'sttl_head', 'czl_head', 'dispatcher']


def replace_laboratory_manager(apps, schema_editor):
    UserRole = apps.get_model('users', 'UserRole')
    RolePageAccess = apps.get_model('users', 'RolePageAccess')

    # No users were ever assigned laboratory_manager at the time of this migration;
    # fall back to shift_head in case some slipped in between deploys.
    UserRole.objects.filter(role='laboratory_manager').update(role='shift_head')
    RolePageAccess.objects.filter(role='laboratory_manager').delete()

    for role in NEW_ROLES:
        RolePageAccess.objects.update_or_create(role=role, defaults=MANAGER_TIER_DEFAULTS)


def restore_laboratory_manager(apps, schema_editor):
    UserRole = apps.get_model('users', 'UserRole')
    RolePageAccess = apps.get_model('users', 'RolePageAccess')

    UserRole.objects.filter(role__in=NEW_ROLES).update(role='laboratory_manager')
    RolePageAccess.objects.filter(role__in=NEW_ROLES).delete()
    RolePageAccess.objects.update_or_create(role='laboratory_manager', defaults=MANAGER_TIER_DEFAULTS)


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0014_replace_warehouse_roles_with_laboratory_manager'),
    ]

    operations = [
        migrations.RunPython(replace_laboratory_manager, restore_laboratory_manager),
        migrations.AlterField(
            model_name='userrole',
            name='role',
            field=models.CharField(
                choices=[
                    ('admin', 'Админ'),
                    ('it_center', 'IT Center'),
                    ('shift_head', 'Начальник смены'),
                    ('sttl_head', 'Начальник СТТЛ'),
                    ('czl_head', 'Начальник ЦЗЛ'),
                    ('dispatcher', 'Диспетчер'),
                    ('user', 'Обычный пользователь'),
                ],
                default='user',
                max_length=32,
            ),
        ),
        migrations.AlterField(
            model_name='rolepageaccess',
            name='role',
            field=models.CharField(
                choices=[
                    ('admin', 'Админ'),
                    ('it_center', 'IT Center'),
                    ('shift_head', 'Начальник смены'),
                    ('sttl_head', 'Начальник СТТЛ'),
                    ('czl_head', 'Начальник ЦЗЛ'),
                    ('dispatcher', 'Диспетчер'),
                    ('user', 'Обычный пользователь'),
                ],
                max_length=32,
                unique=True,
            ),
        ),
    ]
