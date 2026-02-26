"""
Django settings for backend project.
"""

import os
from datetime import timedelta
from pathlib import Path
from urllib.parse import urlparse

from django.core.exceptions import ImproperlyConfigured

try:
    import dj_database_url
except Exception:  # pragma: no cover - dependency check at runtime
    dj_database_url = None


BASE_DIR = Path(__file__).resolve().parent.parent


def _env_flag(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in ("1", "true", "yes", "on")


def _split_csv_env(name: str) -> list[str]:
    raw = os.getenv(name, "")
    return [item.strip() for item in raw.split(",") if item.strip()]


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

FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173").rstrip("/")
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


DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
if DATABASE_URL:
    if dj_database_url is None:
        raise ImproperlyConfigured(
            "DATABASE_URL is set but dj-database-url is not installed."
        )
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=int(os.getenv("DATABASE_CONN_MAX_AGE", "600")),
            ssl_require=_env_flag("DATABASE_SSL_REQUIRE", default=not DEBUG),
        )
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }


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

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


CORS_ALLOWED_ORIGINS = sorted(
    set(
        [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
	    "https://www.bwraap.com",
            FRONTEND_BASE_URL,
        ]
        + _split_csv_env("CORS_ALLOWED_ORIGINS")
    )
)
CORS_ALLOWED_ORIGIN_REGEXES = _split_csv_env("CORS_ALLOWED_ORIGIN_REGEXES")
CORS_ALLOW_CREDENTIALS = True

csrf_origins = _split_csv_env("CSRF_TRUSTED_ORIGINS")
if frontend_origin.scheme and frontend_origin.netloc:
    csrf_origins.append(f"{frontend_origin.scheme}://{frontend_origin.netloc}")
if DEBUG:
    csrf_origins.extend(["http://localhost:5173", "http://127.0.0.1:5173"])
CSRF_TRUSTED_ORIGINS = sorted(set(csrf_origins))


#if not DEBUG:
#    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
 #   SECURE_SSL_REDIRECT = _env_flag("SECURE_SSL_REDIRECT", default=True)
 #   SESSION_COOKIE_SECURE = True
 #   CSRF_COOKIE_SECURE = True
 #   SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "31536000"))
 #   SECURE_HSTS_INCLUDE_SUBDOMAINS = _env_flag(
 #       "SECURE_HSTS_INCLUDE_SUBDOMAINS",
 #       default=True,
 #   )
 #   SECURE_HSTS_PRELOAD = _env_flag("SECURE_HSTS_PRELOAD", default=True)


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
JWT_REFRESH_COOKIE_SAMESITE = os.getenv("JWT_REFRESH_COOKIE_SAMESITE", "Lax")
JWT_REFRESH_COOKIE_SECURE = os.getenv(
    "JWT_REFRESH_COOKIE_SECURE",
    "0" if DEBUG else "1",
).lower() in ("1", "true", "yes")

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
EMAIL_HOST = os.getenv("EMAIL_HOST", "")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "1").lower() in ("1", "true", "yes")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "no-reply@kar.bg")


PASSWORD_RESET_COOLDOWN_SECONDS = int(
    os.getenv("PASSWORD_RESET_COOLDOWN_SECONDS", "60")
)
