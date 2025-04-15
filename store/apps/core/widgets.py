# --"--\Catalog\store\apps\core\widgets.py"--
import django.forms.widgets
import django.template.loader
from django.utils.safestring import mark_safe


class TextInput(django.forms.widgets.TextInput):
    template_name = "widgets/text_input.html"
    label = None
    is_required = False

    def __init__(self, attrs=None, icon_class="fa-question"):
        # Ensure attrs is a dictionary if None is passed
        attrs = attrs or {}
        # Set default input type if not specified in attrs
        attrs.setdefault("type", "text")
        super().__init__(attrs)
        self.icon_class = icon_class
        # label и is_required будут установлены позже BaseForm

    def get_context(self, name, value, attrs):
        context = super().get_context(name, value, attrs)
        widget_context = context.setdefault("widget", {})

        # Читаем label и is_required ИЗ АТРИБУТОВ ЭКЗЕМПЛЯРА (self)
        widget_context["label"] = self.label
        widget_context["is_required"] = self.is_required
        widget_context["icon_class"] = self.icon_class

        # Убедимся, что ID точно есть в attrs контекста виджета
        final_attrs = widget_context.get("attrs", {})
        if "id" not in final_attrs and attrs and "id" in attrs:
            final_attrs["id"] = attrs["id"]
        elif "id" not in final_attrs:
            final_attrs["id"] = f"id_{name}"
        widget_context["attrs"] = final_attrs

        # --- Отладка ---
        # print(f"\n--- TextInput get_context for '{name}' ---")
        # print(f"  Instance label: {self.label}")
        # print(f"  Instance is_required: {self.is_required}")
        # print(f"  Context widget: {widget_context}")
        # print(f"--- END ---")

        return context


# --- NEW: PasswordInput Widget ---
class PasswordInput(TextInput):
    """
    Виджет для поля ввода пароля с иконкой замка и переключателем видимости.
    Наследуется от TextInput.
    """

    template_name = "widgets/password_input.html"
    input_type = "password"  # Django использует это для <input type="...">

    def __init__(self, attrs=None, icon_class="fa-lock"):
        # Устанавливаем input_type по умолчанию для PasswordInput
        attrs = attrs or {}
        attrs.setdefault("type", "password")  # Убедимся, что type='password'
        super().__init__(attrs=attrs, icon_class=icon_class)

    # get_context наследуется от TextInput и должен работать как есть,
    # так как он уже передает все необходимые атрибуты.
    # Убедимся, что тип поля правильно установлен в __init__.


# --- End NEW ---
