from rest_framework.throttling import SimpleRateThrottle


class PublicApiRateThrottle(SimpleRateThrottle):
    scope = "public_api"
    rate = "2/min"

    def get_cache_key(self, request, view):
        api_key = getattr(request, "auth", None)
        if getattr(api_key, "key_hash", None):
            ident = f"api-key:{api_key.key_hash}"
        elif getattr(api_key, "pk", None):
            ident = f"api-key-id:{api_key.pk}"
        elif getattr(getattr(request, "user", None), "pk", None):
            ident = f"user:{request.user.pk}"
        else:
            ident = f"ip:{self.get_ident(request)}"

        return self.cache_format % {
            "scope": self.scope,
            "ident": ident,
        }
