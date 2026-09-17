from django.db import migrations, models


def migrate_warehouse_roles_to_laboratory_manager(apps, schema_editor):
    UserRole = apps.get_model('users', 'UserRole')
    RolePageAccess = apps.get_model('users', 'RolePageAccess')

    UserRole.objects.filter(role__in=['warehouse_manager', 'warehouse_staff']).update(role='laboratory_manager')
    RolePageAccess.objects.filter(role__in=['warehouse_manager', 'warehouse_staff']).delete()

    RolePageAccess.objects.update_or_create(
        role='laboratory_manager',
        defaults={
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
        },
    )


def migrate_laboratory_manager_to_warehouse_manager(apps, schema_editor):
    UserRole = apps.get_model('users', 'UserRole')
    RolePageAccess = apps.get_model('users', 'RolePageAccess')

    UserRole.objects.filter(role='laboratory_manager').update(role='warehouse_manager')
    RolePageAccess.objects.filter(role='laboratory_manager').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0013_add_it_center_role'),
    ]

    operations = [
        migrations.RunPython(migrate_warehouse_roles_to_laboratory_manager, migrate_laboratory_manager_to_warehouse_manager),
        migrations.AlterField(
            model_name='userrole',
            name='role',
            field=models.CharField(
                choices=[
                    ('admin', 'Админ'),
                    ('it_center', 'IT Center'),
                    ('laboratory_manager', 'Менеджер лаборатории'),
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
                    ('laboratory_manager', 'Менеджер лаборатории'),
                    ('user', 'Обычный пользователь'),
                ],
                max_length=32,
                unique=True,
            ),
        ),
    ]
