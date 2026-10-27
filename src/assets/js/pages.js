/* SMARTTRUST — content pages (system pages, about, contact, blog, brands, testimonials) */
import { $, $$, onSalla } from './services/utils';

function initTestimonialsSort() {
  const sel = $('[data-st-testimonials-sort]');
  const list = $('salla-comments[testimonials]');
  if (!sel || !list) return;
  const fromUrl = new URLSearchParams(window.location.search).get('sort');
  if (fromUrl && [...sel.options].some((o) => o.value === fromUrl)) {
    sel.value = fromUrl;
    list.setAttribute('sort', fromUrl);
  }
  sel.addEventListener('change', () => {
    const u = new URL(window.location.href);
    u.searchParams.set('sort', sel.value);
    window.history.replaceState(null, '', u.toString());
    list.sort = sel.value;
    list.setAttribute('sort', sel.value);
    if (typeof list.reload === 'function') list.reload().catch((e) => console.warn('[smarttrust] testimonials', e));
  });
}

onSalla(() => {
  // compare table: highlight the column of the current system page
  const sys = document.body.dataset.stSystem;
  if (sys) $$(`[data-col="${sys}"]`).forEach((c) => c.classList.add('is-hl'));
  initTestimonialsSort();
});
