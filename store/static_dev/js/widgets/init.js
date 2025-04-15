// --"--\Catalog\store\static_dev\js\widgets\init.js"--
import TextInput from "./text_input.js";
import { initPasswordInputs } from "./password_input.js";
import { initAllCustomSelects } from "./select_input.js";

// --- Функция валидации кастомного селекта ---
function validateCustomSelect(widgetContainer) {
  const nativeSelectId = widgetContainer?.dataset.nativeSelectId;
  const nativeSelect = document.getElementById(nativeSelectId);
  const errorElementId = `${nativeSelectId}-error`;
  const errorElement = document.getElementById(errorElementId);
  const isRequired = nativeSelect?.hasAttribute('required');
  // --- Получаем minSelections из config ---
  const config = widgetContainer.widgetInstance?.config || {}; // Получаем инстанс и конфиг
  const minSelections = config.minSelections || 0;
  const minSelectionsMessageTemplate = config.minSelectionsMessage || 'Выберите минимум {min} элемент(а/ов)';
  // ---

  if (!nativeSelect || !widgetContainer) {
    console.warn("Validation: Could not find native select or widget container for:", nativeSelectId);
    return true; // Cannot validate, assume okay for now
  }

  // Filter out placeholder options if they exist and have no value
  const selectedOptions = Array.from(nativeSelect.selectedOptions).filter(opt => opt.value);
  let isValid = true;
  let errorMessage = "";

  // Проверка 1: Обязательное поле (required)
  if (isRequired && selectedOptions.length === 0) {
    isValid = false;
    errorMessage = nativeSelect.dataset.requiredMessage || widgetContainer.dataset.requiredMessage || "Это поле обязательно для заполнения.";
  }
  // Проверка 2: Минимальное количество (только если isValid все еще true)
  else if (minSelections > 0 && selectedOptions.length < minSelections) {
    isValid = false;
    // Формируем сообщение с нужным числом
    errorMessage = minSelectionsMessageTemplate.replace('{min}', minSelections);
  }

  // Обновляем UI
  widgetContainer.classList.toggle('select--error', !isValid);
  if (errorElement) {
    if (!isValid) {
      errorElement.textContent = errorMessage;
      errorElement.style.display = 'block';
    } else {
      errorElement.textContent = '';
      errorElement.style.display = 'none';
    }
  } else if (!isValid) {
    // Log warning only if validation failed and error element is missing
    console.warn(`Validation FAIL for ${nativeSelectId}, but error element #${errorElementId} not found.`);
  }

  return isValid;
}
// --- Конец функции валидации ---


document.addEventListener("DOMContentLoaded", () => {
  // ... (остальная часть DOMContentLoaded без изменений) ...
  console.log("DOM Content Loaded. Initializing widgets...");

  // Global store for TextInput instances if needed elsewhere
  window.textInputInstances = {};

  const forms = document.querySelectorAll("form[novalidate]"); // Target forms that need custom validation

  // --- Initialize Widgets ---
  initPasswordInputs(); // Initialize password toggle and confirmation logic first
  initAllCustomSelects(); // Initialize custom select dropdowns

  forms.forEach((form) => {
    console.log(`Processing form: #${form.id || form.name || 'unnamed'}`);

    // Initialize TextInput instances for all relevant fields in this form
    const textInputs = form.querySelectorAll(".auth-input"); // Select all potential text/password inputs
    textInputs.forEach((input) => {
      if (input.id) {
        // Avoid re-initializing if already handled by password logic, maybe check instance existence first?
        // Though TextInput constructor is idempotent, it might be slightly inefficient.
        // Let's assume it's okay for now.
        window.textInputInstances[input.id] = new TextInput(input);
      } else {
        console.warn("TextInput init: Input element without ID skipped.", input);
      }
    });

    // --- Focus Management (Enter Key Navigation) ---
    const focusableElements = Array.from(
      form.querySelectorAll('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), .select-header')
    );

    form.querySelectorAll('.auth-input, .select-header').forEach((element) => {
      const isTextInput = element.matches('.auth-input') && element.id && window.textInputInstances[element.id];
      const isSelectHeader = element.matches('.select-header');

      if (isTextInput || isSelectHeader) {
        element.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault(); // Prevent default form submission on Enter in fields
            let proceed = true; // Flag to check if validation passes

            // Validate current field before moving
            if (isTextInput) {
              const instance = window.textInputInstances[element.id];
              if (!instance.validate()) {
                proceed = false;
              }
            } else if (isSelectHeader) {
              const customWidget = element.closest('.django-custom-select-widget');
              if (customWidget) {
                // Close dropdown if open before validating
                if (customWidget.classList.contains('select--open')) {
                  customWidget.widgetInstance?.close(); // Use optional chaining
                }
                if (!validateCustomSelect(customWidget)) { // Validate the select on Enter
                  proceed = false;
                }
              }
            }

            // Move focus if valid
            if (proceed) {
              const currentIndex = focusableElements.findIndex(el => el === element);
              const nextIndex = currentIndex + 1;
              if (currentIndex > -1 && nextIndex < focusableElements.length) {
                focusableElements[nextIndex]?.focus(); // Use optional chaining
              } else if (currentIndex === focusableElements.length - 1) {
                // If it's the last element, focus the submit button
                form.querySelector('button[type="submit"]')?.focus();
              }
            }
          }
        });
      }
    });

    // --- Validation on Blur ---
    // Add blur validation for standard text inputs (excluding password confirmation handled separately)
    form.querySelectorAll('.auth-input:not([data-confirm-target]), .auth-textarea').forEach(field => {
      if (field.id && window.textInputInstances[field.id]) {
        field.addEventListener('blur', () => {
          window.textInputInstances[field.id].validate();
        });
      }
    });

    // Add blur validation for custom selects
    form.querySelectorAll('.django-custom-select-widget').forEach(widgetContainer => {
      // Validate when focus moves *outside* the entire widget
      widgetContainer.addEventListener('focusout', (e) => {
        // Check if the newly focused element is still within the widget
        if (!widgetContainer.contains(e.relatedTarget)) {
          validateCustomSelect(widgetContainer);
        }
      });
    });

    // --- Form Submission Handling (AJAX) ---
    form.addEventListener("submit", (e) => {
      e.preventDefault(); // Prevent standard form submission
      console.log(`Form submission attempt: #${form.id || 'unnamed'}`);

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalBtnHTML = submitBtn ? submitBtn.innerHTML : ""; // Store original button text/icon
      const genericErrorDivId = form.dataset.genericErrorId || "form-generic-error";
      const successDivId = form.dataset.successId || "form-success";
      const genericErrorDiv = document.getElementById(genericErrorDivId);
      const successDiv = document.getElementById(successDivId);
      let isFormValid = true;
      let firstInvalidElement = null;

      // Select all elements needing validation
      const formInputsToValidate = form.querySelectorAll(".auth-input, .auth-textarea, .django-custom-select-widget");

      // --- Reset States Before Validation ---
      if (genericErrorDiv) {
        genericErrorDiv.textContent = '';
        genericErrorDiv.style.display = 'none';
      }
      if (successDiv) {
        successDiv.textContent = '';
        successDiv.classList.remove("active"); // Remove active class for fade-in
        successDiv.style.display = 'none';
      }
      // Reset individual field states (errors/success)
      form.querySelectorAll(".auth-input, .auth-textarea").forEach(input => {
        if (input.id && window.textInputInstances[input.id]) {
          window.textInputInstances[input.id].reset(); // Use the instance's reset method
        }
      });
      form.querySelectorAll(".django-custom-select-widget").forEach(widgetContainer => {
        widgetContainer.classList.remove('select--error');
        const errorElement = document.getElementById(`${widgetContainer.dataset.nativeSelectId}-error`);
        if (errorElement) {
          errorElement.textContent = '';
          errorElement.style.display = 'none';
        }
      });

      // --- Client-side Validation Loop ---
      // Validate TextInputs and Textareas
      form.querySelectorAll(".auth-input, .auth-textarea").forEach(input => {
        if (input.id && window.textInputInstances[input.id]) {
          const instance = window.textInputInstances[input.id];
          if (!instance.validate()) {
            isFormValid = false;
            if (!firstInvalidElement) firstInvalidElement = instance.element;
          }
        } else if (input.willValidate && !input.checkValidity()) {
          // Fallback for native validation if TextInput instance isn't found (shouldn't happen often)
          isFormValid = false;
          if (!firstInvalidElement) firstInvalidElement = input;
          console.warn(`Native validation failed for input without TextInput instance: ${input.name || input.id}`);
        }
      });

      // Validate Custom Selects
      form.querySelectorAll(".django-custom-select-widget").forEach(widgetContainer => {
        if (!validateCustomSelect(widgetContainer)) {
          isFormValid = false;
          // Try to focus the header, fallback to the container
          if (!firstInvalidElement) {
            firstInvalidElement = widgetContainer.querySelector('.select-header') || widgetContainer;
          }
        }
      });


      // --- Handle Invalid Form ---
      if (!isFormValid) {
        console.log("Form is invalid on client-side.");
        // Add shake animation to the form
        form.classList.add("animate__animated", "animate__shakeX");
        // Remove animation class after it finishes
        setTimeout(() => form.classList.remove("animate__animated", "animate__shakeX"), 600);

        // Focus the first invalid element
        firstInvalidElement?.focus();
        // Optionally scroll to the first invalid element
        firstInvalidElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return; // Stop submission
      }

      // --- AJAX Submission ---
      console.log("Form is valid on client-side. Proceeding with AJAX...");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Обработка...';
      } else {
        console.warn("Submit button not found for form:", form.id);
      }

      const formData = new FormData(form);
      const csrfToken = formData.get("csrfmiddlewaretoken") || document.querySelector('[name=csrfmiddlewaretoken]')?.value;

      fetch(form.action, {
        method: "POST",
        body: formData,
        headers: {
          "X-Requested-With": "XMLHttpRequest", // Identify as AJAX
          "X-CSRFToken": csrfToken // Send CSRF token
        }
      })
        .then(response => {
          // Check content type to decide how to parse
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.indexOf("application/json") !== -1) {
            // If JSON, parse it and wrap it with response status info
            return response.json().then(data => ({ ok: response.ok, status: response.status, data: data }));
          } else {
            // If not JSON, read as text and create a standard error structure
            console.warn(`Response from ${form.action} was not JSON (Content-Type: ${contentType}). Status: ${response.status}`);
            return response.text().then(text => {
              // Construct a standard error object
              let errorData = {
                error: `Server responded with status ${response.status}.`,
                details: "Response was not in expected JSON format.",
                raw_response: text // Include raw response for debugging
              };
              // Specific handling for common non-JSON errors if needed (e.g., redirects, server errors returning HTML)
              if (response.status >= 500) {
                errorData.error = `Server error (${response.status}). Please try again later.`;
              } else if (response.status === 403) {
                errorData.error = "Permission denied (403).";
              }
              // ... other status codes
              return { ok: response.ok, status: response.status, data: errorData };
            });
          }
        })
        .catch(networkError => {
          // Handle network errors (e.g., server down, CORS issues)
          console.error("Fetch Network Error:", networkError);
          return {
            ok: false,
            status: 0, // Indicate network error
            data: { error: "Network error occurred.", details: networkError.message }
          };
        })
        .then(({ ok, status, data }) => {
          // --- Process AJAX Response ---

          if (ok && data?.status === "success") {
            // --- Success ---
            console.log("AJAX Success:", data);
            if (successDiv) {
              successDiv.textContent = data.message || "Успех!";
              successDiv.classList.add("active"); // Trigger fade-in/show animation
              successDiv.style.display = 'block'; // Ensure it's block for scrollIntoView
              successDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
              alert(data.message || "Успех!"); // Fallback
            }
            if (submitBtn) {
              // Visually indicate success on the button briefly
              submitBtn.innerHTML = '<i class="fas fa-check"></i> Успешно!';
              submitBtn.style.backgroundColor = "var(--accent-color)"; // Use accent color for success
            }

            // Reset form and states after a delay
            setTimeout(() => {
              form.reset(); // Reset native form fields
              // Reset custom widget states
              formInputsToValidate.forEach(element => {
                if (element.matches('.auth-input, .auth-textarea') && element.id && window.textInputInstances[element.id]) {
                  window.textInputInstances[element.id].reset();
                } else if (element.matches('.django-custom-select-widget')) {
                  // Reset visual state
                  element.classList.remove('select--error');
                  const errorElement = document.getElementById(`${element.dataset.nativeSelectId}-error`);
                  if (errorElement) { errorElement.style.display = 'none'; errorElement.textContent = ''; }
                  // Clear selection in the widget instance and update header
                  element.widgetInstance?.removeSelectedItem?.(null); // Assuming a method to clear all, or loop if needed
                  element.widgetInstance?.updateHeader?.(); // Update placeholder
                }
              });
              // Restore submit button
              if (submitBtn) {
                submitBtn.innerHTML = originalBtnHTML;
                submitBtn.disabled = false;
                submitBtn.style.backgroundColor = ""; // Reset background
              }
              // Hide success message
              if (successDiv) {
                successDiv.classList.remove("active");
                successDiv.style.display = 'none';
              }
            }, 2500); // Adjust delay as needed

          } else if (!ok && status === 400 && data?.status === "error" && data.errors) {
            // --- Server-side Validation Errors ---
            console.warn("AJAX Validation Errors:", data.errors);
            firstInvalidElement = null; // Reset for finding the first server error
            Object.keys(data.errors).forEach((fieldName) => {
              // Find the corresponding field (input or select)
              const field = form.querySelector(`[name="${fieldName}"]`);
              const errorMsg = Array.isArray(data.errors[fieldName]) ? data.errors[fieldName].join(', ') : data.errors[fieldName];

              if (field?.matches('.auth-input, .auth-textarea') && field.id && window.textInputInstances[field.id]) {
                // --- Handle TextInput/Textarea Error ---
                window.textInputInstances[field.id].setError(errorMsg); // Use setError method
                if (!firstInvalidElement) firstInvalidElement = field;
              } else if (field?.matches('.django-select-input-native')) {
                // --- Handle Custom Select Error ---
                const widgetContainer = document.querySelector(`.django-custom-select-widget[data-native-select-id="${field.id}"]`);
                const errorElement = document.getElementById(`${field.id}-error`);
                if (widgetContainer && errorElement) {
                  widgetContainer.classList.add('select--error');
                  errorElement.textContent = errorMsg;
                  errorElement.style.display = 'block';
                  if (!firstInvalidElement) firstInvalidElement = widgetContainer.querySelector('.select-header') || widgetContainer;
                } else {
                  console.warn(`Server Error: Cannot find elements for select field '${fieldName}' to display error: "${errorMsg}"`);
                  // Optionally display in generic error div as fallback
                  if (genericErrorDiv && !genericErrorDiv.textContent.includes(errorMsg)) {
                    genericErrorDiv.textContent += `${fieldName}: ${errorMsg} `;
                    genericErrorDiv.style.display = 'block';
                  }
                }
              } else {
                // --- Fallback for errors on fields without specific handlers ---
                console.warn(`Server Error: Cannot find element for field '${fieldName}' or no specific handler. Error: "${errorMsg}"`);
                // Display in the generic error div
                if (genericErrorDiv && !genericErrorDiv.textContent.includes(errorMsg)) {
                  genericErrorDiv.textContent += `${fieldName}: ${errorMsg} `;
                  genericErrorDiv.style.display = 'block';
                  if (!firstInvalidElement) firstInvalidElement = genericErrorDiv; // Focus generic error? Maybe not ideal.
                }
              }
            });

            // Add shake animation
            form.classList.add("animate__animated", "animate__shakeX");
            setTimeout(() => form.classList.remove("animate__animated", "animate__shakeX"), 600);

            // Focus the first field with a server-side error
            firstInvalidElement?.focus();
            firstInvalidElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Re-enable submit button
            if (submitBtn) {
              submitBtn.innerHTML = originalBtnHTML;
              submitBtn.disabled = false;
            }

          } else {
            // --- Other Errors (Server Error, Network Error, Unexpected Format) ---
            let errorMsg = "Произошла непредвиденная ошибка."; // Default message
            if (data && data.error) {
              errorMsg = data.error; // Use error message from parsed data if available
              if (data.details) {
                errorMsg += ` (${data.details})`; // Add details if present
              }
            } else if (!ok) {
              errorMsg = `Ошибка сервера (${status || 'Network Error'}). Пожалуйста, попробуйте позже.`;
            }
            console.error("Unhandled AJAX Error:", { ok, status, data });

            if (genericErrorDiv) {
              genericErrorDiv.textContent = errorMsg;
              genericErrorDiv.style.display = 'block';
              genericErrorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
              alert(errorMsg); // Fallback
            }
            // Add shake animation
            form.classList.add("animate__animated", "animate__shakeX");
            setTimeout(() => form.classList.remove("animate__animated", "animate__shakeX"), 600);

            // Re-enable submit button
            if (submitBtn) {
              submitBtn.innerHTML = originalBtnHTML;
              submitBtn.disabled = false;
            }
          }
        })
        .finally(() => {
          console.log("AJAX request finished.");
          // Ensure button is re-enabled if not handled by specific cases above
          // (e.g., if an error occurred before .then() fully processed)
          if (submitBtn && submitBtn.disabled && !form.querySelector('.form-success.active')) { // Don't re-enable if success message is showing
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHTML;
            submitBtn.style.backgroundColor = ""; // Reset background
          }
        });
    }); // End form submit listener

  }); // End forms.forEach

  console.log("Widget initialization finished.");
}); // End DOMContentLoaded