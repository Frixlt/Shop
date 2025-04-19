// --"--\Catalog\store\static_dev\js\widgets\init.js"-- (COMPLETE & CORRECTED for Redirect)
import TextInput from "./text_input.js";
import { initPasswordInputs } from "./password_input.js";
import { initAllCustomSelects } from "./select_input.js";
import { initCheckboxes, validateCheckbox } from "./checkbox_input.js";
import { FileUpload } from "./file_input.js";

// --- Global Validation Helper for Custom Select ---
function validateCustomSelect(widgetContainer) {
  // Added checks for existence before accessing properties
  if (!widgetContainer || !widgetContainer.dataset.nativeSelectId) { return true; }

  const instance = widgetContainer.widgetInstance; // May be undefined if not yet initialized
  const config = instance?.config; // Use optional chaining
  const nativeSelectId = widgetContainer.dataset.nativeSelectId;
  const nativeSelect = document.getElementById(nativeSelectId);
  const errorElementId = `${nativeSelectId}-error`;
  const errorElement = document.getElementById(errorElementId);

  // Validate required elements exist
  if (!nativeSelect || !errorElement) {
    console.warn(`validateCustomSelect: Missing native select or error element for ${nativeSelectId}`);
    return true; // Cannot validate without these
  }
  // Don't validate if the select is open or not fully initialized
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

  // Perform validation checks
  if (nativeSelect.hasAttribute('required') && minSelections <= 1 && selectedCount === 0) {
    isValid = false;
    errorMessage = requiredMessage;
  } else if (minSelections > 0 && selectedCount < minSelections) { // Check minSelections always if > 0
    isValid = false;
    errorMessage = minSelectionsMessageTemplate.replace('{min}', minSelections);
  }

  // Update UI based on validation result
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

// --- DOMContentLoaded Event Listener ---
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Content Loaded. Initializing widgets...");

  // --- Widget Instance Storage ---
  window.textInputInstances = {};
  window.fileUploadInstances = {}; // Store FileUpload instances

  const forms = document.querySelectorAll("form"); // Select all forms initially for widget init

  // --- Initialize Widgets (Run for all forms on the page) ---
  initPasswordInputs();    // Handles password visibility toggles & confirmation logic
  initAllCustomSelects(); // Initializes all custom select dropdowns
  initCheckboxes();       // Initializes custom checkboxes

  // Initialize File Inputs for all forms
  const fileWidgetContainers = document.querySelectorAll(".file-upload-container");
  fileWidgetContainers.forEach(container => {
    const fileInput = container.querySelector('.file-input');
    if (fileInput && fileInput.id && !window.fileUploadInstances[fileInput.id]) {
      try {
        window.fileUploadInstances[fileInput.id] = new FileUpload(container);
      } catch (e) {
        console.error(`Error initializing FileUpload for #${fileInput.id}:`, e);
        container.innerHTML = `<p style="color:red;">Error loading file widget.</p>`; // Indicate failure
      }
    } else if (fileInput && !fileInput.id) {
      console.warn(`FileUpload init: File input missing ID inside container:`, container);
    }
  });

  // Initialize Text Inputs & Textareas for all forms
  const textFields = document.querySelectorAll(".auth-input, .auth-textarea");
  textFields.forEach((fieldElement) => {
    if (fieldElement.id && !window.textInputInstances[fieldElement.id]) {
      window.textInputInstances[fieldElement.id] = new TextInput(fieldElement);
    } else if (!fieldElement.id) {
      console.warn(`TextInput init: Input or Textarea element without ID skipped.`, fieldElement);
    }
  });


  // --- Process Each Form (Specifically for Submit/Validation logic) ---
  // Filter forms that should have AJAX handling (e.g., login/register forms)
  const ajaxForms = document.querySelectorAll("form#login-form, form#register-form");

  ajaxForms.forEach((form) => {
    const formId = form.id || form.name || 'unnamed_form';
    console.log(`[${formId}] Attaching AJAX submit handler...`);

    // --- Keyboard Navigation (Enter Key) ---
    const focusableElements = Array.from(form.querySelectorAll(
      'input:not([type="hidden"]):not([type="checkbox"]):not([type="file"]):not([disabled]), ' +
      'select:not([disabled]), ' +
      'textarea:not([disabled]), ' +
      'button:not([disabled]), ' +
      '.select-header'
    ));

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
              if (instance && !instance.validate()) { proceedToNextField = false; }
            } else if (isSelectHeader) {
              const customWidget = element.closest('.django-custom-select-widget');
              if (customWidget?.classList.contains('select--open') && customWidget.widgetInstance) {
                customWidget.widgetInstance.close();
              } else if (customWidget) {
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
          form.requestSubmit(); // Consider using submit() or clicking the button
        }
      });
    });


    // --- Blur Validation ---
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
    // Blur for checkbox/file typically not needed as validation happens on change/submit


    // --- Form Submission Handler (AJAX) ---
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      console.log(`[${formId}] Form submission attempt...`);

      const submitButton = form.querySelector('button[type="submit"]');
      const originalButtonHTML = submitButton ? submitButton.innerHTML : "";
      const genericErrorDivId = form.dataset.genericErrorId || `${formId}-generic-error`;
      const successDivId = form.dataset.successId || "form-success"; // Shared success div
      const genericErrorDiv = document.getElementById(genericErrorDivId);
      const successDiv = document.getElementById(successDivId);
      let isFormValid = true;
      let firstInvalidElement = null;

      // --- Reset States Before Validation ---
      if (genericErrorDiv) { genericErrorDiv.style.display = 'none'; genericErrorDiv.textContent = ''; }
      if (successDiv) { successDiv.style.display = 'none'; successDiv.textContent = ''; successDiv.classList.remove("active"); }
      form.querySelectorAll(".auth-input, .auth-textarea").forEach(input => window.textInputInstances?.[input.id]?.resetUI()); // Added optional chaining
      form.querySelectorAll(".django-custom-select-widget").forEach(widgetContainer => {
        widgetContainer.classList.remove('select--error');
        const errorElement = document.getElementById(`${widgetContainer.dataset.nativeSelectId}-error`);
        if (errorElement) { errorElement.style.display = 'none'; errorElement.textContent = ''; errorElement.classList.remove('shake'); }
      });
      form.querySelectorAll(".checkbox-field").forEach(fieldContainer => {
        fieldContainer.classList.remove('error');
        const errorElement = fieldContainer.querySelector('.form-error') || document.getElementById(`${fieldContainer.querySelector('.checkbox-input')?.id}-error`); // Try finding by ID too
        if (errorElement) { errorElement.style.display = 'none'; errorElement.textContent = ''; errorElement.classList.remove('shake'); }
      });
      form.querySelectorAll(".file-upload-container").forEach(container => {
        const fileInput = container.querySelector('.file-input');
        if (fileInput?.id) {
          const instance = window.fileUploadInstances?.[fileInput.id];
          if (instance?.errorMessage) {
            instance.errorMessage.classList.add('hidden');
            instance.errorMessage.textContent = '';
          }
          instance?.container?.classList.remove('upload-error');
        }
      });

      // --- Perform Client-Side Validation ---
      const formInputsToValidate = form.querySelectorAll(
        ".auth-input, .auth-textarea, " +
        ".django-custom-select-widget, " +
        ".checkbox-input[required], " + // Only validate required checkboxes here
        ".file-input" // Validate all file inputs (required check below)
      );

      formInputsToValidate.forEach(element => {
        let currentFieldIsValid = true; // Assume valid initially

        // Validate Text/Textarea
        if (element.matches('.auth-input, .auth-textarea') && element.id && window.textInputInstances?.[element.id]) {
          if (!window.textInputInstances[element.id].validate()) { currentFieldIsValid = false; }
        }
        // Validate Custom Select
        else if (element.matches('.django-custom-select-widget')) {
          if (!validateCustomSelect(element)) { currentFieldIsValid = false; }
        }
        // Validate Checkbox (Required check only)
        else if (element.matches('.checkbox-input[required]')) { // Added [required] selector
          if (!validateCheckbox(element)) { // validateCheckbox handles required check
            currentFieldIsValid = false;
          }
        }
        // Validate File Input (Required check + check for existing JS errors)
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
                instance.container?.classList.add('upload-error');
              }
            } else {
              // Clear previous *required* error if it was showing and is now resolved
              const currentRequiredMsg = element.dataset.requiredMessage || "Please select at least one file.";
              if (instance.errorMessage && instance.errorMessage.textContent === currentRequiredMsg) {
                instance.errorMessage.textContent = '';
                instance.errorMessage.classList.add('hidden');
                instance.container?.classList.remove('upload-error');
              }
            }

            // Check if the JS widget has displayed an error (visible AND has content)
            if (instance.errorMessage &&
              !instance.errorMessage.classList.contains('hidden') &&
              instance.errorMessage.textContent.trim() !== '') {
              fieldHasError = true;
              console.log(`[${formId}] File input #${element.id} invalid due to visible error message: "${instance.errorMessage.textContent}"`);
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
              ? element.closest('.checkbox-field')?.querySelector('.checkbox-custom') || element.closest('.checkbox-field') || element // Target checkbox-field too
              : element.matches('.file-input')
                ? element.closest('.file-upload-container')?.querySelector('.dropzone') || element.closest('.file-upload-container') || element // Target container too
                : element;
        }
        isFormValid = isFormValid && currentFieldIsValid;
      }); // End validation loop

      // --- Handle Invalid Form (Client-Side) ---
      if (!isFormValid) {
        console.log(`[${formId}] Form is invalid on client-side. First invalid element:`, firstInvalidElement);
        form.classList.add("animate__animated", "animate__shakeX");
        setTimeout(() => { form.classList.remove("animate__animated", "animate__shakeX"); }, 600);
        if (firstInvalidElement) {
          let elementToFocus = firstInvalidElement;
          // Refine focusing logic
          if (firstInvalidElement.matches('.checkbox-field') || firstInvalidElement.matches('.file-upload-container')) {
            elementToFocus = firstInvalidElement.querySelector('input, button, .checkbox-custom, .dropzone') || firstInvalidElement;
          }

          console.log(`[${formId}] Focusing/Scrolling to:`, elementToFocus);
          if (typeof elementToFocus.focus === 'function') {
            elementToFocus.focus({ preventScroll: true }); // Prevent default scroll
          }
          // Scroll the form field / container into view
          const elementToScroll = firstInvalidElement.closest('.form-field') || firstInvalidElement;
          if (typeof elementToScroll.scrollIntoView === 'function') {
            elementToScroll.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
        // Re-enable button immediately if client validation fails
        if (submitButton) {
          submitButton.innerHTML = originalButtonHTML;
          submitButton.disabled = false;
        }
        return; // Stop form submission
      }

      // --- Handle Valid Form: Prepare and Send AJAX ---
      console.log(`[${formId}] Form is valid. Proceeding with AJAX submission...`);

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Обработка...';
      }

      const formData = new FormData(form);
      const csrfToken = formData.get("csrfmiddlewaretoken") || document.querySelector('[name=csrfmiddlewaretoken]')?.value;

      // Append files from JS instances
      let fileAppendCount = 0;
      form.querySelectorAll('.file-input').forEach(fileInput => {
        const instance = window.fileUploadInstances?.[fileInput.id];
        if (instance) {
          const fieldName = instance.fileInput.name;
          if (!fieldName) {
            console.error(`[${formId}] File input #${fileInput.id} missing 'name' attribute!`); return;
          }
          if (formData.has(fieldName)) formData.delete(fieldName); // Clear existing
          const filesToAppend = instance.getFiles();
          filesToAppend.forEach(file => {
            formData.append(fieldName, file, file.name); fileAppendCount++;
          });
        }
      });
      console.log(`[${formId}] Total files appended to FormData: ${fileAppendCount}`);


      // --- Perform Fetch Request ---
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
            return response.text().then(text => {
              let errorData = { error: `Server responded with status ${response.status}.`, details: "Response not JSON.", raw_response: text.substring(0, 500) };
              if (response.status >= 500) errorData.error = `Server error (${response.status}). Check server logs.`;
              else if (response.status === 403) errorData.error = "Permission denied (403).";
              else if (response.status === 400) errorData.error = "Bad request (400).";
              return { ok: response.ok, status: response.status, data: errorData };
            });
          }
        })
        .catch(networkError => {
          console.error(`[${formId}] Fetch Network Error:`, networkError);
          const errorMsg = `Network error: ${networkError.message}. Please check your connection.`;
          if (genericErrorDiv) {
            genericErrorDiv.textContent = errorMsg; genericErrorDiv.style.display = 'block';
            genericErrorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else { alert(errorMsg); }
          if (submitButton) { submitButton.innerHTML = originalButtonHTML; submitButton.disabled = false; }
          return { ok: false, status: 0, data: { error: "Network error.", details: networkError.message } };
        })
        .then(({ ok, status, data }) => {
          // --- Process AJAX Result ---
          let shouldReEnableButton = true; // Assume button should be re-enabled unless success+redirect

          // 1. SUCCESS CASE
          if (ok && data?.status === "success") {
            console.log(`[${formId}] AJAX Success:`, data);
            shouldReEnableButton = false; // Don't re-enable immediately on success

            if (successDiv && data.message) {
              successDiv.textContent = data.message;
              successDiv.classList.add("active");
              successDiv.style.display = 'block';
            } else if (data.message) {
              // alert(data.message); // Fallback alert
            }

            if (submitButton) {
              submitButton.innerHTML = '<i class="fas fa-check"></i> Успешно!';
              submitButton.style.backgroundColor = "var(--accent-color)";
              // Keep disabled until redirect or reset
            }

            // *** HANDLE REDIRECT ***
            if (data.redirect_url) {
              console.log(`[${formId}] Redirecting to: ${data.redirect_url}`);
              setTimeout(() => {
                window.location.href = data.redirect_url;
              }, 1000); // Adjust delay as needed
            } else {
              // If no redirect, reset form after a longer delay AND re-enable button then
              console.log(`[${formId}] No redirect URL provided. Resetting form.`);
              setTimeout(() => {
                form.reset();
                Object.values(window.textInputInstances).forEach(inst => { if (form.contains(inst.element)) inst.reset(); });
                Object.values(window.fileUploadInstances).forEach(inst => { if (form.contains(inst.fileInput)) inst.clearAllFiles(); });
                form.querySelectorAll('.django-custom-select-widget').forEach(wc => { if (form.contains(wc)) wc.widgetInstance?.resetState(); });
                form.querySelectorAll('.checkbox-field.error').forEach(cf => cf.classList.remove('error'));
                form.querySelectorAll('.form-error').forEach(fe => { fe.textContent = ''; fe.style.display = 'none'; });
                if (submitButton) { submitButton.innerHTML = originalButtonHTML; submitButton.disabled = false; submitButton.style.backgroundColor = ""; }
                if (successDiv) { successDiv.classList.remove("active"); successDiv.style.display = 'none'; }
              }, 2500);
            }

            // 2. VALIDATION ERROR CASE (Server-side)
          } else if (!ok && (status === 400 || status === 422) && data?.status === "error" && data.errors) {
            console.warn(`[${formId}] AJAX Validation Errors:`, data.errors);
            firstInvalidElement = null;
            if (genericErrorDiv) { genericErrorDiv.textContent = ''; } // Clear previous generic errors

            Object.keys(data.errors).forEach((fieldName) => {
              const field = form.querySelector(`[name="${fieldName}"]`);
              let errorMessage = data.errors[fieldName];
              if (Array.isArray(errorMessage)) errorMessage = errorMessage.join(' ');
              else if (typeof errorMessage !== 'string') errorMessage = String(errorMessage);

              let errorHandled = false;
              if (fieldName === '__all__') {
                if (genericErrorDiv) {
                  genericErrorDiv.textContent += (genericErrorDiv.textContent ? ' ' : '') + errorMessage;
                  errorHandled = true;
                } else { console.warn(`[${formId}] Generic error div not found`); }
              } else if (field) {
                if (field.matches('.auth-input, .auth-textarea') && field.id && window.textInputInstances?.[field.id]) {
                  window.textInputInstances[field.id].setError(errorMessage); if (!firstInvalidElement) firstInvalidElement = field; errorHandled = true;
                } else if (field.matches('.django-select-input-native')) {
                  const wc = form.querySelector(`.django-custom-select-widget[data-native-select-id="${field.id}"]`);
                  const errEl = document.getElementById(`${field.id}-error`);
                  if (wc && errEl) { wc.classList.add('select--error'); errEl.textContent = errorMessage; errEl.style.display = 'block'; errEl.classList.add('shake'); setTimeout(() => errEl.classList.remove('shake'), 400); if (!firstInvalidElement) firstInvalidElement = wc.querySelector('.select-header') || wc; errorHandled = true; }
                } else if (field.matches('.checkbox-input')) {
                  const fc = field.closest('.checkbox-field');
                  if (fc) { const errEl = fc.querySelector('.form-error') || document.getElementById(`${field.id}-error`); if (errEl) { fc.classList.add('error'); errEl.textContent = errorMessage; errEl.style.display = 'block'; errEl.classList.add('shake'); setTimeout(() => errEl.classList.remove('shake'), 400); if (!firstInvalidElement) firstInvalidElement = fc.querySelector('.checkbox-custom') || fc; errorHandled = true; } }
                } else if (field.matches('.file-input')) {
                  const inst = window.fileUploadInstances?.[field.id];
                  if (inst?.errorMessage) { inst.errorMessage.textContent = errorMessage; inst.errorMessage.classList.remove('hidden'); inst.container?.classList.add('upload-error'); if (!firstInvalidElement) firstInvalidElement = inst.dropzone || inst.container; errorHandled = true; }
                }
              } else {
                console.warn(`[${formId}] Server error field '${fieldName}' not found, adding to generic.`);
                if (genericErrorDiv) { genericErrorDiv.textContent += (genericErrorDiv.textContent ? ' ' : '') + `${fieldName}: ${errorMessage}`; errorHandled = true; }
              }
              if (!errorHandled) { console.warn(`[${formId}] Could not handle error for '${fieldName}'`); }
            });

            if (genericErrorDiv && genericErrorDiv.textContent.trim()) { genericErrorDiv.style.display = 'block'; if (!firstInvalidElement) firstInvalidElement = genericErrorDiv; }
            form.classList.add("animate__animated", "animate__shakeX"); setTimeout(() => form.classList.remove("animate__animated", "animate__shakeX"), 600);
            if (firstInvalidElement) { /* ... focus/scroll logic ... */ }
            // Button re-enabled in finally block

            // 3. OTHER ERROR CASE
          } else {
            let finalErrorMessage = "Произошла непредвиденная ошибка.";
            if (data?.error) { finalErrorMessage = data.error + (data.details ? ` (${data.details})` : ''); }
            else if (!ok) { finalErrorMessage = `Ошибка сервера (${status || 'Network Error'}). Пожалуйста, попробуйте позже.`; }
            console.error(`[${formId}] Unhandled AJAX Error:`, { ok, status, data });
            if (genericErrorDiv) { genericErrorDiv.textContent = finalErrorMessage; genericErrorDiv.style.display = 'block'; genericErrorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
            else { alert(finalErrorMessage); }
            form.classList.add("animate__animated", "animate__shakeX"); setTimeout(() => form.classList.remove("animate__animated", "animate__shakeX"), 600);
            // Button re-enabled in finally block
          }

          // Re-enable button if it was disabled and we are NOT in a success+redirect scenario
          if (submitButton && submitButton.disabled && shouldReEnableButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonHTML;
            submitButton.style.backgroundColor = "";
          }
        })
        .finally(() => {
          console.log(`[${formId}] AJAX request finished.`);
          // Final check to ensure button is enabled if something went wrong during .then() processing
          // and it wasn't a success+redirect case
          if (submitButton && submitButton.disabled && !(ok && data?.status === "success" && data.redirect_url)) {
            console.log(`[${formId}] Re-enabling submit button in finally block (fallback).`);
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonHTML;
            submitButton.style.backgroundColor = "";
          }
        });

    }); // End form submit listener
  }); // End ajaxForms.forEach

  console.log("Widget initialization finished.");
}); // End DOMContentLoaded