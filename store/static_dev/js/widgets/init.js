// --"--\Catalog\store\static_dev\js\widgets\init.js"-- (COMPLETE & CORRECTED)
import TextInput from "./text_input.js";
import { initPasswordInputs } from "./password_input.js";
import { initAllCustomSelects } from "./select_input.js";
import { initCheckboxes, validateCheckbox } from "./checkbox_input.js";
import { FileUpload } from "./file_input.js"; // Import FileUpload

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

  const forms = document.querySelectorAll("form[novalidate]");

  // --- Initialize Widgets ---
  initPasswordInputs();    // Handles password visibility toggles & confirmation logic
  initAllCustomSelects(); // Initializes all custom select dropdowns
  initCheckboxes();       // Initializes custom checkboxes

  // --- Process Each Form ---
  forms.forEach((form) => {
    const formId = form.id || form.name || 'unnamed_form';
    console.log(`[${formId}] Processing form...`);

    // Initialize File Inputs for this form
    const fileWidgetContainers = form.querySelectorAll(".file-upload-container");
    fileWidgetContainers.forEach(container => {
      const fileInput = container.querySelector('.file-input');
      if (fileInput && fileInput.id && !window.fileUploadInstances[fileInput.id]) {
        console.log(`[${formId}] Initializing FileUpload for: #${fileInput.id}`);
        try {
          window.fileUploadInstances[fileInput.id] = new FileUpload(container);
        } catch (e) {
          console.error(`[${formId}] Error initializing FileUpload for #${fileInput.id}:`, e);
          container.innerHTML = `<p style="color:red;">Error loading file widget.</p>`; // Indicate failure
        }
      } else if (fileInput && !fileInput.id) {
        console.warn(`[${formId}] FileUpload init: File input missing ID inside container:`, container);
      }
    });

    // Initialize Text Inputs & Textareas for this form
    const textFields = form.querySelectorAll(".auth-input, .auth-textarea");
    textFields.forEach((fieldElement) => {
      if (fieldElement.id && !window.textInputInstances[fieldElement.id]) {
        // console.log(`[${formId}] Initializing TextInput for: #${fieldElement.id}`);
        window.textInputInstances[fieldElement.id] = new TextInput(fieldElement);
      } else if (!fieldElement.id) {
        console.warn(`[${formId}] TextInput init: Input or Textarea element without ID skipped.`, fieldElement);
      }
    });

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
          form.requestSubmit();
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


    // --- Form Submission Handler (AJAX) ---
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      console.log(`[${formId}] Form submission attempt...`);

      const submitButton = form.querySelector('button[type="submit"]');
      const originalButtonHTML = submitButton ? submitButton.innerHTML : "";
      const genericErrorDivId = form.dataset.genericErrorId || "form-generic-error";
      const successDivId = form.dataset.successId || "form-success";
      const genericErrorDiv = document.getElementById(genericErrorDivId);
      const successDiv = document.getElementById(successDivId);
      let isFormValid = true;
      let firstInvalidElement = null;

      // --- Reset States Before Validation ---
      if (genericErrorDiv) { genericErrorDiv.style.display = 'none'; genericErrorDiv.textContent = ''; }
      if (successDiv) { successDiv.style.display = 'none'; successDiv.textContent = ''; successDiv.classList.remove("active"); }
      form.querySelectorAll(".auth-input, .auth-textarea").forEach(input => window.textInputInstances[input.id]?.resetUI());
      form.querySelectorAll(".django-custom-select-widget").forEach(widgetContainer => {
        widgetContainer.classList.remove('select--error');
        const errorElement = document.getElementById(`${widgetContainer.dataset.nativeSelectId}-error`);
        if (errorElement) { errorElement.style.display = 'none'; errorElement.textContent = ''; errorElement.classList.remove('shake'); }
      });
      form.querySelectorAll(".checkbox-field").forEach(fieldContainer => {
        fieldContainer.classList.remove('error');
        const errorElement = fieldContainer.querySelector('.form-error');
        if (errorElement) { errorElement.style.display = 'none'; errorElement.textContent = ''; errorElement.classList.remove('shake'); }
      });
      form.querySelectorAll(".file-upload-container").forEach(container => {
        const fileInput = container.querySelector('.file-input');
        if (fileInput?.id) { // Use optional chaining
          const instance = window.fileUploadInstances[fileInput.id];
          if (instance?.errorMessage) { // Use optional chaining
            instance.errorMessage.style.display = 'none';
            instance.errorMessage.textContent = '';
          }
        }
        container.classList.remove('upload-error');
      });

      // --- Perform Client-Side Validation ---
      const formInputsToValidate = form.querySelectorAll(
        ".auth-input, .auth-textarea, " +
        ".django-custom-select-widget, " +
        ".checkbox-input, " +
        ".file-input"
      );

      formInputsToValidate.forEach(element => {
        let currentFieldIsValid = true; // Assume valid initially

        // Validate Text/Textarea
        if (element.matches('.auth-input, .auth-textarea') && element.id && window.textInputInstances[element.id]) {
          if (!window.textInputInstances[element.id].validate()) { currentFieldIsValid = false; }
        }
        // Validate Custom Select
        else if (element.matches('.django-custom-select-widget')) {
          if (!validateCustomSelect(element)) { currentFieldIsValid = false; }
        }
        // Validate Checkbox (Required check is most common)
        else if (element.matches('.checkbox-input')) {
          if (element.hasAttribute('required') && !validateCheckbox(element)) { currentFieldIsValid = false; }
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
              if (instance.errorMessage && instance.errorMessage.textContent === (element.dataset.requiredMessage || "Please select at least one file.")) {
                instance.errorMessage.textContent = '';
                instance.errorMessage.classList.add('hidden');
                instance.container?.classList.remove('upload-error');
              }
            }

            // Check if the JS widget has *already* displayed an error (e.g., size/count limit)
            if (instance.errorMessage && !instance.errorMessage.classList.contains('hidden')) {
              fieldHasError = true; // Consider invalid if error msg is visible
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
              ? element.closest('.checkbox-field')?.querySelector('.checkbox-custom') || element
              : element.matches('.file-input')
                ? element.closest('.file-upload-container')?.querySelector('.dropzone') || element
                : element;
        }
        isFormValid = isFormValid && currentFieldIsValid;
      }); // End validation loop

      // --- Handle Invalid Form ---
      if (!isFormValid) {
        console.log(`[${formId}] Form is invalid on client-side. First invalid element:`, firstInvalidElement);
        form.classList.add("animate__animated", "animate__shakeX");
        setTimeout(() => { form.classList.remove("animate__animated", "animate__shakeX"); }, 600);
        if (firstInvalidElement) {
          const elementToFocus = firstInvalidElement.matches('.checkbox-custom, .dropzone, .form-error') ? firstInvalidElement : firstInvalidElement;
          elementToFocus.focus({ preventScroll: true });
          const elementToScroll = firstInvalidElement.closest('.form-field') || firstInvalidElement.closest('.file-upload-container') || elementToFocus;
          console.log(`[${formId}] Scrolling to:`, elementToScroll);
          elementToScroll.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

      // Create FormData from the form element
      const formData = new FormData(form);
      const csrfToken = formData.get("csrfmiddlewaretoken") || document.querySelector('[name=csrfmiddlewaretoken]')?.value;

      console.log(`[${formId}] Initial FormData entries (excluding files):`, Array.from(formData.keys()));

      // --- CRITICAL: Append files from JS instances to FormData ---
      let fileAppendCount = 0;
      // Iterate over *known* file input instances associated with *this form*
      form.querySelectorAll('.file-input').forEach(fileInput => {
        const instance = window.fileUploadInstances?.[fileInput.id];
        if (instance) {
          const fieldName = instance.fileInput.name; // Get the correct name attribute
          if (!fieldName) {
            console.error(`[${formId}] File input #${fileInput.id} is missing the 'name' attribute! Cannot append files.`);
            return; // Skip this input
          }
          console.log(`[${formId}] Processing files for field: ${fieldName} (#${fileInput.id})`);

          // Remove potentially stale file entries for this field name
          if (formData.has(fieldName)) {
            console.log(`[${formId}] Removing existing FormData entries for ${fieldName}...`);
            formData.delete(fieldName);
          }

          // Append files currently managed by the JS instance
          const filesToAppend = instance.getFiles(); // Get the array of File objects
          if (filesToAppend.length > 0) {
            console.log(`[${formId}] Appending ${filesToAppend.length} file(s) from JS instance for ${fieldName}:`);
            filesToAppend.forEach(file => {
              // Use the 3-argument version of append for files
              formData.append(fieldName, file, file.name);
              console.log(`  - Appended: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
              fileAppendCount++;
            });
          } else {
            console.log(`[${formId}] No files managed by JS instance for ${fieldName} to append.`);
            // If the field is NOT required, we might need to explicitly send an empty value
            // if the backend expects the key even if no file is uploaded.
            // However, usually, omitting the key is sufficient for optional files.
            // formData.append(fieldName, ''); // Example: Send empty if needed
          }
        } else {
          console.warn(`[${formId}] FileUpload instance not found for input #${fileInput.id} during FormData creation.`);
        }
      });
      console.log(`[${formId}] Total files appended to FormData: ${fileAppendCount}`);

      // DEBUG: Log all FormData entries just before sending
      console.log(`[${formId}] Final FormData entries before fetch:`);
      for (const pair of formData.entries()) {
        if (pair[1] instanceof File) {
          console.log(`  ${pair[0]}: File[ name: ${pair[1].name}, size: ${pair[1].size}, type: ${pair[1].type} ]`);
        } else {
          console.log(`  ${pair[0]}: ${pair[1]}`); // Log other field values
        }
      }

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
          // (Existing response processing logic)
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            return response.json().then(data => ({ ok: response.ok, status: response.status, data: data }));
          } else {
            console.warn(`[${formId}] Response not JSON (Content-Type: ${contentType}). Status: ${response.status}`);
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
          // (Existing network error handling)
          console.error(`[${formId}] Fetch Network Error:`, networkError);
          // Display error in generic div or alert
          const errorMsg = `Network error: ${networkError.message}. Please check your connection.`;
          if (genericErrorDiv) {
            genericErrorDiv.textContent = errorMsg;
            genericErrorDiv.style.display = 'block';
            genericErrorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            alert(errorMsg);
          }
          // Re-enable button on network error
          if (submitButton) {
            submitButton.innerHTML = originalButtonHTML;
            submitButton.disabled = false;
          }
          // Return a consistent error structure
          return { ok: false, status: 0, data: { error: "Network error.", details: networkError.message } };
        })
        .then(({ ok, status, data }) => {
          // --- Process AJAX Result ---
          // (Existing result processing logic for SUCCESS, VALIDATION ERROR, OTHER ERROR)
          // 1. SUCCESS CASE
          if (ok && data?.status === "success") {
            console.log(`[${formId}] AJAX Success:`, data);
            if (successDiv) { successDiv.textContent = data.message || "Успех!"; successDiv.classList.add("active"); successDiv.style.display = 'block'; successDiv.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
            else { alert(data.message || "Успех!"); }
            if (submitButton) { submitButton.innerHTML = '<i class="fas fa-check"></i> Успешно!'; submitButton.style.backgroundColor = "var(--accent-color)"; }
            setTimeout(() => {
              form.reset();
              Object.values(window.textInputInstances).forEach(inst => { if (form.contains(inst.element)) inst.reset(); }); // Check ownership
              Object.values(window.fileUploadInstances).forEach(inst => { if (form.contains(inst.fileInput)) inst.clearAllFiles(); }); // Check ownership
              form.querySelectorAll('.django-custom-select-widget').forEach(wc => { if (form.contains(wc)) wc.widgetInstance?.resetState(); }); // Check ownership
              form.querySelectorAll('.checkbox-field').forEach(cf => cf.classList.remove('error'));
              if (submitButton) { submitButton.innerHTML = originalButtonHTML; submitButton.disabled = false; submitButton.style.backgroundColor = ""; }
              if (successDiv) { successDiv.classList.remove("active"); successDiv.style.display = 'none'; }
            }, 2500);

            // 2. VALIDATION ERROR CASE (Server-side)
          } else if (!ok && (status === 400 || status === 422) && data?.status === "error" && data.errors) {
            console.warn(`[${formId}] AJAX Validation Errors:`, data.errors);
            firstInvalidElement = null;
            Object.keys(data.errors).forEach((fieldName) => {
              const field = form.querySelector(`[name="${fieldName}"]`);
              const errorMessage = Array.isArray(data.errors[fieldName]) ? data.errors[fieldName].join(' ') : data.errors[fieldName];
              let errorHandled = false;
              if (!field && fieldName !== '__all__') { console.warn(`[${formId}] Server Error: Field '${fieldName}' not found.`); if (genericErrorDiv && !genericErrorDiv.textContent.includes(errorMessage)) { genericErrorDiv.textContent += `${fieldName}: ${errorMessage} `; errorHandled = true; } return; }
              // Display Server Error on Corresponding Widget
              if (field?.matches('.auth-input, .auth-textarea') && field.id && window.textInputInstances[field.id]) {
                window.textInputInstances[field.id].setError(errorMessage); if (!firstInvalidElement) firstInvalidElement = field; errorHandled = true;
              } else if (field?.matches('.django-select-input-native')) {
                const widgetContainer = form.querySelector(`.django-custom-select-widget[data-native-select-id="${field.id}"]`); const errorElement = document.getElementById(`${field.id}-error`); if (widgetContainer && errorElement) { widgetContainer.classList.add('select--error'); errorElement.textContent = errorMessage; errorElement.style.display = 'block'; errorElement.classList.add('shake'); setTimeout(() => errorElement.classList.remove('shake'), 400); if (!firstInvalidElement) firstInvalidElement = widgetContainer.querySelector('.select-header') || widgetContainer; errorHandled = true; }
              } else if (field?.matches('.checkbox-input')) {
                const fieldContainer = field.closest('.checkbox-field'); if (fieldContainer) { const errorElement = fieldContainer.querySelector('.form-error'); if (errorElement) { fieldContainer.classList.add('error'); errorElement.textContent = errorMessage; errorElement.style.display = 'block'; errorElement.classList.add('shake'); setTimeout(() => errorElement.classList.remove('shake'), 400); if (!firstInvalidElement) firstInvalidElement = fieldContainer.querySelector('.checkbox-custom') || field; errorHandled = true; } }
              } else if (field?.matches('.file-input')) {
                const instance = window.fileUploadInstances?.[field.id]; if (instance?.errorMessage) { instance.errorMessage.textContent = errorMessage; instance.errorMessage.classList.remove('hidden'); instance.container?.classList.add('upload-error'); if (!firstInvalidElement) firstInvalidElement = instance.dropzone || instance.container; errorHandled = true; }
              } else if (fieldName === '__all__' || !errorHandled) { if (genericErrorDiv && !genericErrorDiv.textContent.includes(errorMessage)) { genericErrorDiv.textContent += `${errorMessage} `; errorHandled = true; } }
            });
            if (genericErrorDiv && genericErrorDiv.textContent.trim()) { genericErrorDiv.style.display = 'block'; if (!firstInvalidElement) firstInvalidElement = genericErrorDiv; }
            form.classList.add("animate__animated", "animate__shakeX"); setTimeout(() => form.classList.remove("animate__animated", "animate__shakeX"), 600);
            if (firstInvalidElement) { const elementToFocus = firstInvalidElement.matches('.checkbox-custom, .dropzone, .form-error') ? firstInvalidElement : firstInvalidElement; elementToFocus.focus({ preventScroll: true }); const elToScroll = firstInvalidElement.closest('.form-field') || firstInvalidElement.closest('.file-upload-container') || firstInvalidElement; elToScroll.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
            if (submitButton) { submitButton.innerHTML = originalButtonHTML; submitButton.disabled = false; }

            // 3. OTHER ERROR CASE (Server Error, Network Error, etc.)
          } else {
            let finalErrorMessage = "Произошла непредвиденная ошибка.";
            if (data?.error) { finalErrorMessage = data.error + (data.details ? ` (${data.details})` : ''); }
            else if (!ok) { finalErrorMessage = `Ошибка сервера (${status || 'Network Error'}). Пожалуйста, попробуйте позже.`; }
            console.error(`[${formId}] Unhandled AJAX Error:`, { ok, status, data });
            if (genericErrorDiv) { genericErrorDiv.textContent = finalErrorMessage; genericErrorDiv.style.display = 'block'; genericErrorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
            else { alert(finalErrorMessage); }
            form.classList.add("animate__animated", "animate__shakeX"); setTimeout(() => form.classList.remove("animate__animated", "animate__shakeX"), 600);
            if (submitButton) { submitButton.innerHTML = originalButtonHTML; submitButton.disabled = false; }
          }
        })
        .finally(() => {
          console.log(`[${formId}] AJAX request finished.`);
          // Ensure button is enabled if it's still processing and not in success state
          if (submitButton && submitButton.disabled && !(successDiv?.classList.contains('active'))) {
            console.log(`[${formId}] Re-enabling submit button in finally block.`);
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonHTML;
            submitButton.style.backgroundColor = "";
          }
        });

    }); // End form submit listener
  }); // End forms.forEach

  console.log("Widget initialization finished.");
}); // End DOMContentLoaded