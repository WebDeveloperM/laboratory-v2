from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0017_item_image'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='PPEArrival',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity', models.PositiveIntegerField(default=0, verbose_name='Количество (приход)')),
                ('received_at', models.DateField(verbose_name='Дата прихода')),
                ('note', models.CharField(blank=True, max_length=255, null=True, verbose_name='Примечание')),
                ('updatedAt', models.DateTimeField(auto_now=True, null=True, blank=True, verbose_name='Дата изменения')),
                ('addedUser', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL, verbose_name='Сотрудник')),
                ('ppeproduct', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='arrivals', to='base.ppeproduct', verbose_name='Средство защиты')),
            ],
            options={
                'verbose_name': 'Приход СИЗ',
                'verbose_name_plural': 'Приходы СИЗ',
                'db_table': 'base_ppe_arrival',
                'ordering': ['-received_at', '-id'],
            },
        ),
    ]
