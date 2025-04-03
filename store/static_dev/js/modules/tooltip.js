export class CustomNotification {
  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'touch-notification';
    document.body.appendChild(this.element);
    this.fadeTimer = null;
    this.isHeld = false;
  }

  show(message, duration = 1500, hold = false) {
    clearTimeout(this.fadeTimer);
    this.element.classList.remove('visible');
    this.element.textContent = message;
    this.element.classList.add('visible');
    this.isHeld = hold;

    if (!hold) {
      this.fadeTimer = setTimeout(() => this.hide(), duration);
    }
  }

  hide() {
    clearTimeout(this.fadeTimer);
    this.element.classList.remove('visible');
    this.isHeld = false;
  }

  releaseHold() {
    if (this.isHeld) {
      this.isHeld = false;
      this.fadeTimer = setTimeout(() => this.hide(), 1500);
    }
  }
}

// Добавляем export для класса Tooltip
export class Tooltip {
  constructor(notification) {
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'tooltip-black';
    document.body.appendChild(this.tooltip);
    this.notification = notification;
    this.currentElement = null;
    this.isMouseHeld = false;
    this.isTouchInteraction = false;
    this.isTouchHolding = false;
    this.heldElement = null;
    this.init();
  }

  updateTooltip(element) {
    if (!element) return;
    let content = element.getAttribute('data-tooltip');
    if (this.isMouseHeld && element.hasAttribute('data-tooltip-hold') && element.hasAttribute('data-tooltip-active')) {
      content = element.getAttribute('data-tooltip-active');
    } else if (!this.isTouchInteraction && element.hasAttribute('data-tooltip-toggle') &&
      element.classList.contains('checked') && element.hasAttribute('data-tooltip-active')) {
      content = element.getAttribute('data-tooltip-active');
    }
    this.tooltip.innerHTML = content || '';
  }

  positionTooltip(e) {
    if (!this.tooltip.classList.contains('visible') || this.isTouchInteraction) return;

    const rect = this.tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = e.pageX + 10;
    let top = e.pageY + 10;

    if (left + rect.width > viewportWidth - 10) left = e.pageX - rect.width - 10;
    if (top + rect.height > viewportHeight - 10) top = e.pageY - rect.height - 10;
    if (left < 10) left = 10;
    if (top < 10) top = 10;

    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;
  }

  showTooltip(element, e) {
    if (this.isTouchInteraction) {
      this.hideTooltip();
      return;
    }
    if (this.currentElement === element && this.tooltip.classList.contains('visible')) {
      this.positionTooltip(e);
      return;
    }
    this.currentElement = element;
    this.updateTooltip(element);
    if (this.tooltip.innerHTML) {
      this.tooltip.classList.add('visible');
      this.positionTooltip(e);
    } else {
      this.hideTooltip();
    }
  }

  hideTooltip() {
    if (!this.isMouseHeld) {
      this.currentElement = null;
      this.tooltip.classList.remove('visible');
    }
  }

  init() {
    document.addEventListener('touchstart', (e) => {
      const element = e.target.closest('.btn-cart');
      if (element) {
        this.isTouchInteraction = true;
        this.hideTooltip();
        if (element.hasAttribute('data-tooltip-hold') && element.hasAttribute('data-touch-message')) {
          this.isTouchHolding = true;
          this.heldElement = element;
          this.notification.show(element.getAttribute('data-touch-message'), 0, true);
        }
      }
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      if (this.isTouchHolding && this.heldElement) {
        const releaseTarget = document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        if (this.heldElement === releaseTarget || this.heldElement.contains(releaseTarget)) {
          this.notification.releaseHold();
        } else {
          this.notification.hide();
        }
        this.isTouchHolding = false;
        this.heldElement = null;
      }
      setTimeout(() => this.isTouchInteraction = false, 100);
    }, { passive: true });

    document.addEventListener('mouseover', (e) => {
      if (!this.isTouchInteraction) {
        const element = e.target.closest('.btn-cart');
        if (element) this.showTooltip(element, e);
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isTouchInteraction) {
        const element = e.target.closest('.btn-cart');
        if (this.tooltip.classList.contains('visible')) {
          if (this.currentElement && (!element || !this.currentElement.contains(element))) {
            this.hideTooltip();
          } else if (this.currentElement) {
            this.positionTooltip(e);
          }
        } else if (element) {
          this.showTooltip(element, e);
        }
      }
    });

    document.addEventListener('mouseout', (e) => {
      if (!this.isTouchInteraction) {
        const element = e.target.closest('.btn-cart');
        if (element && this.currentElement === element && !element.contains(e.relatedTarget)) {
          this.hideTooltip();
        }
      }
    });

    document.addEventListener('mousedown', (e) => {
      if (!this.isTouchInteraction) {
        const element = e.target.closest('.btn-cart');
        if (element && element.hasAttribute('data-tooltip-hold')) {
          this.isMouseHeld = true;
          this.showTooltip(element, e);
        }
      }
    });

    document.addEventListener('mouseup', (e) => {
      if (this.isMouseHeld) {
        this.isMouseHeld = false;
        if (this.currentElement && this.currentElement.contains(e.target)) {
          this.updateTooltip(this.currentElement);
          this.positionTooltip(e);
        } else {
          this.hideTooltip();
        }
      }
    });
  }
}