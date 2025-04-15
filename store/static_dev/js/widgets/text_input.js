// --"--\Catalog\store\static_dev\js\widgets\text_input.js"--

/**
 * Manages validation and UI feedback for a single text input field
 * (text, email, password, tel, etc.).
 * Handles required checks, min/max length, patterns, and specific formats like email.
 * Updates associated wrapper and error elements with success/error states.
 */
class TextInput {
  /**
   * @param {HTMLInputElement|HTMLTextAreaElement} element - The input or textarea element.
   */
  constructor(element) {
    this.element = element;
    if (!this.element) {
      console.error("TextInput: Element not provided.");
      return;
    }

    // --- Element References ---
    this.wrapper = element.closest(".input-wrapper"); // Find the immediate wrapper

    // Find the error message element using various strategies for flexibility:
    this.errorElement = null;
    if (element.id) {
      // 1. Prioritize ID-based lookup (most reliable): elementId + '-error'
      this.errorElement = document.getElementById(`${element.id}-error`);
    }
    if (!this.errorElement && this.wrapper) {
      // 2. Fallback: Look for a '.form-error' element directly inside the wrapper
      this.errorElement = this.wrapper.querySelector(".form-error");
    }
    if (!this.errorElement && element.dataset.errorElementId) {
      // 3. Fallback: Look for an ID specified in a data attribute
      this.errorElement = document.getElementById(element.dataset.errorElementId);
    }
    if (!this.errorElement && this.wrapper && this.wrapper.nextElementSibling?.classList.contains('form-error')) {
      // 4. Fallback: Look for a '.form-error' element that is the *next sibling* of the wrapper
      this.errorElement = this.wrapper.nextElementSibling;
    }

    // --- Validation Configuration (from data attributes) ---
    this.minLength = parseInt(element.dataset.minLength, 10) || 0; // Default 0
    this.maxLength = parseInt(element.dataset.maxLength, 10) || null; // Default null (no limit)
    this.pattern = element.dataset.pattern ? new RegExp(element.dataset.pattern) : null;
    this.required = element.hasAttribute("required");

    // --- Error Messages (from data attributes, with defaults) ---
    this.requiredMessage = element.dataset.requiredMessage || "Это поле обязательно для заполнения";
    this.minLengthMessage = element.dataset.minLengthMessage || `Минимальная длина: ${this.minLength} симв.`;
    this.maxLengthMessage = element.dataset.maxLengthMessage || `Максимальная длина: ${this.maxLength} симв.`;
    // Use patternErrorMessage first, fallback to generic errorMessage, then default
    this.patternErrorMessage = element.dataset.patternErrorMessage || element.dataset.errorMessage || "Некорректный формат";
    this.emailMessage = element.dataset.emailMessage || "Пожалуйста, введите корректный email";
    this.phoneMessage = element.dataset.phoneMessage || "Пожалуйста, введите корректный телефон (например, +79XXXXXXXXX)";
    // Message for password confirmation mismatch
    this.mismatchMessage = element.dataset.mismatchMessage || "Пароли не совпадают."; // Ensure consistent naming if used elsewhere

    // --- Warnings for Missing Elements ---
    if (!this.wrapper) {
      console.warn("TextInput: Could not find .input-wrapper for element:", element);
    }
    if (!this.errorElement) {
      console.warn("TextInput: Could not find error display element for:", element);
      // Functionality related to error messages will be disabled.
    }

    // Initialization logic (like adding blur listeners) is handled centrally in init.js
    // to coordinate with other widget types (like password confirmation).
  }

  /**
   * Validates the input field based on its configuration.
   * Updates the UI to reflect the validation result (error/success states, messages).
   * @returns {boolean} True if the field is valid, false otherwise.
   */
  validate() {
    let isValid = true;
    let message = "";

    // Reset UI state related to this field's errors *before* performing validation checks
    this.resetUI();

    const value = this.element.value.trim(); // Use trimmed value for most checks
    const rawValue = this.element.value; // Keep raw value for password confirmation

    // --- 1. Required Check ---
    if (this.required && !value) {
      isValid = false;
      message = this.requiredMessage;
    }

    // --- 2. Min Length Check ---
    // Only check if the field has a value and validation hasn't failed yet
    if (isValid && this.minLength > 0 && value && value.length < this.minLength) {
      isValid = false;
      message = this.minLengthMessage;
    }

    // --- 3. Max Length Check ---
    // Only check if the field has a value and validation hasn't failed yet
    if (isValid && this.maxLength && value.length > this.maxLength) { // No need to check `value` truthiness here, length check handles empty
      isValid = false;
      message = this.maxLengthMessage;
    }

    // --- 4. Pattern Check ---
    // Only check if the field has a value and validation hasn't failed yet
    if (isValid && this.pattern && value && !this.pattern.test(value)) {
      isValid = false;
      message = this.patternErrorMessage;
    }

    // --- 5. Email Format Check ---
    // Only check if type="email", has value, and validation hasn't failed yet
    if (isValid && this.element.type === "email" && value) {
      // Basic but common email pattern
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@\.]{2,}$/;
      if (!emailPattern.test(value)) {
        isValid = false;
        message = this.emailMessage;
      }
    }

    // --- 6. Phone Format Check (Example - adjust pattern as needed) ---
    // Only check if type="tel", has value, and validation hasn't failed yet
    if (isValid && this.element.type === "tel" && value) {
      // Example pattern: optional +, digits, spaces, hyphens, parentheses
      // const phonePattern = /^\+?\d[\d\s\(\)-]{7,}$/; // Simple example
      // Use the pattern from data-attribute if available, otherwise could add a default here
      // Note: Pattern check (step 4) might already cover this if data-pattern is set correctly for tel.
      // This specific check is more for demonstrating type-based validation.
      // Let's rely on the data-pattern provided for phones for now.
    }


    // --- 7. Password Confirmation Match Check ---
    const confirmTargetId = this.element.dataset.confirmTarget;
    // Check if this field is designated as a confirmation field
    if (confirmTargetId) {
      const passwordField = document.getElementById(confirmTargetId);
      if (passwordField) {
        const passwordValue = passwordField.value; // Use raw value for comparison
        // Check for mismatch only if validation is still potentially valid AND the confirm field has content
        if (isValid && rawValue && passwordValue !== rawValue) {
          isValid = false;
          message = this.mismatchMessage; // Use the specific mismatch message
        }
        // Edge case: If the confirm field is *required* and *empty*, the required check (step 1)
        // should already have caught it. If it's not required and empty, mismatch is not relevant.
      } else {
        console.warn(`TextInput validation: Target password field "#${confirmTargetId}" not found for confirmation field "#${this.element.id}".`);
        // Consider if this situation itself constitutes an error (config issue)
        // isValid = false;
        // message = "Configuration error: Target password field not found.";
      }
    }
    // --- End Password Confirmation ---


    // --- Update UI based on final validation state ---
    this.updateUI(isValid, message);
    return isValid;
  }

  /**
   * Resets the visual state (removes error/success classes and messages)
   * for this input field and its associated elements.
   * Called before validation runs or when the form is successfully submitted.
   * @private
   */
  resetUI() {
    if (this.wrapper) {
      this.wrapper.classList.remove("error", "success");
    }
    if (this.errorElement) {
      this.errorElement.textContent = ""; // Clear message
      this.errorElement.style.display = "none"; // Hide element
      this.errorElement.classList.remove("shake"); // Remove shake animation class
    }
  }

  /**
   * Updates the wrapper class (error/success) and the error message display
   * based on the validation result.
   * @param {boolean} isValid - The result of the validation check.
   * @param {string} message - The error message to display if invalid.
   * @private
   */
  updateUI(isValid, message) {
    if (!this.wrapper || !this.errorElement) {
      // Cannot update UI if elements are missing
      if (!isValid) {
        console.warn(`TextInput validation failed for ${this.element.id || this.element.name}, but UI elements (wrapper or errorElement) are missing.`);
      }
      return;
    }

    if (!isValid) {
      // --- Invalid State ---
      this.wrapper.classList.add("error");
      this.wrapper.classList.remove("success"); // Ensure success is removed
      this.errorElement.textContent = message; // Display the error message
      this.errorElement.style.display = "block"; // Make the error element visible

      // Add shake animation for feedback, typically on initial error detection (e.g., blur or submit)
      // Avoid adding shake on every 'input' event if doing real-time validation there.
      // Since validation here is typically on blur/submit, adding shake is usually appropriate.
      this.errorElement.classList.add("shake");

    } else {
      // --- Valid State ---
      this.wrapper.classList.remove("error");
      // Add success state only if the field is not empty (visual cue that input is valid)
      if (this.element.value.trim()) {
        this.wrapper.classList.add("success");
      } else {
        this.wrapper.classList.remove("success"); // Remove success if field is empty but valid (e.g., optional field)
      }
      // Clear and hide the error message element
      this.errorElement.textContent = "";
      this.errorElement.style.display = "none";
      this.errorElement.classList.remove("shake");
    }
  }

  /**
   * Public method to explicitly set an error state and message on the field.
   * Useful for displaying server-side validation errors.
   * @param {string} message - The error message returned from the server.
   */
  setError(message) {
    this.resetUI(); // Clear any previous client-side state first
    if (this.wrapper && this.errorElement) {
      this.wrapper.classList.add("error");
      this.wrapper.classList.remove("success");
      this.errorElement.textContent = message;
      this.errorElement.style.display = "block";
      this.errorElement.classList.add("shake"); // Add shake for server errors too
    } else {
      console.warn(`TextInput setError: Cannot display server error "${message}" for ${this.element.id || this.element.name} due to missing UI elements.`);
    }
  }

  /**
   * Public method to reset the field's validation state and UI.
   * Typically called after a successful form submission or manual form reset.
   */
  reset() {
    this.resetUI();
    // Note: This does NOT clear the input's value.
    // Form reset is usually handled by form.reset() in init.js.
  }

}

export default TextInput;