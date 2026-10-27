/* KNX project request — 3-step form.
 * Delivery: POST (multipart) to data-endpoint when set; otherwise WhatsApp with a composed message.
 * Only a successful server response is reported as "received". Opening WhatsApp is NOT a delivery:
 * the visitor still has to press Send there, so the form says exactly that. A failed POST never
 * silently switches to WhatsApp — the visitor is told it failed and can choose WhatsApp instead. */
import { $, $$, once, waLink, safeUrl } from './utils';

function fieldLabel(form, name) {
  const el = form.querySelector(`[name="${name}"]`);
  if (!el) return name;
  const wrap = el.closest('[data-label]');
  return wrap ? wrap.dataset.label : name;
}

function valueText(form, name) {
  const els = $$(`[name="${name}"]`, form);
  if (!els.length) return '';
  if (els[0].type === 'radio' || els[0].type === 'checkbox') {
    return els.filter((e) => e.checked).map((e) => e.dataset.text || e.value).join('، ');
  }
  if (els[0].type === 'file') return els[0].files && els[0].files[0] ? els[0].files[0].name : '';
  return els[0].value.trim();
}

function compose(form, { withFile = true } = {}) {
  const lines = [form.dataset.waIntro || 'KNX'];
  $$('[data-label]', form).forEach((wrap) => {
    const input = $('input, select, textarea', wrap);
    if (!input || input.type === 'file') return;
    const v = valueText(form, input.name);
    if (v) lines.push(`• ${wrap.dataset.label}: ${v}`);
  });
  const file = $('input[type="file"]', form);
  if (withFile && file && file.files && file.files[0]) lines.push(`• ${form.dataset.fileNote || ''} ${file.files[0].name}`.trim());
  lines.push(location.href);
  return lines.join('\n');
}

function validate(pane) {
  let ok = true;
  $$('[data-required]', pane).forEach((wrap) => {
    const inputs = $$('input, select, textarea', wrap);
    const filled = inputs.some((i) => ((i.type === 'radio' || i.type === 'checkbox') ? i.checked : i.value.trim() !== '') && i.checkValidity());
    wrap.classList.toggle('is-invalid', !filled);
    const err = $('.st-field__error', wrap);
    if (err) err.hidden = filled;
    if (!filled && ok) {
      ok = false;
      const first = inputs[0];
      first && first.focus();
    }
  });
  return ok;
}

function initOne(form) {
  if (!once(form)) return;
  const panes = $$('.st-kform__pane', form);
  const tabs = $$('.st-kform__stepbtn', form);
  const status = $('.st-kform__status', form);
  const done = $('.st-kform__done', form);
  // only https (or same-origin) endpoints: form data includes personal details
  const endpoint = /^(https:\/\/|\/)/i.test(safeUrl(form.dataset.endpoint)) ? safeUrl(form.dataset.endpoint) : '';
  const wa = form.dataset.whatsapp || '';
  let step = 0;

  const show = (i, focus = true) => {
    step = i;
    panes.forEach((p, n) => { p.hidden = n !== i; });
    tabs.forEach((b, n) => {
      b.classList.toggle('is-active', n === i);
      b.classList.toggle('is-done', n < i);
      b.setAttribute('aria-current', n === i ? 'step' : 'false');
    });
    const h = $('legend, h3', panes[i]);
    if (h && focus) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  };

  tabs.forEach((b, n) => b.addEventListener('click', () => { if (n < step) show(n); }));
  $$('[data-next]', form).forEach((b) => b.addEventListener('click', () => {
    if (validate(panes[step])) show(Math.min(step + 1, panes.length - 1));
  }));
  $$('[data-prev]', form).forEach((b) => b.addEventListener('click', () => show(Math.max(step - 1, 0))));

  // upload tile
  const up = $('.st-upload', form);
  if (up) {
    const input = $('input[type="file"]', up);
    const label = $('[data-upload-label]', up);
    const def = label ? label.textContent : '';
    input.addEventListener('change', () => {
      const f = input.files && input.files[0];
      const max = Number(input.dataset.max || 20) * 1024 * 1024;
      if (f && f.size > max) {
        input.value = '';
        status.textContent = form.dataset.fileTooBig || '';
        return;
      }
      status.textContent = '';
      up.classList.toggle('has-file', !!f);
      if (label) label.textContent = f ? `${f.name} · ${(f.size / 1048576).toFixed(1)} MB` : def;
    });
    ['dragenter', 'dragover'].forEach((ev) => up.addEventListener(ev, (e) => { e.preventDefault(); up.classList.add('is-drag'); }));
    ['dragleave', 'drop'].forEach((ev) => up.addEventListener(ev, () => up.classList.remove('is-drag')));
    up.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.files.length) { input.files = e.dataTransfer.files; input.dispatchEvent(new Event('change')); }
    });
  }

  const pending = $('[data-wa-pending]', form);
  const waAlt = $('[data-wa-alt]', form);
  const btn = $('[type="submit"]', form);
  const TIMEOUT = 30000;

  const panels = () => [...panes, done, pending].filter(Boolean);
  const reveal = (panel) => {
    panels().forEach((p) => { p.hidden = p !== panel; });
    $('.st-kform__steps', form).hidden = true;
    panel.setAttribute('tabindex', '-1');
    panel.focus();
  };
  const backToForm = () => {
    if (pending) pending.hidden = true;
    $('.st-kform__steps', form).hidden = false;
    show(panes.length - 1);
  };

  // WhatsApp: prepare the message and say clearly that nothing is sent until the visitor presses Send there
  const sendWhatsApp = () => {
    const link = waLink(wa, compose(form, { withFile: false }));
    if (!link) {
      status.textContent = form.dataset.noChannel || '';
      return;
    }
    if (pending) {
      const open = $('[data-wa-open]', pending);
      if (open) open.href = link;
      const fileNote = $('[data-wa-file-note]', pending);
      const file = $('input[type="file"]', form);
      if (fileNote) fileNote.hidden = !(file && file.files && file.files[0]);
      reveal(pending);
    }
    // a user-initiated click, so popup blockers allow it; the panel above keeps a manual link either way
    window.open(link, '_blank', 'noopener');
  };

  const fail = (msg) => {
    status.textContent = msg || form.dataset.error || '';
    if (waAlt && wa) waAlt.hidden = false;
  };

  if (waAlt) waAlt.addEventListener('click', () => { status.textContent = ''; sendWhatsApp(); });
  const edit = pending && $('[data-wa-edit]', pending);
  if (edit) edit.addEventListener('click', backToForm);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (btn.disabled || !validate(panes[step])) return;
    status.textContent = '';
    if (waAlt) waAlt.hidden = true;
    if (!endpoint) { sendWhatsApp(); return; }

    btn.disabled = true;
    form.setAttribute('aria-busy', 'true');
    status.textContent = form.dataset.sending || '';
    const data = new FormData(form);
    data.append('page', location.href);
    data.append('summary', compose(form));
    const ctrl = 'AbortController' in window ? new AbortController() : null;
    const timer = ctrl && setTimeout(() => ctrl.abort(), TIMEOUT);

    fetch(endpoint, { method: 'POST', body: data, mode: 'cors', signal: ctrl ? ctrl.signal : undefined })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        // an endpoint may answer 200 with {"success": false}; trust that over the status code
        const type = r.headers.get('content-type') || '';
        return type.includes('json') ? r.json().then((j) => { if (j && j.success === false) throw new Error('rejected'); }) : null;
      })
      .then(() => { status.textContent = ''; reveal(done); })
      .catch((err) => {
        console.warn('[smarttrust] knx form', err);
        fail(err && err.name === 'AbortError' ? form.dataset.timeout : form.dataset.error);
      })
      .finally(() => {
        clearTimeout(timer);
        btn.disabled = false;
        form.removeAttribute('aria-busy');
      });
  });

  show(0, false);
}

export default function initKnxForms(hosts) {
  hosts.forEach(initOne);
}
