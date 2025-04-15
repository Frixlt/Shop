import pprint

import django.http
import django.shortcuts
import django.views.generic

import apps.users.forms

__all__ = ()


class AuthorizeView(django.views.generic.TemplateView):
    template_name = "users/authorize.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["form"] = apps.users.forms.TestAuthForm()
        return context

    def post(self, request, *args, **kwargs):
        form = apps.users.forms.TestAuthForm(request.POST)
        if form.is_valid():
            # --- ADDED PRINTING ---
            cleaned_data = form.cleaned_data
            print("-" * 40)
            print("Received Valid Form Data:")
            # Using pprint for potentially better readability if data gets complex
            pprint.pprint(cleaned_data)
            print("-" * 40)
            # --- END ADDED PRINTING ---

            return django.http.JsonResponse({"status": "success", "message": "Форма успешно отправлена!"})

        errors = {field: error for field, error in form.errors.items()}
        return django.http.JsonResponse({"status": "error", "errors": errors}, status=400)
