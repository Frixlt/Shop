import django.conf
import django.conf.urls.i18n
import django.conf.urls.static
import django.contrib.admin
import django.urls
import django.views.i18n

import apps.catalog.urls
import apps.users.urls
from apps.users.views import AuthorizeView

urlpatterns = [
    django.urls.path(
        "",
        django.urls.include(
            apps.catalog.urls,
        ),
    ),
    django.urls.path(
        "users/",
        django.urls.include(
            apps.users.urls,
        ),
    ),
    django.urls.path(
        "i18n/",
        django.urls.include(
            django.conf.urls.i18n,
        ),
    ),
    django.urls.path(
        "jsi18n/",
        django.views.i18n.JavaScriptCatalog.as_view(),
        name="jsi18n",
    ),
    django.urls.path(
        "admin/login/",
        AuthorizeView.as_view(),
        name="admin_login_override",
    ),
    django.urls.path(
        "admin/",
        django.contrib.admin.site.urls,
        name="admin",
    ),
]

if django.conf.settings.DEBUG:
    urlpatterns += (
        django.urls.path(
            "__debug__/",
            django.urls.include("debug_toolbar.urls"),
        ),
    )
    urlpatterns += django.conf.urls.static.static(
        django.conf.settings.MEDIA_URL,
        document_root=django.conf.settings.MEDIA_ROOT,
    )
