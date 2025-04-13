from django import forms
from django.utils.safestring import mark_safe
import json

__all__ = (
    "TextInputWidget",
    "EmailInputWidget",
    "PasswordInputWidget",
    "TelInputWidget",
    "NumberInputWidget",
    "DateInputWidget",
    "SelectWidget",
    "TextareaWidget",
    "CheckboxWidget",
    "RadioGroupWidget",
    "FileInputWidget",
)


class BaseFormFieldWidget:
    def render_field_wrapper(self, name, input_html, label=None, required=False, errors=None):
        label_html = f'<label for="{name}">{label or name}</label>' if label else ""
        error_html = f'<div class="form-error" id="{name}-error">{errors}</div>' if errors else ""
        return mark_safe(
            f'<div class="form-field {"required" if required else ""}">{label_html}{input_html}{error_html}</div>'
        )


class SelectWidget(forms.Select, BaseFormFieldWidget):
    template_name = "core/widgets/select.html"

    def __init__(
        self,
        label=None,
        icon="fa-globe",
        choices=(),
        max_selections=1,
        placeholder="Выберите {remaining} {declension}",
        attrs=None,
        *args,
        **kwargs,
    ):
        self.label = label
        self.icon = icon
        self.max_selections = max_selections
        self.placeholder = placeholder
        super().__init__(choices=choices, attrs=attrs, *args, **kwargs)

    def render(self, name, value, attrs=None, renderer=None):
        # Получаем список опций из choices
        items = [{"value": str(val), "label": str(label)} for val, label in self.choices]

        # Конфигурация для CustomSelect
        select_config = {
            "items": items,
            "maxSelections": self.max_selections,
            "placeholder": self.placeholder,
            "placeholderAllSelected": "Выбрано максимальное количество",
            "focusOnOpen": True,
            "mode": "overlay",
            "icon": self.icon,
            "indicatorShape": "circle" if self.max_selections == 1 else "square",
            "autoDeselect": True if self.max_selections == 1 else False,
            "countTitle": "Выбрано:",
            "countTitleAllSelected": "Все выбрано (макс. {max}):",
            "selectedItemTextLength": 15,
            "autoCloseOnComplete": False,
            "layoutOrder": ["count", "selected", "search", "options"],
            "hideSelectedFromList": True,
            "declension": {
                "variable": "remaining",
                "rules": [
                    {"value": 1, "condition": "=", "form": "элемент"},
                    {"value": "2-4", "condition": "-", "form": "элемента"},
                    {"value": 5, "condition": ">=", "form": "элементов"},
                    {"value": 0, "condition": "=", "form": "элементов"},
                ],
            },
        }

        # Начальное значение
        initial_values = []
        if value:
            if isinstance(value, (list, tuple)):
                initial_values = [str(v) for v in value]
            else:
                initial_values = [str(value)]

        # Экранируем JSON безопасно
        config_json = json.dumps(select_config, ensure_ascii=False)
        initial_json = json.dumps(initial_values, ensure_ascii=False)

        # Формируем HTML
        select_id = attrs.get("id", f"id_{name}") if attrs else f"id_{name}"
        input_html = (
            f'<div id="{select_id}-custom-select" class="select" '
            f"data-config='{config_json}' "
            f"data-initial='{initial_json}'></div>"
            f'<input type="hidden" name="{name}" id="{select_id}" value="{",".join(initial_values)}">'
        )

        required = attrs.get("required", False) if attrs else self.attrs.get("required", False)
        errors = attrs.get("errors") if attrs else None
        return self.render_field_wrapper(name, input_html, self.label, required, errors)


class TextInputWidget(forms.TextInput, BaseFormFieldWidget):
    def __init__(self, label=None, icon_class=None, attrs=None, *args, **kwargs):
        self.label = label
        self.icon_class = icon_class
        super().__init__(attrs, *args, **kwargs)

    def render(self, name, value, attrs=None, renderer=None):
        input_html = super().render(name, value, attrs, renderer)
        required = attrs.get("required", False) if attrs else self.attrs.get("required", False)
        errors = attrs.get("errors") if attrs else None
        return self.render_field_wrapper(name, input_html, self.label, required, errors)


class EmailInputWidget(TextInputWidget):
    input_type = "email"


class PasswordInputWidget(TextInputWidget):
    input_type = "password"


class TelInputWidget(TextInputWidget):
    input_type = "tel"


class NumberInputWidget(TextInputWidget):
    input_type = "number"


class DateInputWidget(TextInputWidget):
    input_type = "date"


class TextareaWidget(forms.Textarea, BaseFormFieldWidget):
    def __init__(self, label=None, icon_class=None, attrs=None, *args, **kwargs):
        self.label = label
        self.icon_class = icon_class
        super().__init__(attrs, *args, **kwargs)

    def render(self, name, value, attrs=None, renderer=None):
        input_html = super().render(name, value, attrs, renderer)
        required = attrs.get("required", False) if attrs else self.attrs.get("required", False)
        errors = attrs.get("errors") if attrs else None
        return self.render_field_wrapper(name, input_html, self.label, required, errors)


class CheckboxWidget(forms.CheckboxInput, BaseFormFieldWidget):
    def __init__(self, label=None, wrapper_class=None, attrs=None, *args, **kwargs):
        self.label = label
        self.wrapper_class = wrapper_class
        super().__init__(attrs, *args, **kwargs)

    def render(self, name, value, attrs=None, renderer=None):
        input_html = super().render(name, value, attrs, renderer)
        required = attrs.get("required", False) if attrs else self.attrs.get("required", False)
        errors = attrs.get("errors") if attrs else None
        return self.render_field_wrapper(name, input_html, self.label, required, errors)


class RadioGroupWidget(forms.RadioSelect, BaseFormFieldWidget):
    def __init__(self, label=None, attrs=None, *args, **kwargs):
        self.label = label
        super().__init__(attrs, *args, **kwargs)

    def render(self, name, value, attrs=None, renderer=None):
        input_html = super().render(name, value, attrs, renderer)
        required = attrs.get("required", False) if attrs else self.attrs.get("required", False)
        errors = attrs.get("errors") if attrs else None
        return self.render_field_wrapper(name, input_html, self.label, required, errors)


class FileInputWidget(forms.FileInput, BaseFormFieldWidget):
    def __init__(self, label=None, placeholder=None, attrs=None, *args, **kwargs):
        self.label = label
        self.placeholder = placeholder
        super().__init__(attrs, *args, **kwargs)

    def render(self, name, value, attrs=None, renderer=None):
        input_html = super().render(name, value, attrs, renderer)
        required = attrs.get("required", False) if attrs else self.attrs.get("required", False)
        errors = attrs.get("errors") if attrs else None
        return self.render_field_wrapper(name, input_html, self.label, required, errors)
