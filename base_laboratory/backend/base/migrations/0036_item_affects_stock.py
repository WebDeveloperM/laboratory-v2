from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0035_positionpperenewalrule_is_allowed'),
    ]

    operations = [
        migrations.AddField(
            model_name='historicalitem',
            name='affects_stock',
            field=models.BooleanField(default=True, verbose_name='Влияет на остатки склада'),
        ),
        migrations.AddField(
            model_name='item',
            name='affects_stock',
            field=models.BooleanField(default=True, verbose_name='Влияет на остатки склада'),
        ),
    ]
