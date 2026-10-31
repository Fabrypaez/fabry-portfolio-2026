/*!
 * Colorlib kit: counters.js (no dependencies)
 *
 * Replaces jQuery CounterUp + Waypoints, jquery.animateNumber, jquery.countTo and hand-rolled
 * $.animate counters. Each number starts counting when it scrolls into view (IntersectionObserver)
 * and counts up with a requestAnimationFrame loop (ease-out, like CountUp.js's default).
 *
 * Picked up automatically:
 *   <span class="counter">1,250</span>+            CounterUp: the text is the target; commas, decimals,
 *                                                   prefix/suffix inside the element ("$1.5k") are kept
 *   <strong class="number" data-number="18000">0</strong>   ftco animateNumber (',' separator)
 *   <span class="js-counter" data-to="120" data-speed="5000"></span>   countTo (Jackson)
 *   <h2 class="counter_num">8365</h2> · <span class="count">24</span> · <span data-count="350">
 *   <span data-countup="99.5" data-countup-duration="3" data-countup-suffix="%">
 * Elements whose content is not a plain number (e.g. <section class="counter">) are ignored.
 *
 * Optional per element: data-duration (s or ms), data-separator, data-decimal, data-prefix,
 * data-suffix. No JS / reduced motion: the final number is shown (write it in the markup —
 * for ftco "0" placeholders this module writes it in for you).
 */
(function () {
  'use strict';

  const Kit = (window.Kit = window.Kit || {});
  if (Kit.counters) return;

  const cfg = (window.KitConfig && window.KitConfig.counters) || {};
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const SELECTOR = cfg.selector ||
    '.counter, .number[data-number], .js-counter[data-to], .counter_num, .count, .counter-value, [data-count], [data-countup], .timer[data-to]';

  /** "$1,250.5k+" -> { prefix: '$', value: 1250.5, decimals: 1, separator: ',', suffix: 'k+' } */
  function parseText(text) {
    const m = String(text).trim().match(/^([^\d\-.]*)(-?[\d.,\s  ]*\d)(.*)$/s);
    if (!m) return null;
    let num = m[2];
    let separator = '';
    let decimal = '.';
    // Work out which of , or . is the decimal mark: the last one followed by 1-2 digits and not 3.
    const lastComma = num.lastIndexOf(',');
    const lastDot = num.lastIndexOf('.');
    if (lastComma > -1 && lastDot > -1) {
      decimal = lastComma > lastDot ? ',' : '.';
      separator = decimal === ',' ? '.' : ',';
    } else if (lastComma > -1) {
      if (/,\d{3}(?!\d)/.test(num) && !/,\d{1,2}$/.test(num)) separator = ','; else decimal = ',';
    } else if (lastDot > -1 && /\.\d{3}$/.test(num) && (num.match(/\./g) || []).length > 1) {
      separator = '.'; decimal = ',';
    }
    if (/[\s  ]/.test(num)) separator = num.match(/[\s  ]/)[0];
    const clean = num.split(separator || '\u0000').join('').replace(decimal, '.').replace(/[\s  ]/g, '');
    const value = parseFloat(clean);
    if (Number.isNaN(value)) return null;
    const decimals = clean.includes('.') ? clean.split('.')[1].length : 0;
    return { prefix: m[1], value, decimals, separator, decimal, suffix: m[3] };
  }

  const toSeconds = (v) => {
    if (v == null || v === '') return null;
    const n = parseFloat(v);
    if (Number.isNaN(n)) return null;
    return /ms$/.test(v) || n > 100 ? n / 1000 : n; // "5000" is ms (countTo), "2" or "2s" is s
  };

  /** Everything the counter needs for one element, or null if it is not a counter. */
  function describe(el) {
    if (el.children.length && !el.dataset.number && !el.dataset.to && !el.dataset.count && !el.dataset.countup) return null;
    const d = el.dataset;
    const fromText = parseText(el.textContent);
    let target = d.countup ?? d.number ?? d.to ?? d.count;
    let parsed = target != null ? parseText(target) : fromText;
    if (!parsed) return null;
    // ftco animateNumber used a comma separator; keep text formatting when it had one.
    const separator = d.separator ?? ((fromText && fromText.separator) || parsed.separator || (d.number != null ? ',' : ''));
    return {
      value: parsed.value,
      decimals: Number(d.decimals ?? parsed.decimals) || 0,
      separator: separator || '',
      decimal: d.decimal ?? parsed.decimal ?? '.',
      prefix: d.prefix ?? d.countupPrefix ?? (target != null ? '' : parsed.prefix),
      suffix: d.suffix ?? d.countupSuffix ?? (target != null ? '' : parsed.suffix),
      duration: toSeconds(d.duration || d.countupDuration || d.speed) || cfg.duration || 2,
    };
  }

  function format(info) {
    const fixed = info.value.toFixed(info.decimals).split('.');
    const int = fixed[0].replace(/\B(?=(\d{3})+(?!\d))/g, info.separator);
    return info.prefix + int + (fixed[1] ? info.decimal + fixed[1] : '') + info.suffix;
  }

  // Exponential ease-out (CountUp.js's default curve): fast start, gentle landing.
  const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

  function start(el) {
    const info = el._kitCounter;
    if (!info || el.dataset.kitCounted) return;
    el.dataset.kitCounted = '1';
    if (reduceMotion.matches) { el.textContent = format(info); return; }
    const ms = info.duration * 1000;
    const factor = Math.pow(10, info.decimals);
    let t0 = null;
    const step = (now) => {
      if (t0 === null) t0 = now;
      const p = Math.min(1, (now - t0) / ms);
      // Round to the displayed precision so the text never shows a longer tail than the target.
      const value = p >= 1 ? info.value : Math.round(info.value * easeOutExpo(p) * factor) / factor;
      el.textContent = format(Object.assign({}, info, { value }));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  let io = null;

  function init() {
    const els = Array.from(document.querySelectorAll(SELECTOR)).filter((el) => !el._kitCounter);
    if (!els.length) return;
    const animate = !reduceMotion.matches && 'IntersectionObserver' in window;
    els.forEach((el) => {
      const info = describe(el);
      if (!info) return;
      el._kitCounter = info;
      // Without motion: the final number (ftco/countTo markup ships "0" or nothing).
      // With motion: the start value, so nothing flashes the final number and jumps back to 0.
      el.textContent = format(animate ? Object.assign({}, info, { value: 0 }) : info);
    });

    const counters = els.filter((el) => el._kitCounter);
    if (!animate) { counters.forEach(start); return; }
    io = io || new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        start(entry.target);
      });
    }, { rootMargin: '0px', threshold: 0 });
    counters.forEach((el) => io.observe(el));
  }

  Kit.counters = { init, start, parseText };

  if (cfg.autoInit === false) return;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
