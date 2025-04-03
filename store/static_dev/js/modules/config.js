import { Pane } from '../../packets/tweakpane/tweakpane-4.0.5.js';

const PARAMS = {
  theme: 'system',
  showGrid: false,
};

const pane = new Pane({ title: 'Config', expanded: true });

const updateTheme = () => {
  const htmlElement = document.documentElement;
  if (PARAMS.theme === 'system') {
    htmlElement.removeAttribute('data-theme');
  } else {
    htmlElement.setAttribute('data-theme', PARAMS.theme);
  }
  document.body.style.transition = 'none';
  document.body.offsetHeight; // Force reflow
  document.body.style.transition = 'all 0.3s ease';
};

const updateGridOverlay = () => {
  const overlay = document.querySelector('.overlay-grid');
  const areas = overlay.querySelectorAll('div[data-area]');
  const elements = {
    header: document.querySelector('header'),
    nav: document.querySelector('nav'),
    section: document.querySelector('section'),
    aside: document.querySelector('aside'),
    footer: document.querySelector('footer'),
  };

  if (PARAMS.showGrid) {
    overlay.style.display = 'block';
    areas.forEach(area => {
      const targetElement = elements[area.dataset.area];
      if (targetElement && targetElement.offsetParent !== null && targetElement.offsetWidth > 0) {
        const rect = targetElement.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const isVisible = rect.top < viewportHeight && rect.bottom > 0;

        if (isVisible) {
          area.style.display = 'flex';
          area.style.left = `${rect.left + window.scrollX}px`;
          area.style.top = `${rect.top + window.scrollY}px`;
          area.style.width = `${rect.width}px`;
          area.style.height = `${rect.height}px`;
        } else {
          area.style.display = 'none';
        }
      } else {
        area.style.display = 'none';
      }
    });
  } else {
    overlay.style.display = 'none';
  }
};

pane.addBinding(PARAMS, 'theme', {
  label: 'Theme',
  options: { System: 'system', Light: 'light', Dark: 'dark' },
}).on('change', updateTheme);

pane.addBinding(PARAMS, 'showGrid', {
  label: 'Show Old Grid',
}).on('change', updateGridOverlay);

window.addEventListener('resize', updateGridOverlay);
window.addEventListener('scroll', updateGridOverlay);

updateTheme();
updateGridOverlay();