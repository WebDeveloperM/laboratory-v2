from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0023_pendingitemissue_warehouse_signature_image'),
    ]

    operations = [
        migrations.AddField(
            model_name='ppeproduct',
            name='low_stock_threshold',
            field=models.PositiveIntegerField(default=0, verbose_name='Порог остатка'),
        ),
    ]
