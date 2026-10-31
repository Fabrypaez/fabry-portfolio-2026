/*!
 * Colorlib kit: form.js (no dependencies; pairs with php/send-email.php and css/form.css)
 *
 * Replaces jquery.form + jquery.validate + contact.js / mail-script.js / ajaxChimp-style AJAX
 * submits. Sends the form with fetch() and shows the result next to it; without JS the form
 * still posts normally and send-email.php answers with a small HTML page.
 *
 * Picked up automatically: form[data-kit-form] and any form whose action ends in send-email.php.
 *   <form action="php/send-email.php" method="post" data-kit-form
 *         data-success="Thanks! We will reply within a day." novalidate>
 *     … inputs with name="" matching the $config['fields'] keys in send-email.php …
 *     <input type="text" name="website" tabindex="-1" autocomplete="off" hidden>   (honeypot)
 *     <button type="submit">Send</button>
 *     <div data-form-status></div>          (optional; created after the form when missing)
 *   </form>
 *
 * Validation: the browser's own constraints (required, type="email", pattern, minlength…).
 * Invalid fields get aria-invalid and Bootstrap's .is-invalid, and the first one is focused;
 * the form gets .was-validated like Bootstrap's validation examples.
 * States: the submit button is disabled with aria-busy while sending; the status region
 * (role="status") gets .is-success / .is-error. On success the form is reset.
 * Server contract: the response body "OK" means sent; any other short text in a 2xx response is
 * the error to show. Non-2xx answers (a static host without PHP: 404/405) and requests that take
 * longer than `timeout` (15 s; KitConfig.form.timeout or data-timeout="ms") show the generic error.
 */
(function () {
  'use strict';

  const Kit = (window.Kit = window.Kit || {});
  if (Kit.form) return;

  const cfg = Object.assign({
    success: 'Thank you, your message has been sent.',
    error: 'Sorry, the message could not be sent. Please try again later.',
    sending: 'Sending…',
    timeout: 15000, // ms; a POST that never answers ends in the error state instead of hanging
  }, (window.KitConfig && window.KitConfig.form) || {});

  function statusFor(form) {
    let status = form.querySelector('[data-form-status]') || (form.id && document.querySelector(`[data-form-status="${form.id}"]`));
    if (!status) {
      status = document.createElement('div');
      status.setAttribute('data-form-status', '');
      form.insertAdjacentElement('beforeend', status);
    }
    status.classList.add('kit-form-status');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    return status;
  }

  function show(status, type, text) {
    status.classList.toggle('is-success', type === 'success');
    status.classList.toggle('is-error', type === 'error');
    status.classList.toggle('is-sending', type === 'sending');
    status.textContent = text || '';
    status.hidden = !text;
  }

  function markFields(form) {
    let first = null;
    Array.from(form.elements).forEach((el) => {
      if (!el.willValidate) return;
      const bad = !el.checkValidity();
      if (bad) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
      el.classList.toggle('is-invalid', bad);
      if (bad && !first) first = el;
    });
    return first;
  }

  async function submit(form, e) {
    e.preventDefault();
    const status = statusFor(form);
    form.classList.add('was-validated');
    const invalid = markFields(form);
    if (invalid) {
      show(status, 'error', invalid.validationMessage || 'Please check the highlighted fields.');
      invalid.focus();
      return;
    }

    const buttons = Array.from(form.querySelectorAll('button[type="submit"], input[type="submit"], button:not([type])'));
    buttons.forEach((b) => { b.disabled = true; b.setAttribute('aria-busy', 'true'); });
    form.setAttribute('aria-busy', 'true');
    show(status, 'sending', form.dataset.sending || cfg.sending);

    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), Number(form.dataset.timeout) || cfg.timeout) : null;
    try {
      const res = await fetch(form.getAttribute('action') || window.location.href, {
        method: (form.getAttribute('method') || 'POST').toUpperCase(),
        body: new FormData(form),
        headers: { 'X-Requested-With': 'fetch', Accept: 'text/plain' },
        signal: controller ? controller.signal : undefined,
      });
      const text = (await res.text()).trim();
      if (res.ok && text === 'OK') {
        show(status, 'success', form.dataset.success || cfg.success);
        form.reset();
        form.classList.remove('was-validated');
        Array.from(form.elements).forEach((el) => { el.removeAttribute('aria-invalid'); el.classList && el.classList.remove('is-invalid'); });
        form.dispatchEvent(new CustomEvent('kit:form-success', { bubbles: true }));
      } else {
        // Only show short plain-text messages from the handler itself (it answers 200 with the
        // sentence); never a host's error page or its 404/405 text ("Not Found").
        const msg = res.ok && text && text.length < 300 && !/<[a-z!?]/i.test(text) ? text : (form.dataset.error || cfg.error);
        show(status, 'error', msg);
        form.dispatchEvent(new CustomEvent('kit:form-error', { bubbles: true, detail: { status: res.status, text } }));
      }
    } catch (err) {
      show(status, 'error', form.dataset.error || cfg.error);
      form.dispatchEvent(new CustomEvent('kit:form-error', { bubbles: true, detail: { error: err } }));
    } finally {
      if (timer) clearTimeout(timer);
      buttons.forEach((b) => { b.disabled = false; b.removeAttribute('aria-busy'); });
      form.removeAttribute('aria-busy');
    }
  }

  function bind(form) {
    if (!form || form.dataset.kitFormBound) return;
    form.dataset.kitFormBound = '1';
    form.setAttribute('novalidate', ''); // we show our own messages; the constraints still apply
    form.addEventListener('submit', (e) => submit(form, e));
    // Clear a field's error state as soon as it becomes valid.
    form.addEventListener('input', (e) => {
      const el = e.target;
      if (el.classList && el.classList.contains('is-invalid') && el.checkValidity()) {
        el.classList.remove('is-invalid');
        el.removeAttribute('aria-invalid');
      }
    });
  }

  function init() {
    document.querySelectorAll('form[data-kit-form], form[action$="send-email.php"]').forEach(bind);
  }

  Kit.form = { init, bind };

  if (cfg.autoInit === false) return;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
