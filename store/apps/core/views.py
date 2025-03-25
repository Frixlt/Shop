import django.shortcuts
import django.views.generic

__all__ = ()


class BadRequestView(django.views.generic.base.View):
    def get(self, request, exception):
        return django.shortcuts.render(request, "core/BadRequest.html", {}, status=400)


class PermissionDeniedView(django.views.generic.base.View):
    def get(self, request, exception):
        return django.shortcuts.render(request, "core/PermissionDenied.html", {}, status=403)


class NotFoundView(django.views.generic.base.View):
    def get(self, request, exception):
        return django.shortcuts.render(request, "core/NotFound.html", {}, status=404)


class ServerErrorView(django.views.generic.base.View):
    def get(self, request, exception):
        return django.shortcuts.render(request, "core/ServerError.html", {}, status=500)
