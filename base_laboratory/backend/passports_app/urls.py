from django.urls import path
from . import views

urlpatterns = [
    # Dashboard summary
    path('documents-summary/', views.DocumentsSummaryView.as_view()),

    # Passport
    path('passports/', views.PassportListCreateView.as_view()),
    path('passports/pending-approvals/', views.PassportPendingApprovalsView.as_view()),
    path('passports/<int:pk>/', views.PassportDetailView.as_view()),
    path('passports/<int:pk>/submit/', views.PassportSubmitView.as_view()),
    path('passports/<int:pk>/approve/', views.PassportApproveView.as_view()),
    path('passports/<int:pk>/reject/', views.PassportRejectView.as_view()),

    # Spravka
    path('spravki/', views.SpravkaListCreateView.as_view()),
    path('spravki/pending-approvals/', views.SpravkaPendingApprovalsView.as_view()),
    path('spravki/<int:pk>/', views.SpravkaDetailView.as_view()),
    path('spravki/<int:pk>/download/', views.SpravkaDownloadView.as_view()),
    path('spravki/<int:pk>/submit/', views.SpravkaSubmitView.as_view()),
    path('spravki/<int:pk>/approve/', views.SpravkaApproveView.as_view()),
    path('spravki/<int:pk>/reject/', views.SpravkaRejectView.as_view()),

    # Passport PDF store/serve (QR code download support)
    path('passports/upload-pdf/<str:token>/', views.PassportPdfUploadView.as_view()),
    path('passports/pdf/<str:token>/', views.PassportPdfDownloadView.as_view()),

    # Passport approval verification (public, for QR code scanning)
    path('passports/verify/<uuid:token>/', views.PassportVerifyApiView.as_view()),

    # Spravka approval verification (public, for QR code scanning)
    path('spravki/verify/<uuid:token>/', views.SpravkaVerifyApiView.as_view()),

    # PassportTemplate
    path('passport-templates/', views.PassportTemplateListCreateView.as_view()),
    path('passport-templates/<int:pk>/', views.PassportTemplateDetailView.as_view()),
    path('passport-templates/<int:pk>/upload-docx/', views.PassportTemplateUploadDocxView.as_view()),

    # Template fields (nested under template)
    path('passport-templates/<int:pk>/fields/', views.TemplateFieldListCreateView.as_view()),
    path('passport-templates/<int:pk>/fields/bulk/', views.TemplateFieldBulkView.as_view()),
    path('template-fields/<int:pk>/', views.TemplateFieldDetailView.as_view()),

    # Template rows (nested under template)
    path('passport-templates/<int:pk>/rows/', views.TemplateRowListCreateView.as_view()),
    path('passport-templates/<int:pk>/rows/bulk/', views.TemplateRowBulkView.as_view()),
    path('template-rows/<int:pk>/', views.TemplateRowDetailView.as_view()),
]
