# --"--\Catalog\store\apps\users\forms.py"--

import django.forms
from django.utils.safestring import mark_safe
from django.utils.translation import gettext_lazy as _

# Import BaseForm from the core app
from apps.core.forms import BaseForm

# Import custom widgets from the core app
import apps.core.widgets

__all__ = ("TestAuthForm",)


class TestAuthForm(BaseForm):
    """Test form demonstrating custom widgets with cross-field validation via BaseForm."""

    FRUIT_CHOICES = [
        ("", _("Choose a fruit...")),
        ("apple", _("Apple")),
        ("banana", _("Banana")),
        ("orange", _("Orange")),
        ("grape", _("Grape")),
        ("watermelon", _("Watermelon")),
        ("strawberry", _("Strawberry")),
        ("kiwi", _("Kiwi")),
        # Add more choices as needed
    ]

    # --- Field Definitions using Core Widgets ---

    username = django.forms.CharField(
        label=_("Username"),
        required=True,
        min_length=3,
        widget=apps.core.widgets.TextInput(
            attrs={
                "placeholder": _("Your name"),
                "data-min-length": 3,  # Client-side hint
                "data-required-message": _("Please enter a username."),
                "data-min-length-message": _("Username must be at least 3 characters long."),
            },
            icon_class="fa-user",
        ),
        error_messages={  # Server-side messages
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
                # Basic client-side pattern (server-side EmailField is more robust)
                "data-pattern": r".+@.+\..+",
                "data-required-message": _("Please enter an email address."),
                "data-email-message": _("Please enter a valid email address."),  # Used by JS for email type
                "data-pattern-error-message": _("Please enter a valid email address format."),  # Used by JS for pattern
            },
            icon_class="fa-envelope",
        ),
        error_messages={  # Server-side messages
            "required": _("Please enter an email address."),
            "invalid": _("Please enter a valid email address."),
        },
    )

    phone = django.forms.CharField(
        label=_("Phone"),
        required=False,  # PhoneValidator in BaseForm handles min digits if value exists
        widget=apps.core.widgets.TextInput(
            attrs={
                "placeholder": "+7 (999) 123-4567",
                # Simple client-side pattern hint (PhoneValidator is primary)
                "data-pattern": r"^\+?\d[\d\s\(\)-]{9,14}$",
                "maxlength": "18",  # Limit input length
                "data-phone-message": _(
                    "Please enter a valid phone number (e.g., +79991234567).",
                ),  # Used by JS for tel type
                "data-pattern-error-message": _("Please enter a valid phone number format."),  # Used by JS for pattern
            },
            icon_class="fa-phone-alt",
        ),
        error_messages={  # Server-side (less likely needed due to PhoneValidator)
            "invalid": _("Please enter a valid phone number."),
        },
    )

    password = django.forms.CharField(
        label=_("Password"),
        required=True,
        min_length=8,
        widget=apps.core.widgets.PasswordInput(
            attrs={
                "placeholder": _("Create a password"),
                "data-min-length": 8,  # Client-side hint
                "data-required-message": _("Please enter a password."),
                "data-min-length-message": _("Password must be at least 8 characters long."),
            },
            # icon_class defaults to fa-lock in PasswordInput
        ),
        error_messages={  # Server-side messages
            "required": _("Please enter a password."),
            "min_length": _("Password must be at least 8 characters long."),
        },
        help_text=_("Must contain at least 8 characters."),
    )

    confirm_password = django.forms.CharField(
        label=_("Confirm Password"),
        required=True,
        widget=apps.core.widgets.PasswordInput(
            attrs={
                "placeholder": _("Repeat your password"),
                "data-required-message": _("Please confirm your password."),
                # Links this field to 'password' for client & server validation
                "data-confirm-target": "id_password",
                # Specific message for mismatch, used by PasswordConfirmValidator
                "data-mismatch-message": _("Passwords do not match."),
            },
            icon_class="fa-shield-alt",  # Custom icon for confirm field
        ),
        error_messages={  # Server-side message for required check
            "required": _("Please confirm your password."),
            # Mismatch error is added dynamically in BaseForm.clean()
        },
    )

    favorite_fruits = django.forms.MultipleChoiceField(
        label=_("Favorite Fruits"),
        required=True,  # Field itself is required (must select at least minSelections)
        choices=FRUIT_CHOICES,
        widget=apps.core.widgets.SelectInput(
            config={
                "minSelections": 1,  # Enforces selection due to required=True
                "maxSelections": 3,
                "placeholder": _("Choose up to {maxSelections} fruits"),
                "placeholderAllSelected": _("Maximum {maxSelections} fruits selected"),
                "icon": "fa-lemon",
                "indicatorShape": "square",
                "autoDeselect": True,
                "searchable": True,
                "showCount": True,
                "showSelected": True,
                "layoutOrder": ["count", "selected", "search", "options"],
                "hideSelectedFromList": True,
                "stickySearch": True,
                "declension": {
                    "variable": "remaining",  # Use remaining count for declension
                    "rules": [
                        {"value": 1, "condition": "=", "form": _("fruit")},
                        {"value": "2-4", "condition": "-", "form": _("fruits (gen)")},  # Example genitive
                        {"value": 0, "condition": "=", "form": _("fruits (pl)")},  # Example plural
                        {"value": 5, "condition": ">=", "form": _("fruits (pl)")},
                    ],
                },
                # Specific message for client-side min selection feedback
                "minSelectionsMessage": _("Please select at least {min} fruit(s)."),
            },
            # No attrs needed unless overriding defaults
        ),
        error_messages={  # Server-side messages
            # Error if *no* selection is made and minSelections >= 1
            "required": _("Please select at least one fruit."),
            # Error if invalid value submitted
            "invalid_choice": _("Select a valid choice. %(value)s is not one of the available choices."),
            # MultiSelectValidator handles min/max errors based on widget config
        },
    )

    bio = django.forms.CharField(
        label=_("About You"),
        required=False,
        widget=apps.core.widgets.TextareaInput(
            attrs={
                "placeholder": _("Tell us a little about yourself..."),
                "rows": 4,
                "data-max-length": 500,  # Client-side hint
                "data-max-length-message": _("Bio cannot exceed 500 characters."),
            },
            icon_class="fa-feather-alt",
        ),
        max_length=500,  # Server-side validation
        help_text=_("Optional: Maximum 500 characters."),
    )

    terms_agreement = django.forms.BooleanField(
        label=mark_safe(  # Use mark_safe because the label contains HTML links
            _(
                'I accept the <a href="/terms" class="auth-link" target="_blank">terms of use</a> and '
                '<a href="/privacy" class="auth-link" target="_blank">privacy policy</a>',
            ),
        ),
        required=True,
        widget=apps.core.widgets.CheckboxInput(
            attrs={
                # Message for client-side required validation
                "data-required-message": _("You must accept the terms and conditions."),
            },
            # CheckboxInput automatically uses label from field
        ),
        error_messages={  # Server-side message if checkbox not checked
            "required": _("You must accept the terms and conditions."),
        },
    )

    uploaded_docs = django.forms.FileField(
        label=_("Upload Documents"),
        required=False,  # Set to False, validation logic handled by FileUploadValidator if needed
        widget=apps.core.widgets.FileInput(
            # Config passed to JS and used by FileUploadValidator in BaseForm.clean()
            config={
                "maxFileCount": 5,
                "maxFileSize": 5 * 1024 * 1024,  # 5MB in bytes
                "acceptedFormats": "image/jpeg, image/png, .pdf, .docx",  # For JS validation hint
                "sizeCalculationMode": 1,  # 1=per file, 2=total
            },
            attrs={
                # 'accept' attribute for the native file input's filtering
                "accept": (
                    "image/jpeg,image/png,.pdf,.doc,.docx,application/msword,"
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                ),
                # 'multiple' is added automatically by FileInput widget if maxFileCount > 1
            },
        ),
        help_text=_("Optional: Up to 5 files (JPG, PNG, PDF, DOCX), max 5MB each."),
        # File validation errors (count, size) are added dynamically in BaseForm.clean()
    )

    # --- Custom Clean Method for File Field ---
    # Although validation is in BaseForm, you might need this if using ModelForms
    # or if you need to specifically return the list of files.
    def clean_uploaded_docs(self):
        """
        Processes multiple uploaded files for the 'uploaded_docs' field.

        Returns:
            list: A list of UploadedFile objects, or an empty list if not required and no files uploaded.
                  Returns None if the field is required and no files were uploaded (letting Django handle required error).
        """  # noqa: E501 - Line too long
        # Use add_prefix for consistency if the form might have a prefix
        files = self.files.getlist(self.add_prefix("uploaded_docs"))

        # If the field is not required and no files were submitted, return an empty list
        if not self.fields["uploaded_docs"].required and not files:
            return []

        # If the field *is* required and no files were submitted, return None.
        # Django's default field validation will raise the 'required' error.
        # The FileUploadValidator in BaseForm handles count/size errors if files *are* present.
        if self.fields["uploaded_docs"].required and not files:
            return None  # Let Django handle 'required' validation

        # If files are present (required or not), return the list for further processing
        return files

    # No need for clean() method here for password confirmation or file validation
    # as it's handled centrally in BaseForm.clean()
