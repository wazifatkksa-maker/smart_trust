/* SMARTTRUST — shared helpers (no globals, no dependencies) */
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches;
export const saveData = () => !!(navigator.connection && navigator.connection.saveData);

/** run once per element */
export const once = (el, key = 'stReady') => {
  if (!el || el.dataset[key] === '1') return false;
  el.dataset[key] = '1';
  return true;
};

/** translation with fallback text (salla.lang may not be loaded yet) */
export const t = (key, fallback = '') => {
  try {
    const v = window.salla && salla.lang && salla.lang.get(key);
    return v && v !== key ? v : fallback;
  } catch (e) {
    return fallback;
  }
};

export const money = (v) => {
  try { return salla.money(v); } catch (e) { return v; }
};

export const escapeHtml = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** salla.money() may return HTML (the SAR symbol is an icon: <i class=sicon-sar></i>).
 *  Escape everything, then restore only Salla's icon tags — safe for innerHTML. */
export const moneyHtml = (v) => escapeHtml(money(v))
  .replace(/&lt;i class=(?:&quot;|&#39;)?(sicon-[a-z0-9-]+)(?:&quot;|&#39;)?&gt;&lt;\/i&gt;/g, '<i class="$1"></i>');

/** write a formatted price into an element (never as raw text: the currency may be an icon) */
export const setMoney = (el, v) => { if (el) el.innerHTML = moneyHtml(v); };

/** keep only http(s)/relative urls */
export const safeUrl = (u) => {
  const s = String(u || '').trim();
  return /^(https?:\/\/|\/)/i.test(s) ? s : '';
};

export const waLink = (number, text) => {
  const n = String(number || '').replace(/[^\d]/g, '');
  if (!n) return '';
  return 'https://wa.me/' + n + (text ? '?text=' + encodeURIComponent(text) : '');
};

/** lazy-load a module only when its host exists in the DOM */
export function lazyWhenExists({ selector, importer, init }) {
  const hosts = $$(selector);
  if (!hosts.length) return;
  importer().then((mod) => (init ? init(mod, hosts) : mod.default(hosts))).catch((e) => console.warn('[smarttrust]', e));
}

export const onSalla = (cb) => {
  if (window.salla && typeof salla.onReady === 'function') salla.onReady(cb);
  else document.addEventListener('DOMContentLoaded', cb);
};
