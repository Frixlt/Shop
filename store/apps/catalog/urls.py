import django.urls

import apps.catalog.views

app_name = "catalog"

urlpatterns = [
    django.urls.path(
        "",
        apps.catalog.views.ItemsListView.as_view(),
        name="item-list",
    ),
]
