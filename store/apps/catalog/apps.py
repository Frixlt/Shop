from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _

__all__ = ()


class CatalogConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.catalog"
    verbose_name = _("Catalog")
