/*!
 * Colorlib kit: filter.js (no dependencies; optional css/filter.css)
 *
 * Replaces Isotope / MixItUp category filters. The grid stays a normal CSS grid or Bootstrap .row;
 * non-matching items get the `hidden` attribute and the rest reflow. With the View Transitions
 * API (Chrome/Edge/Safari 18+), items glide to their new places; elsewhere they just reflow.
 *
 * Markup (the Isotope markup, plus one attribute on the grid):
 *   <ul class="portfolio-filter">
 *     <li class="active" data-filter="*">All</li>
 *     <li data-filter=".buildings">Buildings</li>
 *   </ul>
 *   <div class="row portfolio-grid" data-filter-grid>
 *     <div class="col-lg-4 all buildings">…</div>
 *   </div>
 * data-filter takes "*" (all) or any CSS selector the items match (".cat", ".a, .b").
 * Link the buttons to a grid with data-filter-target="#grid" on the buttons' container when a
 * page has more than one grid; with a single [data-filter-grid], every [data-filter] drives it.
 * data-filter-grid="…" can name the item selector (default: the grid's children).
 * jQuery-era templates that called Isotope from JS: Kit.filter.bind({ buttons, grid, items }).
 *
 * Accessibility: controls become buttons (role/tabindex for <li>/<a>), aria-pressed shows the
 * current filter, Enter/Space work, and a polite live region announces "N items shown".
 * prefers-reduced-motion: no animation.
 */
(function () {
  'use strict';

  const Kit = (window.Kit = window.Kit || {});
  if (Kit.filter) return;

  const cfg = (window.KitConfig && window.KitConfig.filter) || {};
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let uid = 0;

  function makeAccessible(btn) {
    if (btn.tagName !== 'BUTTON') {
      btn.setAttribute('role', 'button');
      if (!btn.hasAttribute('tabindex')) btn.tabIndex = 0;
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
      });
    } else if (!btn.hasAttribute('type')) {
      btn.type = 'button';
    }
  }

  function liveRegion(grid) {
    const region = document.createElement('p');
    region.className = 'kit-filter-status visually-hidden';
    region.setAttribute('aria-live', 'polite');
    region.style.cssText = 'position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important';
    grid.insertAdjacentElement('afterend', region);
    return region;
  }

  /**
   * bind({ buttons, grid, items, activeClass }) — buttons: selector or list; grid: selector or el;
   * items: selector within the grid (default: its children). Returns { apply(filter) }.
   */
  function bind(options) {
    const grid = typeof options.grid === 'string' ? document.querySelector(options.grid) : options.grid;
    const buttons = typeof options.buttons === 'string' ? Array.from(document.querySelectorAll(options.buttons)) : Array.from(options.buttons || []);
    if (!grid || !buttons.length || grid.kitFilter) return grid && grid.kitFilter;

    const activeClass = options.activeClass || cfg.activeClass || 'active';
    const itemSel = options.items || grid.getAttribute('data-filter-grid') || null;
    const getItems = () => (itemSel ? Array.from(grid.querySelectorAll(itemSel)) : Array.from(grid.children))
      .filter((el) => !el.classList.contains('grid-sizer') && !el.classList.contains('gutter-sizer'));
    if (!grid.id) grid.id = 'kit-filter-grid-' + ++uid;
    const region = liveRegion(grid);
    const prefix = 'kit-f' + uid + '-';

    function matches(item, filter) {
      if (!filter || filter === '*' || filter === 'all') return true;
      try { return item.matches(filter); } catch (e) { return item.classList.contains(filter.replace(/^\./, '')); }
    }

    function update(filter) {
      let shown = 0;
      getItems().forEach((item) => {
        const show = matches(item, filter);
        item.hidden = !show;
        if (show) shown++;
      });
      buttons.forEach((b) => {
        const on = (b.getAttribute('data-filter') || '*') === filter;
        b.classList.toggle(activeClass, on);
        b.setAttribute('aria-pressed', String(on));
      });
      region.textContent = shown === 1 ? '1 item shown' : `${shown} items shown`;
      grid.dispatchEvent(new CustomEvent('kit:filter', { detail: { filter, shown } }));
    }

    function apply(filter) {
      const canAnimate = typeof document.startViewTransition === 'function' && !reduceMotion.matches && !document.hidden;
      if (!canAnimate) { update(filter); return Promise.resolve(); }
      const items = getItems();
      items.forEach((el, i) => { el.style.viewTransitionName = prefix + i; el.style.viewTransitionClass = 'kit-filter-item'; });
      const vt = document.startViewTransition(() => update(filter));
      return vt.finished.finally(() => items.forEach((el) => { el.style.viewTransitionName = ''; el.style.viewTransitionClass = ''; }));
    }

    buttons.forEach((btn) => {
      makeAccessible(btn);
      btn.setAttribute('aria-controls', grid.id);
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        apply(btn.getAttribute('data-filter') || '*');
      });
    });

    // Initial state: the button marked active in the markup (Isotope templates start on "*").
    const initial = buttons.find((b) => b.classList.contains(activeClass)) || buttons[0];
    update(initial.getAttribute('data-filter') || '*');

    grid.kitFilter = { apply, grid, buttons };
    return grid.kitFilter;
  }

  function init() {
    const grids = Array.from(document.querySelectorAll('[data-filter-grid]'));
    if (!grids.length) return;
    const claimed = new Set();
    document.querySelectorAll('[data-filter-target]').forEach((container) => {
      const grid = document.querySelector(container.getAttribute('data-filter-target'));
      const buttons = Array.from(container.querySelectorAll('[data-filter]'));
      buttons.forEach((b) => claimed.add(b));
      if (grid) bind({ grid, buttons });
    });
    if (grids.length === 1) {
      const buttons = Array.from(document.querySelectorAll('[data-filter]')).filter((b) => !claimed.has(b) && !b.hasAttribute('data-filter-grid'));
      if (buttons.length) bind({ grid: grids[0], buttons });
    }
  }

  Kit.filter = { init, bind };

  if (cfg.autoInit === false) return;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
