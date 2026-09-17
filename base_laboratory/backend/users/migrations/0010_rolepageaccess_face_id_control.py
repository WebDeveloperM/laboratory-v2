from django.db import migrations, models


def populate_face_id_control_permission(apps, schema_editor):
    RolePageAccess = apps.get_model('users', 'RolePageAccess')

    defaults_by_role = {
        'admin': True,
        'warehouse_manager': True,
        'warehouse_staff': False,
        'hr': False,
        'user': False,
    }

    for role, can_manage in defaults_by_role.items():
        RolePageAccess.objects.update_or_create(
            role=role,
            defaults={'can_manage_face_id_control': can_manage},
        )


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0009_rolepageaccess_employee_ppe_tab'),
    ]

    operations = [
        migrations.AddField(
            model_name='rolepageaccess',
            name='can_manage_face_id_control',
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(populate_face_id_control_permission, migrations.RunPython.noop),
    ]