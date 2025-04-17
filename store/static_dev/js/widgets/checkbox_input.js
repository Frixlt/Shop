// --"--\Catalog\store\static_dev\js\widgets\checkbox_input.js"--

/**
 * Выполняет валидацию одного чекбокса.
 * Проверяет, отмечен ли он, если установлен атрибут 'required'.
 * Отображает или скрывает сообщение об ошибке и добавляет/удаляет класс 'error' у контейнера
 * для стилизации самого инпута.
 * @param {HTMLInputElement} checkbox - Элемент input[type=checkbox].
 * @returns {boolean} - True, если чекбокс валиден, иначе false.
 */
function validateCheckbox(checkbox) {
  if (!checkbox) return true;

  const fieldContainer = checkbox.closest('.checkbox-field');
  if (!fieldContainer) return true;

  // Ищем ошибку ВНУТРИ контейнера
  const errorElement = fieldContainer.querySelector('.form-error');
  const isRequired = checkbox.hasAttribute('required');
  let isValid = true;
  let errorMessage = "";

  // Сначала сбрасываем состояние ошибки
  fieldContainer.classList.remove('error'); // Удаляем класс ошибки с контейнера (для стилизации инпута)
  if (errorElement) {
    errorElement.textContent = '';
    errorElement.style.display = 'none'; // Явно скрываем ошибку
    errorElement.classList.remove('shake');
  }

  // Проверка на required
  if (isRequired && !checkbox.checked) {
    isValid = false;
    errorMessage = checkbox.dataset.requiredMessage || "Необходимо согласие.";
  }

  // Отображаем ошибку и стилизуем контейнер, если невалидно
  if (!isValid) {
    fieldContainer.classList.add('error'); // Добавляем класс ошибки контейнеру (для стилизации инпута)
    if (errorElement) {
      errorElement.textContent = errorMessage;
      errorElement.style.display = 'block'; // Явно ПОКАЗЫВАЕМ ошибку
      errorElement.classList.add('shake');
      setTimeout(() => errorElement.classList.remove('shake'), 400);
    }
  }
  // Если валидно, ошибка уже скрыта на этапе сброса

  return isValid;
}

/**
* Инициализирует все чекбоксы на странице, добавляя обработчики событий
* для валидации при изменении и потере фокуса.
* Также добавляет обработчик клика на кастомный элемент и метку для имитации клика по скрытому чекбоксу.
*/
function initCheckboxes() {
  console.log("Initializing checkboxes...");
  document.querySelectorAll('.checkbox-input').forEach(checkbox => {
    const fieldContainer = checkbox.closest('.checkbox-field');
    const customCheckbox = fieldContainer?.querySelector('.checkbox-custom');
    const label = fieldContainer?.querySelector('.checkbox-label');

    // Валидация при изменении состояния
    checkbox.addEventListener('change', () => {
      validateCheckbox(checkbox);
    });

    // Валидация при потере фокуса (для консистентности)
    checkbox.addEventListener('blur', () => {
      validateCheckbox(checkbox);
    });

    // Имитация клика по скрытому чекбоксу при клике на кастомный элемент
    if (customCheckbox) {
      customCheckbox.addEventListener('click', () => {
        checkbox.click(); // Вызываем клик на скрытом инпуте
      });
      // Добавляем обработчик для Enter/Space на кастомном элементе для доступности
      customCheckbox.setAttribute('tabindex', '0'); // Делаем его фокусируемым
      customCheckbox.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          checkbox.click();
        }
      });
    }

    // Имитация клика по скрытому чекбоксу при клике на label (уже работает из-за for=)
    // Но можно добавить для надежности, если for не сработает
    // if (label) {
    //     label.addEventListener('click', (event) => {
    //        // Предотвращаем двойной клик, если label уже связан через for
    //        if (event.target.tagName !== 'A') { // Не перехватываем клики по ссылкам внутри
    //            // checkbox.click(); // Это может вызвать двойное срабатывание
    //        }
    //     });
    // }


    // Первоначальный сброс ошибки при загрузке
    if (fieldContainer) {
      const errorElement = fieldContainer.querySelector('.form-error'); // Ищем внутри
      if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none'; // Явно скрываем
      }
      fieldContainer.classList.remove('error'); // Убираем класс ошибки
    }
  });
  console.log("Checkboxes initialized.");
}

// Экспортируем функции
export { initCheckboxes, validateCheckbox };