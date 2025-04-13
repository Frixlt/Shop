// js/forms.js
export function createFormField(config) {
  const {
    type = 'text',
    id,
    name = id,
    label,
    placeholder = '',
    required = false,
    icon = 'fa-question',
    options = [],
    optional = false,
    description = null,
    parentFormId = null,
    validationRules = {}
  } = config;

  const fieldDiv = document.createElement('div');
  fieldDiv.className = 'form-field';

  if (label && type !== 'checkbox' && type !== 'radio-group') {
    const labelEl = document.createElement('label');
    labelEl.htmlFor = id;

    const labelText = document.createElement('span');
    labelText.textContent = label;
    labelEl.appendChild(labelText);

    if (optional) {
      const optionalSpan = document.createElement('span');
      optionalSpan.className = 'optional-text';
      optionalSpan.textContent = window.DJANGO_LANGUAGE_CODE === 'ru' ? '(необязательно)' : '(optional)';
      labelEl.appendChild(optionalSpan);
    }

    fieldDiv.appendChild(labelEl);
  }

  switch (type) {
    case 'text':
    case 'email':
    case 'password':
    case 'tel':
    case 'number':
    case 'date':
      const inputWrapper = document.createElement('div');
      inputWrapper.className = 'input-wrapper';

      const input = document.createElement('input');
      input.type = type;
      input.id = id;
      input.name = name;
      input.className = 'auth-input';
      input.placeholder = placeholder;
      if (required) input.required = true;

      const iconEl = document.createElement('i');
      iconEl.className = `fas ${icon} input-icon`;

      const successIcon = document.createElement('i');
      successIcon.className = 'fas fa-check-circle input-feedback success-icon';
      successIcon.style.color = 'var(--accent-color)';

      const errorIcon = document.createElement('i');
      errorIcon.className = 'fas fa-times-circle input-feedback error-icon';
      errorIcon.style.color = '#dc3545';

      inputWrapper.appendChild(input);
      inputWrapper.appendChild(iconEl);
      inputWrapper.appendChild(successIcon);
      inputWrapper.appendChild(errorIcon);

      if (type === 'password') {
        const toggleIcon = document.createElement('i');
        toggleIcon.className = 'far fa-eye password-toggle-icon';
        toggleIcon.setAttribute('data-target', id);
        inputWrapper.appendChild(toggleIcon);
      }

      fieldDiv.appendChild(inputWrapper);

      const errorDiv = document.createElement('div');
      errorDiv.className = 'form-error';
      errorDiv.id = `${id}-error`;
      fieldDiv.appendChild(errorDiv);
      break;

    case 'select':
      const selectWrapper = document.createElement('div');
      selectWrapper.className = 'select-wrapper';

      const select = document.createElement('select');
      select.id = id;
      select.name = name;
      select.className = 'auth-select';
      if (required) select.required = true;

      if (placeholder) {
        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = placeholder;
        placeholderOption.disabled = true;
        placeholderOption.selected = true;
        select.appendChild(placeholderOption);
      }

      options.forEach(option => {
        const optionEl = document.createElement('option');
        optionEl.value = option.value;
        optionEl.textContent = option.label;
        select.appendChild(optionEl);
      });

      const selectIcon = document.createElement('i');
      selectIcon.className = `fas ${icon} input-icon`;

      const arrowIcon = document.createElement('i');
      arrowIcon.className = 'fas fa-chevron-down select-arrow';

      selectWrapper.appendChild(select);
      selectWrapper.appendChild(selectIcon);
      selectWrapper.appendChild(arrowIcon);

      fieldDiv.appendChild(selectWrapper);

      const selectErrorDiv = document.createElement('div');
      selectErrorDiv.className = 'form-error';
      selectErrorDiv.id = `${id}-error`;
      fieldDiv.appendChild(selectErrorDiv);
      break;

    case 'textarea':
      const textareaWrapper = document.createElement('div');
      textareaWrapper.className = 'input-wrapper';

      const textarea = document.createElement('textarea');
      textarea.id = id;
      textarea.name = name;
      textarea.className = 'auth-textarea';
      textarea.placeholder = placeholder;
      if (required) textarea.required = true;

      const textareaIcon = document.createElement('i');
      textareaIcon.className = `fas ${icon} input-icon`;

      textareaWrapper.appendChild(textarea);
      textareaWrapper.appendChild(textareaIcon);

      fieldDiv.appendChild(textareaWrapper);

      const textareaErrorDiv = document.createElement('div');
      textareaErrorDiv.className = 'form-error';
      textareaErrorDiv.id = `${id}-error`;
      fieldDiv.appendChild(textareaErrorDiv);
      break;

    case 'checkbox':
      fieldDiv.className = 'form-field checkbox-field';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = id;
      checkbox.name = name;
      checkbox.className = 'checkbox-input';
      if (required) checkbox.required = true;

      const checkboxLabel = document.createElement('label');
      checkboxLabel.htmlFor = id;
      checkboxLabel.className = 'checkbox-label';

      if (label && typeof label === 'string' && label.includes('<a')) {
        checkboxLabel.innerHTML = label;
      } else if (label) {
        const textSpan = document.createElement('span');
        textSpan.className = 'checkbox-text';
        textSpan.textContent = label;
        checkboxLabel.appendChild(textSpan);
      }

      fieldDiv.appendChild(checkbox);
      fieldDiv.appendChild(checkboxLabel);

      const checkboxErrorDiv = document.createElement('div');
      checkboxErrorDiv.className = 'form-error';
      checkboxErrorDiv.id = `${id}-error`;
      checkboxErrorDiv.style.marginTop = '-0.8rem';
      checkboxErrorDiv.style.marginBottom = '1rem';
      checkboxErrorDiv.style.display = 'none';

      if (parentFormId) {
        const parentForm = document.getElementById(parentFormId);
        if (parentForm) {
          const submitButton = parentForm.querySelector('button[type="submit"]');
          if (submitButton) {
            parentForm.insertBefore(fieldDiv, submitButton);
            parentForm.insertBefore(checkboxErrorDiv, fieldDiv.nextSibling);
          } else {
            parentForm.appendChild(fieldDiv);
            parentForm.appendChild(checkboxErrorDiv);
          }
        }
      } else {
        fieldDiv.appendChild(checkboxErrorDiv);
      }
      return fieldDiv;

    case 'radio-group':
      fieldDiv.classList.add('radio-group-container');

      const radioGroupLabel = document.createElement('label');
      radioGroupLabel.className = 'radio-group-label';
      radioGroupLabel.textContent = label || '';
      fieldDiv.appendChild(radioGroupLabel);

      const radioGroup = document.createElement('div');
      radioGroup.className = 'radio-group';

      options.forEach(option => {
        const radioField = document.createElement('div');
        radioField.className = 'radio-field';

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.id = `${id}-${option.value}`;
        radio.name = name;
        radio.value = option.value;
        radio.className = 'radio-input';
        if (option.checked) radio.checked = true;
        if (required && !options.some(o => o.checked)) {
          if (options.indexOf(option) === 0) radio.required = true;
        }

        const radioLabel = document.createElement('label');
        radioLabel.htmlFor = `${id}-${option.value}`;
        radioLabel.className = 'radio-label';
        radioLabel.textContent = option.label;

        radioField.appendChild(radio);
        radioField.appendChild(radioLabel);
        radioGroup.appendChild(radioField);
      });

      fieldDiv.appendChild(radioGroup);
      break;

    case 'file':
      const fileField = document.createElement('div');
      fileField.className = 'file-field';

      const fileButton = document.createElement('div');
      fileButton.className = 'file-button';

      const fileIcon = document.createElement('i');
      fileIcon.className = `fas ${icon}`;

      const fileSpan = document.createElement('span');
      fileSpan.textContent = placeholder || (window.DJANGO_LANGUAGE_CODE === 'ru' ? 'Выберите файл' : 'Choose file');

      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.id = id;
      fileInput.name = name;
      fileInput.className = 'file-input';
      if (config.accept) fileInput.accept = config.accept;
      if (required) fileInput.required = true;

      const fileName = document.createElement('div');
      fileName.className = 'file-name';

      fileButton.appendChild(fileIcon);
      fileButton.appendChild(fileSpan);
      fieldField.appendChild(fileButton);
      fieldField.appendChild(fileInput);
      fieldDiv.appendChild(fileField);
      fieldDiv.appendChild(fileName);

      fileInput.addEventListener('change', function () {
        if (this.files && this.files[0]) {
          fileName.textContent = this.files[0].name;
          fileButton.style.borderColor = 'var(--accent-color)';
        } else {
          fileName.textContent = '';
          fileButton.style.borderColor = '';
        }
      });
      break;
  }

  if (description && type !== 'checkbox' && type !== 'radio-group') {
    const descriptionEl = document.createElement('p');
    descriptionEl.className = 'form-field-description';
    descriptionEl.textContent = description;
    fieldDiv.appendChild(descriptionEl);
  }

  if (parentFormId && type !== 'checkbox') {
    const parentForm = document.getElementById(parentFormId);
    if (parentForm) {
      const submitButton = parentForm.querySelector('button[type="submit"]');
      if (submitButton) {
        parentForm.insertBefore(fieldDiv, submitButton);
      } else {
        parentForm.appendChild(fieldDiv);
      }
    }
  }

  return fieldDiv;
}

export function initializeForms() {
  const tabs = document.querySelectorAll('.auth-tab');
  const forms = document.querySelectorAll('.auth-form');
  const switchLinks = document.querySelectorAll('.auth-link[data-switch-tab]');
  const tabIndicator = document.querySelector('.tab-indicator');
  const authForms = document.querySelectorAll('form.auth-form');

  function updateTabIndicator(activeTab) {
    if (!tabIndicator || window.innerWidth <= 480) return;
    tabIndicator.style.width = `${activeTab.offsetWidth}px`;
    tabIndicator.style.left = `${activeTab.offsetLeft}px`;
  }

  function setActiveTab(targetFormId) {
    const activeTab = document.querySelector(`.auth-tab[data-form="${targetFormId}"]`);
    if (!activeTab) return;

    tabs.forEach(tab => tab.classList.toggle('active', tab === activeTab));
    forms.forEach(form => {
      const isActive = form.id === targetFormId;
      form.classList.toggle('active', isActive);
      if (isActive) {
        setTimeout(() => form.querySelector('input:not([type=hidden]), select, textarea')?.focus(), 300);
      }
    });

    updateTabIndicator(activeTab);
  }

  const initialActiveTab = document.querySelector('.auth-tab.active');
  if (initialActiveTab) {
    updateTabIndicator(initialActiveTab);
  }

  tabs.forEach(tab => tab.addEventListener('click', () => setActiveTab(tab.getAttribute('data-form'))));

  switchLinks.forEach(link => link.addEventListener('click', (e) => {
    e.preventDefault();
    const targetForm = link.getAttribute('data-switch-tab');
    const authContainer = document.querySelector('.auth-container');
    if (authContainer) {
      authContainer.classList.add('animate__animated', 'animate__fadeIn');
      setTimeout(() => {
        authContainer.classList.remove('animate__animated', 'animate__fadeIn');
      }, 500);
    }
    setActiveTab(targetForm);
  }));

  document.body.addEventListener('click', function (event) {
    if (event.target.matches('.password-toggle-icon')) {
      const toggle = event.target;
      const targetInput = document.getElementById(toggle.getAttribute('data-target'));
      if (targetInput) {
        targetInput.type = targetInput.type === 'password' ? 'text' : 'password';
        toggle.classList.toggle('fa-eye');
        toggle.classList.toggle('fa-eye-slash');
      }
    }
  });

  function validateField(field) {
    const wrapper = field.closest('.input-wrapper') || field.closest('.select-wrapper') || field.closest('.checkbox-field') || field.closest('.radio-field');
    let errorElement = document.getElementById(`${field.id}-error`);
    if (!errorElement && wrapper && wrapper.nextElementSibling && wrapper.nextElementSibling.classList.contains('form-error')) {
      errorElement = wrapper.nextElementSibling;
    } else if (!errorElement && field.type === 'checkbox') {
      const form = field.closest('form');
      if (form) errorElement = form.querySelector(`#${field.id}-error`);
    }

    let isValid = true;
    let errorMessage = window.DJANGO_LANGUAGE_CODE === 'ru' ? 'Это поле обязательно для заполнения' : 'This field is required';

    if (wrapper && wrapper.classList.contains('input-wrapper')) {
      wrapper.classList.remove('error', 'success');
    }
    if (errorElement) errorElement.style.display = 'none';

    if (field.required) {
      if (field.type === 'checkbox' && !field.checked) {
        errorMessage = window.DJANGO_LANGUAGE_CODE === 'ru' ? 'Необходимо принять условия использования' : 'You must accept the terms';
        isValid = false;
      } else if (field.type === 'radio') {
        const groupName = field.name;
        const group = field.closest('form')?.querySelectorAll(`input[name="${groupName}"]`);
        if (group && !Array.from(group).some(radio => radio.checked)) {
          isValid = false;
        }
      } else if (!field.value.trim() && field.type !== 'checkbox' && field.type !== 'radio') {
        isValid = false;
      }
    }

    if (isValid && field.type === 'email' && field.value.trim()) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(field.value)) {
        errorMessage = window.DJANGO_LANGUAGE_CODE === 'ru' ? 'Пожалуйста, введите корректный email' : 'Please enter a valid email';
        isValid = false;
      }
    }

    if (isValid && field.name === 'phone' && field.value.trim() && field.value.trim() !== '+7 (___) ___-____') {
      const phonePattern = /^\+?\d{10,15}$/;
      if (!phonePattern.test(field.value.replace(/\D/g, ''))) {
        errorMessage = window.DJANGO_LANGUAGE_CODE === 'ru' ? 'Пожалуйста, введите корректный телефон' : 'Please enter a valid phone number';
        isValid = false;
      }
    }

    if (isValid && field.name === 'password' && field.value.trim()) {
      if (field.id === 'register-password') {
        const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
        if (!passwordPattern.test(field.value)) {
          errorMessage = window.DJANGO_LANGUAGE_CODE === 'ru' ? 'Пароль должен содержать минимум 8 символов, буквы и цифры' : 'Password must be at least 8 characters, including letters and numbers';
          isValid = false;
        }
      } else if (field.id === 'login-password' && field.value.length < 6) {
        errorMessage = window.DJANGO_LANGUAGE_CODE === 'ru' ? 'Пароль должен содержать минимум 6 символов' : 'Password must be at least 6 characters';
        isValid = false;
      }
    }

    if (isValid && field.id === 'register-confirm-password') {
      const passwordField = document.getElementById('register-password');
      if (passwordField && field.value !== passwordField.value) {
        errorMessage = window.DJANGO_LANGUAGE_CODE === 'ru' ? 'Пароли не совпадают' : 'Passwords do not match';
        isValid = false;
      }
    }

    if (isValid && field.id === 'register-name' && field.value.trim()) {
      if (field.value.trim().length < 3) {
        errorMessage = window.DJANGO_LANGUAGE_CODE === 'ru' ? 'Имя должно содержать минимум 3 символа' : 'Name must be at least 3 characters';
        isValid = false;
      }
    }

    if (!isValid) {
      if (wrapper && wrapper.classList.contains('input-wrapper')) {
        wrapper.classList.add('error');
      }
      if (errorElement) {
        errorElement.textContent = errorMessage;
        errorElement.style.display = 'block';
      }
    } else {
      if (wrapper && wrapper.classList.contains('input-wrapper') && field.value.trim()) {
        wrapper.classList.add('success');
      }
      if (errorElement) {
        errorElement.style.display = 'none';
      }
    }

    return isValid;
  }

  document.body.addEventListener('input', function (event) {
    if (event.target.matches('.auth-input, .auth-select, .auth-textarea, .checkbox-input, .radio-input')) {
      const field = event.target;
      const wrapper = field.closest('.input-wrapper') || field.closest('.select-wrapper');
      if (wrapper && wrapper.classList.contains('error')) {
        validateField(field);
      } else if (field.type === 'checkbox' || field.type === 'radio') {
        validateField(field);
      }
    }
  });

  document.body.addEventListener('blur', function (event) {
    if (event.target.matches('.auth-input, .auth-select, .auth-textarea')) {
      validateField(event.target);
    }
  }, true);

  document.body.addEventListener('focus', function (event) {
    if (event.target.matches('.auth-input, .auth-select, .auth-textarea')) {
      const wrapper = event.target.closest('.input-wrapper') || event.target.closest('.select-wrapper');
      if (wrapper) wrapper.classList.add('input-focus');
    }
  }, true);

  document.body.addEventListener('blur', function (event) {
    if (event.target.matches('.auth-input, .auth-select, .auth-textarea')) {
      const wrapper = event.target.closest('.input-wrapper') || event.target.closest('.select-wrapper');
      if (wrapper) wrapper.classList.remove('input-focus');
    }
  }, true);

  authForms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let isFormValid = true;

      form.querySelectorAll('.auth-input, .auth-select, .auth-textarea, .checkbox-input[required], .radio-input[required]').forEach(field => {
        if (field.type === 'radio') {
          if (!form.querySelector(`input[name="${field.name}"]:checked`)) {
            if (!validateField(field)) {
              isFormValid = false;
            }
          }
        } else {
          if (!validateField(field)) {
            isFormValid = false;
          }
        }
      });

      if (isFormValid) {
        const submitBtn = form.querySelector('.auth-button');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> ' +
          (window.DJANGO_LANGUAGE_CODE === 'ru' ? 'Обработка...' : 'Processing...');

        // Симуляция отправки (замените на реальный запрос)
        setTimeout(() => {
          submitBtn.innerHTML = '<i class="fas fa-check"></i> ' +
            (window.DJANGO_LANGUAGE_CODE === 'ru' ? 'Успешно!' : 'Success!');
          submitBtn.style.backgroundColor = '#28a745';

          setTimeout(() => {
            submitBtn.innerHTML = originalText;
            submitBtn.style.backgroundColor = '';
            submitBtn.disabled = false;
            // Раскомментируйте для реальной отправки
            // form.submit();
          }, 2000);
        }, 1500);
      } else {
        form.classList.add('animate__animated', 'animate__shakeX');
        setTimeout(() => {
          form.classList.remove('animate__animated', 'animate__shakeX');
        }, 600);
        const firstErrorField = form.querySelector('.error input, .error select, .error textarea, .form-error[style*="block"]');
        firstErrorField?.focus();
      }
    });
  });
}