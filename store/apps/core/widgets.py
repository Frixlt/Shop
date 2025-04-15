# --"--\Catalog\store\apps\core\widgets.py"--
import json
import django.forms.widgets
import django.template.loader
from django.utils.safestring import mark_safe
from django.utils.functional import Promise
from django.utils.encoding import force_str
from django.core.exceptions import ImproperlyConfigured


class TextInput(django.forms.widgets.TextInput):
    template_name = "widgets/text_input.html"
    label = None
    is_required = False

    def __init__(self, attrs=None, icon_class="fa-question"):
        attrs = attrs or {}
        attrs.setdefault("type", "text")
        super().__init__(attrs)
        self.icon_class = icon_class

    def get_context(self, name, value, attrs):
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
    template_name = "widgets/password_input.html"
    input_type = "password"

    def __init__(self, attrs=None, icon_class="fa-lock"):
        attrs = attrs or {}
        attrs.setdefault("type", "password")
        super().__init__(attrs=attrs, icon_class=icon_class)


class SelectInput(django.forms.widgets.Select):
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
        "countTitle": "Выбрано:",
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
        attrs = attrs or {}
        attrs["style"] = attrs.get("style", "") + "display: none;"
        attrs["class"] = attrs.get("class", "") + " django-select-input-native"
        # Важно: Вызываем super().__init__ *здесь*, до работы с self.attrs
        super().__init__(attrs=attrs)
        self.choices = choices

        # Объединяем конфигурации
        self.config = self.default_config.copy()
        if config:
            processed_config = {}
            for key, value in config.items():
                parts = key.split("_")
                camel_case_key = parts[0] + "".join(word.capitalize() for word in parts[1:])
                processed_config[camel_case_key] = value
            self.config.update(processed_config)

        # Валидация и корректировка min/max selections
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

        # Определяем, является ли выбор множественным
        self.allow_multiple_selected = max_sel > 1
        if self.allow_multiple_selected:
            self.attrs["multiple"] = "multiple"
        elif "multiple" in self.attrs:
            del self.attrs["multiple"]

        # Корректируем конфиг для single select
        if not self.allow_multiple_selected:
            self.config["minSelections"] = min(min_sel, 1)  # Убедимся, что min не больше 1
            self.config["autoDeselect"] = True
            self.config["indicatorShape"] = "circle"
            self.config["hideSelectedFromList"] = self.config.get("hideSelectedFromList", False)
            self.config["showSelected"] = False
            self.config["showCount"] = False
            self.config["layoutOrder"] = [i for i in self.config["layoutOrder"] if i not in ("selected", "count")]

        # --- НОВАЯ ПРОВЕРКА: required и minSelections ---
        # Эта проверка должна выполняться *после* того, как мы получили финальное
        # значение minSelections из self.config
        final_min_sel = self.config["minSelections"]
        # Атрибут required у самого виджета (не у поля формы!) может быть не задан явно,
        # он наследуется от поля формы в BaseForm. Поэтому проверять self.is_required здесь
        # еще рано. Вместо этого, мы будем проверять это противоречие в BaseForm.__init__
        # Однако, мы можем проверить, если minSelections == 0, но поле *является* multiple choice.
        # Это само по себе не ошибка, но может быть нелогично (хотя и допустимо).
        # Оставим основную проверку в BaseForm.
        # --- КОНЕЦ НОВОЙ ПРОВЕРКИ ---

    def _resolve_lazy_strings(self, data):
        if isinstance(data, dict):
            return {key: self._resolve_lazy_strings(value) for key, value in data.items()}
        elif isinstance(data, list):
            return [self._resolve_lazy_strings(item) for item in data]
        elif isinstance(data, Promise):
            return force_str(data)
        else:
            return data

    def build_attrs(self, base_attrs, extra_attrs=None):
        attrs = super().build_attrs(base_attrs, extra_attrs=extra_attrs)
        if "id" not in attrs and self.attrs.get("id"):
            attrs["id"] = self.attrs["id"]
        return attrs

    def get_context(self, name, value, attrs):
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
        widget_context["required_message_attr"] = self._resolve_lazy_strings(required_message_attr_value)

        if self.allow_multiple_selected:
            if not isinstance(widget_context["value"], (list, tuple, set)):
                widget_context["value"] = [widget_context["value"]] if widget_context["value"] is not None else []

        return context
