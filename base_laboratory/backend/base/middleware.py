from threading import local
from django.utils.deprecation import MiddlewareMixin

_user = local()

class CurrentUserMiddleware:
    """Har bir request uchun foydalanuvchini saqlab qolish"""
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _user.value = request.user
        response = self.get_response(request)
        return response

    @staticmethod
    def get_current_user():
        return getattr(_user, "value", None)
        
class SimpleHistoryMiddleware(MiddlewareMixin):
    """Middleware to properly set history user from request"""
    
    def process_request(self, request):
        if hasattr(request, 'user') and request.user.is_authenticated:
            request._history_user = request.user
        return None
