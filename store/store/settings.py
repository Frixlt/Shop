import pathlib

import decouple
from django.utils.translation import gettext_lazy as _

BASE_DIR = pathlib.Path(__file__).resolve().parent.parent


SECRET_KEY = decouple.config(
    "DJANGO_SECRET_KEY",
    default="SECRET_KEY",
)

DEBUG = decouple.config(
    "DJANGO_DEBUG",
    default=False,
    cast=bool,
)

DEFAULT_USER_IS_ACTIVE = decouple.config(
    "DJANGO_DEFAULT_USER_IS_ACTIVE",
    default=False,
    cast=bool,
)

ALLOWED_HOSTS = decouple.config(
    "DJANGO_ALLOWED_HOSTS",
    default="*",
    cast=decouple.Csv(),
)

INSTALLED_APPS = [
    # Custom applications
    "apps.catalog.apps.CatalogConfig",
    "apps.core.apps.CoreConfig",
    "apps.users.apps.UsersConfig",
    # Native Django applications # noqa: CM001
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.forms",
    # External applications
    "sorl.thumbnail",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "django.middleware.locale.LocaleMiddleware",
]


if DEBUG:
    MIDDLEWARE.append(
        "debug_toolbar.middleware.DebugToolbarMiddleware",
    )
    INSTALLED_APPS.append(
        "debug_toolbar",
    )

    INTERNAL_IPS = [
        "127.0.0.1",
    ]


ROOT_URLCONF = "store.urls"

TEMPLATES_DIR = [BASE_DIR / "templates/"]

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": TEMPLATES_DIR,
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                # Custom applications
                # Native Django applications # noqa: CM001
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "django.template.context_processors.i18n",
            ],
        },
    },
]


AUTH_USER_MODEL = "users.UserModel"


FORM_RENDERER = "django.forms.renderers.TemplatesSetting"


WSGI_APPLICATION = "store.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    },
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


LANGUAGE_CODE = "ru-ru"

LANGUAGES = [
    ("ru-ru", _("Russian")),
    ("en-us", _("English")),
]

TIME_ZONE = "UTC"

USE_I18N = True

USE_L10N = True

USE_TZ = True

LOCALE_PATHS = [BASE_DIR / "locale/"]


STATIC_URL = "static/"

STATICFILES_DIRS = [BASE_DIR / "static_dev"]

STATIC_ROOT = BASE_DIR / "static"


MEDIA_ROOT = BASE_DIR / "media/"

MEDIA_URL = "media/"


DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


EMAIL_BACKEND = "django.core.mail.backends.filebased.EmailBackend"

EMAIL_FILE_PATH = BASE_DIR / "send_mail"

SPAM_EMAIL = decouple.config("DJANGO_MAIL", default="your_email@ya.ru")
