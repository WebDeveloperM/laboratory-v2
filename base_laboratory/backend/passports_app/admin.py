from django.contrib import admin
from .models import Passport, Spravka, PassportTemplate, TemplateField, TemplateRow


@admin.register(Passport)
class PassportAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'template', 'created_at')
    list_filter = ('created_at', 'template')
    search_fields = ('field_values',)


@admin.register(Spravka)
class SpravkaAdmin(admin.ModelAdmin):
    list_display = ('spravka_number', 'reservoir', 'issue_date', 'created_at')
    search_fields = ('spravka_number', 'reservoir')
    list_filter = ('created_at',)


class TemplateFieldInline(admin.TabularInline):
    model = TemplateField
    extra = 0


class TemplateRowInline(admin.TabularInline):
    model = TemplateRow
    extra = 0


@admin.register(PassportTemplate)
class PassportTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'product_standard', 'reservoir_type', 'updated_at')
    list_filter = ('category', 'reservoir_type')
    search_fields = ('name', 'category')
    inlines = [TemplateFieldInline, TemplateRowInline]
