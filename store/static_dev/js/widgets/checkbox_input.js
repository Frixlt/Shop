function initCheckboxes() {
  console.log("Initializing checkboxes...");
  const checkboxes = document.querySelectorAll('.checkbox-input');
  if (checkboxes.length === 0) {
    console.warn("No elements with class 'checkbox-input' found on the page.");
  }
  checkboxes.forEach(checkbox => {
    const fieldContainer = checkbox.closest('.checkbox-field');
    if (!fieldContainer) {
      console.warn("Checkbox input missing parent .checkbox-field container:", checkbox);
      return;
    }
    const customCheckbox = fieldContainer.querySelector('.checkbox-custom');
    const label = fieldContainer.querySelector('.checkbox-label');

    checkbox.addEventListener('change', () => {
      validateCheckbox(checkbox);
    });

    checkbox.addEventListener('blur', () => {
      validateCheckbox(checkbox);
    });

    if (customCheckbox) {
      customCheckbox.addEventListener('click', () => {
        checkbox.click();
      });
      customCheckbox.setAttribute('tabindex', '0');
      customCheckbox.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          checkbox.click();
        }
      });
    }

    if (label) {
      label.addEventListener('click', (event) => {
        // Prevent clicks on <a> tags from toggling the checkbox
        if (event.target.tagName === 'A') {
          event.stopPropagation();
          return;
        }
        event.preventDefault(); // Prevent default to avoid double toggling
        checkbox.checked = !checkbox.checked; // Toggle checkbox state
        checkbox.dispatchEvent(new Event('change')); // Trigger change event for validation
      });
    }
  });
  console.log(`Checkboxes initialized: ${checkboxes.length} found.`);
}

function validateCheckbox(checkbox) {
  if (!checkbox) {
    console.warn("validateCheckbox: No checkbox provided.");
    return true;
  }
  const fieldContainer = checkbox.closest('.checkbox-field');
  if (!fieldContainer) {
    console.warn("validateCheckbox: No .checkbox-field container for checkbox:", checkbox);
    return true;
  }
  const errorElement = fieldContainer.querySelector('.form-error');
  const isRequired = checkbox.hasAttribute('required');
  let isValid = true;
  let errorMessage = "";

  console.log(`Validating checkbox: ${checkbox.name}, required=${isRequired}, checked=${checkbox.checked}`);

  fieldContainer.classList.remove('error');
  if (errorElement) {
    errorElement.textContent = '';
    errorElement.style.display = 'none';
    errorElement.classList.remove('shake');
  }

  if (isRequired && !checkbox.checked) {
    isValid = false;
    errorMessage = checkbox.dataset.requiredMessage || "Необходимо согласие.";
    console.log(`Checkbox invalid: ${errorMessage}`);
  }

  if (!isValid) {
    fieldContainer.classList.add('error');
    if (errorElement) {
      errorElement.textContent = errorMessage;
      errorElement.style.display = 'block';
      errorElement.classList.add('shake');
      setTimeout(() => errorElement.classList.remove('shake'), 400);
    }
  }

  return isValid;
}

export { initCheckboxes, validateCheckbox };