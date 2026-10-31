/*!
 * Colorlib kit: sliders.js (needs Swiper 14: vendor/swiper/14.3.0/swiper-bundle.min.js + .css,
 * plus css/sliders.css)
 *
 * Replaces Owl Carousel 2 and Slick with Swiper, without rewriting the slider markup.
 *
 * 1. Declarative (auto-initialised on DOMContentLoaded):
 *      <div class="home-slider owl-carousel" data-owl='{"items":1,"loop":true,"nav":true}'>…</div>
 *      <div class="slider-active" data-slick='{"fade":true,"autoplay":true}'>…</div>
 *      <div class="my-slider" data-slider='{"slidesPerView":3,"loop":true}'>…</div>   (Swiper params)
 *    data-owl / data-slick take the ORIGINAL plugin options (copy the object from the old main.js
 *    and JSON-quote it). data-slider takes Swiper params.
 *
 * 2. From a template's main.js, passing the old option object unchanged:
 *      Kit.sliders.fromOwl('.carousel-testimony', { center: true, loop: true, items: 1, margin: 30,
 *        responsive: { 0: { items: 1 }, 600: { items: 2 }, 1000: { items: 3 } } });
 *      Kit.sliders.fromSlick('.slider-active', { autoplay: true, fade: true, prevArrow: '<button …>' });
 *      Kit.sliders.create('.images-carousel', { slidesPerView: 3, … });                (Swiper params)
 *
 * The existing children become slides at runtime (Kit.sliders.wrap). Owl/Slick compat mode also
 * rebuilds the class names the theme CSS targets (.owl-stage-outer, .owl-item.active, .owl-nav
 * button.owl-prev, .owl-dots .owl-dot.active / .slick-list, .slick-slide.slick-active,
 * .slick-prev, .slick-dots li.slick-active), so theme styles keep working.
 *
 * Also: slide captions with data-animation="fadeInUp" data-delay=".4s" (the Slick hero pattern)
 * re-animate on every slide change when reveal.css is present.
 *
 * Accessibility: real <button>s with labels, Swiper's A11y module, autoplay pauses on hover and
 * on keyboard focus. prefers-reduced-motion: no autoplay, no transition, no caption animation.
 * Loop: Owl cloned slides, Swiper 14 needs enough real ones; when there are too few for the
 * widest breakpoint the slider rewinds (last -> first) instead of warning and misbehaving.
 * cloneForLoop: true (in data-owl / data-slick / data-slider, the options passed to fromOwl /
 * fromSlick / create, or KitConfig.sliders.cloneForLoop) clones the slides instead, until Swiper can
 * loop, so N slides at N per view keep looping as Owl did (Alime). The copies get .kit-clone and
 * lose their ids; the dots still count the real slides only.
 */
(function () {
  'use strict';

  const Kit = (window.Kit = window.Kit || {});
  if (Kit.sliders) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const cfg = (window.KitConfig && window.KitConfig.sliders) || {};
  const instances = [];

  const $all = (target) =>
    typeof target === 'string' ? Array.from(document.querySelectorAll(target))
      : target instanceof Element ? [target] : Array.from(target || []);

  const htmlToEl = (html) => {
    const t = document.createElement('template');
    t.innerHTML = String(html).trim();
    return t.content.firstElementChild;
  };

  const isPlainObject = (v) => v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Element);
  function merge(target, ...sources) {
    sources.forEach((src) => {
      Object.keys(src || {}).forEach((k) => {
        if (isPlainObject(src[k])) target[k] = merge({}, isPlainObject(target[k]) ? target[k] : {}, src[k]); // deep copy
        else target[k] = src[k];
      });
    });
    return target;
  }

  /* ------------------------------------------------------------------ option mapping */

  const OWL_DEFAULTS = {
    items: 3, margin: 0, loop: false, center: false, rewind: false, mouseDrag: true, touchDrag: true,
    nav: false, dots: true, autoplay: false, autoplayTimeout: 5000, autoplayHoverPause: false,
    smartSpeed: 250, autoplaySpeed: false, navSpeed: false, autoWidth: false, autoHeight: false,
    slideBy: 1, startPosition: 0, animateOut: false, stagePadding: 0,
    navText: ['<span aria-hidden="true">&#x2039;</span>', '<span aria-hidden="true">&#x203a;</span>'],
  };

  function owlLevel(o) {
    // One Owl option set (base or a responsive entry) -> the Swiper params it controls.
    const s = {};
    if ('items' in o || 'autoWidth' in o) s.slidesPerView = o.autoWidth ? 'auto' : Number(o.items) || 1;
    if ('margin' in o) s.spaceBetween = Number(o.margin) || 0;
    if ('center' in o) s.centeredSlides = !!o.center;
    if ('nav' in o) s.navigation = { enabled: !!o.nav };
    if ('dots' in o) s.pagination = { enabled: !!o.dots };
    if ('stagePadding' in o && o.stagePadding) { s.slidesOffsetBefore = o.stagePadding; s.slidesOffsetAfter = o.stagePadding; }
    if ('slideBy' in o) s.slidesPerGroup = o.slideBy === 'page' ? (Number(o.items) || 1) : Number(o.slideBy) || 1;
    return s;
  }

  /** Owl Carousel 2 options -> Swiper params. Owl defaults apply (items: 3, dots: true). */
  function owlToSwiper(owl) {
    const o = Object.assign({}, OWL_DEFAULTS, owl || {});
    const responsive = o.responsive || {};
    // Owl's responsive[0] is really the base.
    if (responsive[0]) Object.assign(o, responsive[0]);

    const s = Object.assign(owlLevel(o), {
      loop: !!o.loop,
      rewind: !!o.rewind && !o.loop,
      speed: Number(o.autoplay && o.autoplaySpeed ? o.autoplaySpeed : o.smartSpeed) || 250,
      autoHeight: !!o.autoHeight,
      initialSlide: Number(o.startPosition) || 0,
      allowTouchMove: o.mouseDrag !== false || o.touchDrag !== false,
      simulateTouch: o.mouseDrag !== false,
      autoplay: o.autoplay ? { delay: Number(o.autoplayTimeout) || 5000, pauseOnMouseEnter: !!o.autoplayHoverPause, disableOnInteraction: false } : false,
    });
    // animateOut ('fadeOut') was Owl's way of fading single-item sliders.
    if (o.animateOut && (Number(o.items) || 1) === 1) {
      s.effect = 'fade';
      s.fadeEffect = { crossFade: true };
    }

    // Owl breakpoints are min-width and NOT cumulative (each merges over the base only).
    // Emit every key used by any breakpoint in every breakpoint, so Swiper behaves the same.
    const bps = Object.keys(responsive).map(Number).filter((n) => n > 0).sort((a, b) => a - b);
    if (bps.length) {
      const levels = bps.map((bp) => owlLevel(Object.assign({}, o, responsive[bp])));
      const keys = new Set();
      levels.forEach((l) => Object.keys(l).forEach((k) => keys.add(k)));
      s.breakpoints = {};
      bps.forEach((bp, i) => {
        const full = {};
        keys.forEach((k) => { full[k] = k in levels[i] ? levels[i][k] : s[k]; });
        s.breakpoints[bp] = full;
      });
    }
    s._navText = o.navText;
    return s;
  }

  const SLICK_DEFAULTS = {
    slidesToShow: 1, slidesToScroll: 1, infinite: true, arrows: true, dots: false, autoplay: false,
    autoplaySpeed: 3000, speed: 300, fade: false, centerMode: false, variableWidth: false,
    adaptiveHeight: false, pauseOnHover: true, vertical: false, initialSlide: 0, draggable: true,
    swipe: true, mobileFirst: false,
  };

  function slickLevel(o) {
    if (o === 'unslick') return { enabled: false };
    const s = {};
    if ('slidesToShow' in o || 'variableWidth' in o) s.slidesPerView = o.variableWidth ? 'auto' : Number(o.slidesToShow) || 1;
    if ('slidesToScroll' in o) s.slidesPerGroup = Number(o.slidesToScroll) || 1;
    if ('centerMode' in o) s.centeredSlides = !!o.centerMode;
    if ('arrows' in o) s.navigation = { enabled: !!o.arrows };
    if ('dots' in o) s.pagination = { enabled: !!o.dots };
    if ('infinite' in o) s.loop = !!o.infinite;
    s.enabled = true;
    return s;
  }

  /** Slick options -> Swiper params. Slick breakpoints are max-width (desktop-first); converted. */
  function slickToSwiper(slick) {
    const o = Object.assign({}, SLICK_DEFAULTS, slick || {});
    const base = Object.assign(slickLevel(o), {
      speed: Number(o.speed) || 300,
      autoHeight: !!o.adaptiveHeight,
      direction: o.vertical ? 'vertical' : 'horizontal',
      initialSlide: Number(o.initialSlide) || 0,
      allowTouchMove: o.swipe !== false,
      simulateTouch: o.draggable !== false,
      autoplay: o.autoplay ? { delay: Number(o.autoplaySpeed) || 3000, pauseOnMouseEnter: o.pauseOnHover !== false, disableOnInteraction: false } : false,
    });
    if (o.fade) { base.effect = 'fade'; base.fadeEffect = { crossFade: true }; }

    const list = (o.responsive || []).filter((r) => r && r.breakpoint).map((r) => ({
      bp: Number(r.breakpoint),
      level: r.settings === 'unslick' ? { enabled: false } : slickLevel(Object.assign({}, o, r.settings)),
    })).sort((a, b) => a.bp - b.bp);

    if (list.length) {
      const baseLevel = slickLevel(o);
      const keys = new Set(Object.keys(baseLevel));
      list.forEach((l) => Object.keys(l.level).forEach((k) => keys.add(k)));
      const full = (level) => { const f = {}; keys.forEach((k) => { f[k] = k in level ? level[k] : baseLevel[k]; }); return f; };
      base.breakpoints = {};
      if (o.mobileFirst) {
        // Slick: width > bp. Swiper: width >= bp.
        list.forEach((l) => { base.breakpoints[l.bp + 1] = full(l.level); });
      } else {
        // width < bp1 -> settings(bp1); [bp_i, bp_i+1) -> settings(bp_i+1); >= bp_n -> base.
        Object.assign(base, full(list[0].level));
        list.forEach((l, i) => { base.breakpoints[l.bp] = full(i + 1 < list.length ? list[i + 1].level : baseLevel); });
      }
    }
    base._prevArrow = o.prevArrow;
    base._nextArrow = o.nextArrow;
    base._arrows = o.arrows !== false || (o.responsive || []).some((r) => r.settings && r.settings.arrows);
    base._dots = !!o.dots || (o.responsive || []).some((r) => r.settings && r.settings.dots);
    return base;
  }

  /* ------------------------------------------------------------------ markup */

  /**
   * Turns a plain container into Swiper markup at runtime.
   *   compat 'owl'  : .owl-carousel > .swiper.owl-stage-outer > .swiper-wrapper.owl-stage > .swiper-slide.owl-item > (original child)
   *   compat 'slick': .slick-slider > .swiper.slick-list > .swiper-wrapper.slick-track > (original child).swiper-slide.slick-slide
   *   none          : container.swiper > .swiper-wrapper > (original child).swiper-slide
   * Markup that already has .swiper-wrapper is left alone (the build-time route).
   * Returns { root, swiperEl }: root holds nav/dots, swiperEl is what Swiper is created on.
   */
  function wrap(el, compat) {
    if (el.querySelector(':scope > .swiper-wrapper')) return { root: el, swiperEl: el };
    if (el.querySelector(':scope > .swiper > .swiper-wrapper')) return { root: el, swiperEl: el.querySelector(':scope > .swiper') };

    const children = Array.from(el.children);
    const wrapper = document.createElement('div');
    wrapper.className = 'swiper-wrapper';

    if (compat === 'owl') {
      const stageOuter = document.createElement('div');
      stageOuter.className = 'swiper owl-stage-outer';
      wrapper.classList.add('owl-stage');
      children.forEach((child) => {
        const item = document.createElement('div');
        item.className = 'swiper-slide owl-item';
        item.appendChild(child);
        wrapper.appendChild(item);
      });
      stageOuter.appendChild(wrapper);
      el.appendChild(stageOuter);
      el.classList.add('owl-carousel', 'owl-loaded', 'kit-owl');
      return { root: el, swiperEl: stageOuter };
    }

    if (compat === 'slick') {
      const list = document.createElement('div');
      list.className = 'swiper slick-list';
      wrapper.classList.add('slick-track');
      children.forEach((child) => { child.classList.add('swiper-slide', 'slick-slide'); wrapper.appendChild(child); });
      list.appendChild(wrapper);
      el.appendChild(list);
      el.classList.add('slick-slider', 'slick-initialized', 'kit-slick');
      return { root: el, swiperEl: list };
    }

    children.forEach((child) => { child.classList.add('swiper-slide'); wrapper.appendChild(child); });
    el.appendChild(wrapper);
    el.classList.add('swiper');
    return { root: el, swiperEl: el };
  }

  function makeButton(html, fallbackClass, label) {
    let btn = html ? htmlToEl(html) : null;
    if (!btn || btn.tagName !== 'BUTTON') {
      const inner = btn;
      btn = document.createElement('button');
      btn.className = fallbackClass;
      if (inner) btn.appendChild(inner);
    }
    btn.type = 'button';
    if (!btn.getAttribute('aria-label')) btn.setAttribute('aria-label', label);
    return btn;
  }

  /* ------------------------------------------------------------------ behaviour */

  function maxSlidesPerView(params) {
    const values = [params.slidesPerView];
    Object.values(params.breakpoints || {}).forEach((b) => { if (b.slidesPerView != null) values.push(b.slidesPerView); });
    return Math.max(...values.map((v) => (v === 'auto' ? 1 : Math.ceil(Number(v) || 1))));
  }

  /** Slides Swiper 14 needs to loop at the widest breakpoint (0: the slider does not loop). */
  function loopNeed(params) {
    const loops = params.loop || Object.values(params.breakpoints || {}).some((b) => b.loop);
    if (!loops) return 0;
    let spv = maxSlidesPerView(params);
    const centered = params.centeredSlides || Object.values(params.breakpoints || {}).some((b) => b.centeredSlides);
    if (centered && spv % 2 === 0) spv += 1;
    const group = Math.max(1, Number(params.slidesPerGroup) || 1);
    const looped = centered ? Math.max(group, Math.ceil(spv / 2)) : group;
    return spv + looped;
  }

  /** cloneForLoop: append copies of the slides (ids removed) until Swiper can loop. Returns the new count. */
  function cloneForLoop(swiperEl, need, count) {
    const wrapper = swiperEl.querySelector(':scope > .swiper-wrapper');
    const originals = Array.from(wrapper.children);
    let n = count;
    while (originals.length && n < need) {
      originals.forEach((slide) => {
        const c = slide.cloneNode(true);
        c.classList.add('kit-clone');
        [c, ...c.querySelectorAll('[id]')].forEach((e) => e.removeAttribute('id'));
        wrapper.appendChild(c);
        n += 1;
      });
    }
    return n;
  }

  /** Swiper 14's own loop rule; Owl cloned slides instead, so few-slide carousels rewind. */
  function fixLoop(params, slideCount) {
    const need = loopNeed(params);
    if (need && slideCount < need) {
      params.loop = false;
      params.rewind = true;
      Object.values(params.breakpoints || {}).forEach((b) => { delete b.loop; });
    }
  }

  function syncCompatClasses(swiper, compat) {
    const active = compat === 'owl' ? 'active' : 'slick-active';
    const centerCls = compat === 'owl' ? 'center' : 'slick-center';
    swiper.slides.forEach((slide, i) => {
      const visible = slide.classList.contains('swiper-slide-visible') || i === swiper.activeIndex;
      slide.classList.toggle(active, visible);
      slide.classList.toggle(centerCls, !!swiper.params.centeredSlides && i === swiper.activeIndex);
      if (compat === 'slick') slide.classList.toggle('slick-current', i === swiper.activeIndex);
    });
  }

  const isOn = (v) => v !== false && !(v && v.enabled === false);

  /**
   * Swiper replaces the whole `navigation`/`pagination` object when a breakpoint sets one (losing
   * its class-name defaults), so per-breakpoint arrows/dots are handled here instead: strip them
   * from the params and remember which widths show them.
   */
  function controlPlan(p) {
    const plan = { base: { nav: isOn(p.navigation), dots: isOn(p.pagination) }, bps: [] };
    Object.keys(p.breakpoints || {}).map(Number).sort((a, b) => a - b).forEach((bp) => {
      const b = p.breakpoints[bp];
      const entry = { bp };
      if ('navigation' in b) { entry.nav = isOn(b.navigation); delete b.navigation; }
      if ('pagination' in b) { entry.dots = isOn(b.pagination); delete b.pagination; }
      plan.bps.push(entry);
    });
    plan.anyNav = plan.base.nav || plan.bps.some((e) => e.nav);
    plan.anyDots = plan.base.dots || plan.bps.some((e) => e.dots);
    return plan;
  }

  function planAt(plan) {
    const w = window.innerWidth; // Swiper's breakpointsBase: 'window'
    const now = Object.assign({}, plan.base);
    plan.bps.forEach((e) => { if (w >= e.bp) { if ('nav' in e) now.nav = e.nav; if ('dots' in e) now.dots = e.dots; } });
    return now;
  }

  function toggleControls(root, plan) {
    const now = planAt(plan);
    (root._kitNavEls || []).forEach((el) => { el.style.display = now.nav ? '' : 'none'; el.classList.toggle('kit-controls-off', !now.nav); });
    (root._kitDotsEls || []).forEach((el) => { el.style.display = now.dots ? '' : 'none'; el.classList.toggle('kit-controls-off', !now.dots); });
  }

  function animateCaptions(swiper) {
    // Needs reveal.js + reveal.css (they own the effect vocabulary and the hidden state).
    if (reduceMotion.matches || !Kit.reveal) return;
    const effectFor = Kit.reveal.effectFor;
    document.documentElement.classList.add('kit-reveal-on');
    swiper.slides.forEach((slide, i) => {
      const els = slide.querySelectorAll('[data-animation]');
      if (!els.length) return;
      els.forEach((el) => {
        if (i !== swiper.activeIndex) { el.classList.remove('is-revealed'); return; }
        el.setAttribute('data-kit-reveal', effectFor(el.dataset.animation));
        const delay = el.dataset.delay || el.dataset.animationDelay;
        if (delay) el.style.setProperty('--kit-reveal-el-delay', /ms$/.test(delay) ? delay : (parseFloat(delay) * (/s$/.test(delay) ? 1000 : 1)) + 'ms');
        el.classList.remove('is-revealed');
        void el.offsetWidth; // restart the transition
        el.classList.add('is-revealed');
      });
    });
  }

  /**
   * Creates a Swiper on `target` (selector, element or list).
   * extra: { compat: 'owl'|'slick'|null, navText: [prevHtml, nextHtml], prevArrow, nextArrow }
   */
  function create(target, params, extra) {
    if (typeof window.Swiper !== 'function') {
      console.warn('[kit/sliders] Swiper is not loaded; sliders stay static.');
      return [];
    }
    extra = extra || {};
    return $all(target).map((el) => {
      if (el.kitSwiper) return el.kitSwiper;
      const compat = extra.compat || null;
      const p = merge({}, params || {});
      const plan = controlPlan(p);
      const wantsNav = plan.anyNav && (extra.compat !== 'slick' || extra.arrows !== false);
      const wantsDots = plan.anyDots;
      // Controls are always "enabled" for Swiper; visibility per width is ours (toggleControls).
      if (p.navigation && typeof p.navigation === 'object') delete p.navigation.enabled;
      if (p.pagination && typeof p.pagination === 'object') delete p.pagination.enabled;

      const { root, swiperEl } = wrap(el, compat);
      let slideCount = swiperEl.querySelectorAll(':scope > .swiper-wrapper > *').length;
      const realCount = slideCount;
      const wantsClones = 'cloneForLoop' in p ? !!p.cloneForLoop : 'cloneForLoop' in extra ? !!extra.cloneForLoop : !!cfg.cloneForLoop;
      delete p.cloneForLoop;
      if (wantsClones && slideCount && slideCount < loopNeed(p)) slideCount = cloneForLoop(swiperEl, loopNeed(p), slideCount);
      const cloned = slideCount > realCount;

      // Navigation
      if (wantsNav && !(p.navigation && p.navigation.nextEl)) {
        let prev, next;
        if (compat === 'owl') {
          const text = extra.navText || OWL_DEFAULTS.navText;
          const nav = document.createElement('div');
          nav.className = 'owl-nav';
          prev = makeButton(null, 'owl-prev', 'Previous slide');
          next = makeButton(null, 'owl-next', 'Next slide');
          prev.innerHTML = text[0];
          next.innerHTML = text[1];
          nav.append(prev, next);
          root.appendChild(nav);
          root._kitNavEls = [nav];
        } else if (compat === 'slick') {
          prev = makeButton(extra.prevArrow, 'slick-prev slick-arrow', 'Previous slide');
          next = makeButton(extra.nextArrow, 'slick-next slick-arrow', 'Next slide');
          if (!extra.prevArrow) prev.textContent = 'Previous';
          if (!extra.nextArrow) next.textContent = 'Next';
          prev.classList.add('slick-arrow');
          next.classList.add('slick-arrow');
          root.insertBefore(prev, swiperEl);
          root.appendChild(next);
          root._kitNavEls = [prev, next];
        } else {
          prev = root.querySelector(':scope > .swiper-button-prev') || makeButton(null, 'swiper-button-prev', 'Previous slide');
          next = root.querySelector(':scope > .swiper-button-next') || makeButton(null, 'swiper-button-next', 'Next slide');
          if (!prev.parentNode) root.append(prev, next);
          root._kitNavEls = [prev, next];
        }
        p.navigation = Object.assign({}, p.navigation || {}, { prevEl: prev, nextEl: next });
        if (compat) {
          Object.assign(p.navigation, { disabledClass: 'disabled', lockClass: 'kit-nav-lock', hiddenClass: 'kit-nav-hidden',
            navigationDisabledClass: 'kit-navigation-disabled', addIcons: false });
        }
      } else if (!wantsNav) {
        p.navigation = false;
      }

      // Pagination
      if (wantsDots && !(p.pagination && p.pagination.el)) {
        let pag;
        const pagParams = { clickable: true };
        // Compat dots keep the theme's look: Swiper's modifier classes would pull in its CSS.
        const neutral = { modifierClass: 'kit-pagination-', horizontalClass: 'kit-pagination-horizontal',
          verticalClass: 'kit-pagination-vertical', clickableClass: 'kit-pagination-clickable', lockClass: 'kit-pagination-lock' };
        if (compat === 'owl') {
          pag = document.createElement('div');
          pag.className = 'owl-dots';
          Object.assign(pagParams, neutral, {
            bulletClass: 'owl-dot', bulletActiveClass: 'active',
            renderBullet: (i, cls) => `<button type="button" class="${cls}" aria-label="Go to slide ${i + 1}"><span></span></button>`,
          });
          root.appendChild(pag);
        } else if (compat === 'slick') {
          pag = document.createElement('ul');
          pag.className = 'slick-dots';
          Object.assign(pagParams, neutral, {
            bulletClass: 'kit-slick-dot', bulletActiveClass: 'slick-active',
            renderBullet: (i, cls) => `<li class="${cls}"><button type="button" aria-label="Go to slide ${i + 1}">${i + 1}</button></li>`,
          });
          root.appendChild(pag);
        } else {
          pag = root.querySelector(':scope > .swiper-pagination, .swiper-pagination');
          if (!pag) { pag = document.createElement('div'); pag.className = 'swiper-pagination'; root.appendChild(pag); }
        }
        root._kitDotsEls = [pag];
        p.pagination = Object.assign(pagParams, p.pagination || {}, { el: pag });
      } else if (!wantsDots) {
        p.pagination = false;
      }

      fixLoop(p, slideCount);

      if (compat) p.watchSlidesProgress = true; // needed to mirror .active on every visible slide
      p.a11y = Object.assign({ enabled: true }, p.a11y || {});
      if (reduceMotion.matches) { p.autoplay = false; p.speed = 0; }

      const userOn = p.on || {};
      p.on = Object.assign({}, userOn, {
        init(sw) {
          if (compat) syncCompatClasses(sw, compat);
          toggleControls(root, plan);
          animateCaptions(sw);
          userOn.init && userOn.init(sw);
        },
      });

      const swiper = new window.Swiper(swiperEl, p);
      if (compat) {
        swiper.on('slideChange transitionEnd resize progress', () => syncCompatClasses(swiper, compat));
      }
      swiper.on('resize breakpoint', () => toggleControls(root, plan));
      // Clones: one dot per real slide (the dot of a copy's original is the active one).
      if (cloned && swiper.pagination && swiper.params.pagination && swiper.params.pagination.el) {
        const activeCls = (swiper.params.pagination.bulletActiveClass || 'swiper-pagination-bullet-active').split(' ');
        const bulletCls = swiper.params.pagination.bulletClass || 'swiper-pagination-bullet';
        const fixDots = () => {
          const pagEl = swiper.pagination.el;
          if (!pagEl) return;
          const bullets = Array.from(pagEl.querySelectorAll('.' + bulletCls.split(' ')[0]));
          const active = swiper.realIndex % realCount;
          bullets.forEach((b, i) => {
            b.hidden = i >= realCount;
            if (i < realCount) activeCls.forEach((c) => b.classList.toggle(c, i === active));
          });
        };
        swiper.on('paginationRender paginationUpdate slideChange', fixDots);
        fixDots();
      }
      swiper.on('slideChangeTransitionStart', () => animateCaptions(swiper));

      // Autoplay pauses while keyboard focus is inside (WCAG 2.2.2).
      if (swiper.params.autoplay && swiper.params.autoplay.enabled) {
        root.addEventListener('focusin', () => swiper.autoplay.running && swiper.autoplay.pause());
        root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) swiper.autoplay.resume(); });
      }

      el.kitSwiper = swiper;
      instances.push(swiper);
      return swiper;
    });
  }

  function fromOwl(target, owlOptions) {
    const params = owlToSwiper(owlOptions);
    const navText = params._navText;
    delete params._navText;
    const extra = { compat: 'owl', navText };
    if (owlOptions && 'cloneForLoop' in owlOptions) extra.cloneForLoop = !!owlOptions.cloneForLoop;
    return create(target, params, extra);
  }

  function fromSlick(target, slickOptions) {
    const params = slickToSwiper(slickOptions);
    const extra = { compat: 'slick', prevArrow: params._prevArrow, nextArrow: params._nextArrow, arrows: params._arrows };
    if (slickOptions && 'cloneForLoop' in slickOptions) extra.cloneForLoop = !!slickOptions.cloneForLoop;
    ['_prevArrow', '_nextArrow', '_arrows', '_dots'].forEach((k) => delete params[k]);
    return create(target, params, extra);
  }

  function parseJSON(el, attr) {
    const raw = el.getAttribute(attr);
    if (!raw || !raw.trim()) return {};
    try { return JSON.parse(raw); } catch (e) {
      console.warn(`[kit/sliders] ${attr} is not valid JSON on`, el, e);
      return {};
    }
  }

  function init() {
    document.querySelectorAll('[data-owl]').forEach((el) => fromOwl(el, parseJSON(el, 'data-owl')));
    document.querySelectorAll('[data-slick]').forEach((el) => fromSlick(el, parseJSON(el, 'data-slick')));
    document.querySelectorAll('[data-slider]').forEach((el) => {
      const p = Object.assign({ slidesPerView: 1, spaceBetween: 0 }, parseJSON(el, 'data-slider'));
      create(el, p);
    });
  }

  Kit.sliders = { init, create, fromOwl, fromSlick, wrap, owlToSwiper, slickToSwiper, instances };

  if (cfg.autoInit === false) return;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
