from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0034_pendingitemissue_qr_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='positionpperenewalrule',
            name='is_allowed',
            field=models.BooleanField(default=True, verbose_name='Разрешено для должности'),
        ),
    ]
