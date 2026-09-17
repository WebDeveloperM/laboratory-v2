from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0013_remove_ppeproduct_slug'),
    ]

    operations = [
        migrations.AddField(
            model_name='employee',
            name='is_deleted',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='item',
            name='is_deleted',
            field=models.BooleanField(default=False),
        ),
    ]
