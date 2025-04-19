# --"--\Catalog\store\apps\users\forms.py"--

import django.forms
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils.safestring import mark_safe
from django.utils.translation import gettext_lazy as _

from apps.core.forms import BaseForm
import apps.core.widgets

# from apps.users.email_normalizer import EmailNormalizer # Import if needed for cleaning

__all__ = ("LoginForm", "RegisterForm")

UserModel = get_user_model()
# normalizer = EmailNormalizer() # Initialize if normalizing email on clean


class LoginForm(BaseForm):
    # ... (LoginForm definition remains the same as in the previous response) ...
    identifier = django.forms.CharField(
        label=_("Username or Email"),
        required=True,
        widget=apps.core.widgets.TextInput(
            attrs={
                "placeholder": _("Enter your username or email"),
                "data-required-message": _("Please enter your username or email."),
                "autocomplete": "username",
                "id": "id_login_identifier",
            },
            icon_class="fa-user",
        ),
        error_messages={
            "required": _("Please enter your username or email."),
        },
    )
    password = django.forms.CharField(
        label=_("Password"),
        required=True,
        widget=apps.core.widgets.PasswordInput(
            attrs={
                "placeholder": "••••••••",
                "data-required-message": _("Please enter your password."),
                "autocomplete": "current-password",
                "id": "id_login_password",
            },
        ),
        error_messages={
            "required": _("Please enter your password."),
        },
    )
    remember_me = django.forms.BooleanField(
        label=_("Remember me"),
        required=False,
        widget=apps.core.widgets.CheckboxInput(
            attrs={
                "id": "id_login_remember_me",
            }
        ),
    )


class RegisterForm(BaseForm):
    """Form for user registration with uniqueness checks."""

    username = django.forms.CharField(
        # ... (label, required, min_length, validators remain the same) ...
        label=_("Username"),
        required=True,
        min_length=3,
        widget=apps.core.widgets.TextInput(
            attrs={
                "placeholder": _("Choose a unique username"),
                "data-min-length": 3,
                "data-required-message": _("Please enter a username."),
                "data-min-length-message": _("Username must be at least 3 characters long."),
                "autocomplete": "username",
                "id": "id_register_username",
            },
            icon_class="fa-user",
        ),
        error_messages={
            "required": _("Please enter a username."),
            "min_length": _("Username must be at least 3 characters long."),
            # 'unique' message handled by clean_username
        },
    )

    email = django.forms.EmailField(
        # ... (label, required remain the same) ...
        label=_("Email"),
        required=True,
        widget=apps.core.widgets.TextInput(
            attrs={
                "placeholder": "your@email.com",
                "data-pattern": r".+@.+\..+",
                "data-required-message": _("Please enter an email address."),
                "data-email-message": _("Please enter a valid email address."),
                "data-pattern-error-message": _("Please enter a valid email address format."),
                "autocomplete": "email",
                "id": "id_register_email",
            },
            icon_class="fa-envelope",
        ),
        error_messages={
            "required": _("Please enter an email address."),
            "invalid": _("Please enter a valid email address."),
            # 'unique' message handled by clean_email
        },
    )

    password = django.forms.CharField(
        # ... (definition remains the same) ...
        label=_("Password"),
        required=True,
        min_length=8,
        widget=apps.core.widgets.PasswordInput(
            attrs={
                "placeholder": _("Create a strong password"),
                "data-min-length": 8,
                "data-required-message": _("Please enter a password."),
                "data-min-length-message": _("Password must be at least 8 characters long."),
                "autocomplete": "new-password",
                "id": "id_register_password",
            },
        ),
        error_messages={
            "required": _("Please enter a password."),
            "min_length": _("Password must be at least 8 characters long."),
        },
        help_text=_("Minimum 8 characters."),
    )

    confirm_password = django.forms.CharField(
        # ... (definition remains the same) ...
        label=_("Confirm Password"),
        required=True,
        widget=apps.core.widgets.PasswordInput(
            attrs={
                "placeholder": _("Repeat your password"),
                "data-required-message": _("Please confirm your password."),
                "data-confirm-target": "id_register_password",
                "data-mismatch-message": _("Passwords do not match."),
                "autocomplete": "new-password",
                "id": "id_register_confirm_password",
            },
            icon_class="fa-shield-alt",
        ),
        error_messages={
            "required": _("Please confirm your password."),
        },
    )

    terms_agreement = django.forms.BooleanField(
        # ... (definition remains the same) ...
        label=mark_safe(
            _(
                '<span class="checkbox-text">I accept the</span> '
                '<a href="/terms/" class="auth-link" target="_blank">terms of use</a> '
                '<span class="checkbox-text">and</span> '
                '<a href="/privacy/" class="auth-link" target="_blank">privacy policy</a>'
            )
        ),
        required=True,
        widget=apps.core.widgets.CheckboxInput(
            attrs={
                "data-required-message": _("You must accept the terms and conditions."),
                "id": "id_register_terms",
            }
        ),
        error_messages={
            "required": _("You must accept the terms and privacy policy."),
        },
    )

    # *** ADD CLEAN METHODS FOR UNIQUENESS ***
    def clean_username(self):
        username = self.cleaned_data.get("username")
        if username and UserModel.objects.filter(username__iexact=username).exists():
            raise ValidationError(_("This username is already taken."), code="unique_username")
        return username

    def clean_email(self):
        email = self.cleaned_data.get("email")
        # Optional: Normalize email before checking uniqueness
        # normalized_email = normalizer.normalize(email) if email else None
        # if normalized_email and UserModel.objects.filter(email__iexact=normalized_email).exists():
        if email and UserModel.objects.filter(email__iexact=email).exists():
            raise ValidationError(_("This email address is already registered."), code="unique_email")
        # return normalized_email # Return normalized if using normalizer
        return email

    # BaseForm already handles password confirmation check in its clean()

    def save(self, commit=True):
        # Replicate UserCreationForm's save logic but use our cleaned data
        user = UserModel(**self.cleaned_data)
        user.set_password(self.cleaned_data["password"])
        if commit:
            user.save()
        return user
