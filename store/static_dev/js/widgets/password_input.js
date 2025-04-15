// --"--\Catalog\store\static_dev\js\widgets\password_input.js"--

/**
 * Initializes password input specific functionalities:
 * 1. Visibility Toggling: Allows users to show/hide password text.
 * 2. Real-time Confirmation Feedback (Visual Only): Provides immediate visual cues
 *    (success/error icons and borders) when the confirmation field is being typed
 *    into, based on whether it matches the main password field.
 * 3. Defers Text Error Messages: Text error messages (e.g., "Passwords do not match", "Required")
 *    for the confirmation field are NOT shown during real-time input but are handled
 *    by the main TextInput validation logic triggered on blur or form submission.
 */
function initPasswordInputs() {
  console.log("Initializing password inputs (Deferred Text Error Mode)...");

  // --- Password Visibility Toggle (Using Event Delegation) ---
  // Listen on the body for clicks on toggle icons for efficiency.
  document.body.addEventListener('click', function (event) {
    const toggleIcon = event.target.closest('.password-toggle-icon');
    if (!toggleIcon) return; // Click wasn't on a toggle icon or its descendant

    const targetInputId = toggleIcon.dataset.target; // Get the ID of the input to toggle
    if (!targetInputId) {
      console.warn("Password toggle icon is missing 'data-target' attribute.");
      return;
    }

    const passwordInput = document.getElementById(targetInputId);
    if (!passwordInput) {
      console.warn(`Password input with ID '${targetInputId}' not found for toggle.`);
      return;
    }

    // Toggle the input type between 'password' and 'text'
    const currentType = passwordInput.getAttribute('type');
    passwordInput.setAttribute('type', currentType === 'password' ? 'text' : 'password');

    // Toggle the icon class (e.g., Font Awesome eye/eye-slash)
    toggleIcon.classList.toggle('fa-eye'); // Assumes Font Awesome classes
    toggleIcon.classList.toggle('fa-eye-slash'); // Adjust classes if using a different icon set
  });

  // --- Password Confirmation Validation (Real-time VISUAL Feedback) ---
  // Find all password confirmation fields (identified by 'data-confirm-target' attribute)
  const confirmationFields = document.querySelectorAll('input[data-confirm-target]');

  confirmationFields.forEach(confirmField => {
    const passwordFieldId = confirmField.dataset.confirmTarget;
    const passwordField = document.getElementById(passwordFieldId);
    // Find the error message element associated with the confirmation field
    let errorElement = document.getElementById(`${confirmField.id}-error`);
    const wrapper = confirmField.closest('.input-wrapper'); // Get the wrapper for visual styling

    // Fallback for finding error element if ID-based lookup fails
    if (!errorElement && wrapper && wrapper.nextElementSibling?.classList.contains('form-error')) {
      errorElement = wrapper.nextElementSibling;
    }

    if (!passwordField || !wrapper || !errorElement) {
      console.warn(`Password confirmation setup error for "${confirmField.id}". Missing one or more required elements (password field, wrapper, or error element).`);
      return; // Skip setup for this field if elements are missing
    }

    // --- Function to handle real-time VISUAL feedback updates ---
    const handleRealtimeVisualFeedback = () => {
      const passwordValue = passwordField.value; // Get current value of main password field
      const confirmValue = confirmField.value; // Get current value of confirmation field
      const mismatchMessage = confirmField.dataset.mismatchMessage || "Passwords do not match."; // Get the specific mismatch message

      // --- Scenario 1: Confirmation field has some content ---
      if (confirmValue) {
        if (passwordValue === confirmValue) {
          // --- MATCH ---
          // Set success state visually (e.g., green border/icon)
          wrapper.classList.remove('error');
          wrapper.classList.add('success');
          // IMPORTANT: Clear the *text* error message ONLY if it's the mismatch message.
          // This prevents clearing other potential errors (like 'required') prematurely.
          if (errorElement.textContent === mismatchMessage) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
          }
        } else {
          // --- MISMATCH ---
          // Set error state visually (e.g., red border/icon)
          wrapper.classList.add('error');
          wrapper.classList.remove('success');
          // **DO NOT** show the text error message here during 'input' event.
          // The main TextInput validation will handle showing the text on blur/submit.
          // We also *don't* clear the text error here, as it might be showing a
          // 'required' error from a previous blur, which should persist until resolved.
        }
      }
      // --- Scenario 2: Confirmation field is EMPTY ---
      else {
        // If the confirmation field is cleared, remove visual error/success states
        // that were related *specifically* to matching.
        wrapper.classList.remove('error');
        wrapper.classList.remove('success');
        // Clear the mismatch text error if it was specifically showing.
        if (errorElement.textContent === mismatchMessage) {
          errorElement.textContent = '';
          errorElement.style.display = 'none';
        }
        // 'Required' error text (if applicable) will be handled by the main validator on blur/submit.
      }
    };

    // --- Attach Event Listeners ---

    // Listener for typing in the CONFIRMATION field
    // Provides instant visual feedback as the user types in this field.
    confirmField.addEventListener('input', handleRealtimeVisualFeedback);

    // Listener for typing in the MAIN password field
    // Updates the confirmation field's visual state *if* the confirmation field isn't empty.
    // This handles the case where the user types the main password *after* the confirmation.
    passwordField.addEventListener('input', () => {
      // Only update confirmation feedback if the confirmation field already has content.
      if (confirmField.value) {
        handleRealtimeVisualFeedback();
      }
    });

    // Listener for BLUR on the confirmation field
    // When the user leaves the confirmation field, trigger the full validation logic
    // from its associated TextInput instance. This will handle showing *text* errors
    // for 'required' or 'mismatch' if applicable.
    confirmField.addEventListener('blur', () => {
      // Retrieve the TextInput instance associated with this confirmation field
      const instance = window.textInputInstances && window.textInputInstances[confirmField.id];
      if (instance) {
        console.log(`Blur validation triggered for confirmation: ${confirmField.id}`);
        // Call the main validate method, which handles all checks (required, match, etc.)
        // and updates the UI including text error messages.
        instance.validate();
      } else {
        // This should ideally not happen if init.js runs correctly
        console.warn(`Blur validation: TextInput instance not found for confirmation field ${confirmField.id}`);
      }
    });

  }); // End confirmationFields.forEach

  console.log("Password input initialization complete (Deferred Text Error Mode).");
}

// Export the init function for use in init.js
export { initPasswordInputs };