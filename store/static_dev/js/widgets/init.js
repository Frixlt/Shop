// --"--\Catalog\store\static_dev\js\widgets\init.js"--
import TextInput from "./text_input.js";
import { initPasswordInputs } from "./password_input.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Content Loaded. Initializing widgets...");
  window.textInputInstances = {};
  const forms = document.querySelectorAll("form[novalidate]");

  initPasswordInputs();

  forms.forEach((form) => {
    console.log(`Processing form: #${form.id || form.name || 'unnamed'}`);
    const inputs = form.querySelectorAll(".auth-input");
    inputs.forEach((input) => {
      if (input.id) {
        window.textInputInstances[input.id] = new TextInput(input);
      } else {
        console.warn("TextInput init: Input элемент не имеет ID, пропускается.", input);
      }
    });

    // --- Enter Key Navigation (remains the same) ---
    const focusableElements = Array.from(
      form.querySelectorAll(
        'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
      )
    );
    inputs.forEach((input) => {
      if (!window.textInputInstances[input.id]) return;
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const instance = window.textInputInstances[input.id];
          const isValid = instance.validate();
          if (isValid) {
            const currentIndex = focusableElements.findIndex(el => el === input);
            if (currentIndex > -1 && currentIndex < focusableElements.length - 1) {
              focusableElements[currentIndex + 1]?.focus();
            } else if (currentIndex === focusableElements.length - 1) {
              form.querySelector('button[type="submit"]')?.focus();
            }
          }
        }
      });
    });

    // --- Blur validation ONLY for NON-confirmation fields (remains the same) ---
    form.querySelectorAll('.auth-input:not([data-confirm-target]), .auth-select, .auth-textarea')
      .forEach(field => {
        if (field.id && window.textInputInstances[field.id]) {
          field.addEventListener('blur', () => {
            console.log(`Blur validation for non-confirmation: ${field.id}`);
            window.textInputInstances[field.id].validate();
          });
        }
      });

    // --- Form Submission Logic ---
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      console.log(`Form submission attempt: #${form.id || 'unnamed'}`);
      let isFormValid = true;
      let firstInvalidElement = null;
      const genericErrorDivId = form.dataset.genericErrorId || "form-generic-error";
      const successDivId = form.dataset.successId || "form-success";
      const genericErrorDiv = document.getElementById(genericErrorDivId);
      const successDiv = document.getElementById(successDivId);

      // Reset previous states
      if (genericErrorDiv) { genericErrorDiv.textContent = ''; genericErrorDiv.style.display = 'none'; }
      if (successDiv) { successDiv.textContent = ''; successDiv.classList.remove("active"); successDiv.style.display = 'none'; }
      form.querySelectorAll(".auth-input").forEach(input => {
        if (input.id && window.textInputInstances[input.id]) { window.textInputInstances[input.id].reset(); }
      });

      // Client-side Validation
      const formInputsToValidate = form.querySelectorAll(".auth-input, .auth-select, .auth-textarea");
      formInputsToValidate.forEach(input => {
        if (input.id && window.textInputInstances[input.id]) {
          const instance = window.textInputInstances[input.id];
          if (!instance.validate()) {
            isFormValid = false; if (!firstInvalidElement) firstInvalidElement = instance.element;
          }
        } else if (input.willValidate && !input.checkValidity()) {
          isFormValid = false; if (!firstInvalidElement) firstInvalidElement = input;
        }
      });

      if (!isFormValid) {
        console.log("Form is invalid on client-side.");
        form.classList.add("animate__animated", "animate__shakeX");
        setTimeout(() => form.classList.remove("animate__animated", "animate__shakeX"), 600);
        firstInvalidElement?.focus();
        firstInvalidElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      // AJAX Submission
      console.log("Form is valid on client-side. Submitting via AJAX...");
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalBtnHTML = submitBtn ? submitBtn.innerHTML : "";
      if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Обработка...'; }
      const formData = new FormData(form);

      fetch(form.action, {
        method: "POST",
        body: formData,
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          "X-CSRFToken": formData.get("csrfmiddlewaretoken") || document.querySelector('[name=csrfmiddlewaretoken]')?.value
        },
      })
        .then(response => { // First .then, receives the raw Response object
          // Attempt to parse as JSON
          return response.json()
            .then(data => ({ // Success path for response.json()
              ok: response.ok, // Use the original response.ok
              status: response.status, // Use the original response.status
              data: data // The parsed JSON data
            }))
            .catch(jsonError => { // Catch ONLY errors from response.json()
              console.warn("Response was not valid JSON:", jsonError);
              // If JSON parsing failed, attempt to read as text
              return response.text()
                .then(text => { // Success path for response.text()
                  let errorMsg = `Server returned status ${response.status}. Response was not JSON.`;
                  // Try to extract some info from the text if needed
                  // try { /* ... */ } catch (parseError) { }
                  console.log("Raw text response:", text);
                  // Return a structured error object, using original response status
                  return { ok: response.ok, status: response.status, data: { error: errorMsg, raw_response: text } };
                })
                .catch(textError => { // *** ADDED: Catch errors from response.text() ***
                  console.error("Failed to read response body as text:", textError);
                  // Construct a fallback error object even if text parsing fails
                  const errorMsg = `Server returned status ${response.status}. Failed to read response body.`;
                  // Return the structured error object, using original response status
                  return { ok: response.ok, status: response.status, data: { error: errorMsg } };
                });
            }); // End of catch for jsonError
        }) // End of first .then
        .then(({ ok, status, data }) => { // *** Second .then - Should now always receive an object ***
          console.log("Processed Server response:", data, "Status:", status, "OK:", ok);

          if (ok && data?.status === "success") { // Check data.status safely
            // --- Handle Success ---
            if (submitBtn) { submitBtn.innerHTML = '<i class="fas fa-check"></i> Успешно!'; submitBtn.style.backgroundColor = "var(--accent-color)"; }
            if (successDiv) { successDiv.textContent = data.message || "Форма успешно отправлена!"; successDiv.classList.add("active"); successDiv.style.display = 'block'; successDiv.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
            setTimeout(() => {
              form.reset();
              formInputsToValidate.forEach(input => {
                if (input.id && window.textInputInstances[input.id]) { window.textInputInstances[input.id].reset(); }
              });
              if (submitBtn) { submitBtn.innerHTML = originalBtnHTML; submitBtn.disabled = false; submitBtn.style.backgroundColor = ""; }
              if (successDiv) { successDiv.classList.remove("active"); successDiv.style.display = 'none'; }
            }, 2500);

          } else if (!ok && status === 400 && data?.status === "error" && data.errors) {
            // --- Handle Server-Side Validation Errors ---
            console.log("Server validation errors:", data.errors);
            let firstServerErrorField = null;
            Object.keys(data.errors).forEach((fieldName) => {
              const field = form.querySelector(`[name="${fieldName}"]`);
              if (field?.id && window.textInputInstances[field.id]) {
                const instance = window.textInputInstances[field.id];
                const errorMessage = Array.isArray(data.errors[fieldName]) ? data.errors[fieldName].join(', ') : data.errors[fieldName];
                instance.setError(errorMessage);
                if (!firstServerErrorField) firstServerErrorField = field;
              } else {
                console.warn(`Could not find TextInput instance or element for server error on field: ${fieldName}`);
                if (genericErrorDiv) { genericErrorDiv.innerHTML += `<div>${fieldName}: ${Array.isArray(data.errors[fieldName]) ? data.errors[fieldName].join(', ') : data.errors[fieldName]}</div>`; genericErrorDiv.style.display = 'block'; }
              }
            });
            form.classList.add("animate__animated", "animate__shakeX");
            setTimeout(() => form.classList.remove("animate__animated", "animate__shakeX"), 600);
            if (firstServerErrorField) { firstServerErrorField.focus(); firstServerErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
            else if (genericErrorDiv) { genericErrorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
            if (submitBtn) { submitBtn.innerHTML = originalBtnHTML; submitBtn.disabled = false; }

          } else {
            // --- Handle Other Server Errors ---
            let errorMessage = "Произошла ошибка при отправке формы. Попробуйте снова.";
            // Safely access potential error messages from data
            if (data && typeof data === 'object') {
              errorMessage = data.message || data.detail || data.error || errorMessage;
              if (typeof errorMessage !== 'string') {
                try { errorMessage = JSON.stringify(errorMessage); } catch (e) { errorMessage = "Не удалось обработать ответ сервера."; }
              }
            } else if (!ok) { // Use the status code if data is not helpful
              errorMessage = `Ошибка сервера (${status}). Пожалуйста, попробуйте позже.`;
            }
            console.error("Unhandled server error or unexpected response format. Data:", data);
            if (genericErrorDiv) { genericErrorDiv.textContent = errorMessage; genericErrorDiv.style.display = 'block'; genericErrorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
            else { alert(errorMessage); }
            form.classList.add("animate__animated", "animate__shakeX");
            setTimeout(() => form.classList.remove("animate__animated", "animate__shakeX"), 600);
            if (submitBtn) { submitBtn.innerHTML = originalBtnHTML; submitBtn.disabled = false; }
          }
        })
        .catch((error) => { // Catches Network errors or truly unhandled rejections
          // --- Handle Fetch/Network Errors ---
          console.error("Fetch error caught:", error); // Log the actual error
          const networkErrorMsg = "Не удалось связаться с сервером. Проверьте ваше подключение к Интернету.";
          if (genericErrorDiv) { genericErrorDiv.textContent = networkErrorMsg; genericErrorDiv.style.display = 'block'; genericErrorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
          else { alert(networkErrorMsg); }
          form.classList.add("animate__animated", "animate__shakeX");
          setTimeout(() => form.classList.remove("animate__animated", "animate__shakeX"), 600);
          if (submitBtn) { submitBtn.innerHTML = originalBtnHTML; submitBtn.disabled = false; }
        })
        .finally(() => {
          console.log("AJAX request finished.");
        });
      // --- End AJAX Submission ---
    }); // End Form Submission Logic
  }); // End forms.forEach

  console.log("Widget initialization finished.");
}); // End DOMContentLoaded