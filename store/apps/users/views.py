import django.http
import django.shortcuts
import django.views.generic
import apps.users.forms


class AuthorizeView(django.views.generic.TemplateView):
    template_name = "users/authorize.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["form"] = apps.users.forms.TestAuthForm()
        return context

    def post(self, request, *args, **kwargs):
        form = apps.users.forms.TestAuthForm(request.POST)
        if form.is_valid():
            return django.http.JsonResponse({"status": "success", "message": "Форма успешно отправлена!"})
        errors = {field: error for field, error in form.errors.items()}
        return django.http.JsonResponse({"status": "error", "errors": errors}, status=400)
