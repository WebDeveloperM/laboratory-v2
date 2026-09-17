from django.db import migrations, models


def populate_employee_ppe_tab_permission(apps, schema_editor):
    RolePageAccess = apps.get_model('users', 'RolePageAccess')

    defaults_by_role = {
        'admin': True,
        'warehouse_manager': True,
        'warehouse_staff': True,
        'hr': False,
        'user': True,
    }

    for role, can_view in defaults_by_role.items():
        RolePageAccess.objects.update_or_create(
            role=role,
            defaults={'can_view_employee_ppe_tab': can_view},
        )


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0008_rolepageaccess_feature_permissions'),
    ]

    operations = [
        migrations.AddField(
            model_name='rolepageaccess',
            name='can_view_employee_ppe_tab',
            field=models.BooleanField(default=True),
        ),
        migrations.RunPython(populate_employee_ppe_tab_permission, migrations.RunPython.noop),
    ]