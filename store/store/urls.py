import django.conf
import django.conf.urls.i18n
import django.conf.urls.static
import django.contrib.admin
import django.urls
import django.views.i18n

urlpatterns = [
    django.urls.path("", django.urls.include("apps.catalog.urls")),
    django.urls.path(
        "i18n/",
        django.urls.include(
            django.conf.urls.i18n,
        ),
    ),
    django.urls.path(
        "jsi18n/",
        django.views.i18n.JavaScriptCatalog.as_view(),
        name="javascript-catalog",
    ),
    django.urls.path(
        "admin/",
        django.contrib.admin.site.urls,
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
