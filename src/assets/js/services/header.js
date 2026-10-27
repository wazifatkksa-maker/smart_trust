/* Header: transparent→solid on scroll, hide on scroll-down, main menu from Salla, mobile drawer, cart count */
import { $, $$, escapeHtml, safeUrl, t } from './utils';

const CHEV = '<svg class="st-nav__chev" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M2 4l3 3 3-3"/></svg>';

function samePath(url) {
  try {
    const u = new URL(url, location.origin);
    return u.pathname.replace(/\/$/, '') === location.pathname.replace(/\/$/, '');
  } catch (e) { return false; }
}

function renderDesktop(items) {
  return items.map((m) => {
    const url = safeUrl(m.url) || '';
    const title = escapeHtml(m.title);
    const kids = (m.children || []).filter((c) => c && c.title);
    const cur = samePath(url) ? ' aria-current="page"' : '';
    if (!kids.length) return `<div class="st-nav__item"><a class="st-nav__link" href="${url}"${cur}>${title}</a></div>`;
    const sub = kids.map((c) => `<a href="${safeUrl(c.url)}">${escapeHtml(c.title)}</a>`).join('');
    return `<div class="st-nav__item"><a class="st-nav__link" href="${url}"${cur} aria-haspopup="true">${title}${CHEV}</a>` +
      `<div class="st-nav__panel">${sub}<a href="${url}">${escapeHtml(t('blocks.header.view_all', 'عرض الكل'))} <span class="st-arrow">←</span></a></div></div>`;
  }).join('');
}

function renderMobile(items) {
  return items.map((m) => {
    const url = safeUrl(m.url) || '';
    const kids = (m.children || []).filter((c) => c && c.title);
    if (!kids.length) return `<a href="${url}">${escapeHtml(m.title)}<span class="st-arrow" aria-hidden="true">←</span></a>`;
    return `<details><summary>${escapeHtml(m.title)}<span class="st-plus" aria-hidden="true">+</span></summary>` +
      kids.map((c) => `<a href="${safeUrl(c.url)}">${escapeHtml(c.title)}</a>`).join('') +
      `<a href="${url}">${escapeHtml(t('blocks.header.view_all', 'عرض الكل'))}</a></details>`;
  }).join('');
}

function loadMenu() {
  const desk = $('[data-st-menu]');
  const mob = $('[data-st-menu-mobile]');
  if (!desk && !mob) return;
  const api = window.salla && salla.api && salla.api.component;
  const fn = api && (api.getMenus || api.menus);
  const fallback = () => {
    if (desk && !desk.children.length) desk.innerHTML = '<salla-menu source="header"></salla-menu>';
    if (mob && !mob.children.length) mob.innerHTML = '<salla-menu source="header"></salla-menu>';
  };
  if (!fn) return fallback();
  Promise.resolve(fn.call(api, 'header')).then((res) => {
    const items = (res && res.data) || [];
    if (!items.length) return fallback();
    if (desk) { desk.innerHTML = renderDesktop(items); desk.removeAttribute('aria-busy'); }
    if (mob) mob.innerHTML = renderMobile(items);
  }).catch(fallback);
}

function initScroll(header) {
  const over = header.classList.contains('st-header--over');
  const sticky = header.classList.contains('st-header--sticky') || over;
  let last = window.scrollY;
  let ticking = false;
  const update = () => {
    const y = window.scrollY;
    if (over) header.classList.toggle('is-scrolled', y > 40);
    if (sticky) {
      const goingDown = y > last && y > 480;
      header.classList.toggle('is-hidden', goingDown && !header.contains(document.activeElement));
    }
    last = y;
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
}

function initDrawer() {
  const drawer = $('#st-drawer');
  if (!drawer) return;
  const openers = $$('[data-st-drawer-open]');
  const closers = $$('[data-st-drawer-close]', drawer);
  let lastFocus = null;
  const open = () => {
    lastFocus = document.activeElement;
    drawer.classList.add('is-open');
    drawer.removeAttribute('aria-hidden');
    document.body.classList.add('st-lock');
    openers.forEach((b) => b.setAttribute('aria-expanded', 'true'));
    const f = $('button, a', drawer.querySelector('.st-drawer__panel'));
    f && setTimeout(() => f.focus(), 50);
  };
  const close = () => {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('st-lock');
    openers.forEach((b) => b.setAttribute('aria-expanded', 'false'));
    lastFocus && lastFocus.focus();
  };
  openers.forEach((b) => b.addEventListener('click', open));

  // systems accordion: one open at a time + product preview that follows the hovered system
  const systems = $$('.st-sys', drawer);
  const prev = $('.st-drawer__preview', drawer);
  const pimg = prev && $('img', prev);
  const show = (src) => {
    if (!pimg || !src || pimg.getAttribute('src') === src) return;
    prev.classList.add('is-swap');
    setTimeout(() => { pimg.src = src; pimg.onload = () => prev.classList.remove('is-swap'); }, 180);
  };
  systems.forEach((d) => {
    const sum = $('summary', d);
    ['pointerenter', 'focus'].forEach((ev) => sum.addEventListener(ev, () => show(d.dataset.preview)));
    d.addEventListener('toggle', () => {
      if (!d.open) return;
      show(d.dataset.preview);
      systems.forEach((o) => { if (o !== d) o.open = false; });
    });
  });
  closers.forEach((b) => b.addEventListener('click', close));
  drawer.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
    if (e.key !== 'Tab') return;
    const f = $$('a[href], button:not([disabled]), summary, input', drawer).filter((el) => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0];
    const lastEl = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
    else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
  });
}

function initCart() {
  const counters = $$('[data-st-cart-count]');
  const set = (n) => counters.forEach((c) => {
    const v = Number(n) || 0;
    c.textContent = v > 99 ? '99+' : String(v);
    c.dataset.count = String(v);
  });
  try {
    salla.cart.event.onUpdated((summary) => summary && set(summary.count));
  } catch (e) { /* salla not ready */ }
}

function initSearch() {
  $$('[data-st-search]').forEach((b) => b.addEventListener('click', () => {
    try { salla.event.dispatch('search::open'); } catch (e) { /* noop */ }
  }));
}

export default function initHeader() {
  const header = $('#st-header');
  if (header && header.classList.contains('st-header--over') && !$('main .st-hero')) {
    // home without a cinematic hero on top: fall back to the solid header
    header.classList.remove('st-header--over');
    document.body.classList.remove('st-has-over-header');
    $$('.st-header__cta', header).forEach((b) => b.classList.remove('st-btn--glass'));
  }
  if (header) initScroll(header);
  initDrawer();
  initSearch();
  initCart();
  loadMenu();
}
