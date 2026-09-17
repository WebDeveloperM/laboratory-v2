from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0028_remove_employee_headdress_size'),
    ]

    operations = [
        migrations.AddField(
            model_name='ppeproduct',
            name='target_gender',
            field=models.CharField(choices=[('ALL', 'Для всех'), ('M', 'Мужской'), ('F', 'Женский')], default='ALL', max_length=3, verbose_name='Для кого'),
        ),
    ]