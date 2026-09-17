import uuid

from django.db import migrations, models


def populate_spravka_qr_tokens(apps, schema_editor):
    Spravka = apps.get_model('passports_app', 'Spravka')

    for spravka in Spravka.objects.filter(qr_token__isnull=True).iterator():
        spravka.qr_token = uuid.uuid4()
        spravka.save(update_fields=['qr_token'])


class Migration(migrations.Migration):

    dependencies = [
        ('passports_app', '0009_spravka_approval_workflow'),
    ]

    operations = [
        migrations.AddField(
            model_name='spravka',
            name='qr_token',
            field=models.UUIDField(blank=True, null=True, db_index=True, editable=False),
        ),
        migrations.RunPython(populate_spravka_qr_tokens, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='spravka',
            name='qr_token',
            field=models.UUIDField(db_index=True, default=uuid.uuid4, editable=False, unique=True),
        ),
    ]
