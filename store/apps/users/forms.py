# --"--\Catalog\store\apps\users\forms.py"-- (COMPLETE - No changes needed from last version)
import django.core.exceptions
import django.forms
from django.utils.translation import gettext_lazy as _
from django.utils.safestring import mark_safe
from django.template.defaultfilters import filesizeformat  # Import filesizeformat

# Import all widgets from core
import apps.core.widgets

# Add FileInput if exporting widgets from this module specifically (optional)
__all__ = ()


class BaseForm(django.forms.Form):
    """
    Base form to automatically link widgets with field properties
    like label, required status, and ID.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        auto_id_format = self.auto_id
        for field_name, field in self.fields.items():
            widget = field.widget
            # Check if the widget is one of our custom ones
            if isinstance(
                widget,
                (
                    apps.core.widgets.TextInput,
                    apps.core.widgets.PasswordInput,
                    apps.core.widgets.SelectInput,
                    apps.core.widgets.CheckboxInput,
                    apps.core.widgets.TextareaInput,
                    apps.core.widgets.FileInput,  # Added FileInput
                ),
            ):
                # Pass field properties to the widget instance
                widget.label = field.label
                widget.is_required = field.required
                # Assign ID based on Django's auto_id
                if auto_id_format and "%s" in auto_id_format:
                    calculated_id = auto_id_format % field_name
                    if widget.attrs is None:
                        widget.attrs = {}
                    widget.attrs["id"] = calculated_id
                # Specific handling for SelectInput choices
                if isinstance(widget, apps.core.widgets.SelectInput):
                    widget.choices = field.choices


class TestAuthForm(BaseForm):
    """
    A comprehensive test form demonstrating various custom widgets.
    """

    username = django.forms.CharField(
        label=_("Username"),
        required=True,
        min_length=3,
        widget=apps.core.widgets.TextInput(
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
        widget=apps.core.widgets.TextInput(
            attrs={
                "placeholder": "your@email.com",
                # Using a simpler pattern, Django's EmailValidator handles stricter validation
                "data-pattern": r".+@.+\..+",
                "data-required-message": _("Please enter an email address."),
                "data-email-message": _("Please enter a valid email address."),
                "data-pattern-error-message": _("Please enter a valid email address."),
            },
            icon_class="fa-envelope",
        ),
        error_messages={
            "required": _("Please enter an email address."),
            "invalid": _("Please enter a valid email address."),  # Django's default validator message
        },
    )
    phone = django.forms.CharField(
        label=_("Phone"),
        required=False,
        widget=apps.core.widgets.TextInput(
            attrs={
                "placeholder": "+7 (999) 123-4567",
                "data-pattern": r"^\+?\d[\d\s\(\)-]{9,14}$",  # Example pattern
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
        widget=apps.core.widgets.PasswordInput(
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
        widget=apps.core.widgets.PasswordInput(
            attrs={
                "placeholder": _("Repeat your password"),
                "data-required-message": _("Please confirm your password."),
                "data-confirm-target": "id_password",  # ID of the main password field
                "data-mismatch-message": _("Passwords do not match."),
            },
            icon_class="fa-shield-alt",
        ),
        error_messages={
            "required": _("Please confirm your password."),
        },
    )

    FRUIT_CHOICES = [
        ("", _("Choose a fruit...")),
        ("apple", _("Apple")),
        ("banana", _("Banana")),
        ("orange", _("Orange")),
        ("grape", _("Grape")),
        ("watermelon", _("Watermelon")),
        ("strawberry", _("Strawberry")),
        ("kiwi", _("Kiwi")),
    ]

    favorite_fruits = django.forms.MultipleChoiceField(
        label=_("Favorite Fruits"),
        required=True,
        choices=FRUIT_CHOICES,
        widget=apps.core.widgets.SelectInput(
            config={
                "min_selections": 1,  # Field is required
                "max_selections": 3,
                "placeholder": _("Choose up to {maxSelections} fruits"),
                "placeholderAllSelected": _("Maximum {maxSelections} fruits selected"),
                "icon": "fa-lemon",
                "indicator_shape": "square",
                "auto_deselect": True,
                "searchable": True,
                "show_count": True,
                "show_selected": True,
                "layout_order": ["count", "selected", "search", "options"],
                "hide_selected_from_list": True,
                "sticky_search": True,
                "declension": {
                    "variable": "remaining",
                    "rules": [
                        {"value": 1, "condition": "=", "form": _("fruit")},
                        {"value": "2-4", "condition": "-", "form": _("fruits (gen)")},
                        {"value": 0, "condition": "=", "form": _("fruits (pl)")},
                        {"value": 5, "condition": ">=", "form": _("fruits (pl)")},
                    ],
                },
                "min_selections_message": _("Please select at least {min} fruit(s)."),
            },
        ),
        error_messages={
            "required": _("Please select at least one fruit."),
            # More specific errors handled in clean method
        },
    )

    bio = django.forms.CharField(
        label=_("About You"),
        required=False,
        widget=apps.core.widgets.TextareaInput(
            attrs={
                "placeholder": _("Tell us a little about yourself..."),
                "rows": 4,
                "data-max-length": 500,
                "data-max-length-message": _("Bio cannot exceed 500 characters."),
            },
            icon_class="fa-feather-alt",
        ),
        max_length=500,
        help_text=_("Optional: Maximum 500 characters."),
    )

    terms_agreement = django.forms.BooleanField(
        label=mark_safe(
            _(
                'I accept the <a href="/terms" class="auth-link" target="_blank">terms of use</a> and <a'
                ' href="/privacy" class="auth-link" target="_blank">privacy policy</a>',
            ),
        ),
        required=True,
        widget=apps.core.widgets.CheckboxInput(
            attrs={
                "data-required-message": _("You must accept the terms and conditions."),
            },
        ),
        error_messages={
            "required": _("You must accept the terms and conditions."),
        },
    )

    # File Upload Field
    uploaded_docs = django.forms.FileField(
        label=_("Upload Documents"),
        required=False,  # Set to True if needed
        widget=apps.core.widgets.FileInput(
            config={
                "maxFileCount": 5,
                "maxFileSize": 5 * 1024 * 1024,  # 5MB in bytes
                "acceptedFormats": "image/jpeg, image/png, .pdf, .docx",
                "sizeCalculationMode": 1,  # 1: per file, 2: total
            },
            # Add required attribute to widget attrs if field is required
            # attrs={'required': 'required'}
        ),
        help_text=_("Optional: Up to 5 files (JPG, PNG, PDF, DOCX), max 5MB each."),
    )

    # --- Clean Methods ---

    def clean_phone(self):
        """Example specific field validation for phone"""
        phone = self.cleaned_data.get("phone")
        if phone:
            cleaned_phone = "".join(digit for digit in phone if digit.isdigit())
            if len(cleaned_phone) > 0 and len(cleaned_phone) < 10:
                raise django.core.exceptions.ValidationError(
                    _("Phone number seems too short."),
                    code="invalid_phone",
                )
        return phone

    def clean_confirm_password(self):
        """Validate that passwords match"""
        password = self.cleaned_data.get("password")
        confirm_password = self.cleaned_data.get("confirm_password")
        if password and confirm_password and password != confirm_password:
            raise django.core.exceptions.ValidationError(
                _("Passwords do not match."),
                code="password_mismatch",
            )
        return confirm_password

    def clean_favorite_fruits(self):
        """Validate multi-select constraints"""
        fruits = self.cleaned_data.get("favorite_fruits")
        if fruits:
            widget_config = self.fields["favorite_fruits"].widget.config
            min_fruits = widget_config.get("minSelections", 0)
            max_fruits = widget_config.get("maxSelections", 1)
            if len(fruits) < min_fruits:
                min_msg = widget_config.get("minSelectionsMessage", _("Please select at least {min} fruit(s)."))
                raise django.core.exceptions.ValidationError(min_msg.format(min=min_fruits))
            elif len(fruits) > max_fruits:
                raise django.core.exceptions.ValidationError(
                    _("Please select no more than {count} fruits.").format(count=max_fruits)
                )
        return fruits

    def clean_uploaded_docs(self):
        """
        Validate uploaded files based on widget configuration using self.files.
        """
        files = self.files.getlist("uploaded_docs")  # Access files via form.files
        field = self.fields["uploaded_docs"]
        widget = field.widget
        config = widget.config if hasattr(widget, "config") else {}

        max_size = config.get("maxFileSize", 0)
        max_count = config.get("maxFileCount", 1)
        size_mode = config.get("sizeCalculationMode", 1)

        # Check max file count
        if len(files) > max_count:
            raise django.core.exceptions.ValidationError(
                _("You can upload a maximum of {count} file(s). You uploaded {uploaded}.").format(
                    count=max_count, uploaded=len(files)
                ),
                code="max_count_exceeded",
            )

        # Check individual file sizes (Mode 1)
        if size_mode == 1:
            for file in files:
                if max_size > 0 and file.size > max_size:
                    raise django.core.exceptions.ValidationError(
                        _("File '{filename}' ({size}) exceeds the maximum size limit of {limit}.").format(
                            filename=file.name, size=filesizeformat(file.size), limit=filesizeformat(max_size)
                        ),
                        code="max_size_exceeded",
                    )
        # Check total file size (Mode 2)
        elif size_mode == 2:
            total_size = sum(file.size for file in files)
            if max_size > 0 and total_size > max_size:
                raise django.core.exceptions.ValidationError(
                    _("Total size of files ({total_size}) exceeds the maximum limit of {limit}.").format(
                        total_size=filesizeformat(total_size), limit=filesizeformat(max_size)
                    ),
                    code="total_max_size_exceeded",
                )

        # NOTE: Returning None is correct here. Files are handled via self.files / request.FILES.
        return files

    def clean(self):
        """General form clean method"""
        cleaned_data = super().clean()
        # Add any cross-field validation if needed here
        return cleaned_data
