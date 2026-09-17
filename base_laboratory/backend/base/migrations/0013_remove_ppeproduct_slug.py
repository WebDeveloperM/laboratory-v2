from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0012_ppeproduct_slug'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='ppeproduct',
            name='slug',
        ),
    ]
