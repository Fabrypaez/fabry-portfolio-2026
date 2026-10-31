/*  ---------------------------------------------------
    Template Name: Videograph
    Description: Videograph videographer portfolio template
    Author: Colorlib
    Author URI: https://colorlib.com/
    Version: 3.0.0
---------------------------------------------------------  */

'use strict';

// ========================================
// Main Initialization
// ========================================
// The kit modules in js/kit/ start themselves: mobile-nav.js (menu dialog), video-dialog.js
// (.play-btn links), filter.js (portfolio [data-filter-grid]) and counters.js (.counter_num).
document.addEventListener('DOMContentLoaded', function() {

  // Logo in the mobile menu panel
  initMobileNavLogo();

  // Carousels (kit sliders.js + Swiper 14)
  initHeroSlider();
  initTestimonialSlider();
  initLatestSlider();
  initLogoCarousel();

  // Video links opened from file://
  initFileVideoLinks();

  // Current year in the footer
  initYear();

});

// ========================================
// Mobile menu: logo in the kit dialog's header
// ========================================
function initMobileNavLogo() {
  var head = document.querySelector('.kit-mobile-nav__head');
  var logo = document.querySelector('.header__logo img');
  if (!head || !logo) return;

  var wrap = document.createElement('div');
  wrap.className = 'mobile-nav__logo';
  var img = document.createElement('img');
  img.src = logo.getAttribute('src');
  img.alt = '';
  wrap.appendChild(img);
  head.insertBefore(wrap, head.firstChild);
}

// ========================================
// Hero Slider
// ========================================
function initHeroSlider() {
  if (!window.Kit || !Kit.sliders || !document.querySelector('.hero__slider')) return;

  Kit.sliders.create('.hero__slider', {
    loop: true,
    effect: 'fade',
    fadeEffect: { crossFade: true },
    speed: 1200,
    autoplay: { delay: 5000, disableOnInteraction: false },
    navigation: false,
    pagination: {
      renderBullet: function(index, className) {
        return '<span class="' + className + '">' + String(index + 1).padStart(2, '0') + '</span>';
      }
    }
  });
}

// ========================================
// Testimonial Slider
// ========================================
function initTestimonialSlider() {
  if (!window.Kit || !Kit.sliders || !document.querySelector('.testimonial__slider')) return;

  Kit.sliders.create('.testimonial__slider', {
    loop: true,
    speed: 1200,
    autoplay: { delay: 5000, disableOnInteraction: false },
    navigation: false,
    breakpoints: {
      320: { slidesPerView: 1, spaceBetween: 20 },
      768: { slidesPerView: 2, spaceBetween: 20 },
      992: { slidesPerView: 3, spaceBetween: 0 }
    }
  });
}

// ========================================
// Latest Blog Slider
// ========================================
function initLatestSlider() {
  if (!window.Kit || !Kit.sliders || !document.querySelector('.latest__slider')) return;

  Kit.sliders.create('.latest__slider', {
    loop: true,
    speed: 1200,
    autoplay: { delay: 5000, disableOnInteraction: false },
    navigation: false,
    breakpoints: {
      320: { slidesPerView: 1, spaceBetween: 20 },
      768: { slidesPerView: 2, spaceBetween: 20 },
      992: { slidesPerView: 3, spaceBetween: 0 }
    }
  });
}

// ========================================
// Logo Carousel
// ========================================
function initLogoCarousel() {
  if (!window.Kit || !Kit.sliders || !document.querySelector('.logo__carousel')) return;

  Kit.sliders.create('.logo__carousel', {
    loop: true,
    speed: 1200,
    autoplay: { delay: 3000, disableOnInteraction: false },
    navigation: false,
    pagination: false,
    breakpoints: {
      320: { slidesPerView: 2, spaceBetween: 30 },
      480: { slidesPerView: 3, spaceBetween: 50 },
      768: { slidesPerView: 4, spaceBetween: 80 },
      992: { slidesPerView: 5, spaceBetween: 100 }
    }
  });
}

// ========================================
// Video links from file://
// ========================================
// YouTube refuses to play embeds on pages opened straight from disk (no referrer), so there
// the links open the video on YouTube/Vimeo in a new tab instead of the kit's dialog.
function initFileVideoLinks() {
  if (window.location.protocol !== 'file:') return;

  document.querySelectorAll('.play-btn').forEach(function(link) {
    link.setAttribute('data-video', 'false');
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener');
  });
}

// ========================================
// Footer year
// ========================================
function initYear() {
  document.querySelectorAll('.js-year').forEach(function(el) {
    el.textContent = new Date().getFullYear();
  });
}
