/* SMARTTRUST — global entry (every page) */
import { $$, lazyWhenExists, onSalla } from './services/utils';
import initHeader from './services/header';
import initReveal from './services/reveal';
import initCursorLight from './services/cursor-light';

function initDetailsAccordions() {
  // footer groups: open on desktop, collapsible on mobile
  const mq = window.matchMedia('(max-width: 767px)');
  const sync = () => $$('[data-st-collapse]').forEach((d) => { d.open = !mq.matches; });
  sync();
  mq.addEventListener ? mq.addEventListener('change', sync) : mq.addListener(sync);
}

function initWhatsApp() {
  // links that must carry the current page in the message
  $$('[data-st-wa]').forEach((a) => {
    a.addEventListener('click', () => {
      try {
        const u = new URL(a.href);
        const txt = (u.searchParams.get('text') || '') + '\n' + location.href;
        u.searchParams.set('text', txt.trim());
        a.href = u.toString();
      } catch (e) { /* noop */ }
    }, { once: true });
  });
}

// letter-spacing breaks Arabic joining: tracked mono labels that contain Arabic get .is-ar
function markArabicLabels(root = document) {
  const AR = /[\u0600-\u06FF]/;
  $$('.st-label, .st-burger__label, .st-footer__h, .st-float__tag, .st-project__num, .st-map__sys, .st-card__tag', root)
    .forEach((el) => { if (AR.test(el.textContent)) el.classList.add('is-ar'); });
}

// floating KNX button steps aside while the KNX request section is on screen (it would point at itself)
function initFab() {
  const fab = $$('[data-st-fab]')[0];
  const target = document.getElementById('knx-request');
  if (!fab || !target || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(([e]) => fab.classList.toggle('is-knx-visible', e.isIntersecting), { threshold: 0.15 }).observe(target);
}

function boot() {
  markArabicLabels();
  initHeader();
  initDetailsAccordions();
  initReveal();
  initCursorLight();
  initWhatsApp();
  initFab();
  lazyWhenExists({ selector: '[data-st-knx-form]', importer: () => import(/* webpackChunkName: "knx-form" */ './services/knx-form') });
  document.dispatchEvent(new CustomEvent('theme::ready'));
}

onSalla(boot);
