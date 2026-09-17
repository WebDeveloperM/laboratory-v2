from django.db import migrations, models


def populate_role_feature_permissions(apps, schema_editor):
    RolePageAccess = apps.get_model('users', 'RolePageAccess')

    defaults_by_role = {
        'admin': {
            'can_view_dashboard_due_cards': True,
            'can_add_employee': True,
            'can_export_dashboard_excel': True,
            'can_edit_employee': True,
            'can_delete_employee': True,
            'can_submit_ppe_arrival': True,
        },
        'warehouse_manager': {
            'can_view_dashboard_due_cards': True,
            'can_add_employee': False,
            'can_export_dashboard_excel': True,
            'can_edit_employee': False,
            'can_delete_employee': False,
            'can_submit_ppe_arrival': False,
        },
        'warehouse_staff': {
            'can_view_dashboard_due_cards': True,
            'can_add_employee': False,
            'can_export_dashboard_excel': True,
            'can_edit_employee': True,
            'can_delete_employee': False,
            'can_submit_ppe_arrival': True,
        },
        'hr': {
            'can_view_dashboard_due_cards': False,
            'can_add_employee': True,
            'can_export_dashboard_excel': False,
            'can_edit_employee': True,
            'can_delete_employee': False,
            'can_submit_ppe_arrival': False,
        },
        'user': {
            'can_view_dashboard_due_cards': True,
            'can_add_employee': False,
            'can_export_dashboard_excel': True,
            'can_edit_employee': False,
            'can_delete_employee': False,
            'can_submit_ppe_arrival': False,
        },
    }

    for role, defaults in defaults_by_role.items():
        RolePageAccess.objects.update_or_create(role=role, defaults=defaults)


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0007_rolepageaccess'),
    ]

    operations = [
        migrations.AddField(
            model_name='rolepageaccess',
            name='can_add_employee',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='rolepageaccess',
            name='can_delete_employee',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='rolepageaccess',
            name='can_edit_employee',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='rolepageaccess',
            name='can_export_dashboard_excel',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='rolepageaccess',
            name='can_submit_ppe_arrival',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='rolepageaccess',
            name='can_view_dashboard_due_cards',
            field=models.BooleanField(default=True),
        ),
        migrations.RunPython(populate_role_feature_permissions, migrations.RunPython.noop),
    ]