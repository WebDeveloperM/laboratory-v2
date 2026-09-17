from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0015_add_is_deleted_to_history_tables'),
    ]

    operations = [
        migrations.AddField(
            model_name='employee',
            name='base_image',
            field=models.ImageField(blank=True, null=True, upload_to='employee_base_images/', verbose_name='Базовое фото 3x4'),
        ),
        migrations.AddField(
            model_name='historicalemployee',
            name='base_image',
            field=models.TextField(blank=True, null=True),
        ),
    ]
