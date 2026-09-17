from django.db import migrations, models
from django.utils.text import slugify


def populate_ppeproduct_slugs(apps, schema_editor):
    PPEProduct = apps.get_model('base', 'PPEProduct')

    used_slugs = set(
        PPEProduct.objects.exclude(slug__isnull=True).exclude(slug__exact='').values_list('slug', flat=True)
    )

    for product in PPEProduct.objects.all().order_by('id'):
        if product.slug:
            continue

        base_slug = slugify(product.name) or 'ppe-product'
        slug_candidate = base_slug
        suffix = 1
        while slug_candidate in used_slugs:
            suffix += 1
            slug_candidate = f"{base_slug}-{suffix}"

        product.slug = slug_candidate
        product.save(update_fields=['slug'])
        used_slugs.add(slug_candidate)


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0011_item_datetime_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='ppeproduct',
            name='slug',
            field=models.SlugField(blank=True, null=True, unique=True),
        ),
        migrations.RunPython(populate_ppeproduct_slugs, migrations.RunPython.noop),
    ]
