from django.contrib.auth.views import PasswordResetView
import django.urls

import apps.users.views
from django.contrib.auth import views as auth_views

app_name = "users"

urlpatterns = [
    django.urls.path(
        "authorize",
        apps.users.views.AuthorizeView.as_view(),
        name="authorize",
    ),
    django.urls.path(
        "password_reset/",
        PasswordResetView.as_view(),
        name="password_reset",
    ),
    django.urls.path(
        "logout/",
        auth_views.LogoutView.as_view(
            # Optional: Specify where to redirect after logout
            # By default, it redirects to settings.LOGOUT_REDIRECT_URL or '/'
            # next_page=django.urls.reverse_lazy("catalog:item-list"),  # Example redirect
        ),
        name="logout",  # This name matches the one used in the template {% url 'users:logout' %}
    ),
]
