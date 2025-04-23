# --"--\Catalog\store\apps\users\views.py"--
import django.contrib.auth
import django.contrib.auth.decorators
import django.contrib.messages
from django.core.exceptions import ValidationError  # Import ValidationError
from django.shortcuts import redirect, render
from django.urls import reverse, reverse_lazy
from django.utils.decorators import method_decorator
from django.utils.http import url_has_allowed_host_and_scheme
from django.utils.translation import gettext as _
from django.views import View
from django.views.generic import TemplateView

from apps.users.forms import LoginForm, RegisterForm, ProfileUpdateForm

__all__ = ("AuthorizeView", "ProfileView")


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
                    # Use the specific error message from the backend if available
                    auth_error = _("Invalid username/email or password.")
                    # You might add more specific checks here based on backend logic if needed
                    django.contrib.messages.error(request, auth_error)
                    active_form = "login"
                    # Pass the invalid form back to the template
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
                    # Optionally log the user in immediately after registration
                    django.contrib.auth.login(
                        request, user, backend="apps.users.backends.EmailOrUsernameBackend"
                    )  # Specify backend
                    django.contrib.messages.success(request, _("Registration successful! Welcome."))
                    return redirect(redirect_url)
                except Exception as e:
                    print(f"Unexpected Error during registration save/login: {e}")
                    django.contrib.messages.error(
                        request, _("An unexpected error occurred during registration. Please try again.")
                    )
                    active_form = "register"
                    # Pass the invalid form back to the template
                    register_form = form
            else:
                django.contrib.messages.error(request, _("Please correct the registration errors below."))
                active_form = "register"
                register_form = form
        else:
            django.contrib.messages.error(request, _("Invalid form submission type."))
            active_form = "login"  # Default to login form on error

        # Store active form in session to preserve state on page reload after error
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
        user = self.request.user
        context["profile_user"] = user

        # Define field groups based on the HTML structure
        context["personal_fields"] = [
            {
                "label": _("Username"),
                "value": user.username,
                "name": "username",
                "editable": "username" in user.USER_EDITABLE_FIELDS,
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
            {
                "label": _("Birth Date"),
                "value": user.birth_date,
                "name": "birth_date",
                "editable": "birth_date" in user.USER_EDITABLE_FIELDS,
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

        context["show_avatar"] = bool(user.avatar)
        context["avatar_url"] = user.avatar.url if user.avatar else None

        return context

    def post(self, request, *args, **kwargs):
        user = request.user
        field_name = request.POST.get("field_name")

        # Check if the field is actually editable by the user
        if field_name not in user.USER_EDITABLE_FIELDS:
            django.contrib.messages.error(request, _("This field cannot be edited."))
            return redirect("users:profile")

        # Prepare data and files for the form, focusing on the specific field
        post_data = {field_name: request.POST.get("field_value")}
        files_data = {}
        if field_name == "avatar" and "field_value" in request.FILES:
            files_data = {field_name: request.FILES["field_value"]}
            # Clear the POST data for avatar if a file is uploaded
            post_data[field_name] = None

        # Instantiate the form with only the relevant data for validation
        # Pass the full request.POST and request.FILES to the form constructor
        # The form's __init__ will filter based on USER_EDITABLE_FIELDS
        form = self.form_class(request.POST, request.FILES, instance=user)

        # Manually trigger cleaning for the specific field being updated
        if field_name in form.fields:
            try:
                # Use the form's logic to get the value for the specific field
                value_for_clean = form.fields[field_name].widget.value_from_datadict(
                    form.data, form.files, form.add_prefix(field_name)
                )
                # Clean the specific field's value
                cleaned_value = form.fields[field_name].clean(value_for_clean)

                # Run full clean to catch cross-field validation if needed (e.g., email uniqueness)
                # We need to populate cleaned_data for full_clean to work correctly
                form.cleaned_data = {field_name: cleaned_value}
                form.full_clean()  # This might raise ValidationError for cross-field issues

                # Check errors *after* full_clean
                if field_name not in form.errors:
                    # Save only the updated field
                    setattr(user, field_name, cleaned_value)
                    user.save(update_fields=[field_name])
                    django.contrib.messages.success(
                        request, _("'{field}' updated successfully.").format(field=_(form.fields[field_name].label))
                    )
                else:
                    # Add specific field error message
                    for error in form.errors[field_name]:
                        django.contrib.messages.error(request, f"{_(form.fields[field_name].label)}: {error}")

            except ValidationError as e:
                # Add validation error message from clean() or full_clean()
                # Check if it's a field-specific error or non-field error
                if hasattr(e, "error_dict") and field_name in e.error_dict:
                    for error in e.error_dict[field_name]:
                        django.contrib.messages.error(request, f"{_(form.fields[field_name].label)}: {error.message}")
                elif hasattr(e, "messages"):  # Handle non-field errors from full_clean
                    for msg in e.messages:
                        django.contrib.messages.error(request, msg)
                else:  # Generic fallback
                    django.contrib.messages.error(request, f"{_(form.fields[field_name].label)}: {e}")

            except Exception as e:
                print(f"Error updating profile field '{field_name}': {e}")
                django.contrib.messages.error(request, _("An error occurred while updating the profile."))

        else:
            django.contrib.messages.error(request, _("Invalid field specified for update."))

        return redirect("users:profile")
