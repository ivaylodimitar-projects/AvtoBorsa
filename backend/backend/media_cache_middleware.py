from django.conf import settings


IMMUTABLE_MEDIA_CACHE_CONTROL = "public, max-age=31536000, immutable"
DEFAULT_MEDIA_CACHE_CONTROL = "public, max-age=86400"


class MediaCacheControlMiddleware:
    """Apply cache headers for uploaded media files when Django serves them."""

    def __init__(self, get_response):
        self.get_response = get_response
        media_url = getattr(settings, "MEDIA_URL", "/media/")
        if not media_url.startswith("/"):
            media_url = f"/{media_url}"
        self.media_url_prefix = f"{media_url.rstrip('/')}/"

    def __call__(self, request):
        response = self.get_response(request)

        if request.method not in {"GET", "HEAD"}:
            return response
        if response.status_code not in {200, 304}:
            return response
        if not request.path.startswith(self.media_url_prefix):
            return response

        if "/renditions/" in request.path or "/thumbs/" in request.path:
            response["Cache-Control"] = IMMUTABLE_MEDIA_CACHE_CONTROL
            return response

        response.setdefault("Cache-Control", DEFAULT_MEDIA_CACHE_CONTROL)
        return response
