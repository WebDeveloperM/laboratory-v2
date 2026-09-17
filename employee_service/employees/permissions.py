from rest_framework.permissions import SAFE_METHODS, BasePermission, IsAuthenticated

from .authentication import ServiceApiKeyAuthentication


class ServiceApiKeyReadOnlyPermission(BasePermission):
    message = 'Сервисный API-ключ поддерживает только операции чтения.'

    def has_permission(self, request, view):
        authenticator = getattr(request, 'successful_authenticator', None)
        if isinstance(authenticator, ServiceApiKeyAuthentication) and request.method not in SAFE_METHODS:
            return False
        return True


class ServiceApiAuthenticatedPermission(IsAuthenticated):
    message = 'Сервисный API-ключ поддерживает только операции чтения.'

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False

        authenticator = getattr(request, 'successful_authenticator', None)
        if isinstance(authenticator, ServiceApiKeyAuthentication) and request.method not in SAFE_METHODS:
            return False

        return True