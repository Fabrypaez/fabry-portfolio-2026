/*!
 * Colorlib kit: map.js (no dependencies; pairs with css/map.css)
 *
 * Click-to-load map. Replaces Google Maps JS API maps (sample keys), Leaflet, and embed iframes
 * that load on page load or on scroll (an OpenStreetMap or Google embed costs about 2 MB). Nothing
 * leaves the site until the visitor asks: the page shows a placeholder of the same size with the
 * address, a "Show map" button that swaps in the keyless embed iframe, and an "Open in maps" link
 * that works without JavaScript.
 *
 *   <div id="map" class="kit-map" data-kit-map
 *        data-map-src="https://www.openstreetmap.org/export/embed.html?bbox=W,S,E,N&amp;layer=mapnik&amp;marker=LAT,LON"
 *        data-map-title="Map showing our office">
 *     <div class="kit-map__placeholder">
 *       <p class="kit-map__address">203 Example Street, Springfield</p>
 *       <div class="kit-map__actions">
 *         <button type="button" class="btn btn-primary" data-kit-map-show>Show map</button>
 *         <a href="https://www.openstreetmap.org/?mlat=LAT&amp;mlon=LON#map=15/LAT/LON">Open in maps</a>
 *       </div>
 *     </div>
 *   </div>
 *
 * data-map-src: the embed URL (OpenStreetMap export/embed.html, or Google maps/embed?pb=… or
 * maps?q=…&output=embed); no API key. data-map-title: the iframe's accessible name (default "Map").
 * The container keeps the size the theme gives it (map.css fills it; min-height 300px otherwise).
 *
 * Behaviour: the button (any [data-kit-map-show] inside, else the first <button>) injects the
 * iframe, hides the placeholder and moves focus to the map, so keyboard users are not dropped on
 * <body>. Fires `kit:map-load` on the container.
 *
 * API: Kit.map.load(container) · Kit.map.init()
 */
(function () {
  'use strict';

  const Kit = (window.Kit = window.Kit || {});
  if (Kit.map) return;

  const cfg = (window.KitConfig && window.KitConfig.map) || {};
  const SELECTOR = cfg.selector || '[data-kit-map]';

  function load(el) {
    if (!el || el.classList.contains('is-loaded')) return null;
    const src = el.dataset.mapSrc;
    if (!src) { console.warn('[kit/map] data-map-src is missing', el); return null; }
    const frame = document.createElement('iframe');
    frame.className = 'kit-map__frame';
    frame.src = src;
    frame.title = el.dataset.mapTitle || 'Map';
    frame.referrerPolicy = 'no-referrer-when-downgrade';
    frame.allowFullscreen = true;
    el.appendChild(frame);
    const placeholder = el.querySelector('.kit-map__placeholder');
    if (placeholder) placeholder.hidden = true;
    el.classList.add('is-loaded');
    frame.focus({ preventScroll: true });
    el.dispatchEvent(new CustomEvent('kit:map-load', { bubbles: true, detail: { frame } }));
    return frame;
  }

  function init() {
    document.querySelectorAll(SELECTOR).forEach((el) => {
      if (el._kitMap) return;
      el._kitMap = true;
      const button = el.querySelector('[data-kit-map-show]') || el.querySelector('button');
      if (!button) return;
      button.addEventListener('click', (e) => { e.preventDefault(); load(el); });
    });
  }

  Kit.map = { load, init };

  if (cfg.autoInit === false) return;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
