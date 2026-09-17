from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='UserRole',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('role', models.CharField(choices=[('admin', 'Admin'), ('warehouse_manager', 'Omborxona mudiri'), ('user', 'Oddiy user')], default='user', max_length=32)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='role_profile', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
