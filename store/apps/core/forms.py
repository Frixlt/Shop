import django.forms
import django.forms.fields

from apps.core import validators, widgets

__all__ = ("BaseForm",)


class BaseForm(django.forms.Form):
    """
    Base form to link custom widgets with field properties and apply common validators.
    (Docstring unchanged)
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        auto_id_format = self.auto_id

        for field_name, field in self.fields.items():
            widget = field.widget

            # Ensure widget attrs has an ID BEFORE accessing it later
            widget_attrs = getattr(widget, "attrs", None)
            if widget_attrs is not None and auto_id_format and "%s" in auto_id_format:
                widget_attrs.setdefault("id", auto_id_format % field_name)

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
                # ID setting moved above to happen earlier

                if isinstance(widget, widgets.SelectInput):
                    widget.choices = list(field.choices) if hasattr(field, "choices") else []

            # --- Attach Validators ---
            if isinstance(widget, widgets.TextInput) and field_name == "phone":
                if not any(isinstance(v, validators.PhoneValidator) for v in field.validators):
                    field.validators.append(validators.PhoneValidator())

            if isinstance(widget, widgets.SelectInput) and hasattr(widget, "config"):
                min_selections = widget.config.get("minSelections", 0)
                max_selections = widget.config.get("maxSelections", float("inf"))
                min_message = widget.config.get("minSelectionsMessage")
                if min_selections > 0 or max_selections < float("inf"):
                    if not any(isinstance(v, validators.MultiSelectValidator) for v in field.validators):
                        field.validators.append(
                            validators.MultiSelectValidator(
                                min_selections=min_selections,
                                max_selections=max_selections,
                                min_message=min_message,
                            ),
                        )

    def clean(self):
        """Handles cross-field validation for password confirmation and file uploads."""
        cleaned_data = super().clean()

        # --- Password Confirmation Validation (REVISED LOGIC) ---
        # Check if both 'password' and 'confirm_password' fields exist in this form
        password_field_name = "password"  # Standard name for the main password
        confirm_field_name = "confirm_password"  # Standard name for confirmation

        if password_field_name in self.fields and confirm_field_name in self.fields:
            # Check if the confirm field's widget has the data-confirm-target attribute
            confirm_widget = self.fields[confirm_field_name].widget
            if isinstance(confirm_widget, widgets.PasswordInput) and confirm_widget.attrs.get(
                "data-confirm-target"
            ):  # Check if attribute exists

                mismatch_message = confirm_widget.attrs.get("data-mismatch-message")  # Get specific message
                # Call the validator with the explicitly known field names
                validators.PasswordConfirmValidator(
                    password_field_name=password_field_name,
                    confirm_field_name=confirm_field_name,
                    message=mismatch_message,
                )(
                    self,
                )  # Call the validator instance with the form

        # --- File Upload Validation ---
        for name, field in self.fields.items():
            widget = field.widget
            if (
                isinstance(field, django.forms.fields.FileField)
                and isinstance(widget, widgets.FileInput)
                and hasattr(widget, "config")
            ):
                validators.FileUploadValidator(field_name=name, config=widget.config)(self)

        return cleaned_data
