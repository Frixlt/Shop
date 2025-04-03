import { ProductCardCarousel } from './modules/carousel.js';
import { Tooltip, CustomNotification } from './modules/tooltip.js';
import './modules/config.js';
import './modules/show-grid.js';
// Удаляем import './modules/i18n.js';

document.addEventListener('DOMContentLoaded', () => {
  // Инициализация каруселей
  document.querySelectorAll('.product-card:not(.add-card)').forEach(card => {
    new ProductCardCarousel(card).init();
  });

  // Создание экземпляров Notification и Tooltip
  const notification = new CustomNotification();
  const tooltip = new Tooltip(notification);

  // Настройка кнопок корзины
  document.querySelectorAll('.btn-cart').forEach(button => {
    button.setAttribute('data-tooltip', gettext('Add to cart'));
    button.setAttribute('data-tooltip-active', gettext('In cart'));
    button.setAttribute('data-tooltip-toggle', 'true');
    button.setAttribute('data-touch-message-active', gettext('Added to cart'));
    button.setAttribute('data-touch-message-inactive', gettext('Removed from cart'));

    button.addEventListener('click', (e) => {
      e.preventDefault();
      const isTouch = tooltip.isTouchInteraction || notification.isHeld;
      const wasChecked = button.classList.contains('checked');

      button.classList.toggle('checked');

      if (isTouch && !tooltip.isTouchHolding) {
        const message = !wasChecked
          ? button.getAttribute('data-touch-message-active')
          : button.getAttribute('data-touch-message-inactive');
        notification.show(message, 1500, false);
        tooltip.hideTooltip();
      }
    });
  });
});

