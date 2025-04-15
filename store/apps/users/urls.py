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
        "password_reset/",
        PasswordResetView.as_view(),
        name="password_reset",
    ),
]
