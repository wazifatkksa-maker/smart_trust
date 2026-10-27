/* SMARTTRUST — product listing: filter sheet (mobile), sort, result count */
import { $, $$, onSalla } from './services/utils';

function initSheet() {
  const sheet = $('#st-filters');
  const scrim = $('.st-sheet-scrim');
  if (!sheet) return;
  const open = () => { sheet.classList.add('is-open'); scrim && scrim.classList.add('is-open'); document.body.classList.add('st-lock'); const f = $('button', sheet); f && f.focus(); };
  const close = () => { sheet.classList.remove('is-open'); scrim && scrim.classList.remove('is-open'); document.body.classList.remove('st-lock'); };
  $$('[data-st-filters-open]').forEach((b) => b.addEventListener('click', open));
  $$('[data-st-filters-close]').forEach((b) => b.addEventListener('click', close));
  scrim && scrim.addEventListener('click', close);
  sheet.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  const filters = $('salla-filters', sheet);
  filters && filters.addEventListener('changed', () => { if (window.matchMedia('(max-width: 1023px)').matches) close(); });
}

function initSort() {
  const sel = $('#st-sort');
  if (!sel) return;
  sel.addEventListener('change', () => {
    // salla-products-list reads ?sort= on load — a clean, shareable URL
    const u = new URL(window.location.href);
    u.searchParams.set('sort', sel.value);
    u.searchParams.delete('page');
    window.location.assign(u.toString());
  });
}

function initCount() {
  const out = $('[data-st-count]');
  const list = $('salla-products-list');
  if (!out || !list) return;
  list.addEventListener('productsFetched', (e) => {
    const d = e.detail;
    const total = d && (d.cursor && d.cursor.count != null ? d.cursor.count : (d.data && d.data.length));
    if (total != null) out.textContent = out.dataset.tpl.replace(':count', total);
  });
}

onSalla(() => { initSheet(); initSort(); initCount(); });
