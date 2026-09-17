from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('passports_app', '0008_passport_is_delete'),
    ]

    operations = [
        migrations.AddField(
            model_name='spravka',
            name='shift_head',
            field=models.CharField(blank=True, default='', max_length=255, verbose_name='Начальник смены'),
        ),
        migrations.AddField(
            model_name='spravka',
            name='sttl_head',
            field=models.CharField(blank=True, default='', max_length=255, verbose_name='Начальник СТТЛ'),
        ),
        migrations.AddField(
            model_name='spravka',
            name='czl_head',
            field=models.CharField(blank=True, default='', max_length=255, verbose_name='Начальник ЦЗЛ'),
        ),
        migrations.AddField(
            model_name='spravka',
            name='dispatcher_head',
            field=models.CharField(blank=True, default='', max_length=255, verbose_name='Диспетчер'),
        ),
        migrations.AddField(
            model_name='spravka',
            name='approval_status',
            field=models.CharField(choices=[('draft', 'Черновик'), ('pending_sttl', 'На подписи: Начальник СТТЛ'), ('pending_czl', 'На подписи: Начальник ЦЗЛ'), ('pending_dispatcher', 'На подписи: Диспетчер'), ('approved', 'Утверждён'), ('rejected', 'Отклонён')], default='draft', max_length=20, verbose_name='Статус согласования'),
        ),
        migrations.AddField(
            model_name='spravka',
            name='submitted_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to=settings.AUTH_USER_MODEL, verbose_name='Отправил на подпись'),
        ),
        migrations.AddField(
            model_name='spravka',
            name='submitted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='spravka',
            name='sttl_employee_slug',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='spravka',
            name='sttl_approved_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='spravka',
            name='sttl_approved_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='spravka',
            name='czl_employee_slug',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='spravka',
            name='czl_approved_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='spravka',
            name='czl_approved_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='spravka',
            name='dispatcher_employee_slug',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='spravka',
            name='dispatcher_approved_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='spravka',
            name='dispatcher_approved_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='spravka',
            name='rejected_step',
            field=models.CharField(blank=True, choices=[('sttl', 'Начальник СТТЛ'), ('czl', 'Начальник ЦЗЛ'), ('dispatcher', 'Диспетчер')], default='', max_length=20),
        ),
        migrations.AddField(
            model_name='spravka',
            name='rejected_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='spravka',
            name='rejected_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='spravka',
            name='rejection_comment',
            field=models.TextField(blank=True, default=''),
        ),
    ]
