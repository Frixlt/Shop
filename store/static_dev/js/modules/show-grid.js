export function initGridOverlay() {
  const PARAMS = {
    showGrid: false,
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

  window.addEventListener('resize', updateGridOverlay);
  window.addEventListener('scroll', updateGridOverlay);

  return {
    setShowGrid: (value) => {
      PARAMS.showGrid = value;
      updateGridOverlay();
    }
  };
}