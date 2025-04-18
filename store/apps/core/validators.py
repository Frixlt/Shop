# --"--\Catalog\store\apps\core\validators.py"--

import django.core.exceptions
from django.template.defaultfilters import filesizeformat
from django.utils.translation import gettext_lazy as _

__all__ = (
    "PhoneValidator",
    "PasswordConfirmValidator",
    "MultiSelectValidator",
    "FileUploadValidator",
)


class PhoneValidator:
    """Validator for phone numbers, ensuring a minimum number of digits."""

    def __init__(self, min_digits=10, message=None):
        self.min_digits = min_digits
        self.message = message or _("Phone number must contain at least {min} digits.").format(min=self.min_digits)

    def __call__(self, value):
        if value:
            cleaned_phone = "".join(digit for digit in value if digit.isdigit())
            # Check only if there are *some* digits but fewer than required
            if 0 < len(cleaned_phone) < self.min_digits:
                raise django.core.exceptions.ValidationError(
                    self.message,
                    code="invalid_phone_length",  # More specific code
                )


class PasswordConfirmValidator:
    """
    Validator to ensure two password fields match.
    Intended to be called from a form's clean() method.
    """

    def __init__(self, password_field_name, confirm_field_name, message=None):
        self.password_field_name = password_field_name
        self.confirm_field_name = confirm_field_name
        self.message = message or _("Passwords do not match.")

    def __call__(self, form):
        """
        Applies the validation logic to the form instance.

        Args:
            form: The form instance being cleaned.
        """
        password = form.cleaned_data.get(self.password_field_name)
        confirm_password = form.cleaned_data.get(self.confirm_field_name)

        # Only compare if both fields have data (individual 'required' checks handle empty fields)
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
        self.min_message = min_message or _("Please select at least {min} item(s).").format(min=self.min_selections)
        self.max_message = max_message or _("Please select no more than {max} item(s).").format(max=self.max_selections)

    def __call__(self, value):
        """
        Applies validation logic to the selected values.

        Args:
            value: A list or queryset of selected values.
        """
        # Check only if a value is provided (required check is separate)
        if value:
            selected_count = len(value)

            if self.min_selections > 0 and selected_count < self.min_selections:
                raise django.core.exceptions.ValidationError(
                    self.min_message,
                    code="min_selections",
                )

            # Ensure max_selections is treated as infinity correctly
            if (
                self.max_selections is not None
                and self.max_selections < float("inf")
                and selected_count > self.max_selections
            ):
                raise django.core.exceptions.ValidationError(
                    self.max_message,
                    code="max_selections",
                )


class FileUploadValidator:
    """
    Validator for file uploads, enforcing file count and size constraints based on widget config.
    Intended to be called from a form's clean() method.
    """

    def __init__(self, field_name, config):
        """
        Args:
            field_name (str): The name of the file field in the form.
            config (dict): Configuration dictionary from the FileInput widget.
        """
        self.field_name = field_name
        self.config = config or {}  # Ensure config is a dict

        # Determine max file count, defaulting to infinity if invalid or not set
        max_count = self.config.get("maxFileCount", 1)
        if not isinstance(max_count, int) or max_count <= 0:
            self.max_file_count = float("inf")
        else:
            self.max_file_count = max_count

        self.max_file_size = self.config.get("maxFileSize", 0)  # Max size in bytes
        self.size_calculation_mode = self.config.get("sizeCalculationMode", 1)  # 1=per file, 2=total

        # Define error messages, allowing overrides from config
        self.max_count_message = self.config.get("max_count_message") or _(
            "You can upload a maximum of {count} file(s). You attempted to upload {uploaded}."
        )
        self.max_size_message = self.config.get("max_size_message") or _(
            "File '{filename}' ({size}) exceeds the maximum size limit of {limit}."
        )
        self.total_size_message = self.config.get("total_size_message") or _(
            "Total size of files ({total_size}) exceeds the maximum limit of {limit}."
        )

    def __call__(self, form):
        """
        Applies file validation logic to the form instance.

        Args:
            form: The form instance being cleaned.
        """
        # Use getlist to handle multiple files for the field
        files = form.files.getlist(self.field_name)

        # Skip validation if no files were uploaded for this field
        if not files:
            return

        # 1. Validate Max File Count
        if self.max_file_count < float("inf") and len(files) > self.max_file_count:
            form.add_error(
                self.field_name,
                django.core.exceptions.ValidationError(
                    self.max_count_message.format(count=self.max_file_count, uploaded=len(files)),
                    code="max_count_exceeded",
                ),
            )
            # Stop further file validation if count is exceeded
            return

        # 2. Validate File Sizes (Per File or Total)
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
                        # Continue checking other files even if one fails
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
