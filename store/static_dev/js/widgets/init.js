// --"--\Catalog\store\static_dev\js\widgets\init.js"--
import TextInput from "./text_input.js";
import { initPasswordInputs } from "./password_input.js";
import { initAllCustomSelects } from "./select_input.js";
import { initCheckboxes, validateCheckbox } from "./checkbox_input.js";
import { FileUpload } from "./file_input.js";

// --- Global Validation Helper for Custom Select ---
function validateCustomSelect(widgetContainer) {
  if (!widgetContainer || !widgetContainer.dataset.nativeSelectId) { return true; }

  const instance = widgetContainer.widgetInstance;
  const config = instance?.config;
  const nativeSelectId = widgetContainer.dataset.nativeSelectId;
  const nativeSelect = document.getElementById(nativeSelectId);
  // --- Используем ID для ошибки из шаблона виджета ---
  const errorElementId = `${widgetContainer.id}-error`; // ID кастомного виджета + '-error'
  const errorElement = document.getElementById(errorElementId);

  if (!nativeSelect) { // Убрали проверку errorElement, т.к. он может быть создан JS
    console.warn(`validateCustomSelect: Missing native select for ${nativeSelectId}`);
    return true;
  }
  if (widgetContainer.classList.contains('select--open') || !instance || !config) {
    return true;
  }

  const minSelections = config.minSelections || 0;
  const requiredMessage = widgetContainer.dataset.requiredMessage || nativeSelect.dataset.requiredMessage || "Это поле обязательно для заполнения.";
  const minSelectionsMessageTemplate = config.minSelectionsMessage || 'Выберите минимум {min} элемент(а/ов)';
  const selectedOptions = Array.from(nativeSelect.selectedOptions).filter(option => option.value);
  const selectedCount = selectedOptions.length;
  let isValid = true;
  let errorMessage = "";

  if (nativeSelect.hasAttribute('required') && minSelections <= 1 && selectedCount === 0) {
    isValid = false;
    errorMessage = requiredMessage;
  } else if (minSelections > 0 && selectedCount < minSelections) {
    isValid = false;
    errorMessage = minSelectionsMessageTemplate.replace('{min}', minSelections);
  }

  // --- Обновляем UI через JS ---
  widgetContainer.classList.toggle('select--error', !isValid); // Добавляем/удаляем класс ошибки на контейнер виджета
  if (errorElement) { // Проверяем, существует ли элемент ошибки
    if (!isValid) {
      errorElement.textContent = errorMessage;
      errorElement.style.display = 'block';
      errorElement.classList.add('shake');
      setTimeout(() => { errorElement.classList.remove('shake'); }, 400);
    } else {
      errorElement.textContent = '';
      errorElement.style.display = 'none';
      errorElement.classList.remove('shake');
    }
  } else if (!isValid) {
    // Если элемента ошибки нет, можно его создать или вывести в консоль
    console.warn(`validateCustomSelect: Error element #${errorElementId} not found for message: ${errorMessage}`);
  }
  // --- Конец обновления UI ---

  return isValid;
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Content Loaded. Initializing widgets...");

  window.textInputInstances = {};
  window.fileUploadInstances = {};

  const forms = document.querySelectorAll("form");

  initPasswordInputs();
  initAllCustomSelects();
  initCheckboxes();

  const fileWidgetContainers = document.querySelectorAll(".file-upload-container");
  fileWidgetContainers.forEach(container => {
    const fileInput = container.querySelector('.file-input');
    if (fileInput && fileInput.id && !window.fileUploadInstances[fileInput.id]) {
      try {
        window.fileUploadInstances[fileInput.id] = new FileUpload(container);
      } catch (e) {
        console.error(`Error initializing FileUpload for #${fileInput.id}:`, e);
        container.innerHTML = `<p style="color:red;">Error loading file widget.</p>`;
      }
    } else if (fileInput && !fileInput.id) {
      console.warn(`FileUpload init: File input missing ID inside container:`, container);
    }
  });

  const textFields = document.querySelectorAll(".auth-input, .auth-textarea");
  textFields.forEach((fieldElement) => {
    if (fieldElement.id && !window.textInputInstances[fieldElement.id]) {
      window.textInputInstances[fieldElement.id] = new TextInput(fieldElement);
    } else if (!fieldElement.id) {
      console.warn(`TextInput init: Input or Textarea element without ID skipped.`, fieldElement);
    }
  });

  forms.forEach((form) => {
    const formId = form.id || form.name || 'unnamed_form';
    console.log(`[${formId}] Attaching standard submit handler with client-side validation...`);

    const focusableElements = Array.from(form.querySelectorAll(
      'input:not([type="hidden"]):not([type="checkbox"]):not([type="file"]):not([disabled]), ' +
      'select:not([disabled]), ' +
      'textarea:not([disabled]), ' +
      'button:not([disabled]), ' +
      '.select-header'
    ));

    // --- Enter Key Navigation (Оставляем как есть) ---
    form.querySelectorAll('.auth-input, .select-header').forEach((element) => {
      const isTextInput = element.matches('.auth-input') && element.id && window.textInputInstances[element.id];
      const isSelectHeader = element.matches('.select-header');

      if (isTextInput || isSelectHeader) {
        element.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            if (element.tagName === 'TEXTAREA' && !(event.ctrlKey || event.metaKey || event.shiftKey)) {
              return;
            }
            event.preventDefault();
            let proceedToNextField = true;
            if (isTextInput) {
              const instance = window.textInputInstances[element.id];
              // --- Вызываем JS валидацию при Enter ---
              if (instance && !instance.validate()) { proceedToNextField = false; }
            } else if (isSelectHeader) {
              const customWidget = element.closest('.django-custom-select-widget');
              if (customWidget?.classList.contains('select--open') && customWidget.widgetInstance) {
                customWidget.widgetInstance.close();
              } else if (customWidget) {
                // --- Вызываем JS валидацию при Enter ---
                if (!validateCustomSelect(customWidget)) { proceedToNextField = false; }
              }
            }
            if (proceedToNextField) {
              const currentIndex = focusableElements.findIndex(el => el === element || el.closest('.django-custom-select-widget') === element.closest('.django-custom-select-widget'));
              const nextIndex = currentIndex + 1;
              if (currentIndex > -1 && nextIndex < focusableElements.length) {
                focusableElements[nextIndex]?.focus();
              } else if (currentIndex === focusableElements.length - 1) {
                form.querySelector('button[type="submit"]')?.focus();
              }
            }
          }
        });
      }
    });
    form.querySelectorAll('.auth-textarea').forEach(textarea => {
      textarea.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          form.requestSubmit();
        }
      });
    });
    // --- End Enter Key Navigation ---


    // --- Blur Validation (Оставляем как есть, вызывает JS валидацию) ---
    form.querySelectorAll('.auth-input:not([data-confirm-target]), .auth-textarea').forEach(field => {
      if (field.id && window.textInputInstances[field.id]) {
        field.addEventListener('blur', () => { window.textInputInstances[field.id].validate(); });
      }
    });
    form.querySelectorAll('.django-custom-select-widget').forEach(widgetContainer => {
      widgetContainer.addEventListener('focusout', (event) => {
        if (!widgetContainer.contains(event.relatedTarget)) {
          setTimeout(() => {
            if (!widgetContainer.classList.contains('select--open')) { validateCustomSelect(widgetContainer); }
          }, 100);
        }
      });
    });
    form.querySelectorAll('.checkbox-input[required]').forEach(checkbox => {
      checkbox.addEventListener('blur', () => validateCheckbox(checkbox));
      checkbox.addEventListener('change', () => validateCheckbox(checkbox)); // Validate on change too
    });
    // File input validation on change is handled within FileUpload class


    // --- Form Submission Handler (Standard Submit + Client Validation) ---
    form.addEventListener("submit", (event) => {
      console.log(`[${formId}] Form submission attempt (standard + client validation)...`);

      let isFormValid = true;
      let firstInvalidElement = null;

      // --- Reset *Client-Side* UI States Before Validation ---
      // Django errors will persist until next page load
      form.querySelectorAll(".auth-input, .auth-textarea").forEach(input => window.textInputInstances?.[input.id]?.resetUI());
      form.querySelectorAll(".django-custom-select-widget").forEach(widgetContainer => {
        widgetContainer.classList.remove('select--error'); // Remove JS error class
        const errorElement = document.getElementById(`${widgetContainer.id}-error`); // Target JS error element
        if (errorElement) { errorElement.style.display = 'none'; errorElement.textContent = ''; errorElement.classList.remove('shake'); }
      });
      form.querySelectorAll(".checkbox-field").forEach(fieldContainer => {
        fieldContainer.classList.remove('error'); // Remove JS error class
        const errorElement = fieldContainer.querySelector('.form-error'); // Target JS error element
        if (errorElement) { errorElement.style.display = 'none'; errorElement.textContent = ''; errorElement.classList.remove('shake'); }
      });
      form.querySelectorAll(".file-upload-container").forEach(container => {
        const fileInput = container.querySelector('.file-input');
        if (fileInput?.id) {
          const instance = window.fileUploadInstances?.[fileInput.id];
          if (instance?.errorMessage) { // Target JS error element
            instance.errorMessage.classList.add('hidden');
            instance.errorMessage.textContent = '';
          }
          instance?.container?.classList.remove('upload-error'); // Remove JS error class
        }
      });

      // --- Perform Client-Side Validation ---
      const formInputsToValidate = form.querySelectorAll(
        ".auth-input, .auth-textarea, " +
        ".django-custom-select-widget, " +
        ".checkbox-input[required], " +
        ".file-input"
      );

      formInputsToValidate.forEach(element => {
        let currentFieldIsValid = true; // Assume valid initially

        // Validate Text/Textarea using JS instance
        if (element.matches('.auth-input, .auth-textarea') && element.id && window.textInputInstances?.[element.id]) {
          if (!window.textInputInstances[element.id].validate()) { currentFieldIsValid = false; }
        }
        // Validate Custom Select using JS helper
        else if (element.matches('.django-custom-select-widget')) {
          if (!validateCustomSelect(element)) { currentFieldIsValid = false; }
        }
        // Validate Checkbox using JS helper
        else if (element.matches('.checkbox-input[required]')) {
          if (!validateCheckbox(element)) {
            currentFieldIsValid = false;
          }
        }
        // Validate File Input using JS instance (checks required + JS errors)
        else if (element.matches('.file-input')) {
          const instance = window.fileUploadInstances?.[element.id];
          if (instance) {
            let fieldHasError = false;
            // Required check
            if (element.hasAttribute('required') && instance.uploadedFiles.length === 0) {
              fieldHasError = true;
              const requiredMsg = element.dataset.requiredMessage || "Please select at least one file.";
              if (instance.errorMessage) {
                instance.errorMessage.textContent = requiredMsg;
                instance.errorMessage.classList.remove('hidden');
                instance.container?.classList.add('upload-error'); // Add JS error class
              }
            } else {
              // Clear previous *required* error if it was showing and is now resolved
              const currentRequiredMsg = element.dataset.requiredMessage || "Please select at least one file.";
              if (instance.errorMessage && instance.errorMessage.textContent === currentRequiredMsg) {
                instance.errorMessage.textContent = '';
                instance.errorMessage.classList.add('hidden');
                instance.container?.classList.remove('upload-error'); // Remove JS error class
              }
            }

            // Check if the JS widget has displayed an error (visible AND has content)
            if (instance.errorMessage &&
              !instance.errorMessage.classList.contains('hidden') &&
              instance.errorMessage.textContent.trim() !== '') {
              fieldHasError = true;
              console.log(`[${formId}] File input #${element.id} invalid due to visible JS error message: "${instance.errorMessage.textContent}"`);
              instance.container?.classList.add('upload-error'); // Ensure JS error class is set
            }

            if (fieldHasError) {
              currentFieldIsValid = false;
            }
          }
        }

        // Track the first invalid element for focusing
        if (!currentFieldIsValid && !firstInvalidElement) {
          firstInvalidElement = element.matches('.django-custom-select-widget')
            ? element.querySelector('.select-header') || element
            : element.matches('.checkbox-input')
              ? element.closest('.checkbox-field')?.querySelector('.checkbox-custom') || element.closest('.checkbox-field') || element
              : element.matches('.file-input')
                ? element.closest('.file-upload-container')?.querySelector('.dropzone') || element.closest('.file-upload-container') || element
                : element;
        }
        isFormValid = isFormValid && currentFieldIsValid;
      }); // End validation loop

      // --- Handle Invalid Form (Client-Side) ---
      if (!isFormValid) {
        console.log(`[${formId}] Form is invalid on client-side. Preventing submission.`);
        event.preventDefault(); // Prevent standard form submission

        form.classList.add("animate__animated", "animate__shakeX");
        setTimeout(() => { form.classList.remove("animate__animated", "animate__shakeX"); }, 600);
        if (firstInvalidElement) {
          let elementToFocus = firstInvalidElement;
          if (firstInvalidElement.matches('.checkbox-field') || firstInvalidElement.matches('.file-upload-container')) {
            elementToFocus = firstInvalidElement.querySelector('input, button, .checkbox-custom, .dropzone') || firstInvalidElement;
          }

          console.log(`[${formId}] Focusing/Scrolling to:`, elementToFocus);
          if (typeof elementToFocus.focus === 'function') {
            elementToFocus.focus({ preventScroll: true });
          }
          const elementToScroll = firstInvalidElement.closest('.form-field') || firstInvalidElement;
          if (typeof elementToScroll.scrollIntoView === 'function') {
            elementToScroll.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
        return; // Stop further processing
      }

      // --- If form is valid client-side, allow standard submission ---
      console.log(`[${formId}] Form is valid client-side. Allowing standard submission.`);

      const submitButton = form.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Обработка...';
      }

      // Update native file input before standard submission
      form.querySelectorAll('.file-input').forEach(fileInput => {
        const instance = window.fileUploadInstances?.[fileInput.id];
        if (instance) {
          instance.updateNativeInputFileList();
        }
      });
      // The form will now submit normally via the browser.

    }); // End form submit listener
  }); // End forms.forEach

  console.log("Widget initialization finished.");
}); // End DOMContentLoaded