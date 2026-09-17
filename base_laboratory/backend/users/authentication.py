from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.utils.timezone import now
from .models import CustomToken

class ExpiringTokenAuthentication(TokenAuthentication):
    model = CustomToken

    def authenticate_credentials(self, key):
        try:
            token = self.model.objects.get(key=key)
        except self.model.DoesNotExist:
            raise AuthenticationFailed('Invalid token')

        if token.is_expired():
            token.delete()  # Eski tokenni o‘chiramiz
            raise AuthenticationFailed('Token expired')

        return (token.user, token)
