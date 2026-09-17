from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0020_remove_item_responsible_person_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='ppearrival',
            name='size_breakdown',
            field=models.JSONField(blank=True, default=dict, verbose_name='Разбивка по размерам'),
        ),
    ]
