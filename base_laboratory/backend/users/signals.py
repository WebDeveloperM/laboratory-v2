from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

from .models import UserRole


@receiver(post_save, sender=get_user_model())
def create_user_role_profile(sender, instance, created, **kwargs):
    if created:
        UserRole.objects.get_or_create(user=instance)
