import uuid

from django.db import migrations, models


def populate_passport_qr_tokens(apps, schema_editor):
    Passport = apps.get_model('passports_app', 'Passport')

    for passport in Passport.objects.filter(qr_token__isnull=True).iterator():
        passport.qr_token = uuid.uuid4()
        passport.save(update_fields=['qr_token'])


class Migration(migrations.Migration):

    dependencies = [
        ('passports_app', '0006_passport_approval_workflow'),
    ]

    operations = [
        migrations.AddField(
            model_name='passport',
            name='qr_token',
            field=models.UUIDField(blank=True, null=True, db_index=True, editable=False),
        ),
        migrations.RunPython(populate_passport_qr_tokens, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='passport',
            name='qr_token',
            field=models.UUIDField(db_index=True, default=uuid.uuid4, editable=False, unique=True),
        ),
    ]
