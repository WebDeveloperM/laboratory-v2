from django.db import migrations, models
import uuid


def populate_pending_issue_qr_tokens(apps, schema_editor):
    PendingItemIssue = apps.get_model('base', 'PendingItemIssue')

    for pending_issue in PendingItemIssue.objects.filter(qr_token__isnull=True).iterator():
        pending_issue.qr_token = uuid.uuid4()
        pending_issue.save(update_fields=['qr_token'])


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0033_positionpperenewalrule_department_scope'),
    ]

    operations = [
        migrations.AddField(
            model_name='pendingitemissue',
            name='employee_signed_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Дата подписи сотрудника'),
        ),
        migrations.AddField(
            model_name='pendingitemissue',
            name='qr_code_image',
            field=models.ImageField(blank=True, null=True, upload_to='issue_qr_codes/', verbose_name='QR код выдачи'),
        ),
        migrations.AddField(
            model_name='pendingitemissue',
            name='qr_token',
            field=models.UUIDField(blank=True, null=True, db_index=True, editable=False, verbose_name='QR токен выдачи'),
        ),
        migrations.AddField(
            model_name='pendingitemissue',
            name='warehouse_signed_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Дата подписи кладовщика'),
        ),
        migrations.RunPython(populate_pending_issue_qr_tokens, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='pendingitemissue',
            name='qr_token',
            field=models.UUIDField(db_index=True, default=uuid.uuid4, editable=False, unique=True, verbose_name='QR токен выдачи'),
        ),
    ]