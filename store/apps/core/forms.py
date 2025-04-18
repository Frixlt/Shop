# --"--\Catalog\store\apps\core\forms.py"--

import django.forms
import django.forms.fields

# Import custom widgets and validators from the core app
from . import widgets
from . import validators  # Import the new validators module

__all__ = ("BaseForm",)


class BaseForm(django.forms.Form):
    """
    Base form to link custom widgets with field properties and apply common validators.

    This form automatically sets label, required status, and ID on custom widgets.
    It also attaches relevant validators based on widget type or field name:
    - PhoneValidator for fields named 'phone' using TextInput.
    - MultiSelectValidator for SelectInput based on its configuration.
    - PasswordConfirmValidator and FileUploadValidator are applied in the clean() method.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        auto_id_format = self.auto_id  # Get the auto_id setting (e.g., 'id_%s')

        for field_name, field in self.fields.items():
            widget = field.widget

            # Link field properties (label, required) to custom widgets
            if isinstance(
                widget,
                (
                    widgets.TextInput,
                    widgets.PasswordInput,
                    widgets.SelectInput,
                    widgets.CheckboxInput,
                    widgets.TextareaInput,
                    widgets.FileInput,
                ),
            ):
                widget.label = field.label
                widget.is_required = field.required

                # Ensure the widget's attrs has an ID matching Django's auto_id
                if auto_id_format and "%s" in auto_id_format:
                    widget.attrs = widget.attrs or {}
                    # Only set ID if not already present in attrs
                    widget.attrs.setdefault("id", auto_id_format % field_name)

                # Pass choices to SelectInput widget
                if isinstance(widget, widgets.SelectInput):
                    # Ensure field.choices is iterable before assigning
                    widget.choices = list(field.choices) if hasattr(field, "choices") else []

            # --- Attach Validators Based on Widget/Field Type ---

            # Add PhoneValidator for fields named 'phone' with TextInput
            if isinstance(widget, widgets.TextInput) and field_name == "phone":
                # Check if a PhoneValidator isn't already present
                if not any(isinstance(v, validators.PhoneValidator) for v in field.validators):
                    field.validators.append(validators.PhoneValidator())

            # Add MultiSelectValidator for SelectInput based on its config
            if isinstance(widget, widgets.SelectInput) and hasattr(widget, "config"):
                min_selections = widget.config.get("minSelections", 0)
                max_selections = widget.config.get("maxSelections", float("inf"))
                min_message = widget.config.get("minSelectionsMessage")  # Get specific message if provided

                # Add validator only if constraints exist
                if min_selections > 0 or max_selections < float("inf"):
                    # Check if a MultiSelectValidator isn't already present
                    if not any(isinstance(v, validators.MultiSelectValidator) for v in field.validators):
                        field.validators.append(
                            validators.MultiSelectValidator(
                                min_selections=min_selections,
                                max_selections=max_selections,
                                min_message=min_message,  # Pass message template
                            ),
                        )

    def clean(self):
        """Handles cross-field validation for password confirmation and file uploads."""
        cleaned_data = super().clean()

        # --- Password Confirmation Validation ---
        confirm_password_fields = {}  # Stores {password_field_name: confirm_field_name}
        for name, field in self.fields.items():
            widget = field.widget
            # Check if it's a PasswordInput with a confirmation target
            if isinstance(widget, widgets.PasswordInput):
                target_id = widget.attrs.get("data-confirm-target")
                if target_id:
                    # Derive target field name from target ID (assuming 'id_TARGETNAME')
                    target_name = target_id[3:] if target_id.startswith("id_") else None
                    if target_name and target_name in self.fields:
                        # Store the mapping: original password field -> confirmation field
                        confirm_password_fields[target_name] = name

        # Apply the PasswordConfirmValidator for each found pair
        for password_name, confirm_name in confirm_password_fields.items():
            confirm_widget = self.fields[confirm_name].widget
            mismatch_message = confirm_widget.attrs.get("data-mismatch-message")  # Get specific message
            validators.PasswordConfirmValidator(
                password_field_name=password_name,
                confirm_field_name=confirm_name,
                message=mismatch_message,  # Pass specific message to validator
            )(
                self
            )  # Call the validator instance with the form

        # --- File Upload Validation ---
        for name, field in self.fields.items():
            widget = field.widget
            # Check if it's a FileField with our custom FileInput widget that has config
            if (
                isinstance(field, django.forms.fields.FileField)
                and isinstance(widget, widgets.FileInput)
                and hasattr(widget, "config")
            ):
                # Apply the FileUploadValidator
                validators.FileUploadValidator(field_name=name, config=widget.config)(self)  # Call validator

        return cleaned_data  # noqa: R504 - Django convention returns cleaned_data
