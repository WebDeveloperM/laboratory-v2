from django.db import migrations, models
import django.db.models


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0032_positionpperenewalrule'),
    ]

    operations = [
        migrations.AddField(
            model_name='positionpperenewalrule',
            name='department_name',
            field=models.CharField(blank=True, default='', max_length=255, verbose_name='Цех'),
        ),
        migrations.AddField(
            model_name='positionpperenewalrule',
            name='department_service_id',
            field=models.PositiveIntegerField(blank=True, db_index=True, null=True, verbose_name='ID цеха из employee_service'),
        ),
        migrations.RemoveConstraint(
            model_name='positionpperenewalrule',
            name='unique_position_ppe_renewal_rule',
        ),
        migrations.AddConstraint(
            model_name='positionpperenewalrule',
            constraint=models.UniqueConstraint(fields=('department_service_id', 'position_key', 'ppeproduct'), name='unique_department_position_ppe_renewal_rule'),
        ),
        migrations.AddConstraint(
            model_name='positionpperenewalrule',
            constraint=models.UniqueConstraint(condition=django.db.models.Q(department_service_id__isnull=True), fields=('position_key', 'ppeproduct'), name='unique_global_position_ppe_renewal_rule'),
        ),
    ]