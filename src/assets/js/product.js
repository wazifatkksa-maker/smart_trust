/* SMARTTRUST — product page: gallery, live price, sticky buy bar */
import { $, $$, onSalla, setMoney } from './services/utils';

function initGallery() {
  const g = $('[data-st-gallery]');
  if (!g) return;
  const slides = $$('.st-gallery__slide', g);
  const thumbs = $$('.st-gallery__thumb', g);
  const count = $('[data-st-gcount]', g);
  const n = slides.length;
  let cur = 0;
  const go = (i) => {
    cur = (i + n) % n;
    slides.forEach((s, k) => {
      const on = k === cur;
      s.classList.toggle('is-active', on);
      s.setAttribute('aria-hidden', on ? 'false' : 'true');
      const v = $('video', s);
      if (v && !on) v.pause();
      const lazy = $('img[data-src]', s);
      if (on && lazy) { lazy.src = lazy.dataset.src; lazy.removeAttribute('data-src'); }
    });
    thumbs.forEach((t, k) => t.setAttribute('aria-current', k === cur ? 'true' : 'false'));
    if (count) count.textContent = `${String(cur + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;
  };
  thumbs.forEach((t, i) => t.addEventListener('click', () => go(i)));
  // keyboard + swipe on main stage
  const main = $('.st-gallery__main', g);
  if (main && n > 1) {
    main.addEventListener('keydown', (e) => {
      const rtl = document.dir === 'rtl';
      if (e.key === (rtl ? 'ArrowLeft' : 'ArrowRight')) go(cur + 1);
      if (e.key === (rtl ? 'ArrowRight' : 'ArrowLeft')) go(cur - 1);
    });
    let x0 = null;
    main.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    main.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      const rtl = document.dir === 'rtl';
      if (Math.abs(dx) > 40) go(cur + ((dx < 0) !== rtl ? 1 : -1));
      x0 = null;
    }, { passive: true });
  }
  go(0);
}

function initPrice() {
  const form = $('[data-st-product-form]');
  if (!form || !window.salla || !salla.product) return;
  const id = Number(form.querySelector('[name="id"]') && form.querySelector('[name="id"]').value);
  const now = $$('[data-st-price]');
  const old = $$('[data-st-price-old]');
  const wrap = $$('[data-st-price-wrap]');
  const status = $('[data-st-price-status]', form);
  let seq = 0;

  const setStatus = (msg) => {
    if (!status) return;
    status.textContent = msg || '';
    status.hidden = !msg;
  };
  const busy = (on) => wrap.forEach((el) => {
    el.classList.toggle('is-stale', on);
    el.setAttribute('aria-busy', on ? 'true' : 'false');
  });

  const update = () => {
    const mine = ++seq;
    busy(true);
    setStatus('');
    salla.product.getPrice(new FormData(form))
      .catch((err) => {
        // only the latest request may report; the shown price is no longer reliable
        if (mine !== seq) return;
        console.warn('[smarttrust] price', err);
        setStatus(status && status.dataset.error);
      })
      .finally(() => { if (mine === seq) busy(false); });
  };
  form.addEventListener('change', update);

  salla.product.event.onPriceUpdated((res, productId) => {
    if (productId && id && Number(productId) !== id) return;
    const d = res && res.data;
    if (!d) return;
    setStatus('');
    now.forEach((el) => setMoney(el, d.price));
    old.forEach((el) => {
      if (d.has_sale_price) setMoney(el, d.regular_price); else el.textContent = '';
      el.hidden = !d.has_sale_price;
    });
    wrap.forEach((el) => el.classList.toggle('is-sale', !!d.has_sale_price));
  });
}

function initStickyBuy() {
  const bar = $('.st-sticky-buy');
  const anchor = $('[data-st-buy-anchor]');
  if (!bar || !anchor || !('IntersectionObserver' in window)) return;
  document.body.classList.add('st-has-sticky-buy');
  bar.inert = true;
  new IntersectionObserver(([e]) => {
    const past = !e.isIntersecting && e.boundingClientRect.top < 0;
    bar.classList.toggle('is-visible', past);
    bar.setAttribute('aria-hidden', past ? 'false' : 'true');
    bar.inert = !past; // off-screen bar must not take keyboard focus
  }).observe(anchor);
  const jump = $('[data-st-buy-jump]', bar);
  jump && jump.addEventListener('click', () => anchor.scrollIntoView({ behavior: 'smooth', block: 'center' }));
}

onSalla(() => {
  initGallery();
  initPrice();
  initStickyBuy();
});
