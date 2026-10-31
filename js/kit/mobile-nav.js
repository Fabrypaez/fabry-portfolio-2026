/*!
 * Colorlib kit: mobile-nav.js (no dependencies; pairs with css/mobile-nav.css)
 *
 * 1. Mobile menu: replaces SlickNav and the hand-rolled "clone the nav into an offcanvas" scripts
 *    (.site-mobile-menu / .js-clone-nav / body.offcanvas-menu) with a native modal <dialog> that
 *    slides in from the side. Use Bootstrap's navbar collapse or .offcanvas instead when the
 *    template already has Bootstrap navbar markup; this is for designs built without it.
 *
 *    Sources (first match wins): [data-mobile-nav-source] · .js-clone-nav (all of them) ·
 *    ul#navigation (SlickNav default) · .mobile-menu (SlickNav in an offcanvas wrapper).
 *    Toggles: [data-mobile-nav-toggle] · .js-menu-toggle · .canvas__open · .slicknav_btn. When a
 *    template has none (SlickNav made its own), a hamburger is added to [data-mobile-nav-mount] or
 *    .mobile_menu, using SlickNav's class names (.slicknav_menu > .slicknav_btn > .slicknav_icon-bar)
 *    so the theme's button styles still apply.
 *    Options: data-mobile-nav-side="left|right" and data-mobile-nav-label="Menu" on the source,
 *    or window.KitConfig = { mobileNav: { breakpoint: 992, side: 'right', source: '#nav' } }.
 *
 *    Behaviour: showModal() makes the page behind inert; Tab/Shift+Tab wrap inside the panel;
 *    Esc, the close button, a backdrop click, following a link, or growing past `breakpoint`
 *    close it; focus returns to the toggle. Submenus get a disclosure button (aria-expanded);
 *    a parent link with href="#" toggles its submenu (SlickNav's default).
 *
 * 2. Sticky header: [data-sticky-header] (+ data-sticky-offset="120" data-sticky-class="is-sticky",
 *    data-sticky-placeholder to reserve the header's height while it is fixed: empty = min-height on
 *    the parent when the header is its only child, else a spacer of the header's own height inserted
 *    before it; "spacer" = always the spacer; a selector = min-height on that element), .header-sticky
 *    (adds .sticky-bar after 400px, as the SlickNav themes did) and .ftco_navbar (adds
 *    .scrolled > 150px, .awake > 350px, .sleep on the way back, as the ftco themes did).
 */
(function () {
  'use strict';

  const Kit = (window.Kit = window.Kit || {});
  if (Kit.mobileNav) return;

  const cfg = Object.assign({ breakpoint: 992, side: 'right', label: 'Menu' }, (window.KitConfig && window.KitConfig.mobileNav) || {});
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  let uid = 0;

  /* ================================================================== mobile menu */

  function findSources() {
    if (cfg.source) return Array.from(document.querySelectorAll(cfg.source));
    for (const sel of ['[data-mobile-nav-source]', '.js-clone-nav', 'ul#navigation', '.mobile-menu']) {
      const found = Array.from(document.querySelectorAll(sel));
      if (found.length) return found;
    }
    return [];
  }

  function cloneList(source) {
    const clone = source.cloneNode(true);
    clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    clone.removeAttribute('id');
    clone.querySelectorAll('[data-bs-toggle], [data-toggle]').forEach((el) => {
      el.removeAttribute('data-bs-toggle'); el.removeAttribute('data-toggle'); el.removeAttribute('aria-expanded'); el.removeAttribute('role');
    });
    // Desktop-only visibility helpers would hide the clone.
    [clone, ...clone.querySelectorAll('*')].forEach((el) => {
      el.classList.remove('d-none', 'd-lg-block', 'd-md-block', 'd-xl-block', 'd-lg-flex', 'dropdown-menu', 'show');
    });
    // Always end up with a <ul> (a <nav> or wrapper source contributes its lists).
    const lists = clone.tagName === 'UL' || clone.tagName === 'OL' ? [clone] : Array.from(clone.querySelectorAll(':scope ul, :scope ol')).filter((ul) => !ul.parentElement.closest('ul, ol'));
    return lists.length ? lists : [clone];
  }

  function wireSubmenus(list) {
    list.querySelectorAll('li').forEach((li) => {
      const sub = li.querySelector(':scope > ul, :scope > ol, :scope > div');
      if (!sub) return;
      const link = li.querySelector(':scope > a');
      const id = 'kit-mnav-sub-' + ++uid;
      sub.id = id;
      sub.hidden = true;
      sub.classList.add('kit-mobile-nav__sub');
      li.classList.add('kit-mobile-nav__has-sub');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'kit-mobile-nav__sub-toggle';
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-controls', id);
      btn.setAttribute('aria-label', 'Show submenu' + (link ? ': ' + link.textContent.trim() : ''));
      btn.innerHTML = '<span aria-hidden="true"></span>';
      const toggle = () => {
        const open = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', String(open));
        btn.setAttribute('aria-label', (open ? 'Hide submenu' : 'Show submenu') + (link ? ': ' + link.textContent.trim() : ''));
        sub.hidden = !open;
      };
      btn.addEventListener('click', toggle);
      if (link) {
        link.insertAdjacentElement('afterend', btn);
        const href = link.getAttribute('href');
        if (!href || href === '#' || href.startsWith('javascript:')) {
          link.addEventListener('click', (e) => { e.preventDefault(); toggle(); });
          link.dataset.kitSubParent = '1';
        }
      } else {
        li.insertBefore(btn, sub);
      }
    });
  }

  function makeHamburger(mount) {
    const wrap = document.createElement('div');
    wrap.className = 'slicknav_menu kit-mobile-nav-mount';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'slicknav_btn kit-mobile-nav-toggle';
    btn.innerHTML = '<span class="slicknav_menutxt visually-hidden">Menu</span><span class="slicknav_icon"><span class="slicknav_icon-bar"></span><span class="slicknav_icon-bar"></span><span class="slicknav_icon-bar"></span></span>';
    wrap.appendChild(btn);
    mount.appendChild(wrap);
    return btn;
  }

  function initMenu() {
    const sources = findSources();
    if (!sources.length) return null;
    const first = sources[0];
    const side = first.dataset.mobileNavSide || cfg.side;
    const label = first.dataset.mobileNavLabel || cfg.label;

    let toggles = Array.from(document.querySelectorAll('[data-mobile-nav-toggle], .js-menu-toggle, .canvas__open, .slicknav_btn'));
    if (!toggles.length) {
      const mount = document.querySelector('[data-mobile-nav-mount], .mobile_menu');
      if (!mount) return null;
      toggles = [makeHamburger(mount)];
    }

    const dialog = document.createElement('dialog');
    dialog.className = `kit-mobile-nav kit-mobile-nav--${side === 'left' ? 'left' : 'right'}`;
    dialog.id = 'kit-mobile-nav';
    dialog.setAttribute('aria-label', label);
    dialog.innerHTML =
      '<div class="kit-mobile-nav__panel">' +
      '<div class="kit-mobile-nav__head"><button type="button" class="kit-mobile-nav__close" aria-label="Close menu"><span aria-hidden="true">&times;</span></button></div>' +
      `<nav class="kit-mobile-nav__body" aria-label="${label}"></nav>` +
      '</div>';
    const body = dialog.querySelector('.kit-mobile-nav__body');
    sources.forEach((src) => cloneList(src).forEach((list) => {
      list.classList.add('kit-mobile-nav__list');
      wireSubmenus(list);
      body.appendChild(list);
    }));
    document.body.appendChild(dialog);

    let returnFocus = null;
    const setExpanded = (v) => toggles.forEach((t) => t.setAttribute('aria-expanded', String(v)));

    function open(trigger) {
      if (dialog.open) return;
      returnFocus = trigger || document.activeElement;
      dialog.showModal();
      document.documentElement.classList.add('kit-mobile-nav-open');
      setExpanded(true);
      const firstLink = dialog.querySelector('.kit-mobile-nav__body ' + FOCUSABLE);
      (firstLink || dialog.querySelector('.kit-mobile-nav__close')).focus();
    }

    function close() {
      if (!dialog.open) return;
      if (reduceMotion.matches || !dialog.animate) { dialog.close(); return; }
      dialog.classList.add('is-closing');
      const done = () => { dialog.classList.remove('is-closing'); if (dialog.open) dialog.close(); };
      const panel = dialog.querySelector('.kit-mobile-nav__panel');
      const d = parseFloat(getComputedStyle(panel).transitionDuration) || 0;
      d ? setTimeout(done, d * 1000) : done();
    }

    dialog.addEventListener('close', () => {
      document.documentElement.classList.remove('kit-mobile-nav-open');
      setExpanded(false);
      if (returnFocus && document.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
      returnFocus = null;
    });
    dialog.addEventListener('cancel', (e) => { e.preventDefault(); close(); }); // Esc: animate out too
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) { close(); return; } // backdrop
      const link = e.target.closest('a[href]');
      if (link && !link.dataset.kitSubParent) {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#') && href.length > 1) {
          // In-page link: close first so the scroll is not blocked by the modal.
          e.preventDefault();
          dialog.close();
          const target = document.querySelector(href);
          if (target) target.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' });
          history.pushState(null, '', href);
        } else {
          dialog.close();
        }
      }
    });
    dialog.querySelector('.kit-mobile-nav__close').addEventListener('click', close);

    // Focus trap: wrap Tab inside the panel (showModal already makes the page behind inert).
    dialog.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const items = Array.from(dialog.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!items.length) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
    });

    toggles.forEach((t) => {
      t.setAttribute('aria-controls', dialog.id);
      t.setAttribute('aria-expanded', 'false');
      t.setAttribute('aria-haspopup', 'dialog');
      if (t.tagName === 'A') t.setAttribute('role', 'button');
      if (!t.getAttribute('aria-label') && !t.textContent.trim()) t.setAttribute('aria-label', 'Open menu');
      t.addEventListener('click', (e) => { e.preventDefault(); dialog.open ? close() : open(t); });
    });

    const desktop = window.matchMedia(`(min-width: ${cfg.breakpoint}px)`);
    desktop.addEventListener?.('change', (e) => { if (e.matches && dialog.open) dialog.close(); });

    return { dialog, open, close, toggles };
  }

  /* ================================================================== sticky header */

  /* Where the header's height is reserved while it is fixed, so the content does not jump.
   * The parent's min-height worked only when the header was the parent's only child: in the Capital
   * Shop family the parent also holds the top bar and the banner, and the page still jumped 78 px.
   * Now: a selector names the element that gets the min-height; an empty attribute keeps the parent
   * when the header is its only element child and otherwise inserts a spacer before the header with
   * the height of the header alone (margins included); "spacer" always uses the spacer. */
  function placeholderFor(el) {
    if (!el.hasAttribute('data-sticky-placeholder')) return null;
    const v = (el.getAttribute('data-sticky-placeholder') || '').trim();
    if (v && v !== 'spacer') {
      let target = null;
      try { target = document.querySelector(v); } catch (e) { target = null; }
      if (target) return { kind: 'target', target };
      console.warn('[kit/mobile-nav] data-sticky-placeholder="' + v + '" matches nothing; using a spacer.');
    }
    const parent = el.parentElement;
    if (!v && parent && parent.children.length === 1 && parent !== document.body) return { kind: 'target', target: parent };
    return { kind: 'spacer', spacer: null };
  }
  function outerHeight(el) {
    const cs = getComputedStyle(el);
    return el.offsetHeight + (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0);
  }
  function reserve(h, on) {
    const ph = h.placeholder;
    if (!ph) return;
    if (ph.kind === 'target') { ph.target.style.minHeight = on ? h.el.offsetHeight + 'px' : ''; return; }
    if (on) {
      if (!ph.spacer) { ph.spacer = document.createElement('div'); ph.spacer.className = 'kit-sticky-spacer'; ph.spacer.setAttribute('aria-hidden', 'true'); }
      ph.spacer.style.height = outerHeight(h.el) + 'px';
      h.el.parentNode.insertBefore(ph.spacer, h.el);
    } else if (ph.spacer) ph.spacer.remove();
  }

  function initSticky() {
    const headers = [];
    document.querySelectorAll('[data-sticky-header], .header-sticky, .ftco_navbar').forEach((el) => {
      if (el.matches('.ftco_navbar') && !el.hasAttribute('data-sticky-header')) {
        headers.push({ el, preset: 'ftco' });
      } else {
        const offset = Number(el.dataset.stickyOffset ?? (el.classList.contains('header-sticky') ? 400 : 100));
        const cls = (el.dataset.stickyClass || (el.classList.contains('header-sticky') ? 'sticky-bar' : 'is-sticky')).split(/\s+/);
        headers.push({ el, offset, cls, placeholder: placeholderFor(el), stuck: false });
      }
    });
    if (!headers.length) return;

    let ticking = false;
    function update() {
      ticking = false;
      const y = window.scrollY;
      headers.forEach((h) => {
        if (h.preset === 'ftco') {
          const n = h.el.classList;
          if (y > 150) n.add('scrolled');
          if (y < 150) n.remove('scrolled', 'sleep');
          if (y > 350) n.add('awake');
          if (y < 350 && n.contains('awake')) { n.remove('awake'); n.add('sleep'); }
          return;
        }
        const stuck = y > h.offset;
        if (stuck === h.stuck) return;
        if (stuck) reserve(h, true); // measured before the sticky class changes the header
        h.el.classList.toggle(h.cls[0], stuck);
        h.cls.slice(1).forEach((c) => h.el.classList.toggle(c, stuck));
        if (!stuck) reserve(h, false);
        h.stuck = stuck;
        document.documentElement.style.setProperty('--kit-sticky-height', stuck ? h.el.offsetHeight + 'px' : '0px');
      });
    }
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  let menu = null;
  function init() {
    menu = initMenu();
    initSticky();
  }

  Kit.mobileNav = {
    init,
    open: () => menu && menu.open(),
    close: () => menu && menu.close(),
    get dialog() { return menu && menu.dialog; },
  };

  if (cfg.autoInit === false) return;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
