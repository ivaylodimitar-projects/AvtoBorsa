"""
Django settings for backend project.
"""

import os
from datetime import timedelta
from pathlib import Path
from urllib.parse import urlparse

from corsheaders.defaults import default_headers
from django.core.exceptions import ImproperlyConfigured


BASE_DIR = Path(__file__).resolve().parent.parent


def _env_flag(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in ("1", "true", "yes", "on")


def _split_csv_env(name: str) -> list[str]:
    raw = os.getenv(name, "")
    return [item.strip() for item in raw.split(",") if item.strip()]


def _normalize_samesite(value: str | None, default: str = "Lax") -> str:
    normalized = str(value or "").strip().lower()
    if normalized == "none":
        return "None"
    if normalized == "strict":
        return "Strict"
    if normalized == "lax":
        return "Lax"
    return default


def _resolve_env_alias(value: str | None) -> str:
    normalized = str(value or "").strip().strip('"').strip("'")
    if not normalized:
        return ""
    referenced_value = os.getenv(normalized)
    if referenced_value:
        return str(referenced_value).strip().strip('"').strip("'")
    return normalized


def _normalize_endpoint_url(value: str | None, default_scheme: str = "https") -> str:
    raw_value = _resolve_env_alias(value)
    if not raw_value:
        return ""
    if raw_value.startswith("//"):
        return f"{default_scheme}:{raw_value}".rstrip("/")
    if raw_value.startswith("http://") or raw_value.startswith("https://"):
        return raw_value.rstrip("/")
    return f"{default_scheme}://{raw_value.lstrip('/')}".rstrip("/")


def _extract_domain(value: str) -> str:
    if not value:
        return ""
    parsed = urlparse(value if "://" in value else f"https://{value}")
    if parsed.netloc:
        return parsed.netloc.strip()
    return parsed.path.strip().strip("/")


def _ensure_media_url(value: str | None, default: str = "/media/") -> str:
    raw_value = str(value or "").strip()
    if not raw_value:
        raw_value = default
    if not raw_value:
        return ""
    if raw_value.startswith("http://") or raw_value.startswith("https://") or raw_value.startswith("//"):
        return f"{raw_value.rstrip('/')}/"
    normalized = f"/{raw_value.lstrip('/')}"
    return f"{normalized.rstrip('/')}/"


# Load environment variables from backend/.env if present (local dev convenience).
ENV_FILE = BASE_DIR / ".env"
if ENV_FILE.exists():
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        if not key:
            continue
        value = value.strip().strip('"').strip("'")
        if not os.environ.get(key):
            os.environ[key] = value


_DEFAULT_LOCAL_SECRET_KEY = (
    "django-insecure-k0%c#7_1bgsv=esr@@j05cle+u2n8vuktkp%y3_=tdosq(lk9&"
)
SECRET_KEY = os.getenv("SECRET_KEY", _DEFAULT_LOCAL_SECRET_KEY)

DEBUG = _env_flag("DEBUG", default=True)
USE_HTTPS = _env_flag("USE_HTTPS", default=not DEBUG)

if not DEBUG and SECRET_KEY == _DEFAULT_LOCAL_SECRET_KEY:
    raise ImproperlyConfigured(
        "SECRET_KEY environment variable must be set when DEBUG=False."
    )

ALLOWED_HOSTS = _split_csv_env("ALLOWED_HOSTS")
if DEBUG:
    ALLOWED_HOSTS.extend(["localhost", "127.0.0.1", "[::1]"])
ALLOWED_HOSTS = sorted(set(ALLOWED_HOSTS))
if not ALLOWED_HOSTS:
    if DEBUG:
        ALLOWED_HOSTS = ["localhost", "127.0.0.1", "[::1]"]
    else:
        raise ImproperlyConfigured(
            "ALLOWED_HOSTS must be set in production (comma-separated)."
        )

_raw_frontend_base_url = os.getenv("FRONTEND_BASE_URL", "").strip()
if _raw_frontend_base_url:
    FRONTEND_BASE_URL = _raw_frontend_base_url.rstrip("/")
elif DEBUG:
    FRONTEND_BASE_URL = "http://localhost:5173"
else:
    raise ImproperlyConfigured(
        "FRONTEND_BASE_URL must be set when DEBUG=False."
    )
frontend_origin = urlparse(FRONTEND_BASE_URL)


INSTALLED_APPS = [
    "daphne",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "channels",
    "backend.accounts",
    "backend.listings",
    "backend.payments",
    "backend.reports",
    "backend.public_api",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "backend.media_cache_middleware.MediaCacheControlMiddleware",
    "django.middleware.gzip.GZipMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "backend" / "email_templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "backend.wsgi.application"
ASGI_APPLICATION = "backend.asgi.application"

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}


DATABASES = {
    "default": {
        "ENGINE": os.getenv("DB_ENGINE", "django.db.backends.postgresql"),
        "NAME": os.getenv("DB_NAME", "postgres"),
        "USER": os.getenv("DB_USER", ""),
        "PASSWORD": os.getenv("DB_PASSWORD", ""),
        "HOST": os.getenv("DB_HOST", "localhost"),
        "PORT": os.getenv("DB_PORT", "5432"),
        "CONN_MAX_AGE": int(os.getenv("DATABASE_CONN_MAX_AGE", "600")),
    }
}

_db_sslmode = os.getenv("DB_SSLMODE", "").strip()
_db_sslrootcert = os.getenv("DB_SSLROOTCERT", "").strip()
if _db_sslmode or _db_sslrootcert:
    db_options = {}
    if _db_sslmode:
        db_options["sslmode"] = _db_sslmode
    if _db_sslrootcert:
        db_options["sslrootcert"] = _db_sslrootcert
    DATABASES["default"]["OPTIONS"] = db_options


AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True


STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

MEDIA_URL = _ensure_media_url(os.getenv("MEDIA_URL", "/media/"))
MEDIA_ROOT = BASE_DIR / "media"

MEDIA_STORAGE_BACKEND = str(os.getenv("MEDIA_STORAGE_BACKEND", "local") or "local").strip().lower()
if MEDIA_STORAGE_BACKEND == "spaces":
    INSTALLED_APPS.append("storages")

    spaces_key = _resolve_env_alias(
        os.getenv("DO_SPACES_KEY") or os.getenv("AWS_ACCESS_KEY_ID", "")
    )
    spaces_secret = _resolve_env_alias(
        os.getenv("DO_SPACES_SECRET") or os.getenv("AWS_SECRET_ACCESS_KEY", "")
    )
    spaces_bucket = _resolve_env_alias(
        os.getenv("DO_SPACES_BUCKET") or os.getenv("AWS_STORAGE_BUCKET_NAME", "")
    )
    spaces_region = _resolve_env_alias(
        os.getenv("DO_SPACES_REGION") or os.getenv("AWS_S3_REGION_NAME", "")
    )
    spaces_origin_endpoint = _normalize_endpoint_url(
        os.getenv("DO_SPACES_ENDPOINT") or os.getenv("AWS_S3_ENDPOINT_URL", "")
    )
    spaces_cdn_endpoint = _normalize_endpoint_url(
        os.getenv("DO_SPACES_CDN_ENDPOINT") or os.getenv("AWS_S3_CUSTOM_DOMAIN", "")
    )
    spaces_media_url_override = _ensure_media_url(
        _normalize_endpoint_url(os.getenv("DO_SPACES_MEDIA_URL", "")),
        default="",
    )
    spaces_location = str(
        os.getenv("DO_SPACES_LOCATION") or os.getenv("AWS_LOCATION", "")
    ).strip().strip("/")
    spaces_default_acl = str(
        os.getenv("DO_SPACES_DEFAULT_ACL", "public-read")
    ).strip()
    spaces_querystring_auth = _env_flag("DO_SPACES_QUERYSTRING_AUTH", default=False)
    spaces_file_overwrite = _env_flag("DO_SPACES_FILE_OVERWRITE", default=False)
    spaces_cache_control = str(
        os.getenv("DO_SPACES_CACHE_CONTROL", "public, max-age=31536000, immutable")
    ).strip()
    spaces_addressing_style = str(
        os.getenv("DO_SPACES_ADDRESSING_STYLE", "virtual")
    ).strip()

    missing_spaces_values = []
    if not spaces_key:
        missing_spaces_values.append("DO_SPACES_KEY")
    if not spaces_secret:
        missing_spaces_values.append("DO_SPACES_SECRET")
    if not spaces_bucket:
        missing_spaces_values.append("DO_SPACES_BUCKET")
    if not spaces_origin_endpoint:
        missing_spaces_values.append("DO_SPACES_ENDPOINT")

    if missing_spaces_values:
        raise ImproperlyConfigured(
            "MEDIA_STORAGE_BACKEND=spaces requires: "
            + ", ".join(missing_spaces_values)
        )

    spaces_custom_domain = _extract_domain(spaces_cdn_endpoint)
    if not spaces_custom_domain:
        origin_domain = _extract_domain(spaces_origin_endpoint)
        if origin_domain:
            if origin_domain.startswith(f"{spaces_bucket}."):
                spaces_custom_domain = origin_domain
            else:
                spaces_custom_domain = f"{spaces_bucket}.{origin_domain}"

    protocol_source = spaces_cdn_endpoint or spaces_origin_endpoint
    parsed_protocol_source = urlparse(protocol_source)
    spaces_url_scheme = parsed_protocol_source.scheme or "https"
    spaces_url_protocol = f"{spaces_url_scheme}:"

    spaces_storage_options = {
        "access_key": spaces_key,
        "secret_key": spaces_secret,
        "bucket_name": spaces_bucket,
        "endpoint_url": spaces_origin_endpoint,
        "querystring_auth": spaces_querystring_auth,
        "file_overwrite": spaces_file_overwrite,
        "default_acl": spaces_default_acl or None,
        "addressing_style": spaces_addressing_style or "virtual",
        "url_protocol": spaces_url_protocol,
    }
    if spaces_region:
        spaces_storage_options["region_name"] = spaces_region
    if spaces_location:
        spaces_storage_options["location"] = spaces_location
    if spaces_custom_domain:
        spaces_storage_options["custom_domain"] = spaces_custom_domain
    if spaces_cache_control:
        spaces_storage_options["object_parameters"] = {
            "CacheControl": spaces_cache_control,
        }

    STORAGES["default"] = {
        "BACKEND": "storages.backends.s3.S3Storage",
        "OPTIONS": spaces_storage_options,
    }

    if spaces_media_url_override:
        MEDIA_URL = spaces_media_url_override
    elif spaces_custom_domain:
        media_base = f"{spaces_url_scheme}://{spaces_custom_domain}"
        if spaces_location:
            MEDIA_URL = f"{media_base}/{spaces_location}/"
        else:
            MEDIA_URL = f"{media_base}/"
    else:
        MEDIA_URL = _ensure_media_url(MEDIA_URL)

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


LOCAL_FRONTEND_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "https://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:8000",
    "https://localhost:3000",
    "https://127.0.0.1:3000",
]

cors_origins = [FRONTEND_BASE_URL] + _split_csv_env("CORS_ALLOWED_ORIGINS")
if DEBUG:
    cors_origins.extend(LOCAL_FRONTEND_ORIGINS)
CORS_ALLOWED_ORIGINS = sorted(set(cors_origins))
CORS_ALLOWED_ORIGIN_REGEXES = _split_csv_env("CORS_ALLOWED_ORIGIN_REGEXES")
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = list(default_headers) + [
    "cache-control",
    "pragma",
]

csrf_origins = _split_csv_env("CSRF_TRUSTED_ORIGINS")
if frontend_origin.scheme and frontend_origin.netloc:
    csrf_origins.append(f"{frontend_origin.scheme}://{frontend_origin.netloc}")
if DEBUG:
    csrf_origins.extend(LOCAL_FRONTEND_ORIGINS)
CSRF_TRUSTED_ORIGINS = sorted(set(csrf_origins))


if USE_HTTPS:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = _env_flag("SECURE_SSL_REDIRECT", default=True)
    SESSION_COOKIE_SECURE = _env_flag("SESSION_COOKIE_SECURE", default=True)
    CSRF_COOKIE_SECURE = _env_flag("CSRF_COOKIE_SECURE", default=True)
    SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "31536000"))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = _env_flag(
        "SECURE_HSTS_INCLUDE_SUBDOMAINS",
        default=True,
    )
    SECURE_HSTS_PRELOAD = _env_flag("SECURE_HSTS_PRELOAD", default=True)
else:
    SECURE_SSL_REDIRECT = False
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False


REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}

JWT_REFRESH_COOKIE_NAME = os.getenv("JWT_REFRESH_COOKIE_NAME", "refreshToken")
JWT_REFRESH_COOKIE_PATH = os.getenv("JWT_REFRESH_COOKIE_PATH", "/api/auth/")
JWT_REFRESH_COOKIE_SAMESITE = _normalize_samesite(
    os.getenv("JWT_REFRESH_COOKIE_SAMESITE"),
    default="None" if USE_HTTPS else "Lax",
)
JWT_REFRESH_COOKIE_SECURE = os.getenv(
    "JWT_REFRESH_COOKIE_SECURE",
    "1" if USE_HTTPS else "0",
).lower() in ("1", "true", "yes")

if JWT_REFRESH_COOKIE_SAMESITE == "None" and not JWT_REFRESH_COOKIE_SECURE:
    if DEBUG:
        JWT_REFRESH_COOKIE_SAMESITE = "Lax"
    else:
        raise ImproperlyConfigured(
            "JWT refresh cookie with SameSite=None requires "
            "JWT_REFRESH_COOKIE_SECURE=True."
        )


RECAPTCHA_SITE_KEY = os.getenv("RECAPTCHA_SITE_KEY", "").strip()
RECAPTCHA_SECRET_KEY = os.getenv("RECAPTCHA_SECRET_KEY", "").strip()
RECAPTCHA_VERIFY_URL = (
    os.getenv("RECAPTCHA_VERIFY_URL", "https://www.google.com/recaptcha/api/siteverify").strip()
    or "https://www.google.com/recaptcha/api/siteverify"
)
RECAPTCHA_ENABLED = _env_flag("RECAPTCHA_ENABLED", default=False)
if RECAPTCHA_ENABLED and (not RECAPTCHA_SITE_KEY or not RECAPTCHA_SECRET_KEY):
    raise ImproperlyConfigured(
        "RECAPTCHA_ENABLED=True requires both RECAPTCHA_SITE_KEY and RECAPTCHA_SECRET_KEY."
    )


CAR_IMAGE_ASYNC_RENDITIONS = _env_flag("CAR_IMAGE_ASYNC_RENDITIONS", default=True)
try:
    CAR_IMAGE_RENDITION_WORKERS = max(1, int(os.getenv("CAR_IMAGE_RENDITION_WORKERS", "2")))
except (TypeError, ValueError):
    CAR_IMAGE_RENDITION_WORKERS = 2


CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "karbg-local-cache",
        "TIMEOUT": 300,
    }
}


STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
STRIPE_CURRENCY = os.getenv("STRIPE_CURRENCY", "EUR")
STRIPE_API_BASE = os.getenv("STRIPE_API_BASE", "https://api.stripe.com/v1")
STRIPE_TIMEOUT_SECONDS = int(os.getenv("STRIPE_TIMEOUT_SECONDS", "20"))
STRIPE_WEBHOOK_TOLERANCE_SECONDS = int(
    os.getenv("STRIPE_WEBHOOK_TOLERANCE_SECONDS", "300")
)
STRIPE_CHECKOUT_SUCCESS_URL = os.getenv(
    "STRIPE_CHECKOUT_SUCCESS_URL",
    f"{FRONTEND_BASE_URL}/?payment=success&session_id={{CHECKOUT_SESSION_ID}}",
)
STRIPE_CHECKOUT_CANCEL_URL = os.getenv(
    "STRIPE_CHECKOUT_CANCEL_URL",
    f"{FRONTEND_BASE_URL}/?payment=cancelled",
)


EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend",
)
EMAIL_HOST = _resolve_env_alias(os.getenv("EMAIL_HOST", ""))
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = _resolve_env_alias(os.getenv("EMAIL_HOST_USER", ""))
EMAIL_HOST_PASSWORD = _resolve_env_alias(os.getenv("EMAIL_HOST_PASSWORD", ""))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "1").lower() in ("1", "true", "yes")
DEFAULT_FROM_EMAIL = (
    _resolve_env_alias(os.getenv("DEFAULT_FROM_EMAIL", "")) or "no-reply@kar.bg"
)
SUPPORT_FROM_EMAIL = (
    _resolve_env_alias(os.getenv("SUPPORT_FROM_EMAIL", "")) or DEFAULT_FROM_EMAIL
)
ADMIN_REPLY_FROM_EMAIL = (
    _resolve_env_alias(os.getenv("ADMIN_REPLY_FROM_EMAIL", ""))
    or _resolve_env_alias(os.getenv("SUPPORT_FROM_EMAIL", ""))
    or DEFAULT_FROM_EMAIL
)
INVOICE_PDF_FONT_PATH = _resolve_env_alias(os.getenv("INVOICE_PDF_FONT_PATH", ""))

SUPPORT_INBOX_SYNC_ENABLED = _env_flag("SUPPORT_INBOX_SYNC_ENABLED", default=False)
SUPPORT_INBOX_IMAP_HOST = _resolve_env_alias(os.getenv("SUPPORT_INBOX_IMAP_HOST", ""))
if SUPPORT_INBOX_IMAP_HOST.lower().startswith("smtp."):
    SUPPORT_INBOX_IMAP_HOST = "imap." + SUPPORT_INBOX_IMAP_HOST[len("smtp."):]
try:
    SUPPORT_INBOX_IMAP_PORT = int(os.getenv("SUPPORT_INBOX_IMAP_PORT", "993"))
except (TypeError, ValueError):
    SUPPORT_INBOX_IMAP_PORT = 993
try:
    SUPPORT_INBOX_IMAP_TIMEOUT_SECONDS = int(os.getenv("SUPPORT_INBOX_IMAP_TIMEOUT_SECONDS", "12"))
except (TypeError, ValueError):
    SUPPORT_INBOX_IMAP_TIMEOUT_SECONDS = 12
SUPPORT_INBOX_IMAP_USE_SSL = os.getenv("SUPPORT_INBOX_IMAP_USE_SSL", "1").lower() in ("1", "true", "yes")
SUPPORT_INBOX_IMAP_USER = _resolve_env_alias(os.getenv("SUPPORT_INBOX_IMAP_USER", ""))
SUPPORT_INBOX_IMAP_PASSWORD = _resolve_env_alias(os.getenv("SUPPORT_INBOX_IMAP_PASSWORD", ""))
SUPPORT_INBOX_IMAP_MAILBOX = os.getenv("SUPPORT_INBOX_IMAP_MAILBOX", "INBOX")
SUPPORT_INBOX_ALLOW_SELF_REPLY = _env_flag("SUPPORT_INBOX_ALLOW_SELF_REPLY", default=False)
try:
    SUPPORT_INBOX_SYNC_MAX_MESSAGES = int(os.getenv("SUPPORT_INBOX_SYNC_MAX_MESSAGES", "100"))
except (TypeError, ValueError):
    SUPPORT_INBOX_SYNC_MAX_MESSAGES = 100
try:
    SUPPORT_INBOX_SYNC_MIN_INTERVAL_SECONDS = int(
        os.getenv("SUPPORT_INBOX_SYNC_MIN_INTERVAL_SECONDS", "20")
    )
except (TypeError, ValueError):
    SUPPORT_INBOX_SYNC_MIN_INTERVAL_SECONDS = 20


PASSWORD_RESET_COOLDOWN_SECONDS = int(
    os.getenv("PASSWORD_RESET_COOLDOWN_SECONDS", "60")
)
