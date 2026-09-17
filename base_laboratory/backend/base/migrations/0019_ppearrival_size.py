from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0018_ppearrival'),
    ]

    operations = [
        migrations.AddField(
            model_name='ppearrival',
            name='size',
            field=models.CharField(blank=True, max_length=50, null=True, verbose_name='Размер'),
        ),
    ]
