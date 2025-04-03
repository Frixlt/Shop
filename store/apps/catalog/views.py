from django.views.generic import ListView

__all__ = ()


class ItemsListView(ListView):
    template_name = "catalog/index.html"
    context_object_name = "items"

    def get_queryset(self):
        return [
            {
                "data_title": "Яблоко Голден",
                "data_text": "Сладкие и хрустящие яблоки сорта Голден Делишес.",
                "data_price": "210 ₽",
                "data_discount": "-15%",
                "data_rating": "4.5",
                "data_images": [
                    "https://dummyimage.com/180x180/ff5733/ffffff&text=Image+1",
                    "https://dummyimage.com/180x180/ff5733/ffffff&text=Image+2",
                    "https://dummyimage.com/180x180/ff5733/ffffff&text=Image+3",
                    "https://dummyimage.com/180x180/ff5733/ffffff&text=Image+4",
                ],
            },
            {
                "data_title": "Груша Конференс",
                "data_text": "Сочные груши сорта Конференс.",
                "data_price": "180 ₽",
                "data_discount": "-20%",
                "data_rating": "4.8",
                "data_images": [
                    "https://dummyimage.com/180x180/33ff57/ffffff&text=Image+1",
                    "https://dummyimage.com/180x180/33ff57/ffffff&text=Image+2",
                    "https://dummyimage.com/180x180/33ff57/ffffff&text=Image+3",
                ],
            },
        ]

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["extra_data"] = "Пример дополнительных данных"
        return context
