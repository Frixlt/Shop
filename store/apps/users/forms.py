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
                "type": "email",
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
        # Add explicit check for empty email after cleaning, although EmailField should handle it
        if not email:
            raise ValidationError(_("Email address cannot be empty."), code="required")
        return email

    def save(self, commit=True):
        # Ensure required fields are present before creating user
        if "email" not in self.cleaned_data or not self.cleaned_data["email"]:
            raise ValueError("Email is required to create a user.")
        if "username" not in self.cleaned_data or not self.cleaned_data["username"]:
            raise ValueError("Username is required to create a user.")
        if "password" not in self.cleaned_data or not self.cleaned_data["password"]:
            raise ValueError("Password is required to create a user.")

        # Prepare data, ensuring email is included
        user_data = {
            "username": self.cleaned_data["username"],
            "email": self.cleaned_data["email"],
            # Include other relevant fields if they exist in UserModel and RegisterForm
            "first_name": self.cleaned_data.get("first_name", ""),
            "last_name": self.cleaned_data.get("last_name", ""),
        }

        # --- DEBUG ---
        print(f"--- DEBUG (RegisterForm.save): Creating user with data: {user_data} ---")
        # --- END DEBUG ---

        user = UserModel(**user_data)
        user.set_password(self.cleaned_data["password"])
        if commit:
            user.save()
            print(f"--- DEBUG (RegisterForm.save): User {user.username} saved with email '{user.email}' ---")
        return user


class ProfileUpdateForm(BaseForm):
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
        required=True,  # Email is required for the user model
        widget=apps.core.widgets.TextInput(
            attrs={
                "placeholder": "your@email.com",
                "data-email-message": _("Please enter a valid email address."),
                "id": "id_profile_email",
                "type": "email",
                "data-required-message": _("Email address cannot be empty."),
            },
            icon_class="fa-envelope",
        ),
        error_messages={
            "invalid": _("Please enter a valid email address."),
            "required": _("Email address cannot be empty."),
        },
    )
    phone_number = django.forms.CharField(
        label=_("Phone Number"),
        required=False,
        widget=apps.core.widgets.TextInput(
            attrs={"placeholder": "+79XXXXXXXXX", "id": "id_profile_phone_number", "type": "tel"},
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

    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop("instance", None)
        # Get the field name being updated, passed from the view
        self.updating_field = kwargs.pop("updating_field", None)
        super().__init__(*args, **kwargs)

        if not self.user:
            raise ValueError("ProfileUpdateForm requires an 'instance' argument (the user).")

        # --- Logic to handle partial updates ---
        # If we know which field is being updated, remove others *from this form instance*
        # This prevents is_valid() from requiring data for fields not submitted
        if self.updating_field and self.updating_field in self.fields:
            fields_to_keep = [self.updating_field]
            # Include CSRF token if present in data (though usually handled by middleware)
            # if 'csrfmiddlewaretoken' in self.data:
            #     fields_to_keep.append('csrfmiddlewaretoken')
            fields_to_remove = [name for name in self.fields if name not in fields_to_keep]
            for field_name in fields_to_remove:
                del self.fields[field_name]
        else:
            # If updating_field isn't specified, assume a full update (less common via modal)
            # Filter based on USER_EDITABLE_FIELDS as before
            editable_fields = getattr(self.user, "USER_EDITABLE_FIELDS", [])
            fields_to_remove = [name for name in self.fields if name not in editable_fields]
            for field_name in fields_to_remove:
                del self.fields[field_name]

        # Ensure email field reflects its required status if it's still present
        if "email" in self.fields:
            self.fields["email"].required = True

        # Populate initial values for the fields remaining in the form
        for field_name in self.fields:
            self.fields[field_name].initial = getattr(self.user, field_name, None)

    def clean_email(self):
        email = self.cleaned_data.get("email")
        # Required check is implicitly handled by EmailField(required=True)
        if not email:
            # This might be redundant if required=True works as expected, but safe to keep
            raise ValidationError(_("Email address cannot be empty."), code="required")

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

        # Determine which fields were actually cleaned (present in the form and valid)
        fields_to_update = [name for name in self.cleaned_data if name in self.fields]

        if not fields_to_update:
            # No valid data submitted for the intended field(s)
            print("--- DEBUG (ProfileUpdateForm.save): No valid fields to update. ---")
            return self.user  # Return the unchanged user

        # Update the instance with cleaned data for the relevant fields
        for field_name in fields_to_update:
            setattr(self.user, field_name, self.cleaned_data[field_name])
            print(
                f"--- DEBUG (ProfileUpdateForm.save): Preparing to update '{field_name}' to"
                f" '{self.cleaned_data[field_name]}' ---"
            )

        if commit and fields_to_update:
            self.user.save(update_fields=fields_to_update)
            print(
                f"--- DEBUG (ProfileUpdateForm.save): Saved fields: {fields_to_update} for user"
                f" {self.user.username} ---"
            )
        elif not commit:
            print(f"--- DEBUG (ProfileUpdateForm.save): Commit is False, not saving fields: {fields_to_update} ---")

        return self.user
