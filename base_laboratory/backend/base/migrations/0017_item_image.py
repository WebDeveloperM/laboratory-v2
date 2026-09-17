from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0016_employee_base_image'),
    ]

    operations = [
        migrations.AddField(
            model_name='item',
            name='image',
            field=models.ImageField(blank=True, null=True, upload_to='item_images/', verbose_name='Фото при выдаче'),
        ),
        migrations.AddField(
            model_name='historicalitem',
            name='image',
            field=models.TextField(blank=True, null=True),
        ),
    ]
