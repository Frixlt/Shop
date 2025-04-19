# --"--\Catalog\store\apps\users\views.py"--

import json
from django.contrib import auth
from django.http import JsonResponse
from django.shortcuts import render, redirect  # Keep redirect for potential non-AJAX fallback
from django.urls import reverse  # *** IMPORTED reverse ***
from django.views import View
from django.utils.translation import gettext as _

from .forms import LoginForm, RegisterForm

# Optional: Import email sending functions if needed after registration
# from .utils import send_activation_email

__all__ = ("AuthorizeView",)


class AuthorizeView(View):
    """Handles both login and registration display (GET) and submission (POST)."""

    template_name = "users/authorize.html"
    login_form_class = LoginForm
    register_form_class = RegisterForm
    success_url_name = "catalog:item-list"  # *** DEFINED SUCCESS URL NAME ***

    def get_success_url(self):
        """Returns the URL to redirect to on successful login/registration."""
        # You could add logic here, e.g., check for a 'next' parameter
        # next_url = self.request.GET.get('next')
        # if next_url and is_safe_url(url=next_url, allowed_hosts={self.request.get_host()}):
        #     return next_url
        try:
            # Use reverse_lazy if generating URL outside request context, but reverse is fine here
            return reverse(self.success_url_name)
        except Exception as e:
            print(f"Error reversing success URL '{self.success_url_name}': {e}")
            return "/"  # Fallback to homepage if reverse fails

    def get(self, request, *args, **kwargs):
        # Redirect authenticated users away from login/register page
        if request.user.is_authenticated:
            return redirect(self.get_success_url())

        context = {
            "login_form": self.login_form_class(),
            "register_form": self.register_form_class(),
            "active_form": "login",  # Default active tab
        }
        return render(request, self.template_name, context)

    def post(self, request, *args, **kwargs):
        # Redirect authenticated users if they somehow POST here
        if request.user.is_authenticated:
            # Maybe return an error JSON instead of redirecting on POST?
            # return JsonResponse({"status": "error", "errors": {"__all__": [_("Already logged in.")]}}, status=400)
            return redirect(self.get_success_url())  # Or redirect

        form_type = request.POST.get("form_type")
        form = None
        redirect_url = self.get_success_url()  # Get the target URL

        if form_type == "login":
            form = self.login_form_class(request.POST)
            if form.is_valid():
                identifier = form.cleaned_data.get("identifier")
                password = form.cleaned_data.get("password")
                remember_me = form.cleaned_data.get("remember_me")

                # --- Delegate Authentication to Backends ---
                user = auth.authenticate(request, username=identifier, password=password)

                if user is not None:
                    # Backend should handle is_active check via user_can_authenticate
                    auth.login(request, user)
                    if not remember_me:
                        request.session.set_expiry(0)  # Expire session on browser close

                    # *** ADD redirect_url to JSON Response ***
                    return JsonResponse(
                        {
                            "status": "success",
                            "message": _("Login successful! Redirecting..."),
                            "redirect_url": redirect_url,
                        }
                    )
                else:
                    # Authentication failed
                    form.add_error(None, _("Invalid username/email or password."))
                    # Fall through to return form errors below

            # --- Return Login Form Errors ---
            # Contains errors from is_valid() OR the add_error() above
            return JsonResponse({"status": "error", "errors": form.errors}, status=400)

        elif form_type == "register":
            form = self.register_form_class(request.POST)
            if form.is_valid():
                try:
                    # Form's clean methods already checked uniqueness
                    user = form.save(commit=True)  # Save the user

                    # Optional: Send activation email, etc. before login if needed
                    # send_activation_email(request, user)

                    # Log the user in immediately after successful registration
                    auth.login(request, user)

                    # *** ADD redirect_url to JSON Response ***
                    return JsonResponse(
                        {
                            "status": "success",
                            "message": _("Registration successful! Redirecting..."),
                            "redirect_url": redirect_url,
                        }
                    )

                except Exception as e:
                    # Catch any unexpected error during save/login/email sending
                    print(f"Unexpected Error during registration save/login: {e}")
                    form.add_error(None, _("An unexpected error occurred. Please try again."))
                    # Fall through to return form errors

            # --- Return Registration Form Errors ---
            # Contains errors from is_valid() (required, mismatch, unique checks from clean_ methods)
            # OR errors added by add_error() in the except block above
            return JsonResponse({"status": "error", "errors": form.errors}, status=400)

        else:
            # --- Invalid form_type ---
            return JsonResponse(
                {"status": "error", "errors": {"__all__": [_("Invalid form submission type.")]}}, status=400
            )
