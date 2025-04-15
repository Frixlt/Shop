// --"--\Catalog\store\static_dev\js\widgets\select_input.js"--

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
    // A common fallback is to assume the last rule handles the default plural form (e.g., >= 5)
    // Ensure the last rule actually applies or provide a default empty string.
    // Let's refine the fallback logic slightly: return last rule's form only if it *could* apply generally (like >=)
    // or if it's the only rule. For simplicity now, we just return its form or empty.
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
        // Manually update if not tracking changes automatically
        if (this._value !== num) {
          this._value = num;
          // Note: Manual notification needed if required when trackChanges is false
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
        minSelections: 0,           // Minimum required selections (for multi-select)
        maxSelections: 1,           // Maximum allowed selections (1 for single-select)
        placeholder: 'Выберите...', // Placeholder text when nothing is selected
        placeholderAllSelected: 'Все выбрано ({maxSelections})', // Placeholder when max items are selected
        focusOnOpen: true,          // Focus search input when dropdown opens
        mode: 'overlay',            // 'overlay' or 'inline' display mode
        icon: 'fa-angle-down',      // Icon class for the header (e.g., Font Awesome)
        indicatorShape: 'circle',   // Shape of the selection indicator ('circle' or 'square')
        autoDeselect: true,         // For multi-select: automatically deselect oldest item when max is reached
        countTitle: 'Выбрано:',     // Title for the selected count display
        countTitleAllSelected: 'Выбрано (макс. {max}):', // Title when max items are selected
        selectedItemTextLength: 25, // Max length for text in selected item badges
        autoCloseOnComplete: false, // Close dropdown automatically when max selections are reached
        layoutOrder: ['search', 'options'], // Order of elements inside the dropdown
        hideSelectedFromList: true, // Hide already selected options from the list
        searchable: true,           // Enable search input
        showCount: false,           // Show the 'Selected: X/Y' count block
        showSelected: false,        // Show badges for selected items above the list
        declension: null,           // Configuration for DeclensionHandler (see class docs)
        stickySearch: false,        // Make the search bar stick to the top when scrolling
        minSelectionsMessage: 'Выберите минимум {min} элемент(а/ов)', // Error message template for minSelections
        // Merge with JSON from data-config attribute
        ...(JSON.parse(this.container.dataset.config || '{}'))
      };

      // Parse choices from data-choices attribute
      this.choices = JSON.parse(this.container.dataset.choices || '[]');

    } catch (e) {
      console.error('CustomSelectWidget: Failed to parse config or choices JSON.', e, this.container);
      // Set minimal default config to prevent further errors
      this.config = { minSelections: 0, maxSelections: 1 };
      this.choices = [];
      return; // Stop initialization if config/choices are invalid
    }

    // --- Native Select Association ---
    this.nativeSelectId = this.container.dataset.nativeSelectId;
    this.nativeSelect = document.getElementById(this.nativeSelectId);
    if (!this.nativeSelect) {
      console.error(`CustomSelectWidget: Native select element with ID "${this.nativeSelectId}" not found.`);
      return; // Stop initialization if native select is missing
    }

    // --- State Initialization ---
    this.selectedItems = new Set(); // Stores values of selected options
    // Populate initial selection from the native select element
    Array.from(this.nativeSelect.selectedOptions).forEach(option => {
      if (option.value) { // Ignore options with empty values (like placeholders)
        this.selectedItems.add(option.value);
      }
    });
    this.selectionOrder = Array.from(this.selectedItems); // Maintain selection order for auto-deselect

    // --- Initialize Declension Handler ---
    this.declensionHandler = null;
    if (this.config.declension && Array.isArray(this.config.declension.rules) && this.config.declension.rules.length > 0) {
      this.declensionHandler = new DeclensionHandler(this.config.declension, true); // Enable tracking
      this.updateDeclensionValue(); // Set initial value
      // Update header whenever the declined form changes
      this.declensionHandler.onChange(() => {
        this.updateHeader();
      });
    }

    // --- Validate and Adjust Config ---
    // Ensure minSelections/maxSelections are valid
    if (this.config.minSelections < 0) this.config.minSelections = 0;
    if (this.config.maxSelections < 1) this.config.maxSelections = 1; // Must allow at least one selection
    if (this.config.minSelections > this.config.maxSelections) {
      console.warn(`CustomSelectWidget (${this.nativeSelectId}): minSelections (${this.config.minSelections}) cannot be greater than maxSelections (${this.config.maxSelections}). Adjusting minSelections.`);
      this.config.minSelections = this.config.maxSelections;
    }

    // --- Apply CSS Classes Based on Config ---
    // Add sticky class if configured
    if (this.config.stickySearch && this.config.searchable) {
      this.container.classList.add('select--sticky-search');
    }
    // Add class if no icon is specified
    if (!this.config.icon || typeof this.config.icon !== 'string') {
      this.container.classList.add('select--no-icon');
    }
    // Add mode class
    this.container.classList.add(`select--${this.config.mode || 'overlay'}`);


    // --- Final Setup ---
    this.container.widgetInstance = this; // Store instance reference on the element
    this.init();
    // console.log(`Initialized select ${this.nativeSelectId} with config:`, this.config); // Optional: Debug config
  }

  /**
   * Initializes the widget by rendering structure, binding events, and updating UI.
   * @private
   */
  init() {
    this.renderStructure(); // Create HTML elements
    this.bindEvents();      // Attach event listeners
    this.updateHeader();    // Set initial header text
    this.updateDynamicElements(); // Update count/selected items/option visibility
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

    // Calculate remaining selections
    const remaining = Math.max(0, this.config.maxSelections - selectedCount);

    // Start with the base placeholder
    let placeholder = this.config.placeholder || 'Выберите...';

    // Replace placeholders within the text
    placeholder = placeholder.replace('{remaining}', remaining);
    placeholder = placeholder.replace('{maxSelections}', this.config.maxSelections);

    // Apply declension if configured for 'remaining'
    if (this.declensionHandler && this.config.declension?.variable === 'remaining') {
      // Update the handler's value (it will notify if tracking changes)
      this.declensionHandler.updateValue(remaining);
      const declensionForm = this.declensionHandler.getDeclinedForm();
      placeholder = placeholder.replace('{declension}', declensionForm);
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
      // Allow referencing other numeric config properties (though 'remaining' is primary use case)
      valueToUpdate = this.config[declVar];
    }
    // Add more conditions here if other variables need to be tracked

    this.declensionHandler.updateValue(valueToUpdate);
  }

  // --- Rendering Methods ---

  /**
   * Renders the initial HTML structure within the widget container.
   * Finds references to key elements.
   * @private
   */
  renderStructure() {
    // Find existing core elements provided by the Django template
    this.header = this.container.querySelector('.select-header');
    this.headerText = this.container.querySelector('.select-header-text');
    this.optionsContainer = this.container.querySelector('.select-options');

    if (!this.header || !this.headerText || !this.optionsContainer) {
      console.error(`CustomSelectWidget (${this.nativeSelectId}): Missing essential child elements (.select-header, .select-header-text, .select-options). Structure might be incorrect.`);
      return;
    }

    // Render the dynamic content (search, count, selected, options list) inside .select-options
    this.optionsContainer.innerHTML = this.renderLayout();

    // Find newly rendered elements
    this.searchInput = this.optionsContainer.querySelector('.select-search');
    this.optionsListContainer = this.optionsContainer.querySelector('.select-options-list');
    // Get NodeList of options - convert to array for easier manipulation if needed, but NodeList is fine here
    this.options = this.optionsListContainer ? this.optionsListContainer.querySelectorAll('.select-option') : [];
    this.emptyMessage = this.optionsContainer.querySelector('.select-empty');
  }

  /**
   * Generates the HTML for the content inside the options container based on layoutOrder config.
   * @returns {string} HTML string for the options container content.
   * @private
   */
  renderLayout() {
    // Define HTML blocks for each potential section
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
          const isSelected = this.selectedItems.has(item.value);
          const isHidden = this.config.hideSelectedFromList && isSelected;
          const delay = Math.min(index * 0.03, 0.3); // Stagger animation delay

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

    // Assemble blocks according to layoutOrder config
    return (this.config.layoutOrder || ['search', 'options'])
      .map(key => blocks[key] || '') // Get block HTML or empty string if key is invalid
      .join('');
  }

  /**
   * Generates HTML for the selected item badges displayed in the 'selected' block.
   * @returns {string} HTML string of selected item badges.
   * @private
   */
  renderSelectedItems() {
    const textLength = this.config.selectedItemTextLength || 25; // Max length for badge text

    // Map selected values (in order) back to choice objects
    return this.selectionOrder
      .map(value => this.choices.find(item => item.value === value))
      .filter(item => item) // Filter out any undefined items (if value somehow doesn't match a choice)
      .map(item => {
        const label = item.label;
        // Truncate label if it exceeds the configured length
        const truncatedLabel = label.length > textLength
          ? label.substring(0, textLength) + '…' // Use ellipsis character
          : label;

        return `<div class="select-selected-item" data-value="${item.value}">
                  <span class="select-selected-item-text" title="${label}">${truncatedLabel}</span>
                  <button type="button" class="select-selected-item-remove" aria-label="Remove ${label}">
                    <i class="fas fa-times" aria-hidden="true"></i>
                  </button>
                </div>`;
      }).join('');
  }


  // --- UI Update Methods ---

  /**
   * Updates elements that change based on selection (count, selected items, option visibility).
   * @private
   */
  updateDynamicElements() {
    // Update 'Nothing Found' message visibility (handled by filterOptions)
    // this.emptyMessage = this.optionsContainer.querySelector('.select-empty'); // Already assigned in renderStructure

    // Update Count Block
    const countBlock = this.container.querySelector('.select-count');
    if (countBlock) {
      if (this.config.showCount) {
        countBlock.innerHTML = `<div class="select-count-title">
                                    <span>${this.getCountTitle()}</span>
                                    <span class="select-count-value">${this.selectedItems.size}/${this.config.maxSelections}</span>
                                  </div>`;
        countBlock.style.display = ''; // Make visible
      } else {
        countBlock.style.display = 'none'; // Hide if not configured
      }
    }


    // Update Selected Items Block
    const selectedBlock = this.container.querySelector('.select-selected-items');
    if (selectedBlock) {
      if (this.config.showSelected) {
        selectedBlock.innerHTML = this.renderSelectedItems();
        // Show block only if there are selected items
        selectedBlock.style.display = this.selectedItems.size > 0 ? 'flex' : 'none';
      } else {
        selectedBlock.style.display = 'none'; // Hide if not configured
      }
    }


    // Update Option Visibility (if hideSelectedFromList is true)
    if (this.config.hideSelectedFromList && this.options.length > 0) {
      this.options.forEach(option => {
        const isSelected = this.selectedItems.has(option.dataset.value);
        // Hide if selected, show if not (unless hidden by search filter)
        option.classList.toggle('select-option--hidden', isSelected);
        // Ensure aria-selected is also updated
        option.setAttribute('aria-selected', isSelected);
      });
      // Re-apply search filter to ensure visibility is correct
      if (this.searchInput && this.searchInput.value) {
        this.filterOptions(this.searchInput.value);
      } else {
        this.filterOptions(''); // Ensure empty message visibility is correct
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

    // Iterate over all options in the native select
    Array.from(this.nativeSelect.options).forEach(option => {
      // Determine if this option *should* be selected based on the widget's state
      const shouldBeSelected = this.selectedItems.has(option.value);

      // If the option's current selected state differs from what it should be...
      if (option.selected !== shouldBeSelected) {
        option.selected = shouldBeSelected; // ...update the native option's state
        changed = true; // ...and mark that a change occurred
      }
    });

    // If any option's state was changed, dispatch a 'change' event on the native select.
    // This allows other JavaScript code (or form submission logic) that listens
    // for changes on the native select to react accordingly.
    if (changed) {
      const event = new Event('change', { bubbles: true }); // Create a synthetic change event
      this.nativeSelect.dispatchEvent(event); // Dispatch the event
    }
  }


  // --- Event Handling ---

  /**
   * Attaches necessary event listeners to the widget elements.
   * @private
   */
  bindEvents() {
    if (!this.header || !this.optionsContainer) return;

    // Toggle dropdown on header click (but not on remove button inside selected items)
    this.header.addEventListener('click', (e) => {
      // Prevent toggle if click is on the remove icon within a selected item badge
      if (!e.target.closest('.select-selected-item-remove')) {
        this.toggle();
      }
    });

    // Handle clicks within the options container (options list, remove buttons, search)
    this.optionsContainer.addEventListener('click', (e) => {
      const option = e.target.closest('.select-option');
      const removeBtn = e.target.closest('.select-selected-item-remove');
      const searchInput = e.target.closest('.select-search');

      if (option && !option.classList.contains('select-option--hidden')) {
        // Clicked on a visible option: select/deselect it
        this.selectOption(option);
      } else if (removeBtn) {
        // Clicked on a remove button in the selected items area
        e.stopPropagation(); // Prevent header click from firing
        const itemValue = removeBtn.closest('.select-selected-item').dataset.value;
        this.removeSelectedItem(itemValue);
      } else if (searchInput) {
        // Clicked inside the search input: stop propagation to prevent closing
        e.stopPropagation();
      }
      // Clicks elsewhere in the options container are ignored
    });

    // Handle search input filtering
    if (this.searchInput) {
      this.searchInput.addEventListener('input', e => this.filterOptions(e.target.value));
      // Prevent clicks on search icon from closing dropdown immediately
      this.searchInput.addEventListener('click', e => e.stopPropagation());
    }

    // Close dropdown if clicking outside the widget
    document.addEventListener('click', e => {
      if (!this.container.contains(e.target) && this.container.classList.contains('select--open')) {
        this.close();
      }
    });

    // Close dropdown on Escape key press
    this.container.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.container.classList.contains('select--open')) {
        this.close();
      }
      // Basic keyboard navigation could be added here (ArrowDown, ArrowUp, Enter on options)
    });
  }

  /**
   * Toggles the open/closed state of the dropdown.
   * Handles focusing the search input if configured.
   */
  toggle() {
    const isOpen = this.container.classList.toggle('select--open');
    if (isOpen && this.searchInput) {
      // Clear search and filter when opening
      this.searchInput.value = '';
      this.filterOptions('');
      // Focus search input if configured
      if (this.config.focusOnOpen) {
        // Use setTimeout to ensure the element is visible and focusable
        setTimeout(() => this.searchInput.focus(), 10);
      }
    }
    // No specific action needed on close, click outside handles it.
  }

  /**
   * Closes the dropdown.
   */
  close() {
    this.container.classList.remove('select--open');
    // Potentially trigger validation on close? Handled by focusout in init.js
    // const customWidget = this.container;
    // if (customWidget) {
    //     validateCustomSelect(customWidget); // Assuming validateCustomSelect is accessible
    // }
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
    const isSelected = this.selectedItems.has(value);
    const maxReached = this.selectedItems.size >= this.config.maxSelections;
    const minReached = this.selectedItems.size <= this.config.minSelections;

    if (isSelected) {
      // --- Attempting to Deselect ---
      // Prevent deselection if minimum is reached (and it's not a single-select where deselection implies selection of another)
      if (minReached && this.config.minSelections > 0 && this.config.maxSelections !== 1) {
        console.log(`CustomSelectWidget (${this.nativeSelectId}): Minimum selections (${this.config.minSelections}) reached. Cannot deselect value "${value}".`);
        // Provide visual feedback (e.g., shake the option)
        option.classList.add('select-option--shake');
        setTimeout(() => option.classList.remove('select-option--shake'), 400);
        return; // Stop deselection
      }
      // Proceed with deselection
      this.selectedItems.delete(value);
      this.selectionOrder = this.selectionOrder.filter(item => item !== value); // Remove from ordered list
      option.classList.remove('select-option--selected');
      option.setAttribute('aria-selected', 'false');
      // If hideSelectedFromList is false, the option remains visible, just not selected.
      // If true, updateDynamicElements will handle making it visible again if needed.

    } else {
      // --- Attempting to Select ---
      // Check if maximum is reached and we are *not* in single-select mode or auto-deselect mode
      if (maxReached && !this.config.autoDeselect && this.config.maxSelections !== 1) {
        console.log(`CustomSelectWidget (${this.nativeSelectId}): Maximum selections (${this.config.maxSelections}) reached. Cannot select value "${value}".`);
        // Optional: Add visual feedback (shake)
        option.classList.add('select-option--shake');
        setTimeout(() => option.classList.remove('select-option--shake'), 400);
        return; // Stop selection
      }

      // Handle single-select mode (maxSelections === 1)
      if (this.config.maxSelections === 1) {
        // Deselect any previously selected item
        if (this.selectionOrder.length > 0) {
          const previousValue = this.selectionOrder[0];
          this.selectedItems.delete(previousValue);
          const previousOption = this.optionsListContainer.querySelector(`.select-option[data-value="${previousValue}"]`);
          previousOption?.classList.remove('select-option--selected');
          previousOption?.setAttribute('aria-selected', 'false');
          // If hiding selected, make the previous one visible again
          if (this.config.hideSelectedFromList && previousOption) {
            previousOption.classList.remove('select-option--hidden');
          }
        }
        this.selectedItems.clear(); // Ensure set is empty before adding
        this.selectionOrder = [];   // Clear order array
      }
      // Handle multi-select auto-deselect when max is reached
      else if (maxReached && this.config.autoDeselect) {
        // Remove the item selected earliest (first in selectionOrder)
        const earliestValue = this.selectionOrder.shift(); // Remove first element and get its value
        this.selectedItems.delete(earliestValue);
        const earliestOption = this.optionsListContainer.querySelector(`.select-option[data-value="${earliestValue}"]`);
        earliestOption?.classList.remove('select-option--selected');
        earliestOption?.setAttribute('aria-selected', 'false');
        // If hiding selected, make the deselected one visible again
        if (this.config.hideSelectedFromList && earliestOption) {
          earliestOption.classList.remove('select-option--hidden');
        }
      }

      // Add the new selection
      this.selectedItems.add(value);
      this.selectionOrder.push(value); // Add to the end of the ordered list
      option.classList.add('select-option--selected');
      option.setAttribute('aria-selected', 'true');
      // Hiding is handled by updateDynamicElements if configured
    }

    // --- Update UI and State ---
    this.updateDeclensionValue(); // Update value for potential declension changes
    this.updateHeader();          // Update placeholder text
    this.updateDynamicElements(); // Update count, selected badges, option visibility
    this.updateNativeSelect();    // Sync with the hidden native <select>

    // --- Callbacks and Auto-Close ---
    // Trigger custom event handlers if provided in config (advanced use)
    if (typeof this.config.onSelect === 'function') {
      try { this.config.onSelect(value, !isSelected); } // Pass value and selection state
      catch (e) { console.error("Error in onSelect callback:", e); }
    }
    if (typeof this.config.onChange === 'function') {
      try { this.config.onChange(Array.from(this.selectedItems)); } // Pass current selection array
      catch (e) { console.error("Error in onChange callback:", e); }
    }

    // Auto-close logic
    if (this.config.maxSelections === 1 && !isSelected) { // Close immediately after selecting in single-select mode
      this.close();
    } else if (this.config.autoCloseOnComplete && this.selectedItems.size >= this.config.maxSelections) { // Close when max is reached if configured
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

    // --- Check Minimum Selections Constraint ---
    if (this.selectedItems.size <= this.config.minSelections && this.config.minSelections > 0) {
      console.log(`CustomSelectWidget (${this.nativeSelectId}): Minimum selections (${this.config.minSelections}) reached. Cannot remove value "${value}".`);
      // Provide visual feedback (e.g., shake the badge)
      const selectedItemElement = this.container.querySelector(`.select-selected-item[data-value="${value}"]`);
      selectedItemElement?.classList.add('select-selected-item--shake'); // Add a shake class
      setTimeout(() => selectedItemElement?.classList.remove('select-selected-item--shake'), 400);
      return; // Stop removal
    }
    // ---

    // Proceed with removal
    this.selectedItems.delete(value);
    this.selectionOrder = this.selectionOrder.filter(item => item !== value); // Remove from ordered list

    // Update the corresponding option in the list (if it exists)
    const option = this.optionsListContainer.querySelector(`.select-option[data-value="${value}"]`);
    if (option) {
      option.classList.remove('select-option--selected');
      option.setAttribute('aria-selected', 'false');
      // If hiding selected items, make this one visible again
      if (this.config.hideSelectedFromList) {
        option.classList.remove('select-option--hidden');
      }
    }

    // Update UI and State
    this.updateDeclensionValue();
    this.updateHeader();
    this.updateDynamicElements(); // This will re-render the selected items badges
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
   * @param {string} query - The search term entered by the user.
   * @private
   */
  filterOptions(query) {
    if (!this.searchInput || !this.optionsListContainer || !this.emptyMessage) return;

    const q = query.toLowerCase().trim(); // Normalize query
    let visibleCount = 0;

    this.options.forEach(opt => {
      // Check if option is already hidden because it's selected (and hideSelected is true)
      const isSelectedAndHidden = this.config.hideSelectedFromList && this.selectedItems.has(opt.dataset.value);

      // Get option text content
      const text = opt.querySelector('span:last-child')?.textContent.toLowerCase() || '';
      const matches = text.includes(q);

      // Determine if the option should be displayed
      // It should be displayed if it matches the query AND it's not hidden due to being selected
      const shouldDisplay = matches && !isSelectedAndHidden;

      // Toggle display style
      opt.style.display = shouldDisplay ? '' : 'none';

      if (shouldDisplay) {
        visibleCount++;
      }
    });

    // Show/hide the 'Nothing found' message
    this.emptyMessage.style.display = visibleCount === 0 ? 'block' : 'none';
  }
}


// --- Initialization Function ---

/**
 * Finds all elements with the '.django-custom-select-widget' class
 * and initializes a CustomSelectWidget instance for each.
 */
function initAllCustomSelects() {
  const selectWidgets = document.querySelectorAll('.django-custom-select-widget');
  selectWidgets.forEach(widgetElement => {
    // Prevent double initialization
    if (!widgetElement.dataset.initialized) {
      try {
        new CustomSelectWidget(widgetElement);
        widgetElement.dataset.initialized = 'true'; // Mark as initialized
      } catch (error) {
        console.error("Failed to initialize CustomSelectWidget for element:", widgetElement, error);
        // Optionally display an error message in the widget's place
        widgetElement.innerHTML = '<p style="color: red; padding: 10px;">Error initializing select widget.</p>';
      }
    }
  });
}

// --- Export for use in init.js ---
export { CustomSelectWidget, initAllCustomSelects };