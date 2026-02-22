from rest_framework import authentication, exceptions

from backend.accounts.models import BusinessUser, UserImportApiKey


def _extract_api_key(request) -> str:
    auth_header = str(request.headers.get("Authorization") or "").strip()
    if auth_header.lower().startswith("apikey "):
        return auth_header[7:].strip()

    fallback = request.headers.get("X-Karbg-Api-Key") or request.headers.get("X-Api-Key")
    return str(fallback or "").strip()


class PublicApiKeyAuthentication(authentication.BaseAuthentication):
    """Authenticate requests via per-user import API key."""

    def authenticate(self, request):
        raw_key = _extract_api_key(request)
        if not raw_key:
            raise exceptions.NotAuthenticated("API key is missing.")

        api_key = UserImportApiKey.objects.select_related("user").filter(
            key_hash=UserImportApiKey.hash_key(raw_key)
        ).first()
        if not api_key or not api_key.user.is_active:
            raise exceptions.AuthenticationFailed("API key is invalid.")

        try:
            api_key.user.business_profile
        except BusinessUser.DoesNotExist:
            raise exceptions.AuthenticationFailed(
                "API key is allowed only for business accounts."
            )

        api_key.mark_used()
        return (api_key.user, api_key)

    def authenticate_header(self, request):
        return "ApiKey"
