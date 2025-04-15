// --"--\Catalog\store\static_dev\js\widgets\text_input.js"--
class TextInput {
  constructor(element) {
    this.element = element;
    this.wrapper = element.closest(".input-wrapper");
    // Prioritize ID-based error element first
    this.errorElement = element.id ? document.getElementById(`${element.id}-error`) : null;
    // Fallback to querySelector inside wrapper
    if (!this.errorElement && this.wrapper) {
      this.errorElement = this.wrapper.querySelector(".form-error");
    }
    // Fallback to data attribute ID
    if (!this.errorElement && element.dataset.errorElementId) {
      this.errorElement = document.getElementById(element.dataset.errorElementId);
    }
    // Fallback: look for sibling .form-error (less reliable)
    if (!this.errorElement && this.wrapper && this.wrapper.nextElementSibling?.classList.contains('form-error')) {
      this.errorElement = this.wrapper.nextElementSibling;
    }


    this.minLength = parseInt(element.dataset.minLength) || 0;
    this.maxLength = parseInt(element.dataset.maxLength) || null;
    this.pattern = element.dataset.pattern ? new RegExp(element.dataset.pattern) : null;
    this.patternErrorMessage = element.dataset.patternErrorMessage || element.dataset.errorMessage || "Некорректный формат";
    this.required = element.hasAttribute("required");

    this.requiredMessage = element.dataset.requiredMessage || "Это поле обязательно для заполнения";
    this.minLengthMessage = element.dataset.minLengthMessage || `Минимальная длина: ${this.minLength} симв.`;
    this.maxLengthMessage = element.dataset.maxLengthMessage || `Максимальная длина: ${this.maxLength} симв.`;
    this.emailMessage = element.dataset.emailMessage || "Пожалуйста, введите корректный email";
    this.phoneMessage = element.dataset.phoneMessage || "Пожалуйста, введите корректный телефон (например, +79XXXXXXXXX)";
    // Add mismatch message reference
    this.mismatchMessage = element.dataset.mismatchMessage || "Passwords do not match.";

    if (!this.wrapper) {
      console.warn("TextInput: Не найден .input-wrapper для элемента:", element);
    }
    if (!this.errorElement) {
      console.warn("TextInput: Не найден элемент для вывода ошибок для:", element);
    }

    // No need for init() here anymore if listeners are in password_input.js and main init.js
    // We keep blur validation in main init.js for non-password fields
    // if (this.wrapper && this.errorElement) {
    //   this.init();
    // }
  }

  validate() {
    let isValid = true;
    let message = "";
    let isMatchValid = true; // Flag specifically for password match

    // Reset UI state related to this field's errors *before* validation
    this.resetUI();

    const value = this.element.value.trim();

    // --- Standard Validations ---
    if (this.required && !value) {
      isValid = false;
      message = this.requiredMessage;
    }

    if (isValid && this.minLength > 0 && value && value.length < this.minLength) {
      isValid = false;
      message = this.minLengthMessage;
    }

    if (isValid && this.maxLength && value && value.length > this.maxLength) {
      isValid = false;
      message = this.maxLengthMessage;
    }

    if (isValid && this.pattern && value && !this.pattern.test(value)) {
      isValid = false;
      message = this.patternErrorMessage;
    }

    if (isValid && this.element.type === "email" && value) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@\.]{2,}$/;
      if (!emailPattern.test(value)) {
        isValid = false;
        message = this.emailMessage;
      }
    }

    // --- NEW: Password Confirmation Match Check ---
    // Check if this *is* a confirmation field
    const confirmTargetId = this.element.dataset.confirmTarget;
    if (confirmTargetId) {
      const passwordField = document.getElementById(confirmTargetId);
      if (passwordField) {
        const passwordValue = passwordField.value; // No trim here, compare exact values
        const confirmValue = this.element.value; // No trim

        // Check for mismatch *only if* the confirmation field has a value
        if (confirmValue && passwordValue !== confirmValue) {
          isValid = false; // Overall field validation fails
          isMatchValid = false; // Specific match fails
          message = this.mismatchMessage; // Set the specific message
        }
      } else {
        console.warn(`TextInput validation: Target password field "${confirmTargetId}" not found for confirmation.`);
      }
    }
    // --- End NEW ---


    this.updateUI(isValid, message);
    return isValid;
  }

  resetUI() {
    if (this.wrapper) {
      this.wrapper.classList.remove("error", "success");
    }
    if (this.errorElement) {
      // Clear the error text only if it wasn't the mismatch error that's handled elsewhere,
      // OR if it *was* the mismatch error and now it's potentially valid again.
      // Safter just to clear it here and let validate() repopulate if needed.
      this.errorElement.textContent = "";
      this.errorElement.style.display = "none";
      this.errorElement.classList.remove("shake");
    }
  }

  updateUI(isValid, message) {
    if (!this.wrapper || !this.errorElement) return;

    if (!isValid) {
      this.wrapper.classList.add("error");
      this.wrapper.classList.remove("success");
      this.errorElement.textContent = message;
      this.errorElement.style.display = "block";
      // Only add shake animation if the error wasn't already displayed
      // This prevents shaking on every input event during mismatch
      // A simple way is to check if it was already visible with the same message:
      // if (this.errorElement.style.display !== 'block' || this.errorElement.textContent !== message) {
      this.errorElement.classList.add("shake");
      // }
    } else {
      this.wrapper.classList.remove("error");
      // Add success state only if the field has a value and is valid
      if (this.element.value.trim()) {
        this.wrapper.classList.add("success");
      } else {
        this.wrapper.classList.remove("success"); // Remove success if field is cleared
      }
      this.errorElement.textContent = "";
      this.errorElement.style.display = "none";
      this.errorElement.classList.remove("shake");
    }
  }

  setError(message) {
    // Keep this method for setting server-side errors
    this.resetUI();
    if (this.wrapper && this.errorElement) {
      this.wrapper.classList.add("error");
      this.wrapper.classList.remove("success");
      this.errorElement.textContent = message;
      this.errorElement.style.display = "block";
      this.errorElement.classList.add("shake");
    }
  }

  reset() {
    // This method is called externally (e.g., on successful AJAX submit)
    this.resetUI();
    // Optionally clear the value, although form.reset() might handle it
    // this.element.value = '';
  }

  // init() method removed as listeners are handled elsewhere
}

export default TextInput;