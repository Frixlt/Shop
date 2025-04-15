// --"--\Catalog\store\static_dev\js\widgets\password_input.js"--

/**
 * Handles password visibility toggling and real-time visual feedback for confirmation.
 * Text error messages are deferred until blur or final validation.
 */
function initPasswordInputs() {
  console.log("Initializing password inputs (Deferred Text Error Mode)...");

  // --- Password Visibility Toggle (Delegation) ---
  document.body.addEventListener('click', function (event) {
    // ... (toggle logic remains the same) ...
    const toggleIcon = event.target.closest('.password-toggle-icon');
    if (!toggleIcon) return;
    const targetInputId = toggleIcon.dataset.target;
    if (!targetInputId) return;
    const passwordInput = document.getElementById(targetInputId);
    if (!passwordInput) return;
    const currentType = passwordInput.getAttribute('type');
    passwordInput.setAttribute('type', currentType === 'password' ? 'text' : 'password');
    toggleIcon.classList.toggle('fa-eye');
    toggleIcon.classList.toggle('fa-eye-slash');
  });

  // --- Password Confirmation Validation (Real-time VISUAL Feedback) ---
  const confirmationFields = document.querySelectorAll('input[data-confirm-target]');

  confirmationFields.forEach(confirmField => {
    const passwordFieldId = confirmField.dataset.confirmTarget;
    const passwordField = document.getElementById(passwordFieldId);
    let errorElement = document.getElementById(`${confirmField.id}-error`);
    const wrapper = confirmField.closest('.input-wrapper');
    if (!errorElement && wrapper && wrapper.nextElementSibling?.classList.contains('form-error')) {
      errorElement = wrapper.nextElementSibling;
    }

    if (!passwordField || !wrapper || !errorElement) {
      console.warn(`Password confirmation setup error for "${confirmField.id}". Missing elements.`);
      return;
    }

    // --- Function to handle real-time VISUAL feedback ---
    const handleRealtimeVisualFeedback = () => {
      const passwordValue = passwordField.value;
      const confirmValue = confirmField.value;
      const mismatchMessage = confirmField.dataset.mismatchMessage || "Passwords do not match.";

      // --- Scenario 1: Confirmation field has content ---
      if (confirmValue) {
        if (passwordValue === confirmValue) {
          // --- MATCH ---
          // Set success state visually
          wrapper.classList.remove('error');
          wrapper.classList.add('success');
          // Clear mismatch text if it was previously shown (e.g., after a blur)
          if (errorElement.textContent === mismatchMessage) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
          }
        } else {
          // --- MISMATCH ---
          // Set error state visually (red border/icon)
          wrapper.classList.add('error');
          wrapper.classList.remove('success');
          // **DO NOT** show text error message here during input
          // Clear any non-mismatch error text that might be showing
          // if (errorElement.textContent !== mismatchMessage) {
          //     errorElement.textContent = '';
          //     errorElement.style.display = 'none';
          // }
        }
      }
      // --- Scenario 2: Confirmation field is EMPTY ---
      else {
        // Remove visual error/success states related to matching.
        wrapper.classList.remove('error');
        wrapper.classList.remove('success');
        // Clear mismatch text if it was showing
        if (errorElement.textContent === mismatchMessage) {
          errorElement.textContent = '';
          errorElement.style.display = 'none';
        }
        // 'Required' error text will be handled by the main validator on blur/submit.
      }
    };

    // --- Attach Listeners ---
    // Listener for typing in the CONFIRMATION field
    confirmField.addEventListener('input', handleRealtimeVisualFeedback);

    // Listener for typing in the MAIN password field
    passwordField.addEventListener('input', () => {
      // Update confirmation visual feedback ONLY if the confirmation field is not empty
      if (confirmField.value) {
        handleRealtimeVisualFeedback();
      }
    });

    // Listener for BLUR on the confirmation field
    confirmField.addEventListener('blur', () => {
      // On blur, trigger the FULL validation from the TextInput instance
      const instance = window.textInputInstances && window.textInputInstances[confirmField.id];
      if (instance) {
        console.log(`Blur validation triggered for confirmation: ${confirmField.id}`);
        // This will run all checks (required, match) and display the TEXT error if needed
        instance.validate();
      } else {
        console.warn(`Blur validation: TextInput instance not found for ${confirmField.id}`);
      }
    });

  }); // End confirmationFields.forEach

  console.log("Password input initialization complete (Deferred Text Error Mode).");
}

// Export the init function
export { initPasswordInputs };