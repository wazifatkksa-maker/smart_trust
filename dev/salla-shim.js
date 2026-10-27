/* DEV ONLY — a tiny stand-in for Salla's runtime so the theme can be previewed outside Salla.
 * Implements the `salla` object and the web components the theme uses, with mock data.
 * On a real Salla store this file is never loaded: Salla injects the real SDK and components. */
(function () {
  // Safety: never run next to the real SDK (a real Salla page has salla.api), and only with dev data present.
  if ((window.salla && window.salla.api) || !window.__ST_DEV__) {
    console.warn('[smarttrust] dev shim skipped: real Salla runtime detected or no dev data');
    return;
  }
  const D = window.__ST_DEV__ || {};
  const L = D.loc || {};
  const rtl = D.lang !== 'en';
  // like the real SDK: the SAR symbol comes back as an icon (HTML), not text
  const money = (v) => `${Number(v || 0).toLocaleString('en-US')} <i class=sicon-sar></i>`;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem('st-dev-' + k)); localStorage.setItem('st-dev-' + k, JSON.stringify(v)); } catch (e) { return null; } return v; };

  /* ---------------- salla object ---------------- */
  const listeners = {};
  const on = (n) => (cb) => { (listeners[n] = listeners[n] || []).push(cb); };
  const emit = (n, ...a) => (listeners[n] || []).forEach((cb) => cb(...a));
  let cartCount = store('cart') ?? (D.cart ? D.cart.items_count : 0);

  function toast(msg) {
    let t = document.getElementById('st-dev-toast');
    if (!t) { t = document.createElement('div'); t.id = 'st-dev-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.innerHTML = `<span class="st-dot"></span>${esc(msg)}<a href="${D.links.cart}">${rtl ? 'عرض السلة' : 'View cart'}</a>`;
    t.classList.add('is-on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('is-on'), 2600);
  }
  function addToCart(id, qty) {
    cartCount += Number(qty) || 1; store('cart', cartCount);
    emit('cart.updated', { count: cartCount });
    const p = (D.products || []).find((x) => String(x.id) === String(id));
    toast(rtl ? `أُضيف ${p ? p.name : 'المنتج'} إلى السلة` : 'Added to cart');
    return Promise.resolve();
  }

  // ?st_fail=price,cart,remove — simulate SDK failures to check the theme's error states locally
  const FAIL = (new URLSearchParams(location.search).get('st_fail') || '').split(',');
  const reject = (what) => Promise.reject(new Error('[dev] simulated ' + what + ' failure'));

  window.salla = {
    onReady: (cb) => (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', cb) : cb()),
    money,
    lang: { get: (k) => { const v = k.split('.').reduce((o, p) => (o || {})[p], L); return typeof v === 'string' ? v : k; }, onLoaded: () => {} },
    config: { isGuest: () => false, get: () => null },
    event: { dispatch: (n) => emit(n), on: (n, cb) => on(n)(cb), emit },
    cart: {
      event: { onUpdated: on('cart.updated'), onSubmitFailed: on('x'), onItemUpdated: on('cart.item.updated'), onItemUpdatedFailed: on('cart.item.failed') },
      deleteItem: (id) => { if (FAIL.includes('remove')) return reject('remove'); const it = (D.cart.items || []).find((i) => String(i.id) === String(id)); cartCount = Math.max(0, cartCount - (it ? it.quantity : 1)); store('cart', cartCount); emit('cart.updated', { count: cartCount }); return Promise.resolve(); },
      addItem: (d) => addToCart(d.id, d.quantity), submit: () => alert(rtl ? 'الدفع تديره سلة على المتجر الحقيقي.' : 'Checkout is handled by Salla.'),
    },
    product: {
      getPrice: (data) => {
        if (FAIL.includes('price')) return reject('price');
        const id = data instanceof FormData ? data.get('id') : (data && data.id) || data;
        const pr = (D.products || []).find((x) => String(x.id) === String(id));
        const res = pr ? { data: { price: pr.is_on_sale ? pr.sale_price : pr.price, regular_price: pr.regular_price, has_sale_price: !!pr.is_on_sale } } : null;
        if (res) emit('price', res, Number(id));
        return Promise.resolve(res);
      },
      event: { onPriceUpdated: on('price') },
    },
    storage: { get: (k, d) => (k === 'salla::wishlist' ? (store('wishlist') || []) : d) },
    wishlist: { toggle: () => Promise.resolve() },
    form: {
      onChange: (action, e) => {
        const id = e && e.target && e.target.form ? new FormData(e.target.form).get('id') : null;
        setTimeout(() => (FAIL.includes('cart') ? emit('cart.item.failed', new Error('[dev] simulated cart failure'), id) : emit('cart.item.updated', {}, id)), 300);
        return false;
      },
      onSubmit: (action, e) => { e && e.preventDefault(); if (action === 'cart.addItem') { const f = new FormData(e.target); addToCart(f.get('id'), f.get('quantity')); } return false; },
    },
    api: { component: { getMenus: () => Promise.resolve({ data: D.menu || [] }) } },
  };

  /* ---------------- components ---------------- */
  const def = (name, render) => {
    if (customElements.get(name)) return;
    customElements.define(name, class extends HTMLElement {
      connectedCallback() {
        // wait for the element's children (slot text) and the rest of the page to be parsed
        const go = () => { if (!this._r) { this._r = 1; render(this); } };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go, { once: true }); else go();
      }
    });
  };
  const a = (el, n) => el.getAttribute(n);

  // product grid / rail — renders the theme's own <custom-salla-product-card>
  def('salla-products-list', (el) => {
    const src = a(el, 'source') || 'latest';
    const val = a(el, 'source-value') || '';
    const limit = Number(a(el, 'limit') || 0);
    let list = (D.products || []).slice();
    if (src === 'related') list = list.filter((p) => String(p.id) !== val);
    else if (src === 'search') { const q = val.toLowerCase(); list = list.filter((p) => (p.name + ' ' + (p.tags || []).map((t) => t.name).join(' ')).toLowerCase().includes(q)); }
    else if (src === 'selected') { let ids = []; try { ids = JSON.parse(val); } catch (e) { /* */ } list = list.filter((p) => ids.map(String).includes(String(p.id))); }
    else if (src === 'product.index' && val && val !== '0') list = list.filter((p) => String(p.category_id) === val);
    else if (src === 'offers') list = list.filter((p) => p.is_on_sale);
    else if (src === 'wishlist') list = list.slice(0, 3);
    const draw = (items) => {
      el.innerHTML = '';
      const w = document.createElement('div'); w.className = 's-products-list-wrapper';
      items.slice(0, limit || items.length).forEach((p) => { const c = document.createElement('custom-salla-product-card'); c.product = p; w.appendChild(c); });
      el.appendChild(w);
      if (!items.length) el.insertAdjacentHTML('beforeend', `<div class="s-products-list-placeholder"><p>${rtl ? 'لا توجد منتجات مطابقة.' : 'No matching products.'}</p></div>`);
      el.dispatchEvent(new CustomEvent('productsFetched', { bubbles: true, detail: { cursor: { count: items.length } } }));
    };
    el._all = list; el.setFilters = (sys) => draw(sys.length ? list.filter((p) => (p.tags || []).some((t) => sys.includes(t.name))) : list);
    const sort = new URLSearchParams(location.search).get('sort');
    if (sort === 'priceFromLowToTop') list.sort((x, y) => (x.sale_price || x.price) - (y.sale_price || y.price));
    if (sort === 'priceFromTopToLow') list.sort((x, y) => (y.sale_price || y.price) - (x.sale_price || x.price));
    draw(list);
  });
  def('salla-products-slider', (el) => { el.innerHTML = '<salla-products-list source="' + (a(el, 'source') || 'latest') + '" source-value="' + (a(el, 'source-value') || '') + '"></salla-products-list>'; });

  def('salla-filters', (el) => {
    const g = (t, items) => `<details class="s-filters-widget" open><summary class="s-filters-widget-title">${t}</summary><div class="s-filters-widget-content" style="display:flex;flex-direction:column;gap:12px">${items}</div></details>`;
    el.innerHTML = g(rtl ? 'النظام' : 'System', ['KNX', 'Zigbee', 'Control4'].map((s) => `<label class="st-check"><input type="checkbox" value="${s}">${s}</label>`).join(''))
      + g(rtl ? 'التوفر' : 'Availability', `<label class="st-check"><input type="checkbox" disabled>${rtl ? 'متوفر فقط' : 'In stock only'}</label>`);
    el.addEventListener('change', () => {
      const sys = [...el.querySelectorAll('input:checked')].map((i) => i.value);
      document.querySelectorAll('salla-products-list').forEach((l) => l.setFilters && l.setFilters(sys));
      el.dispatchEvent(new CustomEvent('changed'));
    });
  });

  def('salla-add-product-button', (el) => {
    const out = a(el, 'product-status') === 'out';
    const label = el.textContent.trim() || (rtl ? 'أضف إلى السلة' : 'Add to cart');
    el.innerHTML = `<button type="button" class="s-button-btn st-btn st-btn--wide" ${out ? 'disabled' : ''}>${out ? (rtl ? 'نفدت الكمية' : 'Out of stock') : esc(label)}</button>`;
    el.querySelector('button').addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const form = el.closest('form'); const q = form && form.querySelector('[name=quantity]');
      addToCart(a(el, 'product-id'), q ? q.value : 1);
    });
  });
  def('salla-quantity-input', (el) => {
    const v = a(el, 'value') || 1; const max = Number(a(el, 'max') || 99);
    el.innerHTML = `<div class="s-quantity-input-container st-qty"><button type="button" aria-label="+">+</button><input name="${a(el, 'name') || 'quantity'}" value="${v}" inputmode="numeric" aria-label="${rtl ? 'الكمية' : 'Quantity'}"><button type="button" aria-label="−">−</button></div>`;
    const i = el.querySelector('input'); const [plus, minus] = el.querySelectorAll('button');
    plus.onclick = () => { i.value = Math.min(max, +i.value + 1); i.dispatchEvent(new Event('change', { bubbles: true })); };
    minus.onclick = () => { i.value = Math.max(1, +i.value - 1); i.dispatchEvent(new Event('change', { bubbles: true })); };
    // same contract as the real component: setValue(v, false) updates without firing change
    el.setValue = (val, fire = true) => { i.value = Math.min(max, Math.max(1, +val || 1)); if (fire) i.dispatchEvent(new Event('change', { bubbles: true })); return Promise.resolve(el); };
  });
  def('salla-breadcrumb', (el) => {
    const h = document.querySelector('main h1');
    el.innerHTML = `<nav aria-label="breadcrumb" class="st-crumbs"><a href="${D.links.home}">${rtl ? 'الرئيسية' : 'Home'}</a><span>/</span><span aria-current="page">${esc(h ? h.textContent.trim() : '')}</span></nav>`;
  });
  def('salla-user-menu', (el) => {
    const items = [[rtl ? 'الطلبات' : 'Orders', D.links.orders], [rtl ? 'الملف الشخصي' : 'Profile', D.links.profile], [rtl ? 'المفضلة' : 'Wishlist', D.links.wishlist], [rtl ? 'الإشعارات' : 'Notifications', D.links.notifications]];
    if (el.hasAttribute('inline')) {
      el.innerHTML = `<div class="s-user-menu-dropdown"><div class="s-user-menu-dropdown-list">${items.map(([t, u]) => `<a class="s-user-menu-dropdown-item-link" href="${u}" ${location.pathname.endsWith(u.replace(/^\//, '')) || location.pathname === u ? 'aria-current="page"' : ''}>${t}</a>`).join('')}</div></div>`;
    } else {
      el.innerHTML = `<a class="s-user-menu-trigger st-icon-btn" href="${D.links.orders}" aria-label="${rtl ? 'حسابي' : 'Account'}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg></a>`;
    }
  });
  def('salla-menu', (el) => {
    el.innerHTML = `<div class="s-menu-footer-list">${(D.footerMenu || []).map((m) => `<a class="s-menu-footer-item" href="${m.url}">${esc(m.title)}</a>`).join('')}</div>`;
  });
  def('salla-contacts', (el) => {
    const c = (D.store || {}).contacts || {};
    el.innerHTML = `<div class="s-contacts-list">${c.mobile ? `<a href="tel:${c.mobile.replace(/\s/g, '')}" dir="ltr">${c.mobile}</a>` : ''}${c.email ? `<a href="mailto:${c.email}">${c.email}</a>` : ''}${c.whatsapp ? `<a href="https://wa.me/${c.whatsapp}">WhatsApp</a>` : ''}<span>[${rtl ? 'المدينة، الحي' : 'City, district'}]</span></div>`;
  });
  def('salla-social', (el) => {
    el.innerHTML = `<div class="s-social-list">${['IG', 'X', 'SC', 'TT', 'YT'].map((s) => `<a class="s-social-link" href="#" aria-label="${s}" style="font-family:var(--st-mono);font-size:11px">${s}</a>`).join('')}</div>`;
  });
  def('salla-payments', (el) => {
    el.innerHTML = `<div class="s-payments-list">${['mada', 'VISA', 'Mastercard', 'Apple Pay', 'STC Pay', 'Tabby'].map((p) => `<span class="s-payments-list-item" style="font:600 11px var(--st-mono);color:#111">${p}</span>`).join('')}</div>`;
  });
  def('salla-trust-badges', (el) => { el.innerHTML = `<div class="s-trust-badges-content"><span class="s-trust-badges-label">${rtl ? 'شهادة ضريبة القيمة المضافة · منصة الأعمال' : 'VAT certificate · Business platform'}</span></div>`; });
  def('salla-rating-stars', (el) => { const n = Number(a(el, 'value') || 5); el.innerHTML = `<span style="letter-spacing:2px">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span> <span class="st-small st-muted">(${a(el, 'reviews') || 0})</span>`; });
  def('salla-social-share', (el) => { el.innerHTML = `<span style="display:flex;gap:14px">${['WhatsApp', 'X', rtl ? 'نسخ الرابط' : 'Copy link'].map((s) => `<a href="#" class="st-link">${s}</a>`).join('')}</span>`; });
  def('salla-metadata', (el) => {
    const rows = rtl ? [['البروتوكول', 'KNX · Zigbee'], ['جهد التشغيل', '[—]'], ['التركيب', 'جداري داخلي'], ['الضمان', '[—]']] : [['Protocol', 'KNX · Zigbee'], ['Voltage', '[—]'], ['Mounting', 'Indoor wall'], ['Warranty', '[—]']];
    el.innerHTML = `<table class="st-prose" style="max-width:none"><tbody>${rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</tbody></table>`;
  });
  def('salla-comments', (el) => {
    const r = rtl ? [['سارة', 'تركيب نظيف ومظهر فخم على الجدار.'], ['عبدالله', 'الاستجابة سريعة، والمؤشر الضوئي هادئ في الليل.']] : [['Sara', 'Clean install, premium look.'], ['Abdullah', 'Responsive, and the indicator is calm at night.']];
    el.innerHTML = r.map(([n, t]) => `<div style="padding:22px 0;border-top:1px solid var(--st-line);display:flex;flex-direction:column;gap:6px"><span style="display:flex;justify-content:space-between"><b style="font-weight:500">${n}</b><span>★★★★★</span></span><span class="st-muted">${t}</span></div>`).join('') + `<p class="st-small st-muted" style="padding-top:16px">[${rtl ? 'التقييمات الحقيقية تأتي من سلة' : 'Real reviews come from Salla'}]</p>`;
  });
  def('salla-cart-coupons', (el) => { el.innerHTML = `<div class="st-coupon"><input placeholder="${rtl ? 'كود الخصم' : 'Coupon code'}" aria-label="${rtl ? 'كود الخصم' : 'Coupon code'}"><button type="button">${rtl ? 'تطبيق' : 'Apply'}</button></div>`; });
  def('salla-cart-summary-card', (el) => {
    const c = D.cart || {}; const tax = Math.round((c.sub_total || 0) * 0.13);
    el.innerHTML = `<dl class="st-summary__rows"><div><dt>${rtl ? 'المجموع الفرعي' : 'Subtotal'}</dt><dd>${money(c.sub_total)}</dd></div><div><dt>${rtl ? 'الشحن' : 'Shipping'}</dt><dd>${rtl ? 'يُحسب عند الدفع' : 'At checkout'}</dd></div><div><dt>${rtl ? 'منها الضريبة' : 'Incl. VAT'}</dt><dd>${money(tax)}</dd></div></dl>
      <div class="st-summary__total" style="margin:6px 0 18px"><span>${rtl ? 'الإجمالي' : 'Total'}</span><b>${money(c.total)}</b></div>
      <button type="button" class="st-btn st-btn--wide" onclick="salla.cart.submit()">${rtl ? 'إتمام الطلب' : 'Checkout'} <span class="st-arrow">←</span></button>`;
  });
  def('salla-orders', (el) => {
    el.innerHTML = `<div class="st-order-items">${[['884217', '2026-09-21', rtl ? 'قيد التنفيذ' : 'Processing', '#E3D24A', 1119], ['870015', '2026-07-02', rtl ? 'تم التوصيل' : 'Delivered', '#3F6B4E', 540]].map(([id, d, s, c, t]) => `<a class="st-order-item" href="${D.links.order}" style="grid-template-columns:1fr auto auto"><span><b class="st-mono" style="font-weight:500">#${id}</b> <span class="st-small st-muted">${d}</span></span><span class="st-status" style="--c:${c}"><i></i>${s}</span><span>${money(t)}</span></a>`).join('')}</div>`;
  });
  const note = (t) => (el) => { el.innerHTML = `<div class="st-panel"><p class="st-muted">${t}</p></div>`; };
  def('salla-notifications', note(rtl ? 'لا توجد إشعارات جديدة. [يعرضها مكوّن سلة]' : 'No new notifications.'));
  def('salla-user-profile', note(rtl ? 'نموذج الملف الشخصي يعرضه مكوّن سلة (الاسم، الجوال، البريد، تاريخ الميلاد…).' : 'Profile form is rendered by Salla.'));
  def('salla-user-settings', note(rtl ? 'إعدادات الحساب والتنبيهات — مكوّن سلة.' : 'Account settings — Salla component.'));
  def('salla-loyalty-program', note(rtl ? 'برنامج الولاء — مكوّن سلة.' : 'Loyalty — Salla component.'));
  def('salla-apps-icons', () => {});
  ['salla-login-modal', 'salla-offer-modal', 'salla-localization-modal', 'salla-scopes', 'salla-product-options'].forEach((n) => def(n, () => {}));

  // search overlay (the real one is <salla-search>)
  def('salla-search', (el) => {
    el.innerHTML = `<div class="st-dev-search" hidden role="dialog" aria-modal="true" aria-label="${rtl ? 'بحث' : 'Search'}"><form><input type="search" name="q" placeholder="${rtl ? 'ابحث عن منتج أو نظام… مثل KNX' : 'Search… e.g. KNX'}" aria-label="${rtl ? 'بحث' : 'Search'}"><button type="button" class="st-icon-btn" data-x aria-label="×">✕</button></form></div>`;
    const box = el.firstElementChild; const input = box.querySelector('input');
    on('search::open')(() => { box.hidden = false; setTimeout(() => input.focus(), 30); });
    box.querySelector('[data-x]').onclick = () => { box.hidden = true; };
    box.addEventListener('keydown', (e) => { if (e.key === 'Escape') box.hidden = true; });
    box.querySelector('form').onsubmit = (e) => {
      e.preventDefault(); const q = input.value.trim(); if (!q) return;
      location.href = D.mode === 'export' ? `search-${q.toLowerCase()}.html` : D.links.search + encodeURIComponent(q);
    };
  });

  /* ---------------- dev styles for the shims ---------------- */
  const css = `
  #st-dev-toast{position:fixed;z-index:200;inset-inline-start:24px;bottom:24px;display:flex;gap:12px;align-items:center;background:#111214;color:#F1EDE6;padding:16px 18px;font-size:14px;transform:translateY(140%);transition:transform .35s cubic-bezier(.2,.7,.2,1)}
  #st-dev-toast.is-on{transform:none} #st-dev-toast a{text-decoration:underline;margin-inline-start:12px}
  .st-qty{display:flex;align-items:stretch;height:56px;border:1px solid #CFC7BA} .st-qty button{width:44px;background:none;border:0;font-size:18px;cursor:pointer}
  .st-qty input{width:44px;text-align:center;border:0;background:transparent;font-family:var(--st-mono)} .st-citem .st-qty{height:44px}
  .st-crumbs{display:flex;gap:10px;flex-wrap:wrap} .st-crumbs a:hover{text-decoration:underline}
  .st-dev-search{position:fixed;inset:0 0 auto 0;z-index:120;background:#F4F1EB;border-bottom:1px solid #DDD6CA;padding:28px max(20px,calc((100vw - 1312px)/2))}
  .st-dev-search form{display:flex;gap:8px;border-bottom:1px solid #161616} .st-dev-search input{flex:1;height:56px;border:0;background:transparent;font:inherit;font-size:22px}
  .st-dev-search input:focus{outline:none;box-shadow:none}
  .s-filters-widget summary{list-style:none;cursor:pointer}
  #st-dev-badge{position:fixed;z-index:199;inset-inline-end:12px;bottom:12px;font:500 10px/1 var(--st-mono);letter-spacing:.14em;background:#E3D24A;color:#111;padding:6px 8px;opacity:.85}`;
  const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
  window.addEventListener('load', () => {
    if (D.mode !== 'export') { const b = document.createElement('div'); b.id = 'st-dev-badge'; b.textContent = 'PREVIEW · MOCK DATA'; document.body.appendChild(b); }
    emit('cart.updated', { count: cartCount });
  });
})();
