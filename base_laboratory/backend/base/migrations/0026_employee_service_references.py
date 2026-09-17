from django.db import migrations, models


SNAPSHOT_EMPTY = {}


def _build_snapshot(employee):
    if employee is None:
        return {}

    department = getattr(employee, 'department', None)
    section = getattr(employee, 'section', None)
    full_name = ' '.join(
        part for part in [employee.last_name, employee.first_name, employee.surname] if part
    ).strip()

    return {
        'id': employee.id,
        'external_id': str(employee.id),
        'source_system': 'tb-project',
        'slug': employee.slug or '',
        'first_name': employee.first_name or '',
        'last_name': employee.last_name or '',
        'surname': employee.surname or '',
        'full_name': full_name,
        'tabel_number': employee.tabel_number or '',
        'gender': employee.gender or '',
        'height': employee.height or '',
        'clothe_size': employee.clothe_size or '',
        'shoe_size': employee.shoe_size or '',
        'headdress_size': employee.headdress_size or '',
        'position': employee.position or '',
        'date_of_employment': employee.date_of_employment.isoformat() if employee.date_of_employment else None,
        'date_of_change_position': employee.date_of_change_position.isoformat() if employee.date_of_change_position else None,
        'requires_face_id_checkout': bool(getattr(employee, 'requires_face_id_checkout', True)),
        'base_image': getattr(getattr(employee, 'base_image', None), 'name', None),
        'base_image_url': getattr(getattr(employee, 'base_image', None), 'name', None),
        'department': {
            'id': department.id if department else None,
            'name': department.name if department else '',
            'boss_fullName': getattr(department, 'boss_fullName', '') if department else '',
        },
        'section': {
            'id': section.id if section else None,
            'name': section.name if section else '',
            'department_id': section.department_id if section else (department.id if department else None),
        },
        'metadata': {'origin': 'tb-project'},
    }


def copy_employee_references(apps, schema_editor):
    Item = apps.get_model('base', 'Item')
    HistoricalItem = apps.get_model('base', 'HistoricalItem')
    PendingItemIssue = apps.get_model('base', 'PendingItemIssue')

    for item in Item.objects.select_related('employee', 'employee__department', 'employee__section').all():
        employee = getattr(item, 'employee', None)
        snapshot = _build_snapshot(employee)
        item.employee_service_id = employee.id if employee else 0
        item.employee_slug = employee.slug if employee else None
        item.employee_snapshot = snapshot
        item.save(update_fields=['employee_service_id', 'employee_slug', 'employee_snapshot'])

    for historical_item in HistoricalItem.objects.select_related('employee', 'employee__department', 'employee__section').all():
        employee = getattr(historical_item, 'employee', None)
        snapshot = _build_snapshot(employee)
        historical_item.employee_service_id = employee.id if employee else 0
        historical_item.employee_slug = employee.slug if employee else None
        historical_item.employee_snapshot = snapshot
        historical_item.save(update_fields=['employee_service_id', 'employee_slug', 'employee_snapshot'])

    for pending_issue in PendingItemIssue.objects.select_related('employee', 'employee__department', 'employee__section').all():
        employee = getattr(pending_issue, 'employee', None)
        snapshot = _build_snapshot(employee)
        pending_issue.employee_service_id = employee.id if employee else 0
        pending_issue.employee_slug = employee.slug if employee else None
        pending_issue.employee_snapshot = snapshot
        pending_issue.save(update_fields=['employee_service_id', 'employee_slug', 'employee_snapshot'])


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0025_employee_requires_face_id_checkout_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='historicalitem',
            name='employee_service_id',
            field=models.BigIntegerField(blank=True, db_index=True, null=True, verbose_name='ID сотрудника из employee_service'),
        ),
        migrations.AddField(
            model_name='historicalitem',
            name='employee_slug',
            field=models.SlugField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='historicalitem',
            name='employee_snapshot',
            field=models.JSONField(blank=True, default=dict, verbose_name='Снимок сотрудника'),
        ),
        migrations.AddField(
            model_name='item',
            name='employee_service_id',
            field=models.BigIntegerField(blank=True, db_index=True, null=True, verbose_name='ID сотрудника из employee_service'),
        ),
        migrations.AddField(
            model_name='item',
            name='employee_slug',
            field=models.SlugField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name='item',
            name='employee_snapshot',
            field=models.JSONField(blank=True, default=dict, verbose_name='Снимок сотрудника'),
        ),
        migrations.AddField(
            model_name='pendingitemissue',
            name='employee_service_id',
            field=models.BigIntegerField(blank=True, db_index=True, null=True, verbose_name='ID сотрудника из employee_service'),
        ),
        migrations.AddField(
            model_name='pendingitemissue',
            name='employee_slug',
            field=models.SlugField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name='pendingitemissue',
            name='employee_snapshot',
            field=models.JSONField(blank=True, default=dict, verbose_name='Снимок сотрудника'),
        ),
        migrations.RunPython(copy_employee_references, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='historicalitem',
            name='employee_service_id',
            field=models.BigIntegerField(db_index=True, verbose_name='ID сотрудника из employee_service'),
        ),
        migrations.AlterField(
            model_name='item',
            name='employee_service_id',
            field=models.BigIntegerField(db_index=True, verbose_name='ID сотрудника из employee_service'),
        ),
        migrations.AlterField(
            model_name='pendingitemissue',
            name='employee_service_id',
            field=models.BigIntegerField(db_index=True, verbose_name='ID сотрудника из employee_service'),
        ),
        migrations.RemoveField(
            model_name='historicalitem',
            name='employee',
        ),
        migrations.RemoveField(
            model_name='item',
            name='employee',
        ),
        migrations.RemoveField(
            model_name='pendingitemissue',
            name='employee',
        ),
    ]
