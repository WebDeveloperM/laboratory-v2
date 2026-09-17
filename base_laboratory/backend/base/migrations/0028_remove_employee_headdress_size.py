from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0027_alter_ppeproduct_type_product'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='employee',
            name='headdress_size',
        ),
    ]