from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0014_soft_delete_flags'),
    ]

    operations = [
        migrations.AddField(
            model_name='historicalemployee',
            name='is_deleted',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='historicalitem',
            name='is_deleted',
            field=models.BooleanField(default=False),
        ),
    ]
