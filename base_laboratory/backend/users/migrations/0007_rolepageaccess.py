from django.db import migrations, models


def create_default_role_page_access(apps, schema_editor):
    RolePageAccess = apps.get_model('users', 'RolePageAccess')

    defaults_by_role = {
        'admin': {
            'can_view_dashboard': True,
            'can_view_ppe_arrival': True,
            'can_view_statistics': True,
            'can_view_settings': True,
        },
        'warehouse_manager': {
            'can_view_dashboard': True,
            'can_view_ppe_arrival': True,
            'can_view_statistics': True,
            'can_view_settings': True,
        },
        'warehouse_staff': {
            'can_view_dashboard': True,
            'can_view_ppe_arrival': True,
            'can_view_statistics': True,
            'can_view_settings': True,
        },
        'hr': {
            'can_view_dashboard': True,
            'can_view_ppe_arrival': False,
            'can_view_statistics': False,
            'can_view_settings': False,
        },
        'user': {
            'can_view_dashboard': True,
            'can_view_ppe_arrival': False,
            'can_view_statistics': False,
            'can_view_settings': False,
        },
    }

    for role, defaults in defaults_by_role.items():
        RolePageAccess.objects.update_or_create(role=role, defaults=defaults)


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0006_alter_userrole_role'),
    ]

    operations = [
        migrations.CreateModel(
            name='RolePageAccess',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('role', models.CharField(choices=[('admin', 'Админ'), ('warehouse_manager', 'Складской менеджер'), ('warehouse_staff', 'Складской рабочий'), ('hr', 'Отдел кадров'), ('user', 'Обычный пользователь')], max_length=32, unique=True)),
                ('can_view_dashboard', models.BooleanField(default=True)),
                ('can_view_ppe_arrival', models.BooleanField(default=False)),
                ('can_view_statistics', models.BooleanField(default=False)),
                ('can_view_settings', models.BooleanField(default=False)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Role Page Access',
                'verbose_name_plural': 'Role Page Access',
                'ordering': ['role'],
            },
        ),
        migrations.RunPython(create_default_role_page_access, migrations.RunPython.noop),
    ]