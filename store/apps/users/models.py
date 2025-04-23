# --"--\Catalog\store\apps\users\models.py"--
import django.contrib.auth.models
import django.db.models
from django.utils.translation import gettext_lazy as _
import django.dispatch  # Added for signals
import django.db.models.signals  # Added for signals

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
    avatar = django.db.models.ImageField(
        _("Avatar"),
        upload_to="avatars/",
        null=True,
        blank=True,
        help_text=_("User profile picture"),
    )
    birth_date = django.db.models.DateField(
        _("Birth Date"),
        null=True,
        blank=True,
        help_text=_("User's date of birth"),
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
    # Add other fields as needed based on the HTML example (e.g., gender)
    # gender = models.CharField(max_length=10, choices=[('male', _('Male')), ('female', _('Female')), ('other', _('Other'))], blank=True, null=True)

    # Define fields editable by the user themselves
    USER_EDITABLE_FIELDS = [
        "first_name",
        "last_name",
        "email",
        "avatar",
        "birth_date",
        "phone_number",
        "city",
        # 'gender',
    ]

    class Meta:
        verbose_name = _("user")
        verbose_name_plural = _("users")


@django.dispatch.receiver(
    django.db.models.signals.pre_save,  # Changed to pre_save for normalization before saving
    sender=UserModel,
)
def normalize_user_email(sender, instance, **kwargs):
    if hasattr(instance, "email") and instance.email:
        normalized = normalizer.normalize(instance.email)
        if normalized:
            instance.email = normalized
        else:
            # Handle invalid email format if normalization fails (optional)
            # You might want to raise a validation error here if using forms
            print(f"Warning: Could not normalize email '{instance.email}' for user {instance.username}")
            # Or set it to None if allowed: instance.email = None
