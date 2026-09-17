from django.db import migrations, models


def migrate_hr_role_to_user(apps, schema_editor):
    UserRole = apps.get_model('users', 'UserRole')
    RolePageAccess = apps.get_model('users', 'RolePageAccess')

    UserRole.objects.filter(role='hr').update(role='user')
    RolePageAccess.objects.filter(role='hr').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0011_add_employee_slug_face_id_required'),
    ]

    operations = [
        migrations.RunPython(migrate_hr_role_to_user, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='userrole',
            name='role',
            field=models.CharField(
                choices=[
                    ('admin', 'Админ'),
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
                    ('warehouse_manager', 'Складской менеджер'),
                    ('warehouse_staff', 'Складской рабочий'),
                    ('user', 'Обычный пользователь'),
                ],
                max_length=32,
                unique=True,
            ),
        ),
    ]