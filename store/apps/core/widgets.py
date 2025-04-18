import json

from django.core.exceptions import ImproperlyConfigured
import django.forms.widgets
from django.utils.encoding import force_str
from django.utils.functional import Promise
from django.utils.safestring import mark_safe

__all__ = ("TextInput", "PasswordInput", "SelectInput", "CheckboxInput", "TextareaInput", "FileInput")


class TextInput(django.forms.widgets.TextInput):
    """
    A custom text input widget with enhanced styling and client-side validation support.

    This widget renders a text input field with a customizable icon, label, and error handling.
    It integrates with JavaScript for real-time validation (e.g., pattern matching, required checks)
    and is styled via the associated template `widgets/text_input.html`.

    Attributes:
        template_name (str): Path to the template used for rendering (`widgets/text_input.html`).
        label (str, optional): The label text for the field, passed from the form field.
        is_required (bool): Indicates if the field is required, passed from the form field.
        icon_class (str): Font Awesome icon class to display next to the input (default: `fa-question`).

    Usage Example:
        ```python
        from apps.core.widgets import TextInput
        from django import forms

        class MyForm(forms.Form):
            name = forms.CharField(
                label="Your Name",
                required=True,
                widget=TextInput(
                    attrs={
                        "placeholder": "Enter your name",
                        "data-pattern": r"^[A-Za-z]+$",
                        "data-pattern-error-message": "Only letters and spaces allowed."
                    },
                    icon_class="fa-user"
                )
            )
        ```

    Template Context:
        - `widget.label`: The field's label.
        - `widget.is_required`: Boolean indicating if the field is required.
        - `widget.attrs.id`: The input's ID for label association and JS hooks.
        - `widget.type`: The input type (e.g., `text`, `email`, `tel`).
        - `widget.name`: The field's name for form submission.
        - `widget.value`: The current value of the field.
        - `widget.attrs`: HTML attributes for the input (e.g., `placeholder`, `data-*`).
        - `widget.icon_class`: The Font Awesome icon class.
        - `widget.errors`: Any Django validation errors for the field.

    JavaScript Integration:
        The widget expects JavaScript to handle client-side validation using `data-*` attributes
        such as `data-pattern`, `data-required-message`, etc. Ensure `init.js` is included
        to initialize these behaviors.

    Notes:
        - The widget automatically inherits `required` and `id` from the form field's configuration.
        - Use `data-pattern` for regex-based validation and provide a corresponding
          `data-pattern-error-message` for user feedback.
        - The `icon_class` should be a valid Font Awesome class (e.g., `fa-user`, `fa-envelope`).
    """

    template_name = "widgets/text_input.html"
    label = None
    is_required = False

    def __init__(self, attrs=None, icon_class="fa-question"):
        """
        Initialize the TextInput widget.

        Args:
            attrs (dict, optional): HTML attributes to apply to the input element.
                                   Common attributes include `placeholder`, `data-pattern`,
                                   `data-required-message`, etc.
            icon_class (str): Font Awesome icon class to display (default: `fa-question`).
        """
        attrs = attrs or {}
        attrs.setdefault("type", "text")
        super().__init__(attrs)
        self.icon_class = icon_class

    def get_context(self, name, value, attrs):
        """
        Prepare the context for rendering the widget's template.

        Args:
            name (str): The field name.
            value (str): The current value of the field.
            attrs (dict): HTML attributes for the input.

        Returns:
            dict: Context dictionary for the template.
        """
        context = super().get_context(name, value, attrs)
        widget_context = context.setdefault("widget", {})
        widget_context["label"] = getattr(self, "label", None)
        widget_context["is_required"] = getattr(self, "is_required", False)
        widget_context["icon_class"] = self.icon_class
        final_attrs = widget_context.get("attrs", {})
        if "id" not in final_attrs:
            final_attrs["id"] = attrs.get("id", f"id_{name}")

        widget_context["attrs"] = final_attrs
        return context


class PasswordInput(TextInput):
    """
    A custom password input widget with a visibility toggle and enhanced styling.

    Extends `TextInput` to provide a password field with a toggle icon to show/hide
    the password. It uses the `widgets/password_input.html` template and supports
    client-side validation similar to `TextInput`.

    Attributes:
        template_name (str): Path to the template (`widgets/password_input.html`).
        input_type (str): Fixed to `password`.
        label (str, optional): The label text for the field.
        is_required (bool): Indicates if the field is required.
        icon_class (str): Font Awesome icon class (default: `fa-lock`).

    Usage Example:
        ```python
        from apps.core.widgets import PasswordInput
        from django import forms

        class MyForm(forms.Form):
            password = forms.CharField(
                label="Password",
                required=True,
                widget=PasswordInput(
                    attrs={
                        "placeholder": "Enter your password",
                        "data-min-length": 8,
                        "data-min-length-message": "Password must be at least 8 characters."
                    },
                    icon_class="fa-lock"
                )
            )
        ```

    Template Context:
        Inherits all context from `TextInput`, plus:
        - `widget.type`: Set to `password`.
        - `widget.icon_class`: Typically `fa-lock` for password fields.
        - A password toggle icon (`fa-eye`) is added for visibility switching.

    JavaScript Integration:
        Requires JavaScript to handle the password visibility toggle (via `data-target`)
        and client-side validation. Ensure `init.js` is included.

    Notes:
        - The visibility toggle is implemented via an `<i>` element with class `password-toggle-icon`.
        - Use `data-confirm-target` to link to another password field for confirmation checks.
        - The widget automatically sets `type="password"` unless overridden in `attrs`.
    """

    template_name = "widgets/password_input.html"
    input_type = "password"

    def __init__(self, attrs=None, icon_class="fa-lock"):
        """
        Initialize the PasswordInput widget.

        Args:
            attrs (dict, optional): HTML attributes for the input element.
                                   Common attributes include `data-min-length`,
                                   `data-required-message`, `data-confirm-target`.
            icon_class (str): Font Awesome icon class (default: `fa-lock`).
        """
        attrs = attrs or {}
        attrs.setdefault("type", "password")
        super().__init__(attrs=attrs, icon_class=icon_class)


class SelectInput(django.forms.widgets.Select):
    """
    A custom select widget with advanced multi-select, search, and declension support.

    This widget provides a highly customizable dropdown or multi-select interface
    with features like search, selection limits, and dynamic placeholders.
    It uses the `widgets/select_input.html` template and relies on JavaScript
    for interactive behavior.

    Attributes:
        template_name (str): Path to the template (`widgets/select_input.html`).
        label (str, optional): The label text for the field.
        is_required (bool): Indicates if the field is required.
        default_config (dict): Default configuration for the widget's behavior.
        config (dict): Merged configuration (default + user-provided).
        choices (list): The choices for the select field, passed from the form field.
        allow_multiple_selected (bool): Whether multiple selections are allowed.

    Configuration Options (`config`):
        - `min_selections` (int): Minimum number of selections required (default: 0).
        - `max_selections` (int): Maximum number of selections allowed (default: 1).
        - `placeholder` (str): Placeholder text when no options are selected.
        - `placeholder_all_selected` (str): Text when all options are selected.
        - `icon` (str): Font Awesome icon class for the dropdown (e.g., `fa-angle-down`).
        - `indicator_shape` (str): Shape of selection indicators (`circle` or `square`).
        - `auto_deselect` (bool): Allow deselecting options (default: True).
        - `searchable` (bool): Enable search within options (default: True).
        - `show_count` (bool): Show selected count (default: False).
        - `show_selected` (bool): Show selected options in the header (default: False).
        - `layout_order` (list): Order of UI elements (`search`, `options`, `count`, `selected`).
        - `hide_selected_from_list` (bool): Hide selected options from the dropdown.
        - `sticky_search` (bool): Keep search input active after selection.
        - `declension` (dict): Rules for pluralizing text based on selection count.
        - `min_selections_message` (str): Error message for insufficient selections.

    Usage Example:
        ```python
        from apps.core.widgets import SelectInput
        from django import forms

        class MyForm(forms.Form):
            fruits = forms.MultipleChoiceField(
                label="Favorite Fruits",
                choices=[("apple", "Apple"), ("banana", "Banana")],
                widget=SelectInput(
                    config={
                        "min_selections": 1,
                        "max_selections": 3,
                        "searchable": True,
                        "icon": "fa-lemon",
                        "declension": {
                            "variable": "remaining",
                            "rules": [
                                {"value": 1, "condition": "=", "form": "fruit"},
                                {"value": "2-4", "condition": "-", "form": "fruits"}
                            ]
                        }
                    }
                )
            )
        ```

    Template Context:
        - `widget.label`: The field's label.
        - `widget.is_required`: Boolean indicating if the field is required.
        - `widget.attrs.id`: The native select's ID.
        - `widget.custom_widget_id`: ID for the custom select container.
        - `widget.native_select_id`: ID for the native select element.
        - `widget.config_json`: JSON-serialized configuration.
        - `widget.js_choices`: JSON-serialized list of choices.
        - `widget.value`: Current selected value(s).
        - `widget.allow_multiple_selected`: Boolean indicating multi-select support.

    JavaScript Integration:
        Requires `init.js` to initialize the custom select behavior, including search,
        selection limits, and dynamic updates. The `data-config` and `data-choices`
        attributes are used to pass configuration to JavaScript.

    Notes:
        - Set `max_selections > 1` to enable multi-select, which adds the `multiple` attribute.
        - The `declension` config supports dynamic text pluralization (e.g., "1 fruit", "2 fruits").
        - Ensure `min_selections` is at least 1 for required fields to avoid configuration errors.
        - The native `<select>` is hidden and managed by JavaScript, but remains functional
          for form submission.
    """

    template_name = "widgets/select_input.html"
    default_config = {
        "minSelections": 0,
        "maxSelections": 1,
        "placeholder": "Выберите...",
        "placeholderAllSelected": "Все выбрано",
        "focusOnOpen": True,
        "mode": "overlay",
        "icon": "fa-angle-down",
        "indicatorShape": "circle",
        "autoDeselect": True,
        "countTitle": "Выберано:",
        "countTitleAllSelected": "Выбрано (макс. {max}):",
        "selectedItemTextLength": 15,
        "autoCloseOnComplete": False,
        "layoutOrder": ["search", "options"],
        "hideSelectedFromList": True,
        "searchable": True,
        "showCount": False,
        "showSelected": False,
        "declension": None,
        "stickySearch": False,
        "minSelectionsMessage": "Выберите минимум {min} элемент(а/ов)",
    }

    def __init__(self, attrs=None, choices=(), config=None):
        """
        Initialize the SelectInput widget.

        Args:
            attrs (dict, optional): HTML attributes for the native select element.
            choices (list): Choices for the select field (passed from the form field).
            config (dict, optional): Configuration options to customize the widget's behavior.
        """
        attrs = attrs or {}
        attrs["style"] = attrs.get("style", "") + "display: none;"
        attrs["class"] = attrs.get("class", "") + " django-select-input-native"
        super().__init__(attrs=attrs)
        self.choices = choices

        self.config = self.default_config.copy()
        if config:
            processed_config = {}
            for key, value in config.items():
                parts = key.split("_")
                camel_case_key = parts[0] + "".join(word.capitalize() for word in parts[1:])
                processed_config[camel_case_key] = value

            self.config.update(processed_config)

        # Validate min/max selections
        min_sel = self.config.get("minSelections", 0)
        max_sel = self.config.get("maxSelections", 1)
        if min_sel < 0:
            min_sel = 0

        if max_sel < 1:
            max_sel = 1

        if min_sel > max_sel:
            min_sel = max_sel

        self.config["minSelections"] = min_sel
        self.config["maxSelections"] = max_sel

        # Check consistency between required and minSelections
        is_required = getattr(self, "is_required", False) or self.attrs.get("required", False)
        if is_required and min_sel < 1:
            raise ImproperlyConfigured(
                f"Field is marked as required (is_required={is_required}), but 'min_selections' is set to {min_sel}. "
                "For a required field, 'min_selections' must be at least 1.",
            )

        self.allow_multiple_selected = max_sel > 1
        if self.allow_multiple_selected:
            self.attrs["multiple"] = "multiple"
        elif "multiple" in self.attrs:
            del self.attrs["multiple"]

        if not self.allow_multiple_selected:
            self.config["minSelections"] = min(min_sel, 1)
            self.config["autoDeselect"] = True
            self.config["indicatorShape"] = "circle"
            self.config["hideSelectedFromList"] = self.config.get("hideSelectedFromList", False)
            self.config["showSelected"] = False
            self.config["showCount"] = False
            self.config["layoutOrder"] = [i for i in self.config["layoutOrder"] if i not in ("selected", "count")]

    def _resolve_lazy_strings(self, data):
        """
        Resolve Django lazy translation strings in configuration and choices.

        Args:
            data: The data structure to process (dict, list, or string).

        Returns:
            The processed data with lazy strings resolved.
        """
        if isinstance(data, dict):
            return {key: self._resolve_lazy_strings(value) for key, value in data.items()}

        if isinstance(data, list):
            return [self._resolve_lazy_strings(item) for item in data]

        if isinstance(data, Promise):
            return force_str(data)

        return data

    def build_attrs(self, base_attrs, extra_attrs=None):
        """
        Build the HTML attributes for the native select element.

        Args:
            base_attrs (dict): Base attributes from the widget.
            extra_attrs (dict, optional): Additional attributes to merge.

        Returns:
            dict: Combined attributes.
        """
        attrs = super().build_attrs(base_attrs, extra_attrs=extra_attrs)
        if "id" not in attrs and self.attrs.get("id"):
            attrs["id"] = self.attrs["id"]

        return attrs

    def get_context(self, name, value, attrs):
        """
        Prepare the context for rendering the widget's template.

        Args:
            name (str): The field name.
            value: The current value(s) of the field.
            attrs (dict): HTML attributes for the native select.

        Returns:
            dict: Context dictionary for the template.
        """
        context = super(django.forms.widgets.Select, self).get_context(name, value, attrs)
        widget_context = context["widget"]

        resolved_config = self._resolve_lazy_strings(self.config)
        resolved_choices = self._resolve_lazy_strings(list(self.choices))

        js_choices_list = [{"value": str(v), "label": str(l)} for v, l in resolved_choices if v not in ("", None)]

        if "minSelectionsMessage" not in resolved_config and "minSelectionsMessage" in self.config:
            resolved_config["minSelectionsMessage"] = self._resolve_lazy_strings(self.config["minSelectionsMessage"])

        widget_context["config"] = resolved_config
        widget_context["js_choices"] = json.dumps(js_choices_list)
        widget_context["config_json"] = json.dumps(resolved_config)

        widget_context["label"] = getattr(self, "label", None)
        widget_context["is_required"] = getattr(self, "is_required", False)

        native_select_id = widget_context["attrs"].get("id", f"id_{name}")
        widget_context["custom_widget_id"] = f"custom_{native_select_id}"
        widget_context["native_select_id"] = native_select_id

        required_message_attr_value = widget_context["attrs"].get("data-required-message")
        widget_context["required_message"] = self._resolve_lazy_strings(required_message_attr_value)

        if self.allow_multiple_selected:
            if not isinstance(widget_context["value"], (list, tuple, set)):
                widget_context["value"] = [widget_context["value"]] if widget_context["value"] is not None else []

        return context


class CheckboxInput(django.forms.widgets.CheckboxInput):
    """
    A custom checkbox widget with enhanced styling and error handling.

    This widget renders a checkbox with a custom visual representation, supporting
    labels with HTML content (e.g., links) and client-side validation.
    It uses the `widgets/checkbox_input.html` template.

    Attributes:
        template_name (str): Path to the template (`widgets/checkbox_input.html`).
        label (str, optional): The label text for the field, can include HTML.
        is_required (bool): Indicates if the field is required.

    Usage Example:
        ```python
        from apps.core.widgets import CheckboxInput
        from django import forms
        from django.utils.safestring import mark_safe

        class MyForm(forms.Form):
            terms = forms.BooleanField(
                label=mark_safe('I agree to the <a href="/terms">terms</a>'),
                required=True,
                widget=CheckboxInput(
                    attrs={
                        "data-required-message": "You must agree to the terms."
                    }
                )
            )
        ```

    Template Context:
        - `widget.label`: The field's label, marked safe for HTML rendering.
        - `widget.is_required`: Boolean indicating if the field is required.
        - `widget.attrs.id`: The checkbox's ID for label association and JS.
        - `widget.name`: The field's name for form submission.
        - `widget.value`: The current value (True/False).
        - `widget.check_test`: Boolean indicating if the checkbox is checked.
        - `widget.attrs`: HTML attributes (e.g., `data-required-message`).

    JavaScript Integration:
        Requires JavaScript to handle client-side validation and visual updates.
        Ensure `init.js` is included to initialize the checkbox behavior.

    Notes:
        - Use `mark_safe` for labels containing HTML (e.g., links) to ensure proper rendering.
        - The native checkbox is hidden, and a custom `<span>` is used for styling.
        - The `data-required-message` attribute is used for client-side error display.
    """

    template_name = "widgets/checkbox_input.html"
    label = None
    is_required = False

    def get_context(self, name, value, attrs):
        """
        Prepare the context for rendering the widget's template.

        Args:
            name (str): The field name.
            value: The current value of the checkbox.
            attrs (dict): HTML attributes for the checkbox.

        Returns:
            dict: Context dictionary for the template.
        """
        context = super().get_context(name, value, attrs)
        widget_context = context["widget"]

        widget_context["label"] = getattr(self, "label", None)
        widget_context["is_required"] = getattr(self, "is_required", False)

        final_attrs = widget_context.get("attrs", {})
        if "id" not in final_attrs:
            final_attrs["id"] = attrs.get("id", f"id_{name}")

        widget_context["attrs"] = final_attrs

        if isinstance(widget_context["label"], str) and (
            "<" in widget_context["label"] or ">" in widget_context["label"]
        ):
            widget_context["label"] = mark_safe(widget_context["label"])

        return context


class TextareaInput(django.forms.widgets.Textarea):
    """
    A custom textarea widget with enhanced styling and client-side validation.

    This widget renders a textarea field with a customizable icon, label, and
    error handling. It supports client-side validation (e.g., max length checks)
    and is styled via the `widgets/textarea_input.html` template.

    Attributes:
        template_name (str): Path to the template (`widgets/textarea_input.html`).
        label (str, optional): The label text for the field.
        is_required (bool): Indicates if the field is required.
        icon_class (str): Font Awesome icon class (default: `fa-comment-alt`).

    Usage Example:
        ```python
        from apps.core.widgets import TextareaInput
        from django import forms

        class MyForm(forms.Form):
            bio = forms.CharField(
                label="About You",
                required=False,
                max_length=500,
                widget=TextareaInput(
                    attrs={
                        "placeholder": "Tell us about yourself...",
                        "rows": 4,
                        "data-max-length": 500,
                        "data-max-length-message": "Bio cannot exceed 500 characters."
                    },
                    icon_class="fa-feather-alt"
                )
            )
        ```

    Template Context:
        - `widget.label`: The field's label.
        - `widget.is_required`: Boolean indicating if the field is required.
        - `widget.attrs.id`: The textarea's ID for label association and JS.
        - `widget.name`: The field's name for form submission.
        - `widget.value`: The current value of the field.
        - `widget.attrs`: HTML attributes (e.g., `placeholder`, `rows`, `data-*`).
        - `widget.icon_class`: The Font Awesome icon class.

    JavaScript Integration:
        Requires JavaScript to handle client-side validation (e.g., `data-max-length`).
        Ensure `init.js` is included to initialize these behaviors.

    Notes:
        - Use `data-max-length` and `data-max-length-message` for client-side length validation.
        - The `rows` and `cols` attributes can be set via `attrs` to control textarea size.
        - The `icon_class` is displayed to the left of the textarea.
    """

    template_name = "widgets/textarea_input.html"
    label = None
    is_required = False

    def __init__(self, attrs=None, icon_class="fa-comment-alt"):
        """
        Initialize the TextareaInput widget.

        Args:
            attrs (dict, optional): HTML attributes for the textarea element.
                                   Common attributes include `placeholder`, `rows`,
                                   `data-max-length`, `data-max-length-message`.
            icon_class (str): Font Awesome icon class (default: `fa-comment-alt`).
        """
        attrs = attrs or {}
        super().__init__(attrs)
        self.icon_class = icon_class

    def get_context(self, name, value, attrs):
        """
        Prepare the context for rendering the widget's template.

        Args:
            name (str): The field name.
            value (str): The current value of the field.
            attrs (dict): HTML attributes for the textarea.

        Returns:
            dict: Context dictionary for the template.
        """
        context = super().get_context(name, value, attrs)
        widget_context = context.setdefault("widget", {})
        widget_context["label"] = getattr(self, "label", None)
        widget_context["is_required"] = getattr(self, "is_required", False)
        widget_context["icon_class"] = self.icon_class
        final_attrs = widget_context.get("attrs", {})
        if "id" not in final_attrs:
            final_attrs["id"] = attrs.get("id", f"id_{name}")

        widget_context["attrs"] = final_attrs
        return context


class FileInput(django.forms.widgets.FileInput):
    """
    A custom file input widget with drag-and-drop support and file previews.

    This widget provides a modern file upload interface with drag-and-drop functionality,
    file previews, and client-side validation for file types, sizes, and counts.
    It uses the `widgets/file_input.html` template and relies on JavaScript
    (e.g., `FileUpload` class in `init.js`) for interactive behavior.

    Attributes:
        template_name (str): Path to the template (`widgets/file_input.html`).
        label (str, optional): The label text for the field.
        is_required (bool): Indicates if the field is required.
        default_config (dict): Default configuration for file upload behavior.
        config (dict): Merged configuration (default + user-provided).

    Configuration Options (`config`):
        - `accepted_formats` (str or list): Accepted file types (e.g., `image/*,.pdf` or `["image/png", ".docx"]`).
        - `max_file_size` (int): Maximum file size in bytes (default: 10MB).
        - `size_calculation_mode` (int): 1 for per-file size limit, 2 for total size limit (default: 1).
        - `max_file_count` (int): Maximum number of files allowed (default: 1).

    Usage Example:
        ```python
        from apps.core.widgets import FileInput
        from django import forms

        class MyForm(forms.Form):
            documents = forms.FileField(
                label="Upload Documents",
                required=False,
                widget=FileInput(
                    config={
                        "max_file_count": 5,
                        "max_file_size": 5 * 1024 * 1024,  # 5MB
                        "accepted_formats": "image/jpeg,image/png,.pdf",
                        "size_calculation_mode": 1
                    }
                )
            )
        ```

    Template Context:
        - `widget.label`: The field's label.
        - `widget.is_required`: Boolean indicating if the field is required.
        - `widget.attrs.id`: The native input's ID.
        - `widget.config_json`: JSON-serialized configuration.
        - `widget.container_id`: ID for the main container.
        - `widget.dropzone_id`: ID for the dropzone area.
        - `widget.preview_id`: ID for the file preview container.
        - `widget.error_id`: ID for error messages.
        - `widget.select_btn_id`: ID for the select button.
        - `widget.clear_btn_id`: ID for the clear button.
        - `widget.restrictions_id`: ID for file restrictions info.
        - `widget.allow_multiple_selected`: Boolean indicating if multiple files are allowed.

    JavaScript Integration:
        Requires `init.js` to initialize the `FileUpload` class, which handles
        drag-and-drop, file previews, and client-side validation. The `data-config`
        attribute passes configuration to JavaScript.

    Notes:
        - Set `max_file_count > 1` to enable multiple file uploads, which adds the `multiple` attribute.
        - The native `<input type="file">` is hidden but functional for form submission.
        - Use `accepted_formats` to restrict file types (e.g., `image/*` or specific MIME types).
        - File size validation is performed client-side and server-side (via form's `clean_` method).
    """

    template_name = "widgets/file_input.html"
    label = None
    is_required = False
    default_config = {
        "acceptedFormats": None,
        "maxFileSize": 10 * 1024 * 1024,
        "sizeCalculationMode": 1,
        "maxFileCount": 1,
    }

    def __init__(self, attrs=None, config=None):
        """
        Initialize the FileInput widget.

        Args:
            attrs (dict, optional): HTML attributes for the native file input.
            config (dict, optional): Configuration options for file upload behavior.
        """
        attrs = attrs or {}
        attrs["class"] = attrs.get("class", "") + " file-input"
        super().__init__(attrs=attrs)
        self.config = self.default_config.copy()
        if config:
            self.config.update(config)

        if self.config.get("maxFileCount", 1) > 1:
            self.attrs["multiple"] = "multiple"
        elif "multiple" in self.attrs:
            del self.attrs["multiple"]

    def _resolve_lazy_strings(self, data):
        """
        Resolve Django lazy translation strings in configuration.

        Args:
            data: The data structure to process (dict, list, or string).

        Returns:
            The processed data with lazy strings resolved.
        """
        if isinstance(data, dict):
            return {key: self._resolve_lazy_strings(value) for key, value in data.items()}

        if isinstance(data, list):
            return [self._resolve_lazy_strings(item) for item in data]

        if isinstance(data, Promise):
            return force_str(data)

        return data

    def get_context(self, name, value, attrs):
        """
        Prepare the context for rendering the widget's template.

        Args:
            name (str): The field name.
            value: The current value of the field (not typically used for file inputs).
            attrs (dict): HTML attributes for the native file input.

        Returns:
            dict: Context dictionary for the template.
        """
        context = super().get_context(name, value, attrs)
        widget_context = context.setdefault("widget", {})

        widget_context["label"] = getattr(self, "label", None)
        widget_context["is_required"] = getattr(self, "is_required", False)

        resolved_config = self._resolve_lazy_strings(self.config)
        widget_context["config_json"] = json.dumps(resolved_config)

        native_input_id = widget_context["attrs"].get("id", f"id_{name}")
        widget_context["container_id"] = f"{native_input_id}_container"
        widget_context["dropzone_id"] = f"{native_input_id}_dropzone"
        widget_context["preview_id"] = f"{native_input_id}_preview"
        widget_context["error_id"] = f"{native_input_id}_error"
        widget_context["select_btn_id"] = f"{native_input_id}_select_btn"
        widget_context["clear_btn_id"] = f"{native_input_id}_clear_btn"
        widget_context["restrictions_id"] = f"{native_input_id}_restrictions"

        widget_context["attrs"]["id"] = native_input_id
        widget_context["allow_multiple_selected"] = self.config.get("maxFileCount", 1) > 1

        return context
