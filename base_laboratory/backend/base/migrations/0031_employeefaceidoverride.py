from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0030_departmentpperenewalrule'),
    ]

    operations = [
        migrations.CreateModel(
            name='EmployeeFaceIdOverride',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('employee_service_id', models.BigIntegerField(blank=True, db_index=True, null=True, unique=True, verbose_name='ID сотрудника из employee_service')),
                ('employee_slug', models.SlugField(blank=True, db_index=True, max_length=255, null=True, unique=True, verbose_name='Slug сотрудника из employee_service')),
                ('tabel_number', models.CharField(blank=True, db_index=True, max_length=255, null=True, verbose_name='Табельный номер')),
                ('full_name', models.CharField(blank=True, default='', max_length=255, verbose_name='ФИО сотрудника')),
                ('requires_face_id_checkout', models.BooleanField(default=True, help_text='Локальный override для случаев, когда employee_service доступен только на чтение', verbose_name='Требуется Face ID при выдаче СИЗ')),
                ('updatedAt', models.DateTimeField(auto_now=True, blank=True, null=True, verbose_name='Дата изменения')),
            ],
            options={
                'verbose_name': 'Локальная настройка Face ID',
                'verbose_name_plural': 'Локальные настройки Face ID',
                'db_table': 'base_employee_face_id_override',
                'ordering': ['full_name', 'employee_slug', 'id'],
            },
        ),
    ]