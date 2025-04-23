# --"--\Catalog\store\apps\users\views.py"--
import django.contrib.auth
import django.contrib.auth.decorators
import django.contrib.messages
from django.core.exceptions import ValidationError
from django.shortcuts import redirect, render
from django.urls import reverse, reverse_lazy
from django.utils.decorators import method_decorator
from django.utils.http import url_has_allowed_host_and_scheme
from django.utils.translation import gettext as _
from django.views import View
from django.views.generic import TemplateView
from django.contrib.auth import get_user_model

from apps.users.forms import LoginForm, RegisterForm, ProfileUpdateForm

__all__ = ("AuthorizeView", "ProfileView")

UserModel = get_user_model()


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
                    auth_error = _("Invalid username/email or password.")
                    django.contrib.messages.error(request, auth_error)
                    active_form = "login"
                    login_form = form
            else:
                django.contrib.messages.error(request, _("Please correct the errors below."))
                active_form = "login"
                login_form = form

        elif form_type == "register":
            form = self.register_form_class(request.POST)
            if form.is_valid():
                try:
                    user = form.save(commit=True)
                    django.contrib.auth.login(request, user, backend="apps.users.backends.EmailOrUsernameBackend")
                    django.contrib.messages.success(request, _("Registration successful! Welcome."))
                    return redirect(redirect_url)
                except Exception as e:
                    print(f"Unexpected Error during registration save/login: {e}")
                    django.contrib.messages.error(
                        request, _("An unexpected error occurred during registration. Please try again.")
                    )
                    active_form = "register"
                    register_form = form
            else:
                # Add form errors to messages for debugging
                for field, errors in form.errors.items():
                    print(f"Registration Error - Field: {field}, Errors: {errors}")
                    for error in errors:
                        django.contrib.messages.error(
                            request, f"{form.fields[field].label if field != '__all__' else ''}: {error}"
                        )

                # Keep the generic message as well
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


@method_decorator(django.contrib.auth.decorators.login_required, name="dispatch")
class ProfileView(TemplateView):
    template_name = "users/profile.html"
    form_class = ProfileUpdateForm

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Use the user from the request directly
        user = self.request.user
        context["profile_user"] = user

        print(f"--- DEBUG (get_context_data): User email: '{user.email}', Type: {type(user.email)} ---")

        context["personal_fields"] = [
            {
                "label": _("Username"),
                "value": user.username,
                "name": "username",
                "editable": False,
            },
            {
                "label": _("First Name"),
                "value": user.first_name,
                "name": "first_name",
                "editable": "first_name" in user.USER_EDITABLE_FIELDS,
            },
            {
                "label": _("Last Name"),
                "value": user.last_name,
                "name": "last_name",
                "editable": "last_name" in user.USER_EDITABLE_FIELDS,
            },
        ]
        context["contact_fields"] = [
            {
                "label": _("Email"),
                "value": user.email,
                "name": "email",
                "editable": "email" in user.USER_EDITABLE_FIELDS,
            },
            {
                "label": _("Phone Number"),
                "value": user.phone_number,
                "name": "phone_number",
                "editable": "phone_number" in user.USER_EDITABLE_FIELDS,
            },
            {"label": _("City"), "value": user.city, "name": "city", "editable": "city" in user.USER_EDITABLE_FIELDS},
        ]
        context["additional_fields"] = [
            {
                "label": _("Date Joined"),
                "value": user.date_joined.strftime("%d.%m.%Y %H:%M"),
                "name": "date_joined",
                "editable": False,
            },
            {
                "label": _("Status"),
                "value": _("Active") if user.is_active else _("Inactive"),
                "name": "is_active",
                "editable": False,
            },
            {
                "label": _("Last Login"),
                "value": user.last_login.strftime("%d.%m.%Y %H:%M") if user.last_login else _("Never"),
                "name": "last_login",
                "editable": False,
            },
            {
                "label": _("Staff Status"),
                "value": _("Yes") if user.is_staff else _("No"),
                "name": "is_staff",
                "editable": False,
            },
        ]

        return context

    def post(self, request, *args, **kwargs):
        # Get the user instance from the request
        user_instance = request.user

        field_name = request.POST.get("field_name")
        field_value = request.POST.get("field_value")

        # --- Validation: Check if field is editable ---
        if not field_name or field_name not in user_instance.USER_EDITABLE_FIELDS:
            django.contrib.messages.error(request, _("This field cannot be edited or is invalid."))
            return redirect("users:profile")

        # --- Form Handling ---
        # Create a dictionary containing only the data for the field being updated
        post_data = {field_name: field_value}

        # Instantiate the form, passing the specific field being updated
        # This helps the form's __init__ focus validation if needed
        form = self.form_class(post_data, instance=user_instance, updating_field=field_name)

        # --- Form Validation ---
        if form.is_valid():
            try:
                # Use the form's save method, which should now correctly handle partial updates
                form.save(commit=True)
                django.contrib.messages.success(
                    request,
                    _("'{field}' updated successfully.").format(
                        field=_(form.fields[field_name].label) if field_name in form.fields else field_name
                    ),
                )
            except Exception as e:
                print(f"Error saving profile update for field '{field_name}', user {user_instance.username}: {e}")
                django.contrib.messages.error(request, _("An error occurred while saving your profile."))
        else:
            # --- Handle Validation Errors ---
            print(f"--- DEBUG (POST): Form invalid. Errors: {form.errors.as_json()} ---")  # Debug form errors
            if field_name in form.errors:
                label = form.fields[field_name].label if field_name in form.fields else field_name
                label_text = _(label) if label else field_name
                for error in form.errors[field_name]:
                    django.contrib.messages.error(request, f"{label_text}: {error}")
            elif "__all__" in form.errors:
                for error in form.errors["__all__"]:
                    django.contrib.messages.error(request, error)
            else:
                django.contrib.messages.error(request, _("An error occurred during validation."))

        return redirect("users:profile")
