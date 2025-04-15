// --"--\Catalog\store\static_dev\js\widgets\init.js"--
import TextInput from "./text_input.js";
import { initPasswordInputs } from "./password_input.js";
import { initAllCustomSelects } from "./select_input.js";

// --- Функция валидации кастомного селекта ---
// В Catalog\store\static_dev\js\widgets\init.js
function validateCustomSelect(widgetContainer) {
  if (!widgetContainer || !widgetContainer.widgetInstance || !widgetContainer.dataset.nativeSelectId) {
    console.warn("Validation: Cannot validate custom select - missing container, instance, or nativeSelectId dataset.", widgetContainer);
    return true;
  }

  // Игнорируем валидацию, если меню открыто
  if (widgetContainer.classList.contains('select--open')) {
    return true;
  }

  const instance = widgetContainer.widgetInstance;
  const config = instance.config;
  const nativeSelectId = widgetContainer.dataset.nativeSelectId;
  const nativeSelect = document.getElementById(nativeSelectId);
  const errorElementId = `${nativeSelectId}-error`;
  const errorElement = document.getElementById(errorElementId);

  if (!instance || !config || !nativeSelect || !errorElement) {
    console.warn("Validation: Missing required elements for select validation:", { instance, config, nativeSelect, errorElement }, widgetContainer);
    return true;
  }

  const minSelections = config.minSelections || 0;
  const requiredMessage = widgetContainer.dataset.requiredMessage || nativeSelect.dataset.requiredMessage || "Это поле обязательно для заполнения.";
  const minSelectionsMessageTemplate = config.minSelectionsMessage || 'Выберите минимум {min} элемент(а/ов)';

  const selectedOptions = Array.from(nativeSelect.selectedOptions).filter(opt => opt.value);
  const selectedCount = selectedOptions.length;

  let isValid = true;
  let errorMessage = "";

  if (minSelections > 0 && selectedCount < minSelections) {
    isValid = false;
    errorMessage = minSelectionsMessageTemplate.replace('{min}', minSelections);
  } else if (nativeSelect.hasAttribute('required') && selectedCount === 0) {
    isValid = false;
    errorMessage = requiredMessage;
  }

  widgetContainer.classList.toggle('select--error', !isValid);
  if (!isValid) {
    errorElement.textContent = errorMessage;
    errorElement.style.display = 'block';
    errorElement.classList.add('shake');
    setTimeout(() => errorElement.classList.remove('shake'), 400);
  } else {
    errorElement.textContent = '';
    errorElement.style.display = 'none';
    errorElement.classList.remove('shake');
  }

  console.log(`Validate select ${nativeSelectId}: selectedCount=${selectedCount}, minSelections=${minSelections}, isValid=${isValid}`);
  return isValid;
}
// --- Конец функции валидации ---

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Content Loaded. Initializing widgets...");

  // Глобальное хранилище экземпляров TextInput
  window.textInputInstances = {};

  const forms = document.querySelectorAll("form[novalidate]");

  // Инициализация виджетов
  initPasswordInputs();
  initAllCustomSelects();

  forms.forEach((form) => {
    console.log(`Processing form: #${form.id || form.name || 'unnamed'}`);

    // Инициализация TextInput для всех полей
    const textInputs = form.querySelectorAll(".auth-input");
    textInputs.forEach((input) => {
      if (input.id) {
        window.textInputInstances[input.id] = new TextInput(input);
      } else {
        console.warn("TextInput init: Input element without ID skipped.", input);
      }
    });

    // Управление фокусом (навигация по Enter)
    const focusableElements = Array.from(
      form.querySelectorAll('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), .select-header')
    );

    form.querySelectorAll('.auth-input, .select-header').forEach((element) => {
      const isTextInput = element.matches('.auth-input') && element.id && window.textInputInstances[element.id];
      const isSelectHeader = element.matches('.select-header');

      if (isTextInput || isSelectHeader) {
        element.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            let proceed = true;

            // Валидация текущего поля
            if (isTextInput) {
              const instance = window.textInputInstances[element.id];
              if (!instance.validate()) {
                proceed = false;
              }
            } else if (isSelectHeader) {
              const customWidget = element.closest('.django-custom-select-widget');
              if (customWidget) {
                // Закрываем выпадающее меню, если открыто
                if (customWidget.classList.contains('select--open') && customWidget.widgetInstance) {
                  customWidget.widgetInstance.close();
                }
                // Валидация будет вызвана в select_input.js при закрытии
              }
            }

            // Перемещение фокуса
            if (proceed) {
              const currentIndex = focusableElements.findIndex(el => el === element);
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

    // Валидация при потере фокуса
    form.querySelectorAll('.auth-input:not([data-confirm-target]), .auth-textarea').forEach(field => {
      if (field.id && window.textInputInstances[field.id]) {
        field.addEventListener('blur', () => {
          window.textInputInstances[field.id].validate();
        });
      }
    });

    // Валидация кастомных селектов при потере фокуса
    form.querySelectorAll('.django-custom-select-widget').forEach(widgetContainer => {
      widgetContainer.addEventListener('focusout', (e) => {
        if (!widgetContainer.contains(e.relatedTarget)) {
          validateCustomSelect(widgetContainer);
        }
      });
    });

    // Обработка отправки формы (AJAX)
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      console.log(`Form submission attempt: #${form.id || 'unnamed'}`);

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalBtnHTML = submitBtn ? submitBtn.innerHTML : "";
      const genericErrorDivId = form.dataset.genericErrorId || "form-generic-error";
      const successDivId = form.dataset.successId || "form-success";
      const genericErrorDiv = document.getElementById(genericErrorDivId);
      const successDiv = document.getElementById(successDivId);
      let isFormValid = true;
      let firstInvalidElement = null;

      // Элементы для валидации
      const formInputsToValidate = form.querySelectorAll(".auth-input, .auth-textarea, .django-custom-select-widget");

      // Сброс состояний
      if (genericErrorDiv) {
        genericErrorDiv.textContent = '';
        genericErrorDiv.style.display = 'none';
      }
      if (successDiv) {
        successDiv.textContent = '';
        successDiv.classList.remove("active");
        successDiv.style.display = 'none';
      }
      form.querySelectorAll(".auth-input, .auth-textarea").forEach(input => {
        if (input.id && window.textInputInstances[input.id]) {
          window.textInputInstances[input.id].reset();
        }
      });
      form.querySelectorAll(".django-custom-select-widget").forEach(widgetContainer => {
        widgetContainer.classList.remove('select--error');
        const nativeSelectId = widgetContainer.dataset.nativeSelectId;
        if (nativeSelectId) {
          const errorElement = document.getElementById(`${nativeSelectId}-error`);
          if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
            errorElement.classList.remove('shake');
          }
        }
      });

      // Валидация на стороне клиента
      form.querySelectorAll(".auth-input, .auth-textarea").forEach(input => {
        if (input.id && window.textInputInstances[input.id]) {
          const instance = window.textInputInstances[input.id];
          if (!instance.validate()) {
            isFormValid = false;
            if (!firstInvalidElement) firstInvalidElement = instance.element;
          }
        } else if (input.willValidate && !input.checkValidity()) {
          isFormValid = false;
          if (!firstInvalidElement) firstInvalidElement = input;
          console.warn(`Native validation failed for input without TextInput instance: ${input.name || input.id}`);
        }
      });

      form.querySelectorAll(".django-custom-select-widget").forEach(widgetContainer => {
        if (!validateCustomSelect(widgetContainer)) {
          isFormValid = false;
          if (!firstInvalidElement) {
            firstInvalidElement = widgetContainer.querySelector('.select-header') || widgetContainer;
          }
        }
      });

      // Обработка невалидной формы
      if (!isFormValid) {
        console.log("Form is invalid on client-side.");
        form.classList.add("animate__animated", "animate__shakeX");
        setTimeout(() => form.classList.remove("animate__animated", "animate__shakeX"), 600);
        firstInvalidElement?.focus();
        firstInvalidElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      // AJAX отправка
      console.log("Form is valid on client-side. Proceeding with AJAX...");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Обработка...';
      }

      const formData = new FormData(form);
      const csrfToken = formData.get("csrfmiddlewaretoken") || document.querySelector('[name=csrfmiddlewaretoken]')?.value;

      fetch(form.action, {
        method: "POST",
        body: formData,
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          "X-CSRFToken": csrfToken
        }
      })
        .then(response => {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.indexOf("application/json") !== -1) {
            return response.json().then(data => ({ ok: response.ok, status: response.status, data: data }));
          } else {
            console.warn(`Response from ${form.action} was not JSON (Content-Type: ${contentType}). Status: ${response.status}`);
            return response.text().then(text => {
              let errorData = {
                error: `Server responded with status ${response.status}.`,
                details: "Response was not in expected JSON format.",
                raw_response: text
              };
              if (response.status >= 500) errorData.error = `Server error (${response.status}). Please try again later.`;
              else if (response.status === 403) errorData.error = "Permission denied (403).";
              return { ok: response.ok, status: response.status, data: errorData };
            });
          }
        })
        .catch(networkError => {
          console.error("Fetch Network Error:", networkError);
          return {
            ok: false,
            status: 0,
            data: { error: "Network error occurred.", details: networkError.message }
          };
        })
        .then(({ ok, status, data }) => {
          if (ok && data?.status === "success") {
            console.log("AJAX Success:", data);
            if (successDiv) {
              successDiv.textContent = data.message || "Успех!";
              successDiv.classList.add("active");
              successDiv.style.display = 'block';
              successDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
              alert(data.message || "Успех!");
            }
            if (submitBtn) {
              submitBtn.innerHTML = '<i class="fas fa-check"></i> Успешно!';
              submitBtn.style.backgroundColor = "var(--accent-color)";
            }

            setTimeout(() => {
              form.reset();
              formInputsToValidate.forEach(element => {
                if (element.matches('.auth-input, .auth-textarea') && element.id && window.textInputInstances[element.id]) {
                  window.textInputInstances[element.id].reset();
                } else if (element.matches('.django-custom-select-widget') && element.widgetInstance) {
                  element.classList.remove('select--error');
                  const nativeSelectId = element.dataset.nativeSelectId;
                  if (nativeSelectId) {
                    const errorElement = document.getElementById(`${nativeSelectId}-error`);
                    if (errorElement) { errorElement.style.display = 'none'; errorElement.textContent = ''; }
                  }
                  element.widgetInstance.selectedItems.clear();
                  element.widgetInstance.selectionOrder = [];
                  element.widgetInstance.updateNativeSelect();
                  element.widgetInstance.updateHeader();
                  element.widgetInstance.updateDynamicElements();
                }
              });
              if (submitBtn) {
                submitBtn.innerHTML = originalBtnHTML;
                submitBtn.disabled = false;
                submitBtn.style.backgroundColor = "";
              }
              if (successDiv) {
                successDiv.classList.remove("active");
                successDiv.style.display = 'none';
              }
            }, 2500);
          } else if (!ok && status === 400 && data?.status === "error" && data.errors) {
            console.warn("AJAX Validation Errors:", data.errors);
            firstInvalidElement = null;
            Object.keys(data.errors).forEach((fieldName) => {
              const field = form.querySelector(`[name="${fieldName}"]`);
              const errorMsg = Array.isArray(data.errors[fieldName]) ? data.errors[fieldName].join(', ') : data.errors[fieldName];

              if (field?.matches('.auth-input, .auth-textarea') && field.id && window.textInputInstances[field.id]) {
                window.textInputInstances[field.id].setError(errorMsg);
                if (!firstInvalidElement) firstInvalidElement = field;
              } else if (field?.matches('.django-select-input-native')) {
                const nativeSelectId = field.id;
                const widgetContainer = document.querySelector(`.django-custom-select-widget[data-native-select-id="${nativeSelectId}"]`);
                const errorElement = document.getElementById(`${nativeSelectId}-error`);
                if (widgetContainer && errorElement) {
                  widgetContainer.classList.add('select--error');
                  errorElement.textContent = errorMsg;
                  errorElement.style.display = 'block';
                  errorElement.classList.add('shake');
                  setTimeout(() => errorElement.classList.remove('shake'), 400);
                  if (!firstInvalidElement) firstInvalidElement = widgetContainer.querySelector('.select-header') || widgetContainer;
                } else {
                  console.warn(`Server Error: Cannot find elements for select field '${fieldName}' to display error: "${errorMsg}"`);
                  if (genericErrorDiv && !genericErrorDiv.textContent.includes(errorMsg)) {
                    genericErrorDiv.textContent += `${fieldName}: ${errorMsg} `;
                    genericErrorDiv.style.display = 'block';
                  }
                }
              } else {
                console.warn(`Server Error: Cannot find element for field '${fieldName}' or no specific handler. Error: "${errorMsg}"`);
                if (genericErrorDiv && !genericErrorDiv.textContent.includes(errorMsg)) {
                  genericErrorDiv.textContent += `${fieldName}: ${errorMsg} `;
                  genericErrorDiv.style.display = 'block';
                  if (!firstInvalidElement) firstInvalidElement = genericErrorDiv;
                }
              }
            });

            form.classList.add("animate__animated", "animate__shakeX");
            setTimeout(() => form.classList.remove("animate__animated", "animate__shakeX"), 600);
            firstInvalidElement?.focus();
            firstInvalidElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (submitBtn) {
              submitBtn.innerHTML = originalBtnHTML;
              submitBtn.disabled = false;
            }
          } else {
            let errorMsg = "Произошла непредвиденная ошибка.";
            if (data && data.error) {
              errorMsg = data.error;
              if (data.details) errorMsg += ` (${data.details})`;
            } else if (!ok) {
              errorMsg = `Ошибка сервера (${status || 'Network Error'}). Пожалуйста, попробуйте позже.`;
            }
            console.error("Unhandled AJAX Error:", { ok, status, data });

            if (genericErrorDiv) {
              genericErrorDiv.textContent = errorMsg;
              genericErrorDiv.style.display = 'block';
              genericErrorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
              alert(errorMsg);
            }
            form.classList.add("animate__animated", "animate__shakeX");
            setTimeout(() => form.classList.remove("animate__animated", "animate__shakeX"), 600);
            if (submitBtn) {
              submitBtn.innerHTML = originalBtnHTML;
              submitBtn.disabled = false;
            }
          }
        })
        .finally(() => {
          console.log("AJAX request finished.");
          if (submitBtn && submitBtn.disabled && !(successDiv?.classList.contains('active'))) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHTML;
            submitBtn.style.backgroundColor = "";
          }
        });
    });
  });

  console.log("Widget initialization finished.");
});