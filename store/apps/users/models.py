# --"--\Catalog\store\apps\users\models.py"--
import django.contrib.auth.models
import django.db.models
from django.utils.translation import gettext_lazy as _
import django.dispatch
import django.db.models.signals

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
    phone_number = django.db.models.CharField(
        _("Phone Number"),
        max_length=20,
        null=True,
        blank=True,
        help_text=_("User's contact phone number"),
    )
    city = django.db.models.CharField(
        _("City"),
        max_length=100,
        null=True,
        blank=True,
        help_text=_("User's city of residence"),
    )

    USER_EDITABLE_FIELDS = [
        "first_name",
        "last_name",
        "email",
        "phone_number",
        "city",
    ]

    class Meta:
        verbose_name = _("user")
        verbose_name_plural = _("users")


@django.dispatch.receiver(
    django.db.models.signals.pre_save,
    sender=UserModel,
)
def normalize_user_email(sender, instance, **kwargs):
    if hasattr(instance, "email") and instance.email:
        normalized = normalizer.normalize(instance.email)
        if normalized:
            instance.email = normalized
        else:
            print(f"Warning: Could not normalize email '{instance.email}' for user {instance.username}")
