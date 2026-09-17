from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0022_pending_item_issue'),
    ]

    operations = [
        migrations.AddField(
            model_name='pendingitemissue',
            name='warehouse_signature_image',
            field=models.ImageField(blank=True, null=True, upload_to='signatures/', verbose_name='Подпись кладовщика'),
        ),
    ]
