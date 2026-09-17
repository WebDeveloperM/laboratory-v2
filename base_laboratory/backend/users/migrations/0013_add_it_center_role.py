from django.db import migrations, models


def create_it_center_page_access(apps, schema_editor):
    RolePageAccess = apps.get_model('users', 'RolePageAccess')

    RolePageAccess.objects.update_or_create(
        role='it_center',
        defaults={
            'can_view_dashboard': True,
            'can_view_ppe_arrival': True,
            'can_view_statistics': True,
            'can_view_settings': True,
            'can_view_dashboard_due_cards': True,
            'can_export_dashboard_excel': True,
            'can_delete_employee': True,
            'can_view_employee_ppe_tab': True,
            'can_manage_face_id_control': False,
            'can_submit_ppe_arrival': True,
            'can_edit_employee': True,
        },
    )


def remove_it_center_page_access(apps, schema_editor):
    RolePageAccess = apps.get_model('users', 'RolePageAccess')
    RolePageAccess.objects.filter(role='it_center').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0012_remove_hr_role'),
    ]

    operations = [
        migrations.AlterField(
            model_name='userrole',
            name='role',
            field=models.CharField(
                choices=[
                    ('admin', 'Админ'),
                    ('it_center', 'IT Center'),
                    ('warehouse_manager', 'Складской менеджер'),
                    ('warehouse_staff', 'Складской рабочий'),
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
                    ('warehouse_manager', 'Складской менеджер'),
                    ('warehouse_staff', 'Складской рабочий'),
                    ('user', 'Обычный пользователь'),
                ],
                max_length=32,
                unique=True,
            ),
        ),
        migrations.RunPython(create_it_center_page_access, remove_it_center_page_access),
    ]
