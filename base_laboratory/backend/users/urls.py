# accounts/urls.py
from django.urls import path
from .views import BnpzIdAccessCheckAPIView, BnpzIdLoginAPIView, FaceIdLoginAPIView, LoginAPIView, UserInfoView, TokenStatusAPIView, RegisterAPIView
from .views import RolePageAccessSettingsAPIView, SettingsUsersListCreateAPIView, SettingsUsersDetailAPIView
from .views import EmployeeListProxyAPIView, SyncEmployeeRoleAPIView

urlpatterns = [
    path('login/', LoginAPIView.as_view()),
    path('faceid/login/', FaceIdLoginAPIView.as_view()),
    path('bnpzid/login/', BnpzIdLoginAPIView.as_view()),
    path('bnpzid/access-check/', BnpzIdAccessCheckAPIView.as_view()),
    path('register/', RegisterAPIView.as_view()),
    path('settings-users/', SettingsUsersListCreateAPIView.as_view()),
    path('settings-users/sync-role/', SyncEmployeeRoleAPIView.as_view()),
    path('settings-users/<int:pk>/', SettingsUsersDetailAPIView.as_view()),
    path('settings-users/<int:pk>/reset-password/', SettingsUsersDetailAPIView.as_view()),
    path('page-access-settings/', RolePageAccessSettingsAPIView.as_view()),
    path('employees-list/', EmployeeListProxyAPIView.as_view()),
    path('user/', UserInfoView.as_view(), name='user-info'),
    path('check-token/', TokenStatusAPIView.as_view(), name='user-info'),
]
