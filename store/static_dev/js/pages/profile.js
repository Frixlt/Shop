// --"--\Catalog\store\static_dev\js\pages\profile.js"--
document.addEventListener('DOMContentLoaded', () => {
  const themeSwitcher = document.getElementById('theme-switcher');
  const htmlElement = document.documentElement;
  const themeStorageKey = 'user-theme-preference';

  const setTheme = (theme) => {
    if (theme === 'system') {
      htmlElement.removeAttribute('data-theme');
      localStorage.removeItem(themeStorageKey);
    } else {
      htmlElement.setAttribute('data-theme', theme);
      localStorage.setItem(themeStorageKey, theme);
    }
    if (themeSwitcher) {
      themeSwitcher.value = theme;
    }
  };

  const loadTheme = () => {
    const savedTheme = localStorage.getItem(themeStorageKey);
    setTheme(savedTheme || 'system');
  };

  if (themeSwitcher) {
    themeSwitcher.addEventListener('change', (event) => setTheme(event.target.value));
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', () => {
      if (!localStorage.getItem(themeStorageKey) || localStorage.getItem(themeStorageKey) === 'system') {
        setTheme('system');
      }
    });
  } else if (mediaQuery.addListener) {
    mediaQuery.addListener(() => {
      if (!localStorage.getItem(themeStorageKey) || localStorage.getItem(themeStorageKey) === 'system') {
        setTheme('system');
      }
    });
  }


  loadTheme();

  const fieldEditModal = document.getElementById('field-edit-modal');
  const fieldEditTitle = document.getElementById('edit-modal-title');
  const fieldEditLabel = document.getElementById('field-edit-label');
  const fieldEditValueInput = document.getElementById('field-edit-value');
  const fieldEditNameInput = document.getElementById('field-edit-name');

  const openModal = (modalElement) => {
    if (modalElement) {
      modalElement.classList.add('active');
    }
  };

  const closeModal = (modalElement) => {
    if (modalElement) {
      modalElement.classList.remove('active');
    }
  };

  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.querySelectorAll('[data-modal-close]').forEach(closeBtn => {
      closeBtn.addEventListener('click', () => closeModal(modal));
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(closeModal);
    }
  });

  document.querySelectorAll('.profile-field.editable .edit-icon').forEach(icon => {
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      const fieldElement = icon.closest('.profile-field');
      const fieldName = fieldElement.dataset.fieldName;
      const currentLabel = fieldElement.querySelector('.field-label').textContent.trim();
      const currentValue = fieldElement.querySelector('.field-value').textContent.trim();

      if (fieldEditModal && fieldEditTitle && fieldEditLabel && fieldEditValueInput && fieldEditNameInput) {
        fieldEditTitle.textContent = `Редактировать: ${currentLabel}`;
        fieldEditLabel.textContent = `${currentLabel}:`;
        fieldEditValueInput.value = currentValue === '-' ? '' : currentValue;
        fieldEditNameInput.value = fieldName;

        if (fieldName === 'email') {
          fieldEditValueInput.type = 'email';
        } else if (fieldName === 'phone_number') {
          fieldEditValueInput.type = 'tel';
        } else {
          fieldEditValueInput.type = 'text';
        }

        openModal(fieldEditModal);
        setTimeout(() => fieldEditValueInput.focus(), 50);
      }
    });
  });

});