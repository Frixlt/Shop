// --"--\Catalog\store\static_dev\js\widgets\init.js"--
import TextInput from "./text_input.js";
import { initPasswordInputs } from "./password_input.js";
import { initAllCustomSelects } from "./select_input.js";
import { initCheckboxes, validateCheckbox } from "./checkbox_input.js"; // Импортируем

// Функция validateCustomSelect (без изменений)
function validateCustomSelect(widgetContainer) {
  if (!widgetContainer || !widgetContainer.widgetInstance || !widgetContainer.dataset.nativeSelectId) { return true; }
  if (widgetContainer.classList.contains('select--open')) { return true; }
  const instance = widgetContainer.widgetInstance; const config = instance.config; const nativeSelectId = widgetContainer.dataset.nativeSelectId; const nativeSelect = document.getElementById(nativeSelectId); const errorElementId = `${nativeSelectId}-error`; const errorElement = document.getElementById(errorElementId);
  if (!instance || !config || !nativeSelect || !errorElement) { return true; }
  const minSelections = config.minSelections || 0; const requiredMessage = widgetContainer.dataset.requiredMessage || nativeSelect.dataset.requiredMessage || "Это поле обязательно для заполнения."; const minSelectionsMessageTemplate = config.minSelectionsMessage || 'Выберите минимум {min} элемент(а/ов)'; const selectedOptions = Array.from(nativeSelect.selectedOptions).filter(option => option.value); const selectedCount = selectedOptions.length; let isValid = true; let errorMessage = "";
  if (minSelections > 0 && selectedCount < minSelections) { isValid = false; errorMessage = minSelectionsMessageTemplate.replace('{min}', minSelections); }
  else if (nativeSelect.hasAttribute('required') && selectedCount === 0) { isValid = false; errorMessage = requiredMessage; }
  widgetContainer.classList.toggle('select--error', !isValid);
  if (!isValid) { errorElement.textContent = errorMessage; errorElement.style.display = 'block'; errorElement.classList.add('shake'); setTimeout(() => { errorElement.classList.remove('shake'); }, 400); }
  else { errorElement.textContent = ''; errorElement.style.display = 'none'; errorElement.classList.remove('shake'); }
  return isValid;
}


document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Content Loaded. Initializing widgets...");
  window.textInputInstances = {};
  const forms = document.querySelectorAll("form[novalidate]");

  initPasswordInputs();
  initAllCustomSelects();
  initCheckboxes(); // Инициализация чекбоксов

  forms.forEach((form) => {
    console.log(`Processing form: #${form.id || form.name || 'unnamed'}`);

    // Инициализация TextInput
    const textInputs = form.querySelectorAll(".auth-input");
    textInputs.forEach((inputElement) => { if (inputElement.id) { window.textInputInstances[inputElement.id] = new TextInput(inputElement); } else { console.warn("TextInput init: Input element without ID skipped.", inputElement); } });

    // Навигация по Enter
    const focusableElements = Array.from(form.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), .select-header'));
    form.querySelectorAll('.auth-input, .select-header').forEach((element) => { const isTextInput = element.matches('.auth-input') && element.id && window.textInputInstances[element.id]; const isSelectHeader = element.matches('.select-header'); if (isTextInput || isSelectHeader) { element.addEventListener("keydown", (event) => { if (event.key === "Enter") { if (element.tagName === 'TEXTAREA' && !(event.ctrlKey || event.shiftKey)) { return; } event.preventDefault(); let proceedToNextField = true; if (isTextInput) { const instance = window.textInputInstances[element.id]; if (instance && !instance.validate()) { proceedToNextField = false; } } else if (isSelectHeader) { const customWidget = element.closest('.django-custom-select-widget'); if (customWidget?.classList.contains('select--open') && customWidget.widgetInstance) { customWidget.widgetInstance.close(); } } if (proceedToNextField) { const currentIndex = focusableElements.findIndex(el => el === element); const nextIndex = currentIndex + 1; if (currentIndex > -1 && nextIndex < focusableElements.length) { focusableElements[nextIndex]?.focus(); } else if (currentIndex === focusableElements.length - 1) { form.querySelector('button[type="submit"]')?.focus(); } } } }); } });

    // Валидация при blur
    form.querySelectorAll('.auth-input:not([data-confirm-target]), .auth-textarea').forEach(field => { if (field.id && window.textInputInstances[field.id]) { field.addEventListener('blur', () => { window.textInputInstances[field.id].validate(); }); } });
    form.querySelectorAll('.django-custom-select-widget').forEach(widgetContainer => { widgetContainer.addEventListener('focusout', (event) => { if (!widgetContainer.contains(event.relatedTarget)) { if (widgetContainer.classList.contains('select--open') && widgetContainer.widgetInstance) { widgetContainer.widgetInstance.close(); } else { validateCustomSelect(widgetContainer); } } }); });
    // Валидация Checkbox при change/blur добавлена в initCheckboxes()

    // Отправка формы AJAX
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      console.log(`Form submission attempt: #${form.id || 'unnamed'}`);
      const submitButton = form.querySelector('button[type="submit"]'); const originalButtonHTML = submitButton ? submitButton.innerHTML : ""; const genericErrorDivId = form.dataset.genericErrorId || "form-generic-error"; const successDivId = form.dataset.successId || "form-success"; const genericErrorDiv = document.getElementById(genericErrorDivId); const successDiv = document.getElementById(successDivId); let isFormValid = true; let firstInvalidElement = null; const formInputsToValidate = form.querySelectorAll(".auth-input, .auth-textarea, .django-custom-select-widget, .checkbox-input");

      // --- Сброс состояний ---
      if (genericErrorDiv) { genericErrorDiv.textContent = ''; genericErrorDiv.style.display = 'none'; }
      if (successDiv) { successDiv.textContent = ''; successDiv.classList.remove("active"); successDiv.style.display = 'none'; }
      form.querySelectorAll(".auth-input, .auth-textarea").forEach(input => { if (input.id && window.textInputInstances[input.id]) { window.textInputInstances[input.id].reset(); } });
      form.querySelectorAll(".django-custom-select-widget").forEach(widgetContainer => { widgetContainer.classList.remove('select--error'); const nativeSelectId = widgetContainer.dataset.nativeSelectId; if (nativeSelectId) { const errorElement = document.getElementById(`${nativeSelectId}-error`); if (errorElement) { errorElement.textContent = ''; errorElement.style.display = 'none'; errorElement.classList.remove('shake'); } } });
      // Сброс Checkbox
      form.querySelectorAll(".checkbox-input").forEach(checkbox => {
        const fieldContainer = checkbox.closest('.checkbox-field');
        if (fieldContainer) {
          const errorElement = fieldContainer.querySelector('.form-error'); // Ищем ошибку внутри
          if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none'; // Скрываем явно
            errorElement.classList.remove('shake');
          }
          fieldContainer.classList.remove('error'); // Убираем класс ошибки
        }
      });

      // --- Валидация на стороне клиента ---
      form.querySelectorAll(".auth-input, .auth-textarea").forEach(input => { let currentFieldIsValid = true; if (input.id && window.textInputInstances[input.id]) { const instance = window.textInputInstances[input.id]; if (!instance.validate()) { currentFieldIsValid = false; } } else if (input.willValidate && !input.checkValidity()) { currentFieldIsValid = false; console.warn(`Native validation failed: ${input.name || input.id}`); const errorElement = document.getElementById(`${input.id}-error`); if (errorElement) { errorElement.textContent = input.validationMessage; errorElement.style.display = 'block'; errorElement.classList.add('shake'); setTimeout(() => { errorElement.classList.remove('shake'); }, 400); } } if (!currentFieldIsValid && !firstInvalidElement) { firstInvalidElement = input; isFormValid = false; } });
      form.querySelectorAll(".django-custom-select-widget").forEach(widgetContainer => { if (!validateCustomSelect(widgetContainer)) { isFormValid = false; if (!firstInvalidElement) { firstInvalidElement = widgetContainer.querySelector('.select-header') || widgetContainer; } } });
      form.querySelectorAll(".checkbox-input").forEach(checkbox => { if (!validateCheckbox(checkbox)) { isFormValid = false; if (!firstInvalidElement) { firstInvalidElement = checkbox; } } });

      // --- Обработка невалидной формы ---
      if (!isFormValid) {
        console.log("Form is invalid on client-side. First invalid:", firstInvalidElement?.id);
        form.classList.add("animate__animated", "animate__shakeX"); setTimeout(() => { form.classList.remove("animate__animated", "animate__shakeX"); }, 600);
        if (firstInvalidElement) { firstInvalidElement.focus(); const elementToScroll = firstInvalidElement.closest('.form-field') || firstInvalidElement; console.log("Scrolling to:", elementToScroll); elementToScroll.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        return;
      }

      // --- AJAX отправка ---
      console.log("Form is valid. Proceeding with AJAX...");
      if (submitButton) { submitButton.disabled = true; submitButton.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Обработка...'; }
      const formData = new FormData(form); form.querySelectorAll('input[type="checkbox"]').forEach(checkbox => { if (!formData.has(checkbox.name)) { console.log(`Checkbox "${checkbox.name}" not checked.`); } else { console.log(`Checkbox "${checkbox.name}" checked:`, formData.get(checkbox.name)); } }); const csrfToken = formData.get("csrfmiddlewaretoken") || document.querySelector('[name=csrfmiddlewaretoken]')?.value;

      fetch(form.action, { method: "POST", body: formData, headers: { "X-Requested-With": "XMLHttpRequest", "X-CSRFToken": csrfToken } })
        .then(response => { /* ... (парсинг ответа как раньше) ... */ const contentType = response.headers.get("content-type"); if (contentType && contentType.includes("application/json")) { return response.json().then(data => ({ ok: response.ok, status: response.status, data: data })); } else { console.warn(`Response not JSON (Content-Type: ${contentType}). Status: ${response.status}`); return response.text().then(text => { let e = { error: `Server responded with status ${response.status}.`, details: "Response not JSON.", raw_response: text }; if (response.status >= 500) e.error = `Server error (${response.status}).`; else if (response.status === 403) e.error = "Permission denied (403)."; return { ok: response.ok, status: response.status, data: e }; }); } })
        .catch(networkError => { /* ... (обработка сетевой ошибки как раньше) ... */ console.error("Fetch Network Error:", networkError); return { ok: false, status: 0, data: { error: "Network error.", details: networkError.message } }; })
        .then(({ ok, status, data }) => {
          if (ok && data?.status === "success") {
            // --- Успешная отправка ---
            console.log("AJAX Success:", data); if (successDiv) { successDiv.textContent = data.message || "Успех!"; successDiv.classList.add("active"); successDiv.style.display = 'block'; successDiv.scrollIntoView({ behavior: 'smooth', block: 'center' }); } else { alert(data.message || "Успех!"); } if (submitButton) { submitButton.innerHTML = '<i class="fas fa-check"></i> Успешно!'; submitButton.style.backgroundColor = "var(--accent-color)"; }
            setTimeout(() => {
              form.reset();
              formInputsToValidate.forEach(element => {
                if (element.matches('.auth-input, .auth-textarea') && element.id && window.textInputInstances[element.id]) { window.textInputInstances[element.id].reset(); }
                else if (element.matches('.django-custom-select-widget') && element.widgetInstance) { element.widgetInstance.resetState(); } // Предполагаем метод resetState
                else if (element.matches('.checkbox-input')) {
                  // Сброс Checkbox
                  const fieldContainer = element.closest('.checkbox-field');
                  if (fieldContainer) {
                    const errorElement = fieldContainer.querySelector('.form-error'); // Ищем внутри
                    if (errorElement) {
                      errorElement.textContent = '';
                      errorElement.style.display = 'none'; // Скрываем явно
                      errorElement.classList.remove('shake');
                    }
                    fieldContainer.classList.remove('error'); // Убираем класс ошибки
                  }
                }
              });
              if (submitButton) { submitButton.innerHTML = originalButtonHTML; submitButton.disabled = false; submitButton.style.backgroundColor = ""; }
              if (successDiv) { successDiv.classList.remove("active"); successDiv.style.display = 'none'; }
            }, 2500);
          } else if (!ok && status === 400 && data?.status === "error" && data.errors) {
            // --- Ошибки валидации с сервера ---
            console.warn("AJAX Validation Errors:", data.errors); firstInvalidElement = null;
            Object.keys(data.errors).forEach((fieldName) => {
              const field = form.querySelector(`[name="${fieldName}"]`); const errorMessage = Array.isArray(data.errors[fieldName]) ? data.errors[fieldName].join(', ') : data.errors[fieldName]; let errorHandled = false;
              if (field?.matches('.auth-input, .auth-textarea') && field.id && window.textInputInstances[field.id]) { window.textInputInstances[field.id].setError(errorMessage); if (!firstInvalidElement) firstInvalidElement = field; errorHandled = true; }
              else if (field?.matches('.django-select-input-native')) { const nId = field.id; const wCont = document.querySelector(`.django-custom-select-widget[data-native-select-id="${nId}"]`); const errEl = document.getElementById(`${nId}-error`); if (wCont && errEl) { wCont.classList.add('select--error'); errEl.textContent = errorMessage; errEl.style.display = 'block'; errEl.classList.add('shake'); setTimeout(() => errEl.classList.remove('shake'), 400); if (!firstInvalidElement) firstInvalidElement = wCont.querySelector('.select-header') || wCont; errorHandled = true; } else { console.warn(`Server Error: Cannot find elements for select field '${fieldName}'`); } }
              // Обработка ошибок Checkbox
              else if (field?.matches('.checkbox-input')) {
                const fieldContainer = field.closest('.checkbox-field');
                if (fieldContainer) {
                  const errorElement = fieldContainer.querySelector('.form-error'); // Ищем внутри
                  if (errorElement) {
                    errorElement.textContent = errorMessage;
                    errorElement.style.display = 'block'; // Показываем ошибку
                    errorElement.classList.add('shake');
                    setTimeout(() => errorElement.classList.remove('shake'), 400);
                    fieldContainer.classList.add('error'); // Добавляем класс ошибки контейнеру
                    if (!firstInvalidElement) firstInvalidElement = field;
                    errorHandled = true;
                  } else { console.warn(`Server Error: Cannot find error element inside for checkbox '${fieldName}'`); }
                }
              }
              if (!errorHandled && genericErrorDiv && !genericErrorDiv.textContent.includes(errorMessage)) { genericErrorDiv.textContent += `${fieldName}: ${errorMessage} `; genericErrorDiv.style.display = 'block'; if (!firstInvalidElement) firstInvalidElement = genericErrorDiv; }
            }); // Конец forEach по ошибкам
            form.classList.add("animate__animated", "animate__shakeX"); setTimeout(() => form.classList.remove("animate__animated", "animate__shakeX"), 600); if (firstInvalidElement) { firstInvalidElement.focus(); const elToScroll = firstInvalidElement.closest('.form-field') || firstInvalidElement; elToScroll.scrollIntoView({ behavior: 'smooth', block: 'center' }); } if (submitButton) { submitButton.innerHTML = originalButtonHTML; submitButton.disabled = false; }
          } else {
            // --- Необработанные ошибки ---
            let finalErrorMessage = "Произошла непредвиденная ошибка."; if (data?.error) { finalErrorMessage = data.error + (data.details ? ` (${data.details})` : ''); } else if (!ok) { finalErrorMessage = `Ошибка сервера (${status || 'Network Error'}).`; } console.error("Unhandled AJAX Error:", { ok, status, data }); if (genericErrorDiv) { genericErrorDiv.textContent = finalErrorMessage; genericErrorDiv.style.display = 'block'; genericErrorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' }); } else { alert(finalErrorMessage); } form.classList.add("animate__animated", "animate__shakeX"); setTimeout(() => form.classList.remove("animate__animated", "animate__shakeX"), 600); if (submitButton) { submitButton.innerHTML = originalButtonHTML; submitButton.disabled = false; }
          }
        })
        .finally(() => { /* ... (finally блок как раньше) ... */ console.log("AJAX request finished."); if (submitButton && submitButton.disabled && !(successDiv?.classList.contains('active'))) { submitButton.disabled = false; submitButton.innerHTML = originalButtonHTML; submitButton.style.backgroundColor = ""; } });
    }); // Конец form.addEventListener("submit", ...)
  }); // Конец forms.forEach(...)
  console.log("Widget initialization finished.");
}); // Конец DOMContentLoaded