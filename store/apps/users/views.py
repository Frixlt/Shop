from django.contrib import auth
from django.http import JsonResponse
from django.utils.http import url_has_allowed_host_and_scheme
from django.shortcuts import redirect, render
from django.urls import reverse
from django.utils.translation import gettext as _
from django.views import View

from apps.users.forms import LoginForm, RegisterForm

__all__ = ("AuthorizeView",)


class AuthorizeView(View):
    """Handles both login and registration display (GET) and submission (POST)."""

    template_name = "users/authorize.html"
    login_form_class = LoginForm
    register_form_class = RegisterForm
    success_url_name = "catalog:item-list"

    def get_success_url(self, request):
        """
        Returns the URL to redirect to on successful login/registration.
        Checks for a 'next' parameter first.
        """
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

        context = {
            "login_form": login_form,
            "register_form": register_form,
            "active_form": "login",
            "next": next_url or "",
        }
        return render(request, self.template_name, context)

    def post(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            return redirect(self.get_success_url(request))

        form_type = request.POST.get("form_type")
        form = None
        redirect_url = self.get_success_url(request)

        if form_type == "login":
            form = self.login_form_class(request.POST)
            if form.is_valid():
                identifier = form.cleaned_data.get("identifier")
                password = form.cleaned_data.get("password")
                remember_me = form.cleaned_data.get("remember_me")
                user = auth.authenticate(request, username=identifier, password=password)

                if user is not None:
                    auth.login(request, user)
                    if not remember_me:
                        request.session.set_expiry(0)
                    return JsonResponse(
                        {
                            "status": "success",
                            "message": _("Login successful! Redirecting..."),
                            "redirect_url": redirect_url,
                        }
                    )
                else:
                    form.add_error(None, _("Invalid username/email or password."))

            return JsonResponse({"status": "error", "errors": form.errors}, status=400)

        elif form_type == "register":
            form = self.register_form_class(request.POST)
            if form.is_valid():
                try:
                    user = form.save(commit=True)
                    auth.login(request, user)
                    return JsonResponse(
                        {
                            "status": "success",
                            "message": _("Registration successful! Redirecting..."),
                            "redirect_url": redirect_url,
                        }
                    )

                except Exception as e:
                    print(f"Unexpected Error during registration save/login: {e}")
                    form.add_error(None, _("An unexpected error occurred. Please try again."))

            return JsonResponse({"status": "error", "errors": form.errors}, status=400)

        else:
            return JsonResponse(
                {"status": "error", "errors": {"__all__": [_("Invalid form submission type.")]}}, status=400
            )
