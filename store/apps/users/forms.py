import django.core.exceptions
import django.forms
from django.template.defaultfilters import filesizeformat
from django.utils.safestring import mark_safe
from django.utils.translation import gettext_lazy as _

import apps.core.widgets

__all__ = ()


class PhoneValidator:
    """Validator for phone numbers, ensuring a minimum number of digits."""

    def __init__(self, min_digits=10, message=None):
        self.min_digits = min_digits
        self.message = message or _("Phone number must contain at least {min} digits.").format(min=min_digits)

    def __call__(self, value):
        if value:
            cleaned_phone = "".join(digit for digit in value if digit.isdigit())
            if 0 < len(cleaned_phone) < self.min_digits:
                raise django.core.exceptions.ValidationError(
                    self.message,
                    code="invalid_phone",
                )


class PasswordConfirmValidator:
    """Validator to ensure two password fields match. Called from BaseForm.clean()."""

    def __init__(self, password_field_name, confirm_field_name, message=None):
        self.password_field_name = password_field_name
        self.confirm_field_name = confirm_field_name
        self.message = message or _("Passwords do not match.")

    def __call__(self, form):
        password = form.cleaned_data.get(self.password_field_name)
        confirm_password = form.cleaned_data.get(self.confirm_field_name)
        if password and confirm_password and password != confirm_password:
            form.add_error(
                self.confirm_field_name,
                django.core.exceptions.ValidationError(
                    self.message,
                    code="password_mismatch",
                ),
            )


class MultiSelectValidator:
    """Validator for multi-select fields, enforcing minimum and maximum selection constraints."""

    def __init__(self, min_selections, max_selections, min_message=None, max_message=None):
        self.min_selections = min_selections
        self.max_selections = max_selections
        self.min_message = min_message or _("Please select at least {min} item(s).").format(min=min_selections)
        self.max_message = max_message or _("Please select no more than {max} item(s).").format(max=max_selections)

    def __call__(self, value):
        if value:
            if self.min_selections > 0 and len(value) < self.min_selections:
                raise django.core.exceptions.ValidationError(
                    self.min_message,
                    code="min_selections",
                )

            if self.max_selections < float("inf") and len(value) > self.max_selections:
                raise django.core.exceptions.ValidationError(
                    self.max_message,
                    code="max_selections",
                )


class FileUploadValidator:
    """Validator for file uploads, enforcing file count and size constraints based on widget config."""

    def __init__(self, field_name, config):
        self.field_name = field_name
        self.config = config
        self.max_file_count = config.get("maxFileCount", 1)
        if not isinstance(self.max_file_count, int) or self.max_file_count <= 0:
            self.max_file_count = float("inf")

        self.max_file_size = config.get("maxFileSize", 0)
        self.size_calculation_mode = config.get("sizeCalculationMode", 1)
        self.max_count_message = config.get("max_count_message") or _(
            "You can upload a maximum of {count} file(s). You uploaded {uploaded}.",
        )
        self.max_size_message = config.get("max_size_message") or _(
            "File '{filename}' ({size}) exceeds the maximum size limit of {limit}.",
        )
        self.total_size_message = config.get("total_size_message") or _(
            "Total size of files ({total_size}) exceeds the maximum limit of {limit}.",
        )

    def __call__(self, form):
        files = form.files.getlist(self.field_name)
        if not files:
            return

        if self.max_file_count < float("inf") and len(files) > self.max_file_count:
            form.add_error(
                self.field_name,
                django.core.exceptions.ValidationError(
                    self.max_count_message.format(count=self.max_file_count, uploaded=len(files)),
                    code="max_count_exceeded",
                ),
            )
            return

        if self.max_file_size > 0:
            if self.size_calculation_mode == 1:  # Per file size check
                for file in files:
                    if file.size > self.max_file_size:
                        form.add_error(
                            self.field_name,
                            django.core.exceptions.ValidationError(
                                self.max_size_message.format(
                                    filename=file.name,
                                    size=filesizeformat(file.size),
                                    limit=filesizeformat(self.max_file_size),
                                ),
                                code="max_size_exceeded",
                            ),
                        )
            elif self.size_calculation_mode == 2:  # Total size check
                total_size = sum(file.size for file in files)
                if total_size > self.max_file_size:
                    form.add_error(
                        self.field_name,
                        django.core.exceptions.ValidationError(
                            self.total_size_message.format(
                                total_size=filesizeformat(total_size),
                                limit=filesizeformat(self.max_file_size),
                            ),
                            code="total_max_size_exceeded",
                        ),
                    )


class BaseForm(django.forms.Form):
    """Base form to link widgets with field properties and apply validators."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        auto_id_format = self.auto_id
        for field_name, field in self.fields.items():
            widget = field.widget
            if isinstance(
                widget,
                (
                    apps.core.widgets.TextInput,
                    apps.core.widgets.PasswordInput,
                    apps.core.widgets.SelectInput,
                    apps.core.widgets.CheckboxInput,
                    apps.core.widgets.TextareaInput,
                    apps.core.widgets.FileInput,
                ),
            ):
                widget.label = field.label
                widget.is_required = field.required
                if auto_id_format and "%s" in auto_id_format:
                    widget.attrs = widget.attrs or {}
                    widget.attrs["id"] = auto_id_format % field_name

                if isinstance(widget, apps.core.widgets.SelectInput):
                    widget.choices = field.choices

            if isinstance(widget, apps.core.widgets.TextInput) and field_name == "phone":
                field.validators.append(PhoneValidator())

            if isinstance(widget, apps.core.widgets.SelectInput) and hasattr(widget, "config"):
                min_selections = widget.config.get("minSelections", 0)
                max_selections = widget.config.get("maxSelections", float("inf"))
                min_message = widget.config.get("minSelectionsMessage")
                if min_selections > 0 or max_selections < float("inf"):
                    field.validators.append(
                        MultiSelectValidator(
                            min_selections=min_selections,
                            max_selections=max_selections,
                            min_message=min_message,
                        ),
                    )

    def clean(self):
        """Handles cross-field validation for password confirmation and file uploads."""
        cleaned_data = super().clean()
        confirm_password_fields = {}
        for name, field in self.fields.items():
            widget = field.widget
            if isinstance(widget, apps.core.widgets.PasswordInput):
                target_id = widget.attrs.get("data-confirm-target")
                if target_id:
                    target_name = target_id[3:] if target_id.startswith("id_") else None
                    if target_name and target_name in self.fields:
                        confirm_password_fields[target_name] = name

            if (
                isinstance(field, django.forms.FileField)
                and isinstance(widget, apps.core.widgets.FileInput)
                and hasattr(widget, "config")
            ):
                FileUploadValidator(field_name=name, config=widget.config)(self)

        for password_name, confirm_name in confirm_password_fields.items():
            confirm_widget = self.fields[confirm_name].widget
            mismatch_message = confirm_widget.attrs.get("data-mismatch-message")
            PasswordConfirmValidator(
                password_field_name=password_name,
                confirm_field_name=confirm_name,
                message=mismatch_message,
            )(self)

        return cleaned_data  # noqa: R504


class TestAuthForm(BaseForm):
    """Test form demonstrating custom widgets with cross-field validation."""

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
                "data-pattern": r".+@.+\..+",
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
        widget=apps.core.widgets.TextInput(
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
                "data-confirm-target": "id_password",
                "data-mismatch-message": _("Passwords do not match."),
            },
            icon_class="fa-shield-alt",
        ),
        error_messages={
            "required": _("Please confirm your password."),
        },
    )

    favorite_fruits = django.forms.MultipleChoiceField(
        label=_("Favorite Fruits"),
        required=True,
        choices=FRUIT_CHOICES,
        widget=apps.core.widgets.SelectInput(
            config={
                "minSelections": 1,
                "maxSelections": 3,
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
                "minSelectionsMessage": _("Please select at least {min} fruit(s)."),
            },
        ),
        error_messages={
            "required": _("Please select at least one fruit."),
            "invalid_choice": _("Select a valid choice. %(value)s is not one of the available choices."),
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
                'I accept the <a href="/terms" class="auth-link" target="_blank">terms of use</a> and '
                '<a href="/privacy" class="auth-link" target="_blank">privacy policy</a>',
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

    uploaded_docs = django.forms.FileField(
        label=_("Upload Documents"),
        required=False,
        widget=apps.core.widgets.FileInput(
            config={
                "maxFileCount": 5,
                "maxFileSize": 5 * 1024 * 1024,  # 5MB
                "acceptedFormats": "image/jpeg, image/png, .pdf, .docx",
                "sizeCalculationMode": 1,
            },
            attrs={
                "accept": (
                    "image/jpeg,image/png,.pdf,.doc,.docx,application/msword,"
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                ),
            },
        ),
        help_text=_("Optional: Up to 5 files (JPG, PNG, PDF, DOCX), max 5MB each."),
    )

    def clean_uploaded_docs(self):
        """Processes multiple uploaded files, returning a list. Validation handled by FileUploadValidator."""
        files = self.files.getlist(self.add_prefix("uploaded_docs"))
        if not self.fields["uploaded_docs"].required and not files:
            return []

        return files
