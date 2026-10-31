/*!
 * Colorlib kit: video-dialog.js (no dependencies; pairs with css/video-dialog.css)
 *
 * Replaces Magnific Popup type:'iframe' (and Fancybox/GLightbox video links) with a native
 * <dialog>: YouTube (as youtube-nocookie.com), Vimeo (dnt=1), Google Maps links, and local
 * .mp4/.webm files.
 *
 * Picked up automatically:
 *   <a href="https://www.youtube.com/watch?v=ID" class="popup-youtube">   also .popup-vimeo, .popup-video,
 *   .video-popup, .popup-gmaps, .play-btn, .video-btn, [data-video], a[data-fancybox] / a.glightbox
 *   with a video href.
 *   Plain links to a YouTube/Vimeo *video* (watch, youtu.be, shorts, embed, vimeo.com/123) open too;
 *   channel or playlist links are left alone. Opt a link out with data-video="false".
 *
 * Behaviour: showModal() (the page behind is inert), autoplay on open, Esc / close button /
 * backdrop click close it, the player is removed on close (so the video stops), focus returns to
 * the link. prefers-reduced-motion: no open animation, and no autoplay for local <video>.
 *
 * API: Kit.videoDialog.open(url, { title, trigger }) · Kit.videoDialog.close()
 */
(function () {
  'use strict';

  const Kit = (window.Kit = window.Kit || {});
  if (Kit.videoDialog) return;

  const cfg = (window.KitConfig && window.KitConfig.videoDialog) || {};
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const TRIGGERS = '.popup-youtube, .popup-vimeo, .popup-video, .video-popup, .popup-gmaps, .play-btn, .video-btn, [data-video], a[data-fancybox], a.glightbox';

  function parseStart(t) {
    if (!t) return 0;
    if (/^\d+$/.test(t)) return Number(t);
    const m = String(t).match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
    return m ? (Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0)) : 0;
  }

  /** URL -> { type: 'iframe'|'video', src } or null when it is not something we can play. */
  function resolve(href) {
    let url;
    try { url = new URL(href, window.location.href); } catch (e) { return null; }
    const host = url.hostname.replace(/^www\.|^m\./, '');

    let yt = null;
    if (host === 'youtu.be') yt = url.pathname.slice(1).split('/')[0];
    else if (/(^|\.)youtube(-nocookie)?\.com$/.test(host)) {
      if (url.pathname === '/watch') yt = url.searchParams.get('v');
      else {
        const m = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{6,})/);
        if (m) yt = m[1];
      }
    }
    if (yt && /^[\w-]{6,}$/.test(yt)) {
      const params = new URLSearchParams({ autoplay: '1', rel: '0', playsinline: '1' });
      const start = parseStart(url.searchParams.get('t') || url.searchParams.get('start'));
      if (start) params.set('start', String(start));
      return { type: 'iframe', src: `https://www.youtube-nocookie.com/embed/${yt}?${params}` };
    }

    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const m = url.pathname.match(/\/(?:video\/)?(\d+)(?:\/([\da-f]+))?/);
      if (m) {
        const params = new URLSearchParams({ autoplay: '1', dnt: '1' });
        if (m[2]) params.set('h', m[2]);
        return { type: 'iframe', src: `https://player.vimeo.com/video/${m[1]}?${params}` };
      }
    }

    if (/(^|\.)google\.[a-z.]+$/.test(host) && /^\/maps|^maps\./.test(url.pathname + '|' + url.hostname.replace(/^www\./, ''))) {
      const q = url.searchParams.get('q') || decodeURIComponent((url.pathname.match(/\/maps\/place\/([^/]+)/) || [])[1] || '').replace(/\+/g, ' ');
      if (q) return { type: 'iframe', src: `https://maps.google.com/maps?q=${encodeURIComponent(q)}&output=embed` };
    }
    if (host === 'maps.google.com') {
      const q = url.searchParams.get('q');
      if (q) return { type: 'iframe', src: `https://maps.google.com/maps?q=${encodeURIComponent(q)}&output=embed` };
    }

    if (/\.(mp4|webm|ogv|mov)$/i.test(url.pathname)) return { type: 'video', src: url.href };
    return null;
  }

  let dialog = null;
  let stage = null;
  let lastTrigger = null;

  function build() {
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.className = 'kit-video-dialog';
    dialog.setAttribute('aria-label', 'Video');
    dialog.innerHTML =
      '<div class="kit-video-dialog__inner">' +
      '<button type="button" class="kit-video-dialog__close" aria-label="Close video"><span aria-hidden="true">&times;</span></button>' +
      '<div class="kit-video-dialog__stage"></div>' +
      '</div>';
    stage = dialog.querySelector('.kit-video-dialog__stage');
    dialog.querySelector('.kit-video-dialog__close').addEventListener('click', close);
    // Click on the backdrop: the event target is the <dialog> itself, outside the inner box.
    dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });
    // Esc fires 'cancel' and then closes; 'close' covers every path.
    dialog.addEventListener('close', teardown);
    document.body.appendChild(dialog);
    return dialog;
  }

  function teardown() {
    if (stage) stage.replaceChildren(); // removing the iframe/video is what stops playback
    document.documentElement.classList.remove('kit-video-dialog-open');
    const back = lastTrigger;
    lastTrigger = null;
    if (back && document.contains(back)) back.focus({ preventScroll: true });
  }

  function open(href, options) {
    options = options || {};
    const media = resolve(href);
    if (!media) return false;
    build();
    lastTrigger = options.trigger || document.activeElement;
    stage.classList.toggle('is-map', /maps\.google/.test(media.src));
    const title = options.title || 'Video player';
    dialog.setAttribute('aria-label', title);

    let el;
    if (media.type === 'iframe') {
      el = document.createElement('iframe');
      el.src = media.src;
      el.title = title;
      el.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      el.allowFullscreen = true;
      el.referrerPolicy = 'strict-origin-when-cross-origin';
    } else {
      el = document.createElement('video');
      el.src = media.src;
      el.controls = true;
      el.playsInline = true;
      el.autoplay = !reduceMotion.matches;
    }
    stage.replaceChildren(el);
    document.documentElement.classList.add('kit-video-dialog-open');
    dialog.showModal();
    dialog.querySelector('.kit-video-dialog__close').focus();
    return true;
  }

  function close() {
    if (dialog && dialog.open) dialog.close();
  }

  function onClick(e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = e.target.closest('a[href]');
    if (!link || link.dataset.video === 'false') return;
    const explicit = link.matches(TRIGGERS);
    const media = resolve(link.getAttribute('href'));
    if (!media) return;
    // Implicit (plain) links only for video hosts, never maps or files.
    if (!explicit && !(media.type === 'iframe' && !/maps\.google/.test(media.src))) return;
    if (cfg.implicit === false && !explicit) return;
    e.preventDefault();
    open(link.getAttribute('href'), {
      trigger: link,
      title: link.getAttribute('aria-label') || link.getAttribute('title') || link.dataset.title || undefined,
    });
  }

  function init() {
    document.addEventListener('click', onClick);
    // Make the trigger links say what they do.
    document.querySelectorAll(TRIGGERS).forEach((a) => {
      if (a.tagName === 'A' && resolve(a.getAttribute('href')) && !a.hasAttribute('aria-haspopup')) a.setAttribute('aria-haspopup', 'dialog');
    });
  }

  Kit.videoDialog = { init, open, close, resolve };

  if (cfg.autoInit === false) return;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
