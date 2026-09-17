from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0029_ppeproduct_target_gender'),
    ]

    operations = [
        migrations.CreateModel(
            name='DepartmentPPERenewalRule',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('department_service_id', models.PositiveIntegerField(db_index=True, verbose_name='ID цеха из employee_service')),
                ('department_name', models.CharField(max_length=255, verbose_name='Название цеха')),
                ('renewal_months', models.PositiveIntegerField(default=0, verbose_name='Срок выдачи (в месяцах)')),
                ('updatedAt', models.DateTimeField(auto_now=True, blank=True, null=True, verbose_name='Дата изменения')),
                ('ppeproduct', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='department_renewal_rules', to='base.ppeproduct', verbose_name='Средство индивидуальной защиты')),
            ],
            options={
                'verbose_name': 'Норма выдачи СИЗ по цеху',
                'verbose_name_plural': 'Нормы выдачи СИЗ по цехам',
                'db_table': 'base_department_ppe_renewal_rule',
                'ordering': ['department_name', 'ppeproduct__name', 'id'],
            },
        ),
        migrations.AddConstraint(
            model_name='departmentpperenewalrule',
            constraint=models.UniqueConstraint(fields=('department_service_id', 'ppeproduct'), name='unique_department_ppe_renewal_rule'),
        ),
    ]