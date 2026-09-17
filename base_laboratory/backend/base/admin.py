from django.contrib import admin
from .models import *
from simple_history.admin import SimpleHistoryAdmin
from django.utils.translation import gettext_lazy as _
from django.utils import timezone

# Register your models here.


admin.site.register(ResponsiblePerson)


@admin.register(PPEProduct)
class PPEProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'type_product', 'renewal_months', 'is_active')
    list_filter = ('type_product', 'is_active')
    search_fields = ('name',)
    fields = ('name', 'type_product', 'renewal_months', 'is_active')


@admin.register(PPEArrival)
class PPEArrivalAdmin(admin.ModelAdmin):
    list_display = ('ppeproduct', 'quantity', 'size', 'size_breakdown', 'received_at', 'addedUser', 'updatedAt')
    list_filter = ('received_at', 'ppeproduct')
    search_fields = ('ppeproduct__name', 'size', 'note')
    fields = ('ppeproduct', 'quantity', 'size', 'size_breakdown', 'received_at', 'note', 'addedUser', 'updatedAt')
    readonly_fields = ('updatedAt',)

    def save_model(self, request, obj, form, change):
        if not obj.addedUser:
            obj.addedUser = request.user
        super().save_model(request, obj, form, change)


@admin.register(Item)
class ItemAdmin(SimpleHistoryAdmin):
    list_display = ('id', 'employee_service_id', 'employee_slug', 'issued_at', 'next_due_date', 'issued_by', 'updatedUser', 'isActive')
    list_filter = ('issued_at', 'isActive', 'issued_by')
    search_fields = ('slug', 'employee_slug', 'employee_service_id')
    readonly_fields = ('updatedAt',)

    def save_model(self, request, obj, form, change):
        if not obj.addedUser:
            obj.addedUser = request.user
        obj.updatedUser = request.user
        obj._history_user = request.user
        super().save_model(request, obj, form, change)