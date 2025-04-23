# --"--\Catalog\store\apps\users\forms.py"--
import django.contrib.auth
from django.core.exceptions import ValidationError
import django.forms
from django.utils.safestring import mark_safe
from django.utils.translation import gettext_lazy as _

from apps.core.forms import BaseForm
import apps.core.widgets

__all__ = ("LoginForm", "RegisterForm", "ProfileUpdateForm")


UserModel = django.contrib.auth.get_user_model()


class LoginForm(BaseForm):
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
            },
        ),
    )


class RegisterForm(BaseForm):
    """Form for user registration with uniqueness checks."""

    username = django.forms.CharField(
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
        },
    )

    email = django.forms.EmailField(
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
        },
    )

    password = django.forms.CharField(
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
        label=mark_safe(
            _(
                '<span class="checkbox-text">I accept the</span> '
                '<a href="/terms/" class="auth-link" target="_blank">terms of use</a> '
                '<span class="checkbox-text">and</span> '
                '<a href="/privacy/" class="auth-link" target="_blank">privacy policy</a>',
            ),
        ),
        required=True,
        widget=apps.core.widgets.CheckboxInput(
            attrs={
                "data-required-message": _("You must accept the terms and conditions."),
                "id": "id_register_terms",
            },
        ),
        error_messages={
            "required": _("You must accept the terms and privacy policy."),
        },
    )

    def clean_username(self):
        username = self.cleaned_data.get("username")
        if username and UserModel.objects.filter(username__iexact=username).exists():
            raise ValidationError(_("This username is already taken."), code="unique_username")

        return username

    def clean_email(self):
        email = self.cleaned_data.get("email")
        if email and UserModel.objects.filter(email__iexact=email).exists():
            raise ValidationError(_("This email address is already registered."), code="unique_email")

        return email

    def save(self, commit=True):
        # Exclude fields not in the UserModel before creating the instance
        user_data = {
            field: self.cleaned_data[field]
            for field in self.cleaned_data
            if field in [f.name for f in UserModel._meta.get_fields()] and field != "confirm_password"
        }
        user = UserModel(**user_data)
        user.set_password(self.cleaned_data["password"])
        if commit:
            user.save()

        return user


class ProfileUpdateForm(BaseForm):
    """
    Form for updating user profile fields.
    Fields are dynamically included based on UserModel.USER_EDITABLE_FIELDS.
    """

    # Define potential fields with widgets, even if not always shown
    first_name = django.forms.CharField(
        label=_("First Name"),
        required=False,
        widget=apps.core.widgets.TextInput(
            attrs={"placeholder": _("Your first name"), "id": "id_profile_first_name"},
            icon_class="fa-user",
        ),
    )
    last_name = django.forms.CharField(
        label=_("Last Name"),
        required=False,
        widget=apps.core.widgets.TextInput(
            attrs={"placeholder": _("Your last name"), "id": "id_profile_last_name"},
            icon_class="fa-user",
        ),
    )
    email = django.forms.EmailField(
        label=_("Email"),
        required=False,  # Email change might need verification, handle in view
        widget=apps.core.widgets.TextInput(
            attrs={
                "placeholder": "your@email.com",
                "data-email-message": _("Please enter a valid email address."),
                "id": "id_profile_email",
            },
            icon_class="fa-envelope",
        ),
        error_messages={"invalid": _("Please enter a valid email address.")},
    )
    birth_date = django.forms.DateField(
        label=_("Birth Date"),
        required=False,
        widget=django.forms.DateInput(
            attrs={"type": "date", "id": "id_profile_birth_date"}  # Use standard date input for simplicity
        ),
    )
    phone_number = django.forms.CharField(
        label=_("Phone Number"),
        required=False,
        widget=apps.core.widgets.TextInput(
            attrs={"placeholder": "+79XXXXXXXXX", "id": "id_profile_phone_number"},
            icon_class="fa-phone",
        ),
    )
    city = django.forms.CharField(
        label=_("City"),
        required=False,
        widget=apps.core.widgets.TextInput(
            attrs={"placeholder": _("Your city"), "id": "id_profile_city"},
            icon_class="fa-city",
        ),
    )
    avatar = django.forms.ImageField(
        label=_("Avatar"),
        required=False,
        widget=apps.core.widgets.FileInput(
            config={
                "max_file_count": 1,
                "max_file_size": 2 * 1024 * 1024,  # 2MB limit example
                "accepted_formats": "image/*",
            },
            attrs={"id": "id_profile_avatar"},
        ),
    )

    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop("instance", None)  # Get user instance
        super().__init__(*args, **kwargs)

        if not self.user:
            raise ValueError("ProfileUpdateForm requires an 'instance' argument (the user).")

        # Dynamically remove fields not listed as editable
        editable_fields = getattr(self.user, "USER_EDITABLE_FIELDS", [])
        fields_to_remove = [name for name in self.fields if name not in editable_fields]
        for field_name in fields_to_remove:
            del self.fields[field_name]

        # Set initial values from the user instance
        for field_name in self.fields:
            self.fields[field_name].initial = getattr(self.user, field_name, None)

    def clean_email(self):
        email = self.cleaned_data.get("email")
        # Check uniqueness only if the email has changed
        if email and self.user and email.lower() != self.user.email.lower():
            if UserModel.objects.filter(email__iexact=email).exclude(pk=self.user.pk).exists():
                raise ValidationError(
                    _("This email address is already registered by another user."), code="unique_email"
                )
        return email

    def save(self, commit=True):
        if not self.user:
            raise ValueError("Cannot save form without a user instance.")

        # Update user instance with cleaned data
        for field_name, value in self.cleaned_data.items():
            # Handle avatar separately to avoid clearing if no new file is uploaded
            if field_name == "avatar" and not value:
                continue  # Keep existing avatar if no new one provided
            setattr(self.user, field_name, value)

        if commit:
            self.user.save()
        return self.user
