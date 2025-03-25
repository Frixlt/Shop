import django.contrib.auth.models
import django.db.models
from django.utils.translation import gettext_lazy as _


__all__ = ()


class UserModel(django.contrib.auth.models.AbstractUser):
    email = django.db.models.EmailField(
        _("email address"),
        unique=True,
        null=False,
        blank=False,
        help_text=_("Unique email address"),
    )

    class Meta:
        verbose_name = _("user")
        verbose_name_plural = _("users")
