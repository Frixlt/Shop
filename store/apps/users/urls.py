# --"--\Catalog\store\apps\users\urls.py"--
import django.contrib.auth.views
from django.contrib.auth.views import PasswordResetView
import django.urls

import apps.users.views

app_name = "users"

urlpatterns = [
    django.urls.path(
        "authorize",
        apps.users.views.AuthorizeView.as_view(),
        name="authorize",
    ),
    django.urls.path(
        "profile/",
        apps.users.views.ProfileView.as_view(),
        name="profile",
    ),
    django.urls.path(
        "password_reset/",
        PasswordResetView.as_view(),
        name="password_reset",
    ),
    django.urls.path(
        "logout/",
        django.contrib.auth.views.LogoutView.as_view(
            next_page=django.urls.reverse_lazy("catalog:item-list"),
        ),
        name="logout",
    ),
]
