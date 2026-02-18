from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponseRedirect


def redirect_to_frontend_admin(request, path=""):
    frontend_base = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:5173").rstrip("/")
    target = f"{frontend_base}/admin"
    if request.META.get("QUERY_STRING"):
        target = f"{target}?{request.META['QUERY_STRING']}"
    return HttpResponseRedirect(target)

urlpatterns = [
    path('admin/', redirect_to_frontend_admin),
    path('admin/<path:path>/', redirect_to_frontend_admin),
    path('django-admin/', admin.site.urls),
    path('api/auth/', include('backend.accounts.urls')),
    path('api/admin/', include('backend.adminpanel.urls')),
    path('api/payments/', include('backend.payments.urls')),
    path('api/', include('backend.listings.urls')),
    path('api/', include('backend.public_api.urls')),
    path('api/', include('backend.reports.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
