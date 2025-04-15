// --"--\Catalog\store\static_dev\js\widgets\select_input.js"--

/**
 * Handles declension of words based on a number.
 * Expects a config object like:
 * {
 *   variable: 'items',
 *   rules: [
 *     { value: 1, condition: '=', form: 'товар' },
 *     { value: '2-4', condition: '-', form: 'товара' },
 *     { value: 0, condition: '=', form: 'товаров' },
 *     { value: 5, condition: '>=', form: 'товаров' },
 *   ]
 * }
 * Conditions: '=', '-', '>', '<', '>=', '<='
 */
class DeclensionHandler {
  constructor(config, trackChanges = false) {
    this.variable = config?.variable || '';
    this.rules = config?.rules || [];
    this._value = 0;
    this.trackChanges = trackChanges;
    this.callbacks = [];

    if (this.trackChanges) {
      Object.defineProperty(this, 'value', {
        get: () => this._value,
        set: (newValue) => {
          const num = Number(newValue);
          if (!isNaN(num) && this._value !== num) {
            this._value = num;
            this.notify();
          }
        },
        configurable: true
      });
    } else {
      this.value = 0;
    }
  }

  onChange(callback) {
    if (this.trackChanges && typeof callback === 'function') {
      this.callbacks.push(callback);
    }
  }

  notify() {
    const form = this.getDeclinedForm();
    this.callbacks.forEach(cb => cb(form));
  }

  getDeclinedForm() {
    const val = Number(this.trackChanges ? this._value : this.value);
    if (isNaN(val)) return '';

    for (const rule of this.rules) {
      const cV = rule.value;
      const cT = rule.condition;

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
      }
    }

    const lastRule = this.rules[this.rules.length - 1];
    return lastRule ? lastRule.form : '';
  }

  updateValue(newValue) {
    const num = Number(newValue);
    if (!isNaN(num)) {
      if (this.trackChanges) {
        this.value = num;
      } else {
        if (this._value !== num) {
          this._value = num;
        }
      }
    }
  }
}

/**
 * Creates a custom select dropdown UI that syncs with a hidden native select element.
 */
class CustomSelectWidget {
  constructor(element) {
    this.container = element;
    if (!this.container) {
      console.error("CustomSelectWidget: Container element not provided.");
      return;
    }

    try {
      this.config = {
        minSelections: 0,
        maxSelections: 1,
        placeholder: 'Выберите...',
        placeholderAllSelected: 'Все выбрано ({maxSelections})',
        focusOnOpen: true,
        mode: 'overlay',
        icon: 'fa-angle-down',
        indicatorShape: 'circle',
        autoDeselect: true,
        countTitle: 'Выбрано:',
        countTitleAllSelected: 'Выбрано (макс. {max}):',
        selectedItemTextLength: 25,
        autoCloseOnComplete: false,
        layoutOrder: ['search', 'options'],
        hideSelectedFromList: true,
        searchable: true,
        showCount: false,
        showSelected: false,
        declension: null,
        stickySearch: false,
        minSelectionsMessage: 'Выберите минимум {min} элемент(а/ов)',
        ...(JSON.parse(this.container.dataset.config || '{}'))
      };

      this.choices = JSON.parse(this.container.dataset.choices || '[]');
    } catch (e) {
      console.error('CustomSelectWidget: Failed to parse config or choices JSON.', e, this.container);
      this.config = { minSelections: 0, maxSelections: 1 };
      this.choices = [];
      return;
    }

    this.nativeSelectId = this.container.dataset.nativeSelectId;
    this.nativeSelect = document.getElementById(this.nativeSelectId);
    if (!this.nativeSelect) {
      console.error(`CustomSelectWidget: Native select element with ID "${this.nativeSelectId}" not found.`);
      return;
    }

    this.selectedItems = new Set();
    Array.from(this.nativeSelect.selectedOptions).forEach(option => {
      if (option.value) {
        this.selectedItems.add(option.value);
      }
    });
    this.selectionOrder = Array.from(this.selectedItems);

    this.declensionHandler = null;
    if (this.config.declension && Array.isArray(this.config.declension.rules) && this.config.declension.rules.length > 0) {
      this.declensionHandler = new DeclensionHandler(this.config.declension, true);
      this.updateDeclensionValue();
      this.declensionHandler.onChange(() => {
        this.updateHeader();
      });
    }

    if (this.config.minSelections < 0) this.config.minSelections = 0;
    if (this.config.maxSelections < 1) this.config.maxSelections = 1;
    if (this.config.minSelections > this.config.maxSelections) {
      console.warn(`CustomSelectWidget (${this.nativeSelectId}): minSelections (${this.config.minSelections}) cannot be greater than maxSelections (${this.config.maxSelections}). Adjusting minSelections.`);
      this.config.minSelections = this.config.maxSelections;
    }

    if (this.config.stickySearch && this.config.searchable) {
      this.container.classList.add('select--sticky-search');
    }
    if (!this.config.icon || typeof this.config.icon !== 'string') {
      this.container.classList.add('select--no-icon');
    }
    this.container.classList.add(`select--${this.config.mode || 'overlay'}`);

    this.container.widgetInstance = this;
    this.init();
  }

  init() {
    this.renderStructure();
    this.bindEvents();
    this.updateHeader();
    this.updateDynamicElements();
  }

  getPlaceholderText() {
    const selectedCount = this.selectedItems.size;
    const maxReached = selectedCount >= this.config.maxSelections;

    if (maxReached && this.config.placeholderAllSelected) {
      return this.config.placeholderAllSelected.replace('{maxSelections}', this.config.maxSelections);
    }

    const remaining = Math.max(0, this.config.maxSelections - selectedCount);
    let placeholder = this.config.placeholder || 'Выберите...';
    placeholder = placeholder.replace('{remaining}', remaining);
    placeholder = placeholder.replace('{maxSelections}', this.config.maxSelections);

    if (this.declensionHandler && this.config.declension?.variable === 'remaining') {
      this.declensionHandler.updateValue(remaining);
      const declensionForm = this.declensionHandler.getDeclinedForm();
      placeholder = placeholder.replace('{declension}', declensionForm);
    }

    return placeholder;
  }

  getCountTitle() {
    if (this.selectedItems.size >= this.config.maxSelections && this.config.countTitleAllSelected) {
      return this.config.countTitleAllSelected.replace('{max}', this.config.maxSelections);
    }
    return this.config.countTitle || 'Выбрано:';
  }

  updateDeclensionValue() {
    if (!this.declensionHandler) return;
    const declVar = this.config.declension?.variable;
    let valueToUpdate = 0;
    if (declVar === 'remaining') {
      valueToUpdate = Math.max(0, this.config.maxSelections - this.selectedItems.size);
    }
    this.declensionHandler.updateValue(valueToUpdate);
  }

  renderStructure() {
    this.header = this.container.querySelector('.select-header');
    this.headerText = this.container.querySelector('.select-header-text');
    this.optionsContainer = this.container.querySelector('.select-options');

    if (!this.header || !this.headerText || !this.optionsContainer) {
      console.error(`CustomSelectWidget (${this.nativeSelectId}): Missing essential child elements (.select-header, .select-header-text, .select-options).`);
      return;
    }

    this.optionsContainer.innerHTML = this.renderLayout();

    this.searchInput = this.optionsContainer.querySelector('.select-search');
    this.optionsListContainer = this.optionsContainer.querySelector('.select-options-list');
    this.options = this.optionsListContainer ? this.optionsListContainer.querySelectorAll('.select-option') : [];
    this.emptyMessage = this.optionsContainer.querySelector('.select-empty');
  }

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
          const isSelected = this.selectedItems.has(item.value);
          const isHidden = this.config.hideSelectedFromList && isSelected;
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

    return (this.config.layoutOrder || ['search', 'options'])
      .map(key => blocks[key] || '')
      .join('');
  }

  renderSelectedItems() {
    const textLength = this.config.selectedItemTextLength || 25;
    return this.selectionOrder
      .map(value => this.choices.find(item => item.value === value))
      .filter(item => item)
      .map(item => {
        const label = item.label;
        const truncatedLabel = label.length > textLength
          ? label.substring(0, textLength) + '…'
          : label;
        return `<div class="select-selected-item" data-value="${item.value}">
                  <span class="select-selected-item-text" title="${label}">${truncatedLabel}</span>
                  <button type="button" class="select-selected-item-remove" aria-label="Remove ${label}">
                    <i class="fas fa-times" aria-hidden="true"></i>
                  </button>
                </div>`;
      }).join('');
  }

  updateDynamicElements() {
    const countBlock = this.container.querySelector('.select-count');
    if (countBlock) {
      if (this.config.showCount) {
        countBlock.innerHTML = `<div class="select-count-title">
                                    <span>${this.getCountTitle()}</span>
                                    <span class="select-count-value">${this.selectedItems.size}/${this.config.maxSelections}</span>
                                  </div>`;
        countBlock.style.display = '';
      } else {
        countBlock.style.display = 'none';
      }
    }

    const selectedBlock = this.container.querySelector('.select-selected-items');
    if (selectedBlock) {
      if (this.config.showSelected) {
        selectedBlock.innerHTML = this.renderSelectedItems();
        selectedBlock.style.display = this.selectedItems.size > 0 ? 'flex' : 'none';
      } else {
        selectedBlock.style.display = 'none';
      }
    }

    if (this.config.hideSelectedFromList && this.options.length > 0) {
      this.options.forEach(option => {
        const isSelected = this.selectedItems.has(option.dataset.value);
        option.classList.toggle('select-option--hidden', isSelected);
        option.setAttribute('aria-selected', isSelected);
      });
      if (this.searchInput && this.searchInput.value) {
        this.filterOptions(this.searchInput.value);
      } else {
        this.filterOptions('');
      }
    }
  }

  updateHeader() {
    if (this.headerText) {
      this.headerText.textContent = this.getPlaceholderText();
    }
  }

  updateNativeSelect() {
    if (!this.nativeSelect) return;
    let changed = false;
    Array.from(this.nativeSelect.options).forEach(option => {
      const shouldBeSelected = this.selectedItems.has(option.value);
      if (option.selected !== shouldBeSelected) {
        option.selected = shouldBeSelected;
        changed = true;
      }
    });
    if (changed) {
      const event = new Event('change', { bubbles: true });
      this.nativeSelect.dispatchEvent(event);
    }
  }

  bindEvents() {
    if (!this.header || !this.optionsContainer) return;

    this.header.addEventListener('click', (e) => {
      if (!e.target.closest('.select-selected-item-remove')) {
        this.toggle();
      }
    });

    this.optionsContainer.addEventListener('click', (e) => {
      const option = e.target.closest('.select-option');
      const removeBtn = e.target.closest('.select-selected-item-remove');
      const searchInput = e.target.closest('.select-search');

      if (option && !option.classList.contains('select-option--hidden')) {
        this.selectOption(option);
      } else if (removeBtn) {
        e.stopPropagation();
        const itemValue = removeBtn.closest('.select-selected-item').dataset.value;
        this.removeSelectedItem(itemValue);
      } else if (searchInput) {
        e.stopPropagation();
      }
    });

    if (this.searchInput) {
      this.searchInput.addEventListener('input', e => this.filterOptions(e.target.value));
      this.searchInput.addEventListener('click', e => e.stopPropagation());
    }

    document.addEventListener('click', e => {
      if (!this.container.contains(e.target) && this.container.classList.contains('select--open')) {
        this.close();
      }
    });

    this.container.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.container.classList.contains('select--open')) {
        this.close();
      }
    });
  }

  toggle() {
    const isOpen = this.container.classList.toggle('select--open');
    if (isOpen && this.searchInput) {
      this.searchInput.value = '';
      this.filterOptions('');
      if (this.config.focusOnOpen) {
        setTimeout(() => this.searchInput.focus(), 10);
      }
    }
  }

  close() {
    this.container.classList.remove('select--open');
    // Вызываем валидацию при закрытии
    if (typeof window.validateCustomSelect === 'function') {
      window.validateCustomSelect(this.container);
    }
  }

  // В Catalog\store\static_dev\js\widgets\select_input.js
  selectOption(option) {
    const value = option.dataset.value;
    const isSelected = this.selectedItems.has(value);
    const maxReached = this.selectedItems.size >= this.config.maxSelections;
    const minReached = this.selectedItems.size <= this.config.minSelections;

    if (isSelected) {
      if (minReached && this.config.minSelections > 0 && this.config.maxSelections !== 1) {
        console.log(`CustomSelectWidget (${this.nativeSelectId}): Minimum selections (${this.config.minSelections}) reached. Cannot deselect value "${value}".`);
        option.classList.add('select-option--shake');
        setTimeout(() => option.classList.remove('select-option--shake'), 400);
        return;
      }
      this.selectedItems.delete(value);
      this.selectionOrder = this.selectionOrder.filter(item => item !== value);
      option.classList.remove('select-option--selected');
      option.setAttribute('aria-selected', 'false');
    } else {
      if (maxReached && !this.config.autoDeselect && this.config.maxSelections !== 1) {
        console.log(`CustomSelectWidget (${this.nativeSelectId}): Maximum selections (${this.config.maxSelections}) reached. Cannot select value "${value}".`);
        option.classList.add('select-option--shake');
        setTimeout(() => option.classList.remove('select-option--shake'), 400);
        return;
      }

      if (this.config.maxSelections === 1) {
        if (this.selectionOrder.length > 0) {
          const previousValue = this.selectionOrder[0];
          this.selectedItems.delete(previousValue);
          const previousOption = this.optionsListContainer.querySelector(`.select-option[data-value="${previousValue}"]`);
          previousOption?.classList.remove('select-option--selected');
          previousOption?.setAttribute('aria-selected', 'false');
          if (this.config.hideSelectedFromList && previousOption) {
            previousOption.classList.remove('select-option--hidden');
          }
        }
        this.selectedItems.clear();
        this.selectionOrder = [];
      } else if (maxReached && this.config.autoDeselect) {
        const earliestValue = this.selectionOrder.shift();
        this.selectedItems.delete(earliestValue);
        const earliestOption = this.optionsListContainer.querySelector(`.select-option[data-value="${earliestValue}"]`);
        earliestOption?.classList.remove('select-option--selected');
        earliestOption?.setAttribute('aria-selected', 'false');
        if (this.config.hideSelectedFromList && earliestOption) {
          earliestOption.classList.remove('select-option--hidden');
        }
      }

      this.selectedItems.add(value);
      this.selectionOrder.push(value);
      option.classList.add('select-option--selected');
      option.setAttribute('aria-selected', 'true');
    }

    this.updateDeclensionValue();
    this.updateHeader();
    this.updateDynamicElements();
    this.updateNativeSelect();

    if (typeof this.config.onSelect === 'function') {
      try { this.config.onSelect(value, !isSelected); }
      catch (e) { console.error("Error in onSelect callback:", e); }
    }
    if (typeof this.config.onChange === 'function') {
      try { this.config.onChange(Array.from(this.selectedItems)); }
      catch (e) { console.error("Error in onChange callback:", e); }
    }

    if (this.config.maxSelections === 1 && !isSelected) {
      this.close();
    } else if (this.config.autoCloseOnComplete && this.selectedItems.size >= this.config.maxSelections) {
      this.close();
    }

    // НЕ вызываем валидацию здесь, она должна быть в close() или focusout
  }

  removeSelectedItem(value) {
    if (!this.selectedItems.has(value)) return;

    if (this.selectedItems.size <= this.config.minSelections && this.config.minSelections > 0) {
      console.log(`CustomSelectWidget (${this.nativeSelectId}): Minimum selections (${this.config.minSelections}) reached. Cannot remove value "${value}".`);
      const selectedItemElement = this.container.querySelector(`.select-selected-item[data-value="${value}"]`);
      selectedItemElement?.classList.add('select-selected-item--shake');
      setTimeout(() => selectedItemElement?.classList.remove('select-selected-item--shake'), 400);
      return;
    }

    this.selectedItems.delete(value);
    this.selectionOrder = this.selectionOrder.filter(item => item !== value);

    const option = this.optionsListContainer.querySelector(`.select-option[data-value="${value}"]`);
    if (option) {
      option.classList.remove('select-option--selected');
      option.setAttribute('aria-selected', 'false');
      if (this.config.hideSelectedFromList) {
        option.classList.remove('select-option--hidden');
      }
    }

    this.updateDeclensionValue();
    this.updateHeader();
    this.updateDynamicElements();
    this.updateNativeSelect();

    if (typeof this.config.onSelect === 'function') {
      try { this.config.onSelect(value, false); }
      catch (e) { console.error("Error in onSelect callback:", e); }
    }
    if (typeof this.config.onChange === 'function') {
      try { this.config.onChange(Array.from(this.selectedItems)); }
      catch (e) { console.error("Error in onChange callback:", e); }
    }
  }

  filterOptions(query) {
    if (!this.searchInput || !this.optionsListContainer || !this.emptyMessage) return;

    const q = query.toLowerCase().trim();
    let visibleCount = 0;

    this.options.forEach(opt => {
      const isSelectedAndHidden = this.config.hideSelectedFromList && this.selectedItems.has(opt.dataset.value);
      const text = opt.querySelector('span:last-child')?.textContent.toLowerCase() || '';
      const matches = text.includes(q);
      const shouldDisplay = matches && !isSelectedAndHidden;
      opt.style.display = shouldDisplay ? '' : 'none';
      if (shouldDisplay) {
        visibleCount++;
      }
    });

    this.emptyMessage.style.display = visibleCount === 0 ? 'block' : 'none';
  }
}

function initAllCustomSelects() {
  const selectWidgets = document.querySelectorAll('.django-custom-select-widget');
  selectWidgets.forEach(widgetElement => {
    if (!widgetElement.dataset.initialized) {
      try {
        new CustomSelectWidget(widgetElement);
        widgetElement.dataset.initialized = 'true';
      } catch (error) {
        console.error("Failed to initialize CustomSelectWidget for element:", widgetElement, error);
        widgetElement.innerHTML = '<p style="color: red; padding: 10px;">Error initializing select widget.</p>';
      }
    }
  });
}

export { CustomSelectWidget, initAllCustomSelects };