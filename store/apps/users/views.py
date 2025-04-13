from django.contrib.auth import login
from django.shortcuts import redirect
from django.urls import reverse_lazy
from django.utils.translation import gettext_lazy as _
from django.views.generic import TemplateView
from .forms import LoginForm, RegisterForm
from .models import UserModel

__all__ = ("AuthorizeListView",)


class AuthorizeListView(TemplateView):
    template_name = "users/authorize.html"
    success_url = reverse_lazy("home")  # Замените на ваш URL после успешного входа/регистрации

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["login_form"] = LoginForm()
        context["register_form"] = RegisterForm()
        return context

    def post(self, request, *args, **kwargs):
        if "login-form" in request.POST:
            return self.handle_login(request)
        elif "register-form" in request.POST:
            return self.handle_register(request)
        return super().get(request, *args, **kwargs)

    def handle_login(self, request):
        form = LoginForm(request.POST)
        if form.is_valid():
            user = form.cleaned_data["user"]
            login(request, user, backend="django.contrib.auth.backends.ModelBackend")
            if form.cleaned_data["remember"]:
                request.session.set_expiry(1209600)  # 2 недели
            else:
                request.session.set_expiry(0)  # Сессия до закрытия браузера
            return redirect(self.success_url)
        return self.render_to_response(self.get_context_data(login_form=form, register_form=RegisterForm()))

    def handle_register(self, request):
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user, backend="django.contrib.auth.backends.ModelBackend")
            return redirect(self.success_url)
        return self.render_to_response(self.get_context_data(login_form=LoginForm(), register_form=form))
