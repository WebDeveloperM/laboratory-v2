from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0005_remove_item_note_remove_item_responsible_person_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='item',
            name='isActive',
            field=models.BooleanField(default=True),
        ),
    ]
