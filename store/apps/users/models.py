import django.contrib.auth.models
import django.db.models
from django.utils.translation import gettext_lazy as _

import apps.users.email_normalizer

__all__ = ()

normalizer = apps.users.email_normalizer.EmailNormalizer()


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


@django.dispatch.receiver(
    django.db.models.signals.post_save,
    sender=UserModel,
)
def create_user_profile(sender, instance, created, **kwargs):
    if hasattr(instance, "email") and instance.email:
        instance.email = normalizer.normalize(
            instance.email,
        )
