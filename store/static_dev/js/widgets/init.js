import TextInput from "./text_input.js";
import { initPasswordInputs } from "./password_input.js";
import { initAllCustomSelects } from "./select_input.js";
import { initCheckboxes, validateCheckbox } from "./checkbox_input.js";

function validateCustomSelect(widgetContainer) {
  if (!widgetContainer || !widgetContainer.widgetInstance || !widgetContainer.dataset.nativeSelectId) { return true; }
  if (widgetContainer.classList.contains('select--open')) { return true; }
  const instance = widgetContainer.widgetInstance;
  const config = instance.config;
  const nativeSelectId = widgetContainer.dataset.nativeSelectId;
  const nativeSelect = document.getElementById(nativeSelectId);
  const errorElementId = `${nativeSelectId}-error`;
  const errorElement = document.getElementById(errorElementId);
  if (!instance || !config || !nativeSelect || !errorElement) { return true; }
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
  } else if (minSelections > 1 && selectedCount < minSelections) {
    isValid = false;
    errorMessage = minSelectionsMessageTemplate.replace('{min}', minSelections);
  }
  widgetContainer.classList.toggle('select--error', !isValid);
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
  return isValid;
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Content Loaded. Initializing widgets...");
  window.textInputInstances = {};
  const forms = document.querySelectorAll("form[novalidate]");

  initPasswordInputs();
  initAllCustomSelects();
  initCheckboxes();

  forms.forEach((form) => {
    console.log(`Processing form: #${form.id || form.name || 'unnamed'}`);

    const textFields = form.querySelectorAll(".auth-input, .auth-textarea");
    textFields.forEach((fieldElement) => {
      if (fieldElement.id) {
        window.textInputInstances[fieldElement.id] = new TextInput(fieldElement);
      } else {
        console.warn("TextInput init: Input or Textarea element without ID skipped.", fieldElement);
      }
    });

    const focusableElements = Array.from(form.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), .select-header'));
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
              if (instance && !instance.validate()) {
                proceedToNextField = false;
              }
            } else if (isSelectHeader) {
              const customWidget = element.closest('.django-custom-select-widget');
              if (customWidget?.classList.contains('select--open') && customWidget.widgetInstance) {
                customWidget.widgetInstance.close();
              }
            }
            if (proceedToNextField) {
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

    form.querySelectorAll('.auth-textarea').forEach(textarea => {
      textarea.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          form.requestSubmit();
        }
      });
    });

    form.querySelectorAll('.auth-input:not([data-confirm-target]), .auth-textarea').forEach(field => {
      if (field.id && window.textInputInstances[field.id]) {
        field.addEventListener('blur', () => {
          window.textInputInstances[field.id].validate();
        });
      }
    });

    form.querySelectorAll('.django-custom-select-widget').forEach(widgetContainer => {
      widgetContainer.addEventListener('focusout', (event) => {
        if (!widgetContainer.contains(event.relatedTarget)) {
          setTimeout(() => {
            if (widgetContainer.classList.contains('select--open') && widgetContainer.widgetInstance) {
              widgetContainer.widgetInstance.close();
            } else {
              validateCustomSelect(widgetContainer);
            }
          }, 100); // Delay to allow option click to process
        }
      });
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      console.log(`Form submission attempt: #${form.id || 'unnamed'}`);
      const submitButton = form.querySelector('button[type="submit"]');
      const originalButtonHTML = submitButton ? submitButton.innerHTML : "";
      const genericErrorDivId = form.dataset.genericErrorId || "form-generic-error";
      const successDivId = form.dataset.successId || "form-success";
      const genericErrorDiv = document.getElementById(genericErrorDivId);
      const successDiv = document.getElementById(successDivId);
      let isFormValid = true;
      let firstInvalidElement = null;

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
      form.querySelectorAll(".checkbox-input").forEach(checkbox => {
        const fieldContainer = checkbox.closest('.checkbox-field');
        if (fieldContainer) {
          const errorElement = fieldContainer.querySelector('.form-error');
          if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
            errorElement.classList.remove('shake');
          }
          fieldContainer.classList.remove('error');
        }
      });

      const formInputsToValidate = form.querySelectorAll(".auth-input, .auth-textarea, .django-custom-select-widget, .checkbox-input");
      formInputsToValidate.forEach(element => {
        let currentFieldIsValid = true;
        if (element.matches('.auth-input, .auth-textarea') && element.id && window.textInputInstances[element.id]) {
          if (!window.textInputInstances[element.id].validate()) {
            currentFieldIsValid = false;
          }
        } else if (element.matches('.django-custom-select-widget')) {
          if (!validateCustomSelect(element)) {
            currentFieldIsValid = false;
          }
        } else if (element.matches('.checkbox-input') && element.required) {
          if (!validateCheckbox(element)) {
            currentFieldIsValid = false;
          }
        }
        if (!currentFieldIsValid && !firstInvalidElement) {
          firstInvalidElement = element.matches('.django-custom-select-widget')
            ? element.querySelector('.select-header') || element
            : element.matches('.checkbox-input')
              ? element.closest('.checkbox-field')?.querySelector('.checkbox-custom') || element
              : element;
        }
        isFormValid = isFormValid && currentFieldIsValid;
      });

      if (!isFormValid) {
        console.log("Form is invalid on client-side. First invalid:", firstInvalidElement?.id || firstInvalidElement);
        form.classList.add("animate__animated", "animate__shakeX");
        setTimeout(() => {
          form.classList.remove("animate__animated", "animate__shakeX");
        }, 600);
        if (firstInvalidElement) {
          const elementToFocus = firstInvalidElement.matches('.checkbox-custom') ? firstInvalidElement : firstInvalidElement;
          elementToFocus.focus();
          const elementToScroll = elementToFocus.closest('.form-field') || elementToFocus;
          console.log("Scrolling to:", elementToScroll);
          elementToScroll.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      console.log("Form is valid. Proceeding with AJAX...");
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Обработка...';
      }
      const formData = new FormData(form);
      form.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        if (!formData.has(checkbox.name)) {
          console.log(`Checkbox "${checkbox.name}" not checked, value not sent.`);
        } else {
          console.log(`Checkbox "${checkbox.name}" checked:`, formData.get(checkbox.name));
        }
      });
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
          if (contentType && contentType.includes("application/json")) {
            return response.json().then(data => ({ ok: response.ok, status: response.status, data: data }));
          } else {
            console.warn(`Response not JSON (Content-Type: ${contentType}). Status: ${response.status}`);
            return response.text().then(text => {
              let e = { error: `Server responded with status ${response.status}.`, details: "Response not JSON.", raw_response: text };
              if (response.status >= 500) e.error = `Server error (${response.status}).`;
              else if (response.status === 403) e.error = "Permission denied (403).";
              else if (response.status === 400) e.error = "Bad request (400).";
              return { ok: response.ok, status: response.status, data: e };
            });
          }
        })
        .catch(networkError => {
          console.error("Fetch Network Error:", networkError);
          return { ok: false, status: 0, data: { error: "Network error.", details: networkError.message } };
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
            if (submitButton) {
              submitButton.innerHTML = '<i class="fas fa-check"></i> Успешно!';
              submitButton.style.backgroundColor = "var(--accent-color)";
            }
            setTimeout(() => {
              form.reset();
              formInputsToValidate.forEach(element => {
                if (element.matches('.auth-input, .auth-textarea') && element.id && window.textInputInstances[element.id]) {
                  window.textInputInstances[element.id].reset();
                } else if (element.matches('.django-custom-select-widget') && element.widgetInstance) {
                  element.widgetInstance.resetState();
                } else if (element.matches('.checkbox-input')) {
                  const fieldContainer = element.closest('.checkbox-field');
                  if (fieldContainer) {
                    const errorElement = fieldContainer.querySelector('.form-error');
                    if (errorElement) {
                      errorElement.textContent = '';
                      errorElement.style.display = 'none';
                      errorElement.classList.remove('shake');
                    }
                    fieldContainer.classList.remove('error');
                  }
                }
              });
              if (submitButton) {
                submitButton.innerHTML = originalButtonHTML;
                submitButton.disabled = false;
                submitButton.style.backgroundColor = "";
              }
              if (successDiv) {
                successDiv.classList.remove("active");
                successDiv.style.display = 'none';
              }
            }, 2500);
          } else if (!ok && (status === 400 || status === 422) && data?.status === "error" && data.errors) {
            console.warn("AJAX Validation Errors:", data.errors);
            firstInvalidElement = null;
            Object.keys(data.errors).forEach((fieldName) => {
              const field = form.querySelector(`[name="${fieldName}"]`);
              const errorMessage = Array.isArray(data.errors[fieldName]) ? data.errors[fieldName].join(', ') : data.errors[fieldName];
              let errorHandled = false;

              if (!field) {
                console.warn(`Server Error: Field with name '${fieldName}' not found in the form.`);
                if (genericErrorDiv && !genericErrorDiv.textContent.includes(errorMessage)) {
                  genericErrorDiv.textContent += `${fieldName}: ${errorMessage} `;
                  genericErrorDiv.style.display = 'block';
                  if (!firstInvalidElement) firstInvalidElement = genericErrorDiv;
                }
                return;
              }

              if (field?.matches('.auth-input, .auth-textarea') && field.id && window.textInputInstances[field.id]) {
                window.textInputInstances[field.id].setError(errorMessage);
                if (!firstInvalidElement) firstInvalidElement = field;
                errorHandled = true;
              } else if (field?.matches('.django-select-input-native')) {
                const nId = field.id;
                const wCont = document.querySelector(`.django-custom-select-widget[data-native-select-id="${nId}"]`);
                const errEl = document.getElementById(`${nId}-error`);
                if (wCont && errEl) {
                  wCont.classList.add('select--error');
                  errEl.textContent = errorMessage;
                  errEl.style.display = 'block';
                  errEl.classList.add('shake');
                  setTimeout(() => errEl.classList.remove('shake'), 400);
                  if (!firstInvalidElement) firstInvalidElement = wCont.querySelector('.select-header') || wCont;
                  errorHandled = true;
                } else {
                  console.warn(`Server Error: Cannot find elements for select field '${fieldName}' (Native ID: ${nId})`);
                }
              } else if (field?.matches('.checkbox-input')) {
                const fieldContainer = field.closest('.checkbox-field');
                if (fieldContainer) {
                  const errorElement = fieldContainer.querySelector('.form-error');
                  if (errorElement) {
                    errorElement.textContent = errorMessage;
                    errorElement.style.display = 'block';
                    errorElement.classList.add('shake');
                    setTimeout(() => errorElement.classList.remove('shake'), 400);
                    fieldContainer.classList.add('error');
                    if (!firstInvalidElement) firstInvalidElement = fieldContainer.querySelector('.checkbox-custom') || field;
                    errorHandled = true;
                  } else {
                    console.warn(`Server Error: Cannot find error element inside for checkbox '${fieldName}'`);
                  }
                }
              }
              if (!errorHandled && genericErrorDiv && !genericErrorDiv.textContent.includes(errorMessage)) {
                genericErrorDiv.textContent += `${fieldName}: ${errorMessage} `;
                genericErrorDiv.style.display = 'block';
                if (!firstInvalidElement) firstInvalidElement = genericErrorDiv;
              }
            });
            form.classList.add("animate__animated", "animate__shakeX");
            setTimeout(() => form.classList.remove("animate__animated", "animate__shakeX"), 600);
            if (firstInvalidElement) {
              firstInvalidElement.focus();
              const elToScroll = firstInvalidElement.closest('.form-field') || firstInvalidElement;
              elToScroll.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            if (submitButton) {
              submitButton.innerHTML = originalButtonHTML;
              submitButton.disabled = false;
            }
          } else {
            let finalErrorMessage = "Произошла непредвиденная ошибка.";
            if (data?.error) {
              finalErrorMessage = data.error + (data.details ? ` (${data.details})` : '');
            } else if (!ok) {
              finalErrorMessage = `Ошибка сервера (${status || 'Network Error'}). Пожалуйста, попробуйте позже.`;
            }
            console.error("Unhandled AJAX Error:", { ok, status, data });
            if (genericErrorDiv) {
              genericErrorDiv.textContent = finalErrorMessage;
              genericErrorDiv.style.display = 'block';
              genericErrorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
              alert(finalErrorMessage);
            }
            form.classList.add("animate__animated", "animate__shakeX");
            setTimeout(() => form.classList.remove("animate__animated", "animate__shakeX"), 600);
            if (submitButton) {
              submitButton.innerHTML = originalButtonHTML;
              submitButton.disabled = false;
            }
          }
        })
        .finally(() => {
          console.log("AJAX request finished.");
          if (submitButton && submitButton.disabled && !(successDiv?.classList.contains('active'))) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonHTML;
            submitButton.style.backgroundColor = "";
          }
        });
    });
  });
  console.log("Widget initialization finished.");
});