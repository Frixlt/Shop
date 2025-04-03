export class ProductCardCarousel {
  constructor(cardElement) {
    this.card = cardElement;
    this.cardImgContainer = this.card.querySelector('.card-img-container');
    this.hoverArea = this.card.querySelector('.hover-area');
    this.imageTrack = this.card.querySelector('.image-track');
    this.indicators = this.card.querySelectorAll('.indicator');
    this.indicatorSlider = this.card.querySelector('.carousel-indicator-slider');
    this.totalSlides = this.imageTrack.children.length;
    this.currentSlide = 0;
  }

  init() {
    this.imageTrack.style.width = `${this.totalSlides * 100}%`;
    this.imageTrack.querySelectorAll('.image-container').forEach(container => {
      container.style.width = `${100 / this.totalSlides}%`;
    });
    this.indicatorSlider.style.width = `${100 / this.totalSlides}%`;
    this.attachEventListeners();
    this.updateCarousel(0, false);
  }

  updateCarousel(slideIndex, useTransition = false) {
    if (slideIndex < 0) slideIndex = 0;
    if (slideIndex >= this.totalSlides) slideIndex = this.totalSlides - 1;
    this.currentSlide = slideIndex;

    this.imageTrack.style.transition = useTransition ? 'transform 0.3s ease' : 'none';
    this.imageTrack.style.transform = `translateX(-${slideIndex * (100 / this.totalSlides)}%)`;

    this.indicators.forEach((ind, idx) => {
      ind.classList.toggle('active', idx === slideIndex);
    });
    this.indicatorSlider.style.transform = `translateX(${slideIndex * 100}%)`;
  }

  attachEventListeners() {
    this.hoverArea.addEventListener('mousemove', (e) => {
      const containerWidth = this.cardImgContainer.offsetWidth;
      const sectionWidth = containerWidth / this.totalSlides;
      const mouseX = e.offsetX;
      const slideIndex = Math.floor(mouseX / sectionWidth);
      this.updateCarousel(slideIndex, false);
    });

    this.hoverArea.addEventListener('mouseleave', () => {
      this.updateCarousel(0, false);
    });

    let startX = 0;
    let startY = 0;
    let isHorizontalSwipe = false;

    this.hoverArea.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isHorizontalSwipe = false;
    }, { passive: true });

    this.hoverArea.addEventListener('touchmove', (e) => {
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        e.preventDefault();
        isHorizontalSwipe = true;
      }
    }, { passive: false });

    this.hoverArea.addEventListener('touchend', (e) => {
      if (!isHorizontalSwipe) return;

      const endX = e.changedTouches[0].clientX;
      const diff = startX - endX;

      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          this.updateCarousel(this.currentSlide + 1, true);
        } else {
          this.updateCarousel(this.currentSlide - 1, true);
        }
      }
    }, { passive: true });

    this.indicators.forEach((indicator, index) => {
      indicator.addEventListener('click', () => this.updateCarousel(index, false));
    });
  }
}