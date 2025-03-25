import django.apps
from django.utils.translation import gettext_lazy as _

__all__ = ()


class UsersConfig(django.apps.AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.users"
    verbose_name = _("Users")
