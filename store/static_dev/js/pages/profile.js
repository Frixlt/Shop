// --"--\Catalog\store\static_dev\js\pages\profile.js"--
document.addEventListener('DOMContentLoaded', () => {
  // --- Theme Switching ---
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

  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  if (mediaQuery.addEventListener) { // Modern browsers
    mediaQuery.addEventListener('change', () => {
      if (!localStorage.getItem(themeStorageKey) || localStorage.getItem(themeStorageKey) === 'system') {
        setTheme('system');
      }
    });
  } else if (mediaQuery.addListener) { // Older browsers (deprecated)
    mediaQuery.addListener(() => {
      if (!localStorage.getItem(themeStorageKey) || localStorage.getItem(themeStorageKey) === 'system') {
        setTheme('system');
      }
    });
  }


  loadTheme();

  // --- Modal Handling ---
  const fieldEditModal = document.getElementById('field-edit-modal');
  const avatarEditModal = document.getElementById('avatar-edit-modal');
  const fieldEditTitle = document.getElementById('edit-modal-title');
  const fieldEditLabel = document.getElementById('field-edit-label');
  const fieldEditValueInput = document.getElementById('field-edit-value');
  const fieldEditNameInput = document.getElementById('field-edit-name'); // Hidden input for field name
  // const fieldEditSaveBtn = document.getElementById('field-edit-save'); // Button now submits form
  const avatarUploadInput = document.getElementById('avatar-upload');
  const avatarUploadPreview = document.getElementById('avatar-upload-preview');
  const uploadButton = document.getElementById('upload-button');
  const avatarContainer = document.getElementById('avatar-container');
  const changeAvatarBtn = document.getElementById('change-avatar-btn');
  // const fieldEditForm = document.getElementById('field-edit-form'); // Form is submitted directly
  // const avatarEditForm = document.getElementById('avatar-edit-form'); // Form is submitted directly

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

  // Close modal listeners
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

  // --- Field Editing ---
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
        fieldEditValueInput.value = currentValue === '-' ? '' : currentValue; // Handle placeholder
        fieldEditNameInput.value = fieldName; // Set the hidden field name

        // Adjust input type based on field name (example)
        if (fieldName === 'birth_date') {
          fieldEditValueInput.type = 'date';
          // Convert display format DD.MM.YYYY to YYYY-MM-DD for input
          if (currentValue && currentValue !== '-') {
            const parts = currentValue.split('.');
            if (parts.length === 3) {
              fieldEditValueInput.value = `${parts[2]}-${parts[1]}-${parts[0]}`;
            } else {
              fieldEditValueInput.value = ''; // Clear if format is wrong
            }
          } else {
            fieldEditValueInput.value = ''; // Clear if placeholder
          }
        } else if (fieldName === 'email') {
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

  // Save button now directly submits the form via HTML `form="field-edit-form"` attribute
  // No specific JS needed for the save button click itself

  // --- Avatar Editing ---
  const showAvatar = document.querySelector('.profile-container')?.dataset.showAvatar === 'true';

  if (showAvatar) {
    if (changeAvatarBtn) {
      changeAvatarBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(avatarEditModal);
      });
    }

    if (avatarContainer) {
      avatarContainer.addEventListener('click', (e) => {
        // Prevent opening modal if click was on edit icon itself (if it existed)
        if (!e.target.closest('.edit-icon')) {
          openModal(avatarEditModal);
        }
      });
    }

    if (uploadButton && avatarUploadInput) {
      uploadButton.addEventListener('click', () => avatarUploadInput.click());

      avatarUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (avatarUploadPreview) {
              avatarUploadPreview.src = e.target.result;
              avatarUploadPreview.style.display = 'block';
            }
            // Clear predefined selection if a file is uploaded
            // document.querySelectorAll('#avatar-options .avatar-option.selected').forEach(el => el.classList.remove('selected'));
          };
          reader.readAsDataURL(file);
        } else {
          if (avatarUploadPreview) {
            avatarUploadPreview.style.display = 'none';
            avatarUploadPreview.src = '#';
          }
          // Clear the input if the file is invalid
          avatarUploadInput.value = '';
        }
      });
    }

    // Save button now directly submits the form via HTML `form="avatar-edit-form"` attribute
    // No specific JS needed for the save button click itself

  } // end if(showAvatar)

}); // End DOMContentLoaded