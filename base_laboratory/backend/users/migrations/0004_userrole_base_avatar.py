from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_alter_userrole_role'),
    ]

    operations = [
        migrations.AddField(
            model_name='userrole',
            name='base_avatar',
            field=models.ImageField(blank=True, null=True, upload_to='user_avatars/', verbose_name='Базовый аватар'),
        ),
    ]
