# --"--\Catalog\store\apps\users\backends.py"--

import django.conf
import django.contrib.auth
from django.contrib.auth import get_user_model
import django.contrib.auth.backends
import django.db.models
from django.utils.translation import gettext_lazy as _

# Add imports for locking/activation logic if you implement it later
# import datetime
# import django.core.mail
# import django.template.loader
# import django.urls
# import django.utils.timezone
# import apps.users.tokens

__all__ = ("EmailOrUsernameBackend",)

UserModel = get_user_model()


class EmailOrUsernameBackend(django.contrib.auth.backends.ModelBackend):
    """
    Authenticates against settings.AUTH_USER_MODEL using email or username.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            # The identifier field might be named differently in the form,
            # handle potential kwargs if needed, but usually username is passed
            # even if it contains an email.
            # username = kwargs.get(UserModel.USERNAME_FIELD) # Example fallback
            # For this specific case, the form uses 'identifier', but authenticate gets 'username'
            # We'll handle the lookup within the try block.
            return None  # Cannot authenticate without an identifier

        # Try to find the user by username or email (case-insensitive)
        try:
            # Use Q objects for OR query
            user = UserModel.objects.get(
                django.db.models.Q(username__iexact=username) | django.db.models.Q(email__iexact=username)
            )
        except UserModel.DoesNotExist:
            # Run the default password hasher once to reduce timing attacks
            UserModel().set_password(password)
            return None
        except UserModel.MultipleObjectsReturned:
            # This shouldn't happen with unique constraints, but handle defensively
            print(f"Warning: Multiple users found for identifier '{username}'")
            return None

        # Check the password and user status
        if user.check_password(password) and self.user_can_authenticate(user):
            # --- Optional: Reset attempt counter on success ---
            # profile = getattr(user, 'profile', None)
            # if profile:
            #     profile.attempts_count = 0
            #     profile.save(update_fields=['attempts_count'])
            # --- End Optional ---
            return user
        else:
            # --- Optional: Increment attempt counter and lock ---
            # profile = getattr(user, 'profile', None)
            # if profile:
            #     profile.attempts_count = F('attempts_count') + 1
            #     profile.save(update_fields=['attempts_count'])
            #     profile.refresh_from_db() # Get updated count
            #     max_attempts = getattr(django.conf.settings, 'MAX_AUTH_ATTEMPTS', 5) # Get from settings
            #     if profile.attempts_count >= max_attempts and user.is_active:
            #         user.is_active = False
            #         user.save(update_fields=['is_active'])
            #         # self.send_activation_email(user, request) # Send lock notification/reactivation
            # --- End Optional ---
            return None

    def get_user(self, user_id):
        # Standard get_user method required by Django auth
        try:
            user = UserModel.objects.get(pk=user_id)
        except UserModel.DoesNotExist:
            return None
        return user  # if self.user_can_authenticate(user) else None # Optionally check status again

    # Optional: Add send_activation_email method from example if implementing locking
    # def send_activation_email(self, user, request): ...
