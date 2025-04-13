// Catalog/store/static/js/custom_select.js

class DeclensionHandler {
  constructor(config, trackChanges = false) {
    this.variable = config.variable || '';
    this.rules = config.rules || [];
    this._value = 0;
    this.trackChanges = trackChanges;
    this.callbacks = [];

    if (this.trackChanges) {
      Object.defineProperty(this, 'value', {
        get: () => this._value,
        set: (newValue) => {
          if (this._value !== newValue) {
            this._value = newValue;
            this.notify();
          }
        }
      });
    } else {
      this.value = 0;
    }
  }

  onChange(callback) {
    if (this.trackChanges) {
      this.callbacks.push(callback);
    }
  }

  notify() {
    const currentForm = this.getDeclinedForm();
    this.callbacks.forEach(callback => callback(currentForm));
  }

  getDeclinedForm() {
    const value = this.trackChanges ? this._value : this.value;
    for (const rule of this.rules) {
      if (rule.condition === '=') {
        if (value === rule.value) return rule.form;
      } else if (rule.condition === '-') {
        const [min, max] = rule.value.split('-').map(Number);
        if (value >= min && value <= max) return rule.form;
      } else if (rule.condition === '>=') {
        if (value >= rule.value) return rule.form;
      } else if (rule.condition === '<=') {
        if (value <= rule.value) return rule.form;
      } else if (rule.condition === '>') {
        if (value > rule.value) return rule.form;
      } else if (rule.condition === '<') {
        if (value < rule.value) return rule.form;
      }
    }
    return this.rules[this.rules.length - 1]?.form || '';
  }
}

class CustomSelect {
  constructor(selector, options = {}) {
    this.container = document.querySelector(selector);
    if (!this.container) {
      console.error('Контейнер с селектором "' + selector + '" не найден.');
      return;
    }

    try {
      this.config = {
        items: options.items || [],
        maxSelections: options.maxSelections || 1,
        placeholder: options.placeholder || 'Осталось выбрать {remaining} {declension}',
        placeholderAllSelected: options.placeholderAllSelected || 'Все элементы выбраны',
        focusOnOpen: options.focusOnOpen !== false,
        mode: options.mode || 'overlay',
        icon: options.icon !== undefined ? options.icon : (options.mode === 'inline' ? 'fa-bars' : 'fa-apple-whole'),
        declension: options.declension || null,
        indicatorShape: options.indicatorShape || (options.maxSelections === 1 ? 'circle' : 'square'),
        autoDeselect: options.autoDeselect !== undefined ? options.autoDeselect : (options.indicatorShape === 'circle' || options.maxSelections === 1),
        countTitle: options.countTitle || 'Выбрано:',
        countTitleAllSelected: options.countTitleAllSelected || 'Все выбрано (макс. {max}):',
        selectedItemTextLength: options.selectedItemTextLength || 15,
        autoCloseOnComplete: options.autoCloseOnComplete !== undefined ? options.autoCloseOnComplete : false,
        layoutOrder: options.layoutOrder || ['count', 'selected', 'search', 'options'],
        hideSelectedFromList: options.hideSelectedFromList !== undefined ? options.hideSelectedFromList : true,
        onChange: options.onChange || (() => console.log('Изменено:', Array.from(this.selectedItems))),
        onSelect: options.onSelect || ((value, isSelected) => console.log(`Элемент ${value} ${isSelected ? 'выбран' : 'снят'}`))
      };
      console.log('Конфигурация:', this.config); // Отладка
    } catch (e) {
      console.error('Ошибка в конфигурации:', e);
      return;
    }

    if (this.config.maxSelections < 1) {
      console.error('Ошибка: maxSelections должен быть больше или равен 1.');
      return;
    }

    this.declensionHandler = null;
    if (this.config.declension) {
      this.declensionHandler = new DeclensionHandler(this.config.declension, true);
      this.declensionHandler.value = this.config[this.config.declension.variable] || 0;
      this.declensionHandler.onChange(() => this.updateHeader());
    }

    this.selectedItems = new Set();
    this.selectionOrder = [];
    this.init();
  }

  init() {
    console.log('Инициализация CustomSelect для:', this.container.id);
    this.render();
    this.bindEvents();
    // Отладка: проверяем наличие .select-options
    const options = this.container.querySelector('.select-options');
    if (!options) {
      console.error('Ошибка: .select-options не найден в', this.container.id);
    } else {
      console.log('Найден .select-options для:', this.container.id);
      console.log('Содержимое .select-options:', options.innerHTML);
    }
    // Принудительно открываем для теста
    this.container.classList.add('select--open');
    if (options) {
      console.log('Стили .select-options:', window.getComputedStyle(options).display);
    }
  }

  getPlaceholderText() {
    if (this.selectedItems.size >= this.config.maxSelections && this.config.placeholderAllSelected) {
      return this.config.placeholderAllSelected;
    }

    const remaining = Math.max(0, this.config.maxSelections - this.selectedItems.size);
    let placeholder = this.config.placeholder.replace('{remaining}', remaining);
    placeholder = placeholder.replace('{maxSelections}', this.config.maxSelections);

    if (this.declensionHandler) {
      const declensionForm = this.declensionHandler.getDeclinedForm();
      placeholder = placeholder.replace('{declension}', declensionForm);
    }

    return placeholder;
  }

  getCountTitle() {
    if (this.selectedItems.size >= this.config.maxSelections) {
      return this.config.countTitleAllSelected.replace('{max}', this.config.maxSelections);
    }
    return this.config.countTitle;
  }

  render() {
    const hasIcon = this.config.icon !== false && this.config.icon !== '';
    if (!hasIcon) {
      this.container.classList.add('select--no-icon');
    }

    this.container.innerHTML = `
      <div class="select-header">
        ${hasIcon ? `<i class="fas ${this.config.icon} select-header-icon"></i>` : ''}
        <span class="select-header-text">${this.getPlaceholderText()}</span>
      </div>
      <div class="select-options">
        ${this.renderLayout()}
      </div>
      <input type="hidden" name="${this.container.id.replace('-custom-select', '')}" value="">
    `;

    this.container.classList.add(`select--${this.config.mode}`);
    this.header = this.container.querySelector('.select-header');
    this.headerText = this.container.querySelector('.select-header-text');
    this.optionsContainer = this.container.querySelector('.select-options');
    this.hiddenInput = this.container.querySelector('input[type="hidden"]');
    this.updateDynamicElements();
  }

  renderLayout() {
    const blocks = {
      count: `
        <div class="select-count">
          <div class="select-count-title">
            <span>${this.getCountTitle()}</span>
            <span class="select-count-value">${this.selectedItems.size}/${this.config.maxSelections}</span>
          </div>
        </div>
      `,
      selected: `
        <div class="select-selected-items">
          ${this.renderSelectedItems()}
        </div>
      `,
      search: `
        <div class="select-search-wrapper">
          <input type="text" class="select-search" placeholder="Поиск...">
          <i class="fas fa-search select-search-icon"></i>
        </div>
      `,
      options: `
        ${this.config.items.map(item => `
          <div class="select-option" data-value="${item.value}">
            <span class="select-check select-check--${this.config.indicatorShape}"></span>
            <span>${item.label}</span>
          </div>
        `).join('')}
      `
    };

    return this.config.layoutOrder
      .filter(block => blocks[block])
      .map(block => blocks[block])
      .join('');
  }

  renderSelectedItems() {
    return Array.from(this.options || [])
      .filter(opt => this.selectedItems.has(opt.dataset.value))
      .map(opt => {
        const label = opt.querySelector('span:last-child').textContent;
        const truncatedLabel = label.length > this.config.selectedItemTextLength
          ? label.substring(0, this.config.selectedItemTextLength) + '...'
          : label;
        return `
          <div class="select-selected-item" data-value="${opt.dataset.value}">
            <span class="select-selected-item-text">${truncatedLabel}</span>
            <i class="fas fa-times select-selected-item-remove"></i>
          </div>
        `;
      }).join('');
  }

  updateDynamicElements() {
    this.options = this.container.querySelectorAll('.select-option');
    this.searchInput = this.container.querySelector('.select-search');

    const countBlock = this.container.querySelector('.select-count');
    if (countBlock) {
      countBlock.innerHTML = `
        <div class="select-count-title">
          <span>${this.getCountTitle()}</span>
          <span class="select-count-value">${this.selectedItems.size}/${this.config.maxSelections}</span>
        </div>
      `;
    }

    const selectedBlock = this.container.querySelector('.select-selected-items');
    if (selectedBlock) {
      selectedBlock.innerHTML = this.renderSelectedItems();
    }

    if (this.config.hideSelectedFromList && this.config.layoutOrder.includes('selected')) {
      this.options.forEach(option => {
        if (this.selectedItems.has(option.dataset.value)) {
          option.classList.add('select-option--hidden');
        } else {
          option.classList.remove('select-option--hidden');
        }
      });
    }

    try {
      const initialValues = this.container.dataset.initial ? JSON.parse(this.container.dataset.initial) : [];
      console.log('Начальные значения:', initialValues); // Отладка
      initialValues.forEach(value => {
        const option = Array.from(this.options).find(opt => opt.dataset.value === value);
        if (option && !this.selectedItems.has(value)) {
          this.selectOption(option);
        }
      });
    } catch (e) {
      console.error('Ошибка парсинга data-initial:', e);
    }
  }

  bindEvents() {
    this.header.addEventListener('click', (e) => {
      e.preventDefault(); // Предотвращаем стандартное поведение
      e.stopPropagation(); // Останавливаем всплытие события
      console.log('Клик по header:', this.container.id); // Отладка
      this.toggle();
    });

    this.options.forEach(opt => opt.addEventListener('click', () => {
      console.log('Клик по опции:', opt.dataset.value); // Отладка
      this.selectOption(opt);
    }));

    if (this.searchInput) {
      this.searchInput.addEventListener('input', e => this.filterOptions(e.target.value));
      this.searchInput.addEventListener('click', e => e.stopPropagation());
    }

    this.optionsContainer.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.select-selected-item-remove');
      if (removeBtn) {
        e.stopPropagation();
        const item = removeBtn.closest('.select-selected-item');
        const value = item.dataset.value;
        this.removeSelectedItem(value);
      }
    });

    document.addEventListener('click', e => {
      if (!this.container.contains(e.target)) {
        console.log('Клик вне селекта, закрываем:', this.container.id); // Отладка
        this.close();
      }
    });
  }

  toggle() {
    this.container.classList.toggle('select--open');
    console.log('Тоггл селекта:', this.container.id, 'Открыт:', this.container.classList.contains('select--open')); // Отладка
    if (this.config.focusOnOpen && this.searchInput && this.container.classList.contains('select--open')) {
      setTimeout(() => this.searchInput.focus(), 10);
    }
  }

  close() {
    this.container.classList.remove('select--open');
    console.log('Закрытие селекта:', this.container.id); // Отладка
    if (this.searchInput) {
      this.searchInput.value = '';
      this.filterOptions('');
    }
  }

  selectOption(option) {
    const value = option.dataset.value;
    const isSelected = this.selectedItems.has(value);

    if (isSelected) {
      this.selectedItems.delete(value);
      this.selectionOrder = this.selectionOrder.filter(item => item !== value);
      option.classList.remove('select-option--selected');
    } else {
      if (this.config.autoDeselect) {
        if (this.config.maxSelections === 1) {
          this.selectedItems.clear();
          this.selectionOrder = [];
          this.options.forEach(opt => opt.classList.remove('select-option--selected'));
        } else if (this.selectedItems.size >= this.config.maxSelections) {
          const earliestValue = this.selectionOrder.shift();
          this.selectedItems.delete(earliestValue);
          const earliestOption = Array.from(this.options).find(opt => opt.dataset.value === earliestValue);
          if (earliestOption) {
            earliestOption.classList.remove('select-option--selected');
          }
        }
      } else if (this.selectedItems.size >= this.config.maxSelections) {
        return;
      }

      this.selectedItems.add(value);
      this.selectionOrder.push(value);
      option.classList.add('select-option--selected');
    }

    this.updateHeader();
    this.updateDynamicElements();
    this.updateHiddenInput();

    this.config.onSelect(value, !isSelected);
    this.config.onChange(Array.from(this.selectedItems));

    if (this.config.autoCloseOnComplete && this.selectedItems.size >= this.config.maxSelections) {
      this.close();
    } else if (this.config.maxSelections === 1) {
      this.close();
    }
  }

  removeSelectedItem(value) {
    this.selectedItems.delete(value);
    this.selectionOrder = this.selectionOrder.filter(item => item !== value);
    const option = Array.from(this.options).find(opt => opt.dataset.value === value);
    if (option) {
      option.classList.remove('select-option--selected');
    }
    this.updateHeader();
    this.updateDynamicElements();
    this.updateHiddenInput();
    this.config.onSelect(value, false);
    this.config.onChange(Array.from(this.selectedItems));
  }

  updateHeader() {
    this.headerText.textContent = this.getPlaceholderText();
  }

  updateHiddenInput() {
    this.hiddenInput.value = Array.from(this.selectedItems).join(',');
  }

  filterOptions(query) {
    const q = query.toLowerCase();
    let hasResults = false;

    this.options.forEach(opt => {
      if (this.config.hideSelectedFromList && this.selectedItems.has(opt.dataset.value)) {
        return;
      }
      const text = opt.querySelector('span:last-child').textContent.toLowerCase();
      opt.style.display = text.includes(q) ? '' : 'none';
      if (text.includes(q)) hasResults = true;
    });

    let empty = this.optionsContainer.querySelector('.select-empty');
    if (!hasResults && !empty) {
      empty = document.createElement('div');
      empty.className = 'select-empty';
      empty.textContent = 'Ничего не найдено';
      this.optionsContainer.appendChild(empty);
    } else if (hasResults && empty) {
      empty.remove();
    }
  }

  setMaxSelections(newValue) {
    if (newValue < 1) {
      console.error('Ошибка: maxSelections должен быть больше или равен 1.');
      return;
    }
    this.config.maxSelections = newValue;
    if (this.declensionHandler && this.config.declension.variable === 'maxSelections') {
      this.declensionHandler.value = newValue;
    }
    this.updateHeader();
  }

  setHideSelectedFromList(value) {
    this.config.hideSelectedFromList = value;
    this.updateDynamicElements();
  }
}
