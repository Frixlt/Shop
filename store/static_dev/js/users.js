// js/users.js
import { createFormField, initializeForms } from './modules/forms.js';
// import { CustomSelect, DeclensionHandler } from './modules/forms.js';

document.addEventListener('DOMContentLoaded', () => {
  // Инициализация форм
  initializeForms();
  // Инициализация всех селектов на странице
  console.log('Поиск селектов...');
  document.querySelectorAll('.select').forEach(select => {
    console.log('Найден селект:', select.id);
    try {
      const config = select.dataset.config ? JSON.parse(select.dataset.config) : {};
      new CustomSelect(`#${select.id}`, config);
    } catch (e) {
      console.error('Ошибка инициализации селекта:', select.id, e);
    }
  });
});