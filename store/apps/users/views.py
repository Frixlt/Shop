# --"--\Catalog\store\apps\users\views.py"--
import django.contrib.auth
import django.contrib.messages
from django.shortcuts import redirect, render
from django.urls import reverse
from django.utils.http import url_has_allowed_host_and_scheme
from django.utils.translation import gettext as _
from django.views import View

from apps.users.forms import LoginForm, RegisterForm

__all__ = ("AuthorizeView",)


class AuthorizeView(View):
    template_name = "users/authorize.html"
    login_form_class = LoginForm
    register_form_class = RegisterForm
    success_url_name = "catalog:item-list"

    def get_success_url(self, request):
        next_url = request.POST.get("next", request.GET.get("next"))
        is_safe = url_has_allowed_host_and_scheme(
            url=next_url,
            allowed_hosts={request.get_host()},
            require_https=request.is_secure(),
        )
        if next_url and is_safe:
            return next_url
        try:
            return reverse(self.success_url_name)
        except Exception as e:
            print(f"Error reversing success URL '{self.success_url_name}': {e}")
            return "/"

    def get(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            return redirect(self.get_success_url(request))

        login_form = self.login_form_class()
        register_form = self.register_form_class()
        next_url = request.GET.get("next")
        active_form = request.session.pop("active_form", "login")

        context = {
            "login_form": login_form,
            "register_form": register_form,
            "active_form": active_form,
            "next": next_url or "",
        }
        return render(request, self.template_name, context)

    def post(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            return redirect(self.get_success_url(request))

        form_type = request.POST.get("form_type")
        login_form = self.login_form_class()
        register_form = self.register_form_class()
        active_form = form_type
        next_url = request.POST.get("next", "")
        redirect_url = self.get_success_url(request)

        if form_type == "login":
            form = self.login_form_class(request.POST)
            if form.is_valid():
                identifier = form.cleaned_data.get("identifier")
                password = form.cleaned_data.get("password")
                remember_me = form.cleaned_data.get("remember_me")
                user = django.contrib.auth.authenticate(request, username=identifier, password=password)

                if user is not None:
                    django.contrib.auth.login(request, user)
                    if not remember_me:
                        request.session.set_expiry(0)
                    django.contrib.messages.success(request, _("Login successful! Welcome back."))
                    return redirect(redirect_url)
                else:
                    django.contrib.messages.error(request, _("Invalid username/email or password."))
                    active_form = "login"
            else:
                django.contrib.messages.error(request, _("Please correct the errors below."))
                active_form = "login"
                login_form = form

        elif form_type == "register":
            form = self.register_form_class(request.POST)
            if form.is_valid():
                try:
                    user = form.save(commit=True)
                    django.contrib.auth.login(request, user)
                    django.contrib.messages.success(request, _("Registration successful! Welcome."))
                    return redirect(redirect_url)
                except Exception as e:
                    print(f"Unexpected Error during registration save/login: {e}")
                    django.contrib.messages.error(request, _("An unexpected error occurred. Please try again."))
                    active_form = "register"
            else:
                django.contrib.messages.error(request, _("Please correct the registration errors below."))
                active_form = "register"
                register_form = form
        else:
            django.contrib.messages.error(request, _("Invalid form submission type."))
            active_form = "login"

        request.session["active_form"] = active_form
        context = {
            "login_form": login_form,
            "register_form": register_form,
            "active_form": active_form,
            "next": next_url,
        }
        return render(request, self.template_name, context)
