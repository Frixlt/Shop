# --"--\Catalog\store\apps\users\forms.py"--
import django.core.exceptions
import django.forms
import apps.core.widgets  # Import the widgets module
from django.utils.translation import gettext_lazy as _


class BaseForm(django.forms.Form):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Get the auto_id format string for this form instance (e.g., 'id_%s')
        auto_id_format = self.auto_id

        for field_name, field in self.fields.items():
            widget = field.widget
            # Check if it's our custom widget or its subclass
            if isinstance(widget, (apps.core.widgets.TextInput, apps.core.widgets.PasswordInput)):
                # Assign label and required status to the widget instance
                widget.label = field.label
                widget.is_required = field.required

                # --- UPDATED: Calculate ID correctly ---
                # Check if auto_id generation is enabled for this form
                if auto_id_format and "%s" in auto_id_format:
                    # Construct the ID using the form's format and the field's name
                    calculated_id = auto_id_format % field_name
                    # Ensure the widget's attrs dictionary exists
                    if widget.attrs is None:
                        widget.attrs = {}
                    # Set the calculated ID in the widget's attributes
                    # This makes it available early, e.g., if the widget's __init__ needed it,
                    # and ensures it's passed to the template context.
                    widget.attrs["id"] = calculated_id
                # --- End UPDATED ---


class TestAuthForm(BaseForm):
    username = django.forms.CharField(
        label=_("Username"),
        required=True,
        min_length=3,
        widget=apps.core.widgets.TextInput(  # Use TextInput
            attrs={
                "placeholder": _("Your name"),
                "data-min-length": 3,
                "data-required-message": _("Please enter a username."),
                "data-min-length-message": _("Username must be at least 3 characters long."),
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
        widget=apps.core.widgets.TextInput(  # Use TextInput
            attrs={
                "placeholder": "your@email.com",
                "data-pattern": r"""(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])""",
                "data-required-message": _("Please enter an email address."),
                "data-email-message": _("Please enter a valid email address."),
                "data-pattern-error-message": _("Please enter a valid email address."),
            },
            icon_class="fa-envelope",
        ),
        error_messages={
            "required": _("Please enter an email address."),
            "invalid": _("Please enter a valid email address."),
        },
    )
    phone = django.forms.CharField(
        label=_("Phone"),
        required=False,
        widget=apps.core.widgets.TextInput(  # Use TextInput
            attrs={
                "placeholder": "+7 (999) 123-4567",
                "data-pattern": r"^\+?\d[\d\s\(\)-]{9,14}$",
                "maxlength": "18",
                "data-phone-message": _("Please enter a valid phone number (e.g., +79991234567)."),
                "data-pattern-error-message": _("Please enter a valid phone number format."),
            },
            icon_class="fa-phone-alt",
        ),
        error_messages={
            "invalid": _("Please enter a valid phone number."),
        },
    )

    password = django.forms.CharField(
        label=_("Password"),
        required=True,
        min_length=8,
        # The field's name is 'password', default form auto_id is 'id_%s', so ID will be 'id_password'
        widget=apps.core.widgets.PasswordInput(  # Use PasswordInput
            attrs={
                "placeholder": _("Create a password"),
                "data-min-length": 8,
                "data-required-message": _("Please enter a password."),
                "data-min-length-message": _("Password must be at least 8 characters long."),
            },
        ),
        error_messages={
            "required": _("Please enter a password."),
            "min_length": _("Password must be at least 8 characters long."),
        },
        help_text=_("Must contain at least 8 characters."),
    )

    confirm_password = django.forms.CharField(
        label=_("Confirm Password"),
        required=True,
        widget=apps.core.widgets.PasswordInput(  # Use PasswordInput
            attrs={
                "placeholder": _("Repeat your password"),
                "data-required-message": _("Please confirm your password."),
                # Link to the calculated ID of the 'password' field
                "data-confirm-target": "id_password",
                "data-mismatch-message": _("Passwords do not match."),
            },
            icon_class="fa-shield-alt",
        ),
        error_messages={
            "required": _("Please confirm your password."),
        },
    )

    # clean_phone remains the same
    def clean_phone(self):
        phone = self.cleaned_data.get("phone")
        if phone:
            cleaned_phone = "".join(d for d in phone if d.isdigit())
            if len(cleaned_phone) > 0 and len(cleaned_phone) < 10:
                raise django.core.exceptions.ValidationError(_("Phone number seems too short."), code="invalid_phone")
        return phone

    # clean_confirm_password remains the same
    def clean_confirm_password(self):
        password = self.cleaned_data.get("password")
        confirm_password = self.cleaned_data.get("confirm_password")
        if password and confirm_password and password != confirm_password:
            raise django.core.exceptions.ValidationError(_("Passwords do not match."), code="password_mismatch")
        return confirm_password

    # clean remains the same
    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get("password")
        # Example: Add complexity check here if needed
        # if password and ...
        return cleaned_data
