import functools

import django.apps
from django.utils.translation import gettext_lazy as _

__all__ = ["LazyModelLoader"]


class AppModelLoader:
    def __init__(self, app_label):
        self.app_label = app_label

    def __getattr__(self, model_name):
        model = django.apps.apps.get_model(self.app_label, model_name)
        if model is None:
            raise AttributeError(
                _("The model '{model_name}' was not found in the application '{app_label}'.").format(
                    model_name=model_name,
                    app_label=self.app_label,
                ),
            )

        return model


class LazyModelLoader:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(LazyModelLoader, cls).__new__(cls)

        return cls._instance

    @functools.cached_property
    def _apps(self):
        return {config.label: AppModelLoader(config.label) for config in django.apps.apps.get_app_configs()}

    def __getattr__(self, app_label):
        if app_label in self._apps:
            return self._apps[app_label]

        raise AttributeError(_("The application '{app_label}' was not found.").format(app_label=app_label))
