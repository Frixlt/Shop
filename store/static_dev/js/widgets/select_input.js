/**
 * Handles declension of words based on a number.
 * Expects a config object like:
 * {
 *   variable: 'items', // The name of the quantity (optional, for context)
 *   rules: [
 *     { value: 1, condition: '=', form: 'товар' },            // 1 товар
 *     { value: '2-4', condition: '-', form: 'товара' },       // 2-4 товара
 *     { value: 0, condition: '=', form: 'товаров' },          // 0 товаров
 *     { value: 5, condition: '>=', form: 'товаров' },        // 5+ товаров (or default)
 *     // Add more specific rules if needed (e.g., for 11-14)
 *   ]
 * }
 * Conditions: '=', '-', '>', '<', '>=', '<='
 */
class DeclensionHandler {
  constructor(config, trackChanges = false) {
    this.variable = config?.variable || ''; // Optional name for the variable
    this.rules = config?.rules || [];       // Array of declension rules
    this._value = 0;                        // Internal value storage
    this.trackChanges = trackChanges;       // Whether to automatically notify on value change
    this.callbacks = [];                    // Callbacks for change notification

    if (this.trackChanges) {
      // Use defineProperty to trigger notify() when 'value' is set
      Object.defineProperty(this, 'value', {
        get: () => this._value,
        set: (newValue) => {
          const num = Number(newValue);
          if (!isNaN(num) && this._value !== num) {
            this._value = num;
            this.notify(); // Notify listeners on change
          }
        },
        configurable: true // Allow redefining if needed
      });
    } else {
      // If not tracking changes, just use a simple property
      this.value = 0;
    }
  }

  /**
   * Register a callback function to be called when the value changes (if trackChanges is true).
   * @param {function} callback - The function to call (receives the declined form as argument).
   */
  onChange(callback) {
    if (this.trackChanges && typeof callback === 'function') {
      this.callbacks.push(callback);
    }
  }

  /**
   * Notify all registered callbacks with the current declined form.
   * @private
   */
  notify() {
    const form = this.getDeclinedForm();
    this.callbacks.forEach(cb => cb(form));
  }

  /**
   * Calculates and returns the correctly declined form based on the current value and rules.
   * @returns {string} The declined word form.
   */
  getDeclinedForm() {
    const val = Number(this.trackChanges ? this._value : this.value);
    if (isNaN(val)) return ''; // Return empty if value is not a number

    for (const rule of this.rules) {
      const cV = rule.value; // Condition value (e.g., 1, '2-4', 5)
      const cT = rule.condition; // Condition type (e.g., '=', '-', '>=')

      try {
        if (cT === '=') {
          if (val === Number(cV)) return rule.form;
        } else if (cT === '-') {
          const [min, max] = String(cV).split('-').map(Number);
          if (!isNaN(min) && !isNaN(max) && val >= min && val <= max) return rule.form;
        } else if (cT === '>=') {
          if (val >= Number(cV)) return rule.form;
        } else if (cT === '<=') {
          if (val <= Number(cV)) return rule.form;
        } else if (cT === '>') {
          if (val > Number(cV)) return rule.form;
        } else if (cT === '<') {
          if (val < Number(cV)) return rule.form;
        }
      } catch (e) {
        console.error("Error processing declension rule:", rule, e);
        // Continue to next rule in case of error
      }
    }

    // Fallback: use the form from the last rule if no other rule matched, or return empty string
    const lastRule = this.rules[this.rules.length - 1];
    return lastRule ? lastRule.form : '';
  }

  /**
   * Updates the internal value. If trackChanges is true, this will trigger notifications.
   * @param {*} newValue - The new value to set.
   */
  updateValue(newValue) {
    const num = Number(newValue);
    if (!isNaN(num)) {
      if (this.trackChanges) {
        this.value = num; // Setter handles notification
      } else {
        // If not tracking changes, update internal value directly
        if (this._value !== num) {
          this._value = num;
        }
      }
    }
  }
}


/**
 * Creates a custom select dropdown UI that syncs with a hidden native select element.
 * Enhances standard select with features like search, multi-select, item counts, etc.
 */
class CustomSelectWidget {
  /**
   * @param {HTMLElement} element - The container element (.django-custom-select-widget).
   */
  constructor(element) {
    this.container = element;
    if (!this.container) {
      console.error("CustomSelectWidget: Container element not provided.");
      return;
    }

    // --- Configuration and Data Parsing ---
    try {
      // Default configuration merged with data-config attribute
      this.config = {
        minSelections: 0,
        maxSelections: 1,
        placeholder: 'Выберите...',
        placeholderAllSelected: 'Все выбрано ({maxSelections})',
        focusOnOpen: true,
        mode: 'overlay', // 'overlay' or 'inline'
        icon: 'fa-angle-down', // Font Awesome icon class for header
        indicatorShape: 'circle', // 'circle' or 'square' for option indicators
        autoDeselect: true, // For multi-select, deselect oldest when max reached
        countTitle: 'Выбрано:',
        countTitleAllSelected: 'Выбрано (макс. {max}):',
        selectedItemTextLength: 25, // Max length for selected item badges
        autoCloseOnComplete: false, // Close multi-select when maxSelections reached
        layoutOrder: ['search', 'options'], // Order of elements: 'search', 'options', 'count', 'selected'
        hideSelectedFromList: true, // Hide already selected options from the list
        searchable: true, // Enable search input
        showCount: false, // Show "Selected: X/Y" count block
        showSelected: false, // Show badges for selected items
        declension: null, // Declension config object (see DeclensionHandler)
        stickySearch: false, // Make search bar sticky
        minSelectionsMessage: 'Выберите минимум {min} элемент(а/ов)', // Error message template
        ...(JSON.parse(this.container.dataset.config || '{}'))
      };

      // Parse choices from data-choices attribute
      this.choices = JSON.parse(this.container.dataset.choices || '[]');

    } catch (e) {
      console.error('CustomSelectWidget: Failed to parse config or choices JSON.', e, this.container);
      this.config = { minSelections: 0, maxSelections: 1 }; // Minimal fallback config
      this.choices = [];
      return; // Stop initialization if config/choices fail
    }

    // --- Native Select Association ---
    this.nativeSelectId = this.container.dataset.nativeSelectId;
    this.nativeSelect = document.getElementById(this.nativeSelectId);
    if (!this.nativeSelect) {
      console.error(`CustomSelectWidget: Native select element with ID "${this.nativeSelectId}" not found.`);
      return; // Stop initialization if native select is missing
    }

    // --- State Initialization ---
    this.selectedItems = new Set();
    // Populate initial state from native select
    Array.from(this.nativeSelect.selectedOptions).forEach(option => {
      if (option.value) { // Ignore options with empty value (like placeholder options)
        this.selectedItems.add(option.value);
      }
    });
    // Maintain selection order (useful for autoDeselect)
    this.selectionOrder = Array.from(this.selectedItems);

    // --- Initialize Declension Handler ---
    this.declensionHandler = null;
    if (this.config.declension && Array.isArray(this.config.declension.rules) && this.config.declension.rules.length > 0) {
      this.declensionHandler = new DeclensionHandler(this.config.declension, true); // Enable tracking
      this.updateDeclensionValue(); // Set initial value
      // Listen for changes to update the header text
      this.declensionHandler.onChange(() => {
        this.updateHeader();
      });
    }

    // --- Validate and Adjust Config ---
    if (this.config.minSelections < 0) this.config.minSelections = 0;
    if (this.config.maxSelections < 1) this.config.maxSelections = 1;
    if (this.config.minSelections > this.config.maxSelections) {
      console.warn(`CustomSelectWidget (${this.nativeSelectId}): minSelections (${this.config.minSelections}) cannot be greater than maxSelections (${this.config.maxSelections}). Adjusting minSelections.`);
      this.config.minSelections = this.config.maxSelections;
    }
    // Ensure required fields have minSelections >= 1
    if (this.nativeSelect.hasAttribute('required') && this.config.minSelections < 1) {
      console.warn(`CustomSelectWidget (${this.nativeSelectId}): Native select is required, setting minSelections to 1.`);
      this.config.minSelections = 1;
    }


    // --- Apply CSS Classes Based on Config ---
    if (this.config.stickySearch && this.config.searchable) {
      this.container.classList.add('select--sticky-search');
    }
    if (!this.config.icon || typeof this.config.icon !== 'string') {
      this.container.classList.add('select--no-icon');
    }
    this.container.classList.add(`select--${this.config.mode || 'overlay'}`);

    // --- Final Setup ---
    this.container.widgetInstance = this; // Store instance on the element
    this.init();
  }

  /**
   * Initializes the widget by rendering structure, binding events, and updating UI.
   * @private
   */
  init() {
    this.renderStructure();
    this.bindEvents();
    this.updateHeader();
    this.updateDynamicElements(); // Initial update for count/selected/options visibility
  }

  /**
   * Determines the placeholder text based on selection state and configuration.
   * Handles declension if configured.
   * @returns {string} The placeholder text to display in the header.
   * @private
   */
  getPlaceholderText() {
    const selectedCount = this.selectedItems.size;
    const maxReached = selectedCount >= this.config.maxSelections;

    // Use specific placeholder if max selections reached
    if (maxReached && this.config.placeholderAllSelected) {
      return this.config.placeholderAllSelected.replace('{maxSelections}', this.config.maxSelections);
    }

    // Default placeholder handling
    const remaining = Math.max(0, this.config.maxSelections - selectedCount);
    let placeholder = this.config.placeholder || 'Выберите...'; // Default text
    // Replace placeholders within the text
    placeholder = placeholder.replace('{remaining}', remaining);
    placeholder = placeholder.replace('{maxSelections}', this.config.maxSelections);

    // Handle declension if configured for 'remaining'
    if (this.declensionHandler && this.config.declension?.variable === 'remaining') {
      // DeclensionHandler is already tracking changes, just get the form
      const declensionForm = this.declensionHandler.getDeclinedForm();
      placeholder = placeholder.replace('{declension}', declensionForm || ''); // Use empty string if no form
    }

    return placeholder;
  }

  /**
   * Gets the title for the selected count display area.
   * @returns {string} The title text.
   * @private
   */
  getCountTitle() {
    if (this.selectedItems.size >= this.config.maxSelections && this.config.countTitleAllSelected) {
      return this.config.countTitleAllSelected.replace('{max}', this.config.maxSelections);
    }
    return this.config.countTitle || 'Выбрано:';
  }

  /**
   * Updates the value in the DeclensionHandler based on the configured variable.
   * @private
   */
  updateDeclensionValue() {
    if (!this.declensionHandler) return;

    const declVar = this.config.declension?.variable;
    let valueToUpdate = 0;

    if (declVar === 'remaining') {
      valueToUpdate = Math.max(0, this.config.maxSelections - this.selectedItems.size);
    } else if (declVar && typeof this.config[declVar] === 'number') {
      // If variable refers to another config number (less common)
      valueToUpdate = this.config[declVar];
    }
    // You could add more cases here, e.g., declVar === 'selected'
    // else if (declVar === 'selected') {
    //   valueToUpdate = this.selectedItems.size;
    // }

    // The DeclensionHandler's setter will trigger updates if tracking is enabled
    this.declensionHandler.updateValue(valueToUpdate);
  }


  /**
   * Renders the initial HTML structure within the widget container.
   * Finds references to key elements.
   * @private
   */
  renderStructure() {
    // Find existing elements rendered by the Django template
    this.header = this.container.querySelector('.select-header');
    this.headerText = this.container.querySelector('.select-header-text');
    this.optionsContainer = this.container.querySelector('.select-options');

    if (!this.header || !this.headerText || !this.optionsContainer) {
      console.error(`CustomSelectWidget (${this.nativeSelectId}): Missing essential child elements (.select-header, .select-header-text, .select-options). Structure might be incorrect.`);
      return; // Cannot proceed without basic structure
    }

    // Populate the options container using the layout logic
    this.optionsContainer.innerHTML = this.renderLayout();

    // Get references to dynamically generated elements
    this.searchInput = this.optionsContainer.querySelector('.select-search');
    this.optionsListContainer = this.optionsContainer.querySelector('.select-options-list');
    // Use querySelectorAll directly on the list container
    this.options = this.optionsListContainer ? this.optionsListContainer.querySelectorAll('.select-option') : [];
    this.emptyMessage = this.optionsContainer.querySelector('.select-empty');
  }

  /**
   * Generates the HTML for the content inside the options container based on layoutOrder config.
   * @returns {string} HTML string for the options container content.
   * @private
   */
  renderLayout() {
    const blocks = {
      count: this.config.showCount
        ? `<div class="select-count">
             <div class="select-count-title">
               <span>${this.getCountTitle()}</span>
               <span class="select-count-value">${this.selectedItems.size}/${this.config.maxSelections}</span>
             </div>
           </div>`
        : '',
      selected: this.config.showSelected
        ? `<div class="select-selected-items">
             ${this.renderSelectedItems()}
           </div>`
        : '',
      search: this.config.searchable
        ? `<div class="select-search-wrapper">
             <input type="text" class="select-search" placeholder="Поиск..." aria-label="Search options">
             <i class="fas fa-search select-search-icon" aria-hidden="true"></i>
           </div>`
        : '',
      options:
        `<div class="select-options-list" role="listbox" aria-multiselectable="${this.config.maxSelections > 1}">
           ${this.choices.map((item, index) => {
          // Determine initial selected state based on the Set
          const isSelected = this.selectedItems.has(item.value);
          // Determine if it should be hidden initially
          const isHidden = this.config.hideSelectedFromList && isSelected;
          // Calculate animation delay (optional, for visual effect)
          const delay = Math.min(index * 0.03, 0.3);

          return `<div class="select-option ${isSelected ? 'select-option--selected' : ''} ${isHidden ? 'select-option--hidden' : ''}"
                           data-value="${item.value}"
                           role="option"
                           aria-selected="${isSelected}"
                           style="animation-delay: ${delay}s">
                         <span class="select-check select-check--${this.config.indicatorShape}" aria-hidden="true"></span>
                         <span>${item.label}</span>
                       </div>`;
        }).join('')}
           <div class="select-empty" style="display: none;">Ничего не найдено</div>
         </div>`
    };

    // Build the final HTML string based on the configured order
    return (this.config.layoutOrder || ['search', 'options']) // Default order
      .map(key => blocks[key] || '') // Get block HTML or empty string
      .join(''); // Concatenate blocks
  }

  /**
   * Generates HTML for the selected item badges displayed in the 'selected' block.
   * @returns {string} HTML string of selected item badges.
   * @private
   */
  renderSelectedItems() {
    const textLength = this.config.selectedItemTextLength || 25;

    // Use the selectionOrder array to maintain the order badges appear
    return this.selectionOrder
      .map(value => this.choices.find(item => item.value === value)) // Find choice object for the value
      .filter(item => item) // Filter out if a value in selectionOrder doesn't exist in choices (shouldn't happen)
      .map(item => {
        const label = item.label;
        // Truncate label if it exceeds the configured length
        const truncatedLabel = label.length > textLength
          ? label.substring(0, textLength) + '…' // Ellipsis character
          : label;

        // Generate HTML for the badge
        return `<div class="select-selected-item" data-value="${item.value}">
                  <span class="select-selected-item-text" title="${label}">${truncatedLabel}</span>
                  <button type="button" class="select-selected-item-remove" aria-label="Remove ${label}">
                    <i class="fas fa-times" aria-hidden="true"></i>
                  </button>
                </div>`;
      }).join(''); // Join all badge HTML strings
  }

  /**
   * Updates elements that change based on selection (count, selected items, option visibility).
   * @private
   */
  updateDynamicElements() {
    const countBlock = this.container.querySelector('.select-count');
    if (countBlock) {
      if (this.config.showCount) {
        // Update count text and value
        countBlock.innerHTML = `<div class="select-count-title">
                                    <span>${this.getCountTitle()}</span>
                                    <span class="select-count-value">${this.selectedItems.size}/${this.config.maxSelections}</span>
                                  </div>`;
        countBlock.style.display = ''; // Ensure visible
      } else {
        countBlock.style.display = 'none'; // Hide if not configured
      }
    }

    const selectedBlock = this.container.querySelector('.select-selected-items');
    if (selectedBlock) {
      if (this.config.showSelected) {
        // Re-render selected item badges
        selectedBlock.innerHTML = this.renderSelectedItems();
        // Show block only if items are selected
        selectedBlock.style.display = this.selectedItems.size > 0 ? 'flex' : 'none';
      } else {
        selectedBlock.style.display = 'none'; // Hide if not configured
      }
    }

    // Update visibility of options in the list if hideSelectedFromList is true
    if (this.config.hideSelectedFromList && this.options.length > 0) {
      this.options.forEach(option => {
        const value = option.dataset.value;
        const isSelected = this.selectedItems.has(value);
        // Toggle hidden class based on selection state
        option.classList.toggle('select-option--hidden', isSelected);
        // Update ARIA selected state
        option.setAttribute('aria-selected', isSelected);
      });
      // Re-apply filter if search input has value, otherwise show all non-hidden
      if (this.searchInput && this.searchInput.value) {
        this.filterOptions(this.searchInput.value);
      } else {
        this.filterOptions(''); // Ensure correct visibility after selection change
      }
    }
  }

  /**
   * Updates the text content of the select header (placeholder).
   * @private
   */
  updateHeader() {
    if (this.headerText) {
      this.headerText.textContent = this.getPlaceholderText();
    }
  }

  /**
   * Synchronizes the selected state of the hidden native select element
   * with the custom widget's internal state (`this.selectedItems`).
   * Dispatches a 'change' event on the native select if its state was modified.
   * @private
   */
  updateNativeSelect() {
    if (!this.nativeSelect) return;

    let changed = false; // Flag to track if any option's state changed

    // Iterate through native options
    Array.from(this.nativeSelect.options).forEach(option => {
      // Should this option be selected based on our custom widget state?
      const shouldBeSelected = this.selectedItems.has(option.value);
      // If the native option's state doesn't match our state, update it
      if (option.selected !== shouldBeSelected) {
        option.selected = shouldBeSelected;
        changed = true; // Mark that a change occurred
      }
    });

    // If any option's state changed, dispatch a 'change' event on the native select
    // This allows other JS code (or form submission logic) to react to the change.
    if (changed) {
      const event = new Event('change', { bubbles: true });
      this.nativeSelect.dispatchEvent(event);
      console.log(`Dispatched change event for ${this.nativeSelectId}`);
    }
  }

  /**
   * Attaches necessary event listeners to the widget elements.
   * @private
   */
  bindEvents() {
    if (!this.header || !this.optionsContainer) return; // Need core elements

    // --- Header Click: Toggle dropdown ---
    this.header.addEventListener('click', (e) => {
      // Prevent toggle if click is on the 'remove' button within a selected badge
      if (!e.target.closest('.select-selected-item-remove')) {
        this.toggle();
      }
    });

    // --- Options Container Click (Event Delegation) ---
    this.optionsContainer.addEventListener('click', (e) => {
      const option = e.target.closest('.select-option');
      const removeBtn = e.target.closest('.select-selected-item-remove');
      const searchInput = e.target.closest('.select-search');

      if (option && !option.classList.contains('select-option--hidden')) {
        // Clicked on a visible option
        e.stopPropagation(); // Important: Prevent document click listener from closing immediately
        this.selectOption(option);
      } else if (removeBtn) {
        // Clicked on a 'remove' button within a selected badge
        e.stopPropagation();
        const itemValue = removeBtn.closest('.select-selected-item').dataset.value;
        this.removeSelectedItem(itemValue);
      } else if (searchInput) {
        // Clicked inside the search input (allow normal input behavior)
        e.stopPropagation();
      }
      // Clicks elsewhere within optionsContainer (e.g., padding) are ignored
    });

    // --- Search Input Events ---
    if (this.searchInput) {
      this.searchInput.addEventListener('input', e => this.filterOptions(e.target.value));
      // Prevent clicks within search from closing the dropdown via document listener
      this.searchInput.addEventListener('click', e => e.stopPropagation());
    }

    // --- Document Click Listener (for closing dropdown) ---
    // Store the handler function so it can be potentially removed later if needed
    this.handleDocumentClick = (e) => {
      // If the click is outside the container AND the select is open
      if (!this.container.contains(e.target) && this.container.classList.contains('select--open')) {
        // Close the select immediately, no timeout needed
        this.close();
      }
    };
    // Add the listener to the document
    document.addEventListener('click', this.handleDocumentClick);


    // --- Keyboard Events (Optional but good for accessibility) ---
    this.container.addEventListener('keydown', e => {
      // Close dropdown on Escape key
      if (e.key === 'Escape' && this.container.classList.contains('select--open')) {
        this.close();
      }
      // Basic arrow key navigation could be added here
    });
  }

  /**
   * Toggles the open/closed state of the dropdown.
   * Handles focusing the search input if configured.
   */
  toggle() {
    const isOpen = this.container.classList.toggle('select--open');
    this.container.setAttribute('aria-expanded', isOpen); // Update ARIA state

    if (isOpen && this.searchInput) {
      // If opening and search is enabled:
      this.searchInput.value = ''; // Clear search
      this.filterOptions('');    // Show all options initially
      if (this.config.focusOnOpen) {
        // Focus search input shortly after opening
        setTimeout(() => this.searchInput.focus(), 10);
      }
    }
    // Trigger validation on close if focusout didn't catch it
    if (!isOpen) {
      // Slightly delayed validation on manual close
      setTimeout(() => {
        if (!this.container.classList.contains('select--open')) { // Double check it's still closed
          window.validateCustomSelect && window.validateCustomSelect(this.container);
        }
      }, 100);
    }
  }

  /**
   * Closes the dropdown.
   */
  close() {
    if (this.container.classList.contains('select--open')) {
      this.container.classList.remove('select--open');
      this.container.setAttribute('aria-expanded', 'false'); // Update ARIA state
      // Trigger validation after closing
      // Use window.validateCustomSelect if it's globally available from init.js
      // Otherwise, you might need to pass a validation callback during initialization
      setTimeout(() => {
        if (!this.container.classList.contains('select--open')) { // Double check it's still closed
          window.validateCustomSelect && window.validateCustomSelect(this.container);
        }
      }, 100); // Delay validation slightly after closing
    }
  }


  /**
   * Handles the selection or deselection of an option.
   * Updates internal state, UI, and native select.
   * Respects minSelections and maxSelections constraints.
   * @param {HTMLElement} option - The clicked option element.
   * @private
   */
  selectOption(option) {
    const value = option.dataset.value;
    if (value === undefined || value === null) return; // Safety check

    const isSelected = this.selectedItems.has(value);
    const maxReached = this.selectedItems.size >= this.config.maxSelections;
    const minReached = this.selectedItems.size <= this.config.minSelections;

    if (isSelected) {
      // --- Attempting to DESELECT ---
      // Check if minSelections prevents deselection (only matters for multi-select)
      if (minReached && this.config.minSelections > 0 && this.config.maxSelections !== 1) {
        console.log(`CustomSelectWidget (${this.nativeSelectId}): Minimum selections (${this.config.minSelections}) reached. Cannot deselect value "${value}".`);
        // Add visual feedback (shake animation)
        option.classList.add('select-option--shake');
        setTimeout(() => option.classList.remove('select-option--shake'), 400);
        return; // Stop deselection
      }
      // Proceed with deselection
      this.selectedItems.delete(value);
      this.selectionOrder = this.selectionOrder.filter(item => item !== value); // Remove from order
      option.classList.remove('select-option--selected');
      option.setAttribute('aria-selected', 'false');
      // If hideSelectedFromList is true, the option becomes visible again in the list
      // updateDynamicElements will handle making it visible if needed.

    } else {
      // --- Attempting to SELECT ---
      // Check if maxSelections prevents selection (only matters for multi-select without autoDeselect)
      if (maxReached && !this.config.autoDeselect && this.config.maxSelections !== 1) {
        console.log(`CustomSelectWidget (${this.nativeSelectId}): Maximum selections (${this.config.maxSelections}) reached. Cannot select value "${value}".`);
        option.classList.add('select-option--shake');
        setTimeout(() => option.classList.remove('select-option--shake'), 400);
        return; // Stop selection
      }

      // Handle Single Select (maxSelections === 1)
      if (this.config.maxSelections === 1) {
        // Deselect previously selected item if any
        if (this.selectionOrder.length > 0) {
          const previousValue = this.selectionOrder[0];
          this.selectedItems.delete(previousValue);
          const previousOption = this.optionsListContainer.querySelector(`.select-option[data-value="${previousValue}"]`);
          if (previousOption) {
            previousOption.classList.remove('select-option--selected');
            previousOption.setAttribute('aria-selected', 'false');
            // Make previous option visible if hiding is enabled
            if (this.config.hideSelectedFromList) {
              previousOption.classList.remove('select-option--hidden');
              previousOption.style.display = ''; // Ensure it's displayed
            }
          }
        }
        // Clear state and add the new selection
        this.selectedItems.clear(); // Should be empty already, but clear just in case
        this.selectionOrder = [];
      }
      // Handle Multi-Select with autoDeselect when max is reached
      else if (maxReached && this.config.autoDeselect) {
        const earliestValue = this.selectionOrder.shift(); // Remove oldest value from order
        this.selectedItems.delete(earliestValue); // Remove from Set
        const earliestOption = this.optionsListContainer.querySelector(`.select-option[data-value="${earliestValue}"]`);
        if (earliestOption) {
          earliestOption.classList.remove('select-option--selected');
          earliestOption.setAttribute('aria-selected', 'false');
          // Make auto-deselected option visible if hiding is enabled
          if (this.config.hideSelectedFromList) {
            earliestOption.classList.remove('select-option--hidden');
            earliestOption.style.display = ''; // Ensure it's displayed
          }
        }
      }

      // Add the new selection
      this.selectedItems.add(value);
      this.selectionOrder.push(value); // Add to end of order
      option.classList.add('select-option--selected');
      option.setAttribute('aria-selected', 'true');
      // updateDynamicElements will handle hiding it if needed.
    }

    // --- Update UI and State ---
    this.updateDeclensionValue(); // Update value for declension (e.g., remaining count)
    this.updateHeader();          // Update placeholder text
    this.updateDynamicElements(); // Update count, selected badges, option visibility
    this.updateNativeSelect();    // Sync with the hidden native <select>

    // --- Trigger Callbacks (if defined in config) ---
    if (typeof this.config.onSelect === 'function') {
      try { this.config.onSelect(value, !isSelected); } // Pass value and whether it was selected (true) or deselected (false)
      catch (e) { console.error("Error in onSelect callback:", e); }
    }
    if (typeof this.config.onChange === 'function') {
      try { this.config.onChange(Array.from(this.selectedItems)); } // Pass current array of selected values
      catch (e) { console.error("Error in onChange callback:", e); }
    }

    // --- Auto-Close Logic ---
    if (this.config.maxSelections === 1 && !isSelected) {
      // Close immediately after selecting in single-select mode
      this.close();
    } else if (this.config.autoCloseOnComplete && this.selectedItems.size >= this.config.maxSelections && this.config.maxSelections > 1) {
      // Close after reaching max selections in multi-select mode (if configured)
      this.close();
    }
  }


  /**
   * Removes a selected item, triggered by clicking the remove button in the selected items area.
   * Updates state, UI, and native select. Respects minSelections constraint.
   * @param {string} value - The value of the item to remove.
   */
  removeSelectedItem(value) {
    if (!this.selectedItems.has(value)) return; // Item not selected, nothing to do

    // Check if minimum selections prevents removal
    if (this.selectedItems.size <= this.config.minSelections && this.config.minSelections > 0) {
      console.log(`CustomSelectWidget (${this.nativeSelectId}): Minimum selections (${this.config.minSelections}) reached. Cannot remove value "${value}".`);
      // Provide visual feedback (shake the badge)
      const selectedItemElement = this.container.querySelector(`.select-selected-item[data-value="${value}"]`);
      selectedItemElement?.classList.add('select-selected-item--shake');
      setTimeout(() => selectedItemElement?.classList.remove('select-selected-item--shake'), 400);
      return; // Stop removal
    }

    // Proceed with removal
    this.selectedItems.delete(value);
    this.selectionOrder = this.selectionOrder.filter(item => item !== value); // Remove from order

    // Update the corresponding option in the list
    const option = this.optionsListContainer.querySelector(`.select-option[data-value="${value}"]`);
    if (option) {
      option.classList.remove('select-option--selected');
      option.setAttribute('aria-selected', 'false');
      // If hiding selected, make the option visible again
      if (this.config.hideSelectedFromList) {
        option.classList.remove('select-option--hidden');
        option.style.display = ''; // Ensure display is not 'none'
        // Re-apply filter if needed
        if (this.searchInput && this.searchInput.value) {
          this.filterOptions(this.searchInput.value);
        }
      }
    }

    // Update UI and state
    this.updateDeclensionValue();
    this.updateHeader();
    this.updateDynamicElements();
    this.updateNativeSelect();

    // Trigger callbacks
    if (typeof this.config.onSelect === 'function') {
      try { this.config.onSelect(value, false); } // Indicate deselection
      catch (e) { console.error("Error in onSelect callback:", e); }
    }
    if (typeof this.config.onChange === 'function') {
      try { this.config.onChange(Array.from(this.selectedItems)); }
      catch (e) { console.error("Error in onChange callback:", e); }
    }
  }

  /**
   * Filters the options list based on the search query.
   * Hides/shows options and the 'empty' message accordingly.
   * Considers the hideSelectedFromList setting.
   * @param {string} query - The search term entered by the user.
   * @private
   */
  filterOptions(query) {
    if (!this.searchInput || !this.optionsListContainer || !this.emptyMessage) return;

    const q = query.toLowerCase().trim();
    let visibleCount = 0;

    this.options.forEach(opt => {
      const value = opt.dataset.value;
      // Determine if option should be hidden due to being selected
      const isSelectedAndHiddenConfig = this.config.hideSelectedFromList && this.selectedItems.has(value);

      // Get text content for matching
      const text = opt.querySelector('span:last-child')?.textContent.toLowerCase() || '';
      const matchesQuery = text.includes(q);

      // Determine final visibility
      const shouldDisplay = matchesQuery && !isSelectedAndHiddenConfig;

      // Apply display style
      opt.style.display = shouldDisplay ? '' : 'none';

      // Increment count if displayed
      if (shouldDisplay) {
        visibleCount++;
      }
    });

    // Show/hide the "empty" message
    this.emptyMessage.style.display = visibleCount === 0 ? 'block' : 'none';
  }

  /**
   * Resets the widget state to its initial load state or clears selection.
   * Updates UI accordingly.
   */
  resetState() {
    console.log(`Resetting state for ${this.nativeSelectId}`);
    // Clear internal state
    this.selectedItems.clear();
    this.selectionOrder = [];

    // If you need to reset to initial values from native select:
    // Array.from(this.nativeSelect.options).forEach(option => {
    //     if (option.defaultSelected && option.value) { // Check defaultSelected property
    //         this.selectedItems.add(option.value);
    //         this.selectionOrder.push(option.value);
    //     }
    // });

    // Reset visual states of options
    this.options.forEach(option => {
      option.classList.remove('select-option--selected', 'select-option--hidden');
      option.setAttribute('aria-selected', 'false');
      option.style.display = ''; // Make all potentially visible again
    });

    // Clear search and filter
    if (this.searchInput) {
      this.searchInput.value = '';
      this.filterOptions('');
    }

    // Update other UI elements
    this.updateDeclensionValue();
    this.updateHeader();
    this.updateDynamicElements();
    this.updateNativeSelect(); // Sync native select to cleared state

    // Remove error state from container
    this.container.classList.remove('select--error');

    console.log(`State reset complete for ${this.nativeSelectId}`);
  }

  // Optional: Method to clean up listeners if the widget is destroyed
  destroy() {
    if (this.handleDocumentClick) {
      document.removeEventListener('click', this.handleDocumentClick);
    }
    // Remove other listeners attached directly (header click, container keydown etc.)
    // ...
    // Clear references
    this.container.widgetInstance = null;
    console.log(`Destroyed CustomSelectWidget for ${this.nativeSelectId}`);
  }
}


/**
 * Finds all elements with the '.django-custom-select-widget' class
 * and initializes a CustomSelectWidget instance for each, preventing re-initialization.
 */
function initAllCustomSelects() {
  const selectWidgets = document.querySelectorAll('.django-custom-select-widget');
  console.log(`Found ${selectWidgets.length} custom select widgets to initialize.`);
  selectWidgets.forEach((widgetElement, index) => {
    // Check if already initialized using a data attribute
    if (!widgetElement.dataset.initialized) {
      const nativeSelectId = widgetElement.dataset.nativeSelectId || `widget-${index}`; // Use index for logging if ID missing
      console.log(`Initializing widget ${index + 1}/${selectWidgets.length} (Native ID: ${nativeSelectId})...`);
      try {
        new CustomSelectWidget(widgetElement);
        // Mark as initialized to prevent re-running constructor
        widgetElement.dataset.initialized = 'true';
        console.log(`Successfully initialized widget (Native ID: ${nativeSelectId})`);
      } catch (error) {
        console.error("Failed to initialize CustomSelectWidget for element:", widgetElement, error);
        // Optionally display an error message within the broken widget
        widgetElement.innerHTML = '<p style="color: red; padding: 10px; border: 1px solid red;">Error initializing select widget.</p>';
      }
    } else {
      const nativeSelectId = widgetElement.dataset.nativeSelectId || `widget-${index}`;
      console.log(`Widget ${index + 1}/${selectWidgets.length} (Native ID: ${nativeSelectId}) already initialized, skipping.`);
    }
  });
}

// Export necessary components
export { CustomSelectWidget, initAllCustomSelects };