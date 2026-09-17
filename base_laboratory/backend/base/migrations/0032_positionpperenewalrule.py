from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0031_employeefaceidoverride'),
    ]

    operations = [
        migrations.CreateModel(
            name='PositionPPERenewalRule',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('position_name', models.CharField(max_length=255, verbose_name='Должность')),
                ('position_key', models.CharField(db_index=True, editable=False, max_length=255, verbose_name='Ключ должности')),
                ('renewal_months', models.PositiveIntegerField(default=0, verbose_name='Срок выдачи (в месяцах)')),
                ('updatedAt', models.DateTimeField(auto_now=True, blank=True, null=True, verbose_name='Дата изменения')),
                ('ppeproduct', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='position_renewal_rules', to='base.ppeproduct', verbose_name='Средство индивидуальной защиты')),
            ],
            options={
                'verbose_name': 'Норма выдачи СИЗ по должности',
                'verbose_name_plural': 'Нормы выдачи СИЗ по должностям',
                'db_table': 'base_position_ppe_renewal_rule',
                'ordering': ['position_name', 'ppeproduct__name', 'id'],
            },
        ),
        migrations.AddConstraint(
            model_name='positionpperenewalrule',
            constraint=models.UniqueConstraint(fields=('position_key', 'ppeproduct'), name='unique_position_ppe_renewal_rule'),
        ),
    ]