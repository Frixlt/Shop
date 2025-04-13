from django import forms
from django.contrib.auth import authenticate
from django.utils.translation import gettext_lazy as _
from django.utils.html import format_html
from .models import UserModel
from .email_normalizer import EmailNormalizer
from apps.core.widgets import (
    TextInputWidget,
    EmailInputWidget,
    PasswordInputWidget,
    TelInputWidget,
    NumberInputWidget,
    DateInputWidget,
    SelectWidget,
    TextareaWidget,
    CheckboxWidget,
    RadioGroupWidget,
    FileInputWidget,
)

__all__ = ("BaseAuthForm", "LoginForm", "RegisterForm")


class BaseAuthForm(forms.Form):
    def __init__(self, *args, theme="default", **kwargs):
        super().__init__(*args, **kwargs)
        self.theme = theme

        for field_name, field in self.fields.items():
            # Ensure field has an id for the label 'for' attribute
            # Django automatically assigns id_fieldname if not specified in attrs
            widget_attrs = field.widget.attrs or {}
            if "id" not in widget_attrs:
                # Use Django's auto id format if not explicitly set
                widget_attrs["id"] = field.auto_id
                # Or force the one from forms.py if set there
                # widget_attrs['id'] = self.fields[field_name].widget.attrs.get('id', field.auto_id)

            widget_attrs["required"] = field.required
            current_class = widget_attrs.get("class", "")
            widget_attrs["class"] = f"{current_class} theme-{self.theme}".strip()
            field.widget.attrs = widget_attrs  # Re-assign updated attrs

    def add_error(self, field, error):
        super().add_error(field, error)
        if field in self.fields:
            # Ensure attrs dictionary exists before modifying
            if self.fields[field].widget.attrs is None:
                self.fields[field].widget.attrs = {}
            self.fields[field].widget.attrs["errors"] = self.errors.get(field)


class LoginForm(BaseAuthForm):
    email_or_username = forms.CharField(
        label=_("Email or Username"),
        max_length=254,
        widget=EmailInputWidget(  # Assuming EmailInputWidget renders type="text" or type="email"
            label=_("Email or Username"),
            icon_class="fa-user",
            attrs={
                "class": "auth-input",
                "placeholder": _("your@email.com"),
                "id": "login-email",
                "autocomplete": "username",  # Covers both email and username for login
            },
        ),
    )
    password = forms.CharField(
        label=_("Password"),
        widget=PasswordInputWidget(
            label=_("Password"),
            icon_class="fa-lock",
            attrs={
                "class": "auth-input",
                "placeholder": "••••••••",
                "id": "login-password",
                "autocomplete": "current-password",
            },
        ),
        min_length=6,
    )
    remember = forms.BooleanField(
        label=_("Remember me"),
        required=False,
        initial=False,
        widget=CheckboxWidget(
            label=_("Remember me"),
            wrapper_class="form-check",
            attrs={
                "class": "form-check-input",
                "id": "remember-me",
                # autocomplete not typically used for remember me
            },
        ),
    )

    def clean(self):
        cleaned_data = super().clean()
        email_or_username = cleaned_data.get("email_or_username")
        password = cleaned_data.get("password")

        if email_or_username and password:
            normalizer = EmailNormalizer()
            normalized_email = normalizer.normalize(email_or_username)

            user = None
            if normalized_email:
                # Try authenticating with normalized email first
                user = authenticate(email=normalized_email, password=password)
            if not user and "@" not in email_or_username:
                # If email didn't work and input looks like a username, try username
                user = authenticate(username=email_or_username, password=password)
            elif not user and normalized_email:
                # Fallback: maybe they entered non-normalized email that matches username? Unlikely but possible.
                # Or maybe the original email_or_username *is* the username and contains '@'
                user = authenticate(username=email_or_username, password=password)

            if user is None:
                raise forms.ValidationError(
                    _("Invalid email/username or password"),
                    code="invalid_credentials",
                )
            if not user.is_active:
                raise forms.ValidationError(
                    _("This account is inactive"),
                    code="inactive_account",
                )

            cleaned_data["user"] = user
        return cleaned_data


class RegisterForm(BaseAuthForm, forms.ModelForm):
    phone = forms.CharField(
        label=_("Phone Number"),
        required=False,
        widget=TelInputWidget(
            label=_("Phone Number"),
            attrs={
                "class": "auth-input",
                "placeholder": "+1234567890",
                "id": "register-phone",
                "autocomplete": "tel",
            },
        ),
    )
    age = forms.IntegerField(
        label=_("Age"),
        required=False,
        widget=NumberInputWidget(
            label=_("Age"),
            attrs={
                "class": "auth-input",
                "placeholder": "Your age",
                "id": "register-age",
                "autocomplete": "off",  # Age isn't standard, turn off
            },
        ),
    )
    birth_date = forms.DateField(
        label=_("Birth Date"),
        required=False,
        widget=DateInputWidget(
            label=_("Birth Date"),
            attrs={
                "class": "auth-input",
                "placeholder": "YYYY-MM-DD",
                "id": "register-birth-date",
                "autocomplete": "bday",
            },
        ),
    )
    country = forms.ChoiceField(
        choices=[
            ("", _("Select Country...")),  # Add a default empty choice
            ("ru", "Россия"),
            ("us", "США"),
            ("de", "Германия"),
            ("fr", "Франция"),
            ("jp", "Япония"),
        ],
        widget=SelectWidget(
            label="Страна",
            icon="fa-globe",
            max_selections=1,
            placeholder="Выберите {remaining} {declension}",
            # Ensure SelectWidget passes down id and autocomplete
            attrs={
                "id": "register-country",  # Explicit ID needed if widget doesn't use standard one
                "autocomplete": "country-name",
            },
        ),
        required=True,
    )
    bio = forms.CharField(
        label=_("Bio"),
        required=False,
        widget=TextareaWidget(
            label=_("Bio"),
            icon_class="fa-comment",
            attrs={
                "class": "auth-textarea",
                "placeholder": "Tell us about yourself",
                "id": "register-bio",
                "autocomplete": "off",  # Bio is custom
            },
        ),
    )
    gender = forms.ChoiceField(
        label=_("Gender"),
        choices=[
            ("male", "Male"),
            ("female", "Female"),
            ("other", "Other"),
        ],
        required=False,
        widget=RadioGroupWidget(  # Assume RadioGroupWidget renders standard radios with labels
            label=_("Gender"),
            attrs={
                "id": "register-gender",  # ID for the group container, not the inputs themselves
                # Autocomplete not applicable to radio group itself
            },
        ),
    )
    avatar = forms.FileField(
        label=_("Avatar"),
        required=False,
        widget=FileInputWidget(
            label=_("Avatar"),
            placeholder=_("Upload your avatar"),
            attrs={
                "class": "file-input",
                "accept": "image/*",
                "id": "register-avatar",
                # Autocomplete not applicable
            },
        ),
    )
    password = forms.CharField(
        label=_("Password"),
        widget=PasswordInputWidget(
            label=_("Password"),
            icon_class="fa-lock",
            attrs={
                "class": "auth-input",
                "placeholder": _("Create a password"),
                "id": "register-password",
                "autocomplete": "new-password",
            },
        ),
        min_length=8,
        help_text=_("Password must be at least 8 characters, including letters and numbers"),
    )
    confirm_password = forms.CharField(
        label=_("Confirm Password"),
        widget=PasswordInputWidget(
            label=_("Confirm Password"),
            icon_class="fa-shield-alt",
            attrs={
                "class": "auth-input",
                "placeholder": _("Repeat password"),
                "id": "register-confirm-password",
                "autocomplete": "new-password",  # Use new-password for confirmation too
            },
        ),
        min_length=8,
    )
    terms = forms.BooleanField(
        label=_("I accept the terms of use and privacy policy"),  # This label text is overridden by widget label
        required=True,
        error_messages={"required": _("You must accept the terms of use")},
        widget=CheckboxWidget(
            label=format_html(  # This label content is passed to the widget
                '{} <a href="#" class="auth-link">{}</a> {} <a href="#" class="auth-link">{}</a>',
                _("I accept the"),
                _("terms of use"),
                _("and"),
                _("privacy policy"),
            ),
            wrapper_class="form-check",
            attrs={
                "class": "form-check-input",
                "id": "terms-checkbox",
                # Autocomplete not applicable
            },
        ),
    )

    class Meta:
        model = UserModel
        # Define fields included in the form
        fields = (
            "username",
            "email",
            # Note: password/confirm_password/terms are defined above, not in model Meta usually
            # Add other model fields that have widgets defined above:
            "phone",
            "age",
            "birth_date",
            "country",
            "bio",
            "gender",
            "avatar",
        )
        # Define widgets for model fields *not* explicitly defined above
        widgets = {
            "username": TextInputWidget(
                label=_("Username"),
                icon_class="fa-user",
                attrs={
                    "class": "auth-input",
                    "placeholder": _("Your name"),
                    "id": "register-name",  # Explicit ID
                    "autocomplete": "username",
                },
            ),
            "email": EmailInputWidget(
                label=_("Email"),
                icon_class="fa-envelope",
                attrs={
                    "class": "auth-input",
                    "placeholder": _("your@email.com"),
                    "id": "register-email",  # Explicit ID
                    "autocomplete": "email",
                },
            ),
            # Widgets for phone, age, birth_date etc. are defined as separate fields above
            # Make sure fields list above matches fields defined with widgets
        }
        # Labels and help texts for fields from Meta
        labels = {
            "username": _("Username"),
            "email": _("Email"),
            # Add labels for other Meta fields if needed, though usually covered by Field definition
        }
        help_texts = {
            "email": _("Unique email address"),
            "username": _("Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only."),
            # Add help_texts for other Meta fields if needed
        }

    # clean_email, clean_username, clean, save methods remain the same...
    def clean_email(self):
        email = self.cleaned_data.get("email")
        if email:
            normalizer = EmailNormalizer()
            normalized_email = normalizer.normalize(email)
            if normalized_email and UserModel.objects.filter(email=normalized_email).exists():
                # Check if the existing user is the one being edited (if applicable)
                # if not self.instance or self.instance.email != normalized_email: # Uncomment/adapt for user edit form
                raise forms.ValidationError(
                    _("A user with this email already exists"),
                    code="email_exists",
                )
            return normalized_email  # Return normalized email
        # If email field is required (which it is by default in AbstractUser)
        raise forms.ValidationError(
            _("Please enter a valid email"),
            code="invalid_email",
        )

    def clean_username(self):
        username = self.cleaned_data.get("username")
        if not username:  # Check if username is empty (it's required by AbstractUser)
            raise forms.ValidationError(
                _("Username cannot be empty."),
                code="required",
            )
        if len(username) < 3:
            raise forms.ValidationError(
                _("Username must be at least 3 characters"),
                code="short_username",
            )
        if UserModel.objects.filter(username=username).exists():
            # Check if the existing user is the one being edited (if applicable)
            # if not self.instance or self.instance.username != username: # Uncomment/adapt for user edit form
            raise forms.ValidationError(
                _("A user with this username already exists"),
                code="username_exists",
            )
        return username

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get("password")
        confirm_password = cleaned_data.get("confirm_password")

        # Check password confirmation mismatch
        if password and confirm_password and password != confirm_password:
            # Add error specifically to confirm_password field for better UX
            self.add_error(
                "confirm_password",
                forms.ValidationError(
                    _("Passwords do not match"),
                    code="password_mismatch",
                ),
            )
            # Also raise a non-field error if desired, but field error is often enough
            # raise forms.ValidationError(_("Passwords do not match"), code="password_mismatch")

        # Check password complexity
        if password:
            # Using refined check: at least one letter AND at least one digit
            has_letter = any(c.isalpha() for c in password)
            has_digit = any(c.isdigit() for c in password)
            if not (has_letter and has_digit):
                self.add_error(
                    "password",
                    forms.ValidationError(
                        _("Password must include letters and numbers"),
                        code="invalid_password_complexity",  # More specific code
                    ),
                )
                # raise forms.ValidationError(...) # Optional non-field error

        # Check terms acceptance
        if not cleaned_data.get("terms"):
            # Error added by BooleanField(required=True) automatically, but can customize here if needed
            pass  # Let the default required validation handle this

        return cleaned_data

    def save(self, commit=True):
        user = super().save(commit=False)
        # Ensure email is normalized before setting password or saving
        user.email = self.cleaned_data.get("email")  # Get potentially cleaned/normalized email
        user.set_password(self.cleaned_data["password"])
        if commit:
            user.save()
            # Note: The post_save signal in models.py will re-normalize the email,
            # which is redundant if clean_email already does it. Consider removing
            # the signal or making clean_email the single source of truth.
        return user
