/* Renders the real theme templates (src/views) with mock Salla data.
 * Used by dev/server.js (live preview) and dev/export.js (standalone .html pages). */
const Twig = require('twig');
const fs = require('fs');
const path = require('path');
const createMock = require('./mock');

const ROOT = path.resolve(__dirname, '..');
const VIEWS = path.join(ROOT, 'src/views');
Twig.cache(false);

let state = { home: [], page: '', lang: 'ar', loc: {}, mode: 'dev' };

let TW = null;
Twig.extend((T) => {
  TW = T;
  T.exports.extendTag({
    type: 'hook', regex: /^hook\s+(.+)$/, next: [], open: true,
    compile(t) { t.name = t.match[1].trim().replace(/^'|'$/g, ''); delete t.match; return t; },
    parse(t, ctx, chain) {
      if (t.name === 'copyright') {
        return { chain, output: `<p>© ${new Date().getFullYear()} ${ctx.store.name}. ${state.lang === 'ar' ? 'جميع الحقوق محفوظة · متجر يعمل على منصة سلة' : 'All rights reserved · Powered by Salla'}</p>` };
      }
      return { chain, output: `<!-- hook:${t.name} -->` };
    },
  });
  T.exports.extendTag({
    type: 'component', regex: /^component\s+(.+)$/, next: [], open: true,
    compile(t) { t.name = t.match[1].trim().replace(/^'|'$/g, ''); delete t.match; return t; },
    parse(t, ctx, chain) {
      const one = (p, data, i) => {
        const tpl = T.Templates.load('components.' + p);
        if (!tpl) throw new Error('Component not found: ' + p);
        return `<!-- component:${p} -->\n` + tpl.render(Object.assign({}, ctx, { component: data || {}, position: i || 0 }));
      };
      if (t.name === 'home') return { chain, output: state.home.map((h, i) => one(h.path, h.data, i)).join('\n') };
      return { chain, output: one(t.name, {}, 0) };
    },
  });
  T.exports.extendFunction('trans', (k) => {
    const v = k.split('.').reduce((o, p) => (o || {})[p], state.loc);
    if (typeof v !== 'string') { console.warn('[trans] missing key', k); return k; }
    return v;
  });
  T.exports.extendFunction('is_page', (p) => state.page === p);
  T.exports.extendFilter('cdn', (v) => 'https://cdn.salla.network/' + v);
  T.exports.extendFilter('money', (v) => (v === undefined || v === null || v === '' ? '' : `${Number(v).toLocaleString('en-US')} ${state.lang === 'ar' ? 'ر.س' : 'SAR'}`));
  T.exports.extendFilter('raw', (v) => v);
});

function loadTemplates() {
  const walk = (d) => fs.readdirSync(d).flatMap((f) => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? walk(p) : [p]; });
  TW.Templates.registry = {};
  for (const f of walk(VIEWS)) {
    const id = path.relative(VIEWS, f).replace(/\.twig$/, '').split(path.sep).join('.');
    Twig.twig({ id, data: fs.readFileSync(f, 'utf8'), allowInlineIncludes: true, rethrow: true });
  }
}

/** mode 'dev': /product/3 · mode 'export': product-3.html */
function linker(mode) {
  const U = (p) => {
    if (mode !== 'export') return p;
    const [pathname, query] = String(p).split('?');
    const hash = pathname.includes('#') ? '#' + pathname.split('#')[1] : '';
    const clean = pathname.split('#')[0].replace(/^\/|\/$/g, '');
    if (!clean) return 'index.html' + hash;
    let file = clean.replace(/\//g, '-') + '.html';
    if (clean === 'search' && query) file = 'search-' + decodeURIComponent(query.replace(/^q=/, '')).toLowerCase() + '.html';
    return file + hash;
  };
  const A = (f) => (mode === 'export' ? 'assets/' : '/public/') + f;
  return { U, A };
}

/** Route table — every page of the store. Returns [template, vars, pageSlug, extra] */
function routes(m, U, A) {
  const byId = (id) => m.products.find((p) => String(p.id) === String(id));
  const sorts = [{ id: 'ourSuggest', name: 'مقترحاتنا', is_selected: true }, { id: 'bestSell', name: 'الأكثر مبيعًا' }, { id: 'priceFromLowToTop', name: 'السعر: من الأقل' }, { id: 'priceFromTopToLow', name: 'السعر: من الأعلى' }];
  const sysPage = (id, title, content) => ['pages.page-single', { page: { id, title, content, type: 'page', slug: 'page-single' } }, 'page-single'];
  const r = {
    '/': () => ['pages.index', { page: { title: m.store.name, slug: 'index', id: 0 } }, 'index', { home: m.home }],
    '/products': () => ['pages.product.index', { page: { title: 'كل المنتجات', slug: 'product.index', id: 0 }, category: { name: 'كل المنتجات', sub_categories: m.categories }, filters: true, sort_options: sorts }, 'product.index'],
    '/cart': () => ['pages.cart', { cart: m.cart }, 'cart'],
    '/cart-empty': () => ['pages.cart', { cart: { items: [], items_count: 0 } }, 'cart'],
    '/cart-options': () => ['pages.cart', { cart: Object.assign({}, m.cart, { options: [{ id: 9901, quantity: 1, options: [{ id: 1, name: 'تغليف هدية', type: 'checkbox' }] }] }) }, 'cart'],
    '/thank-you': () => ['pages.thank-you', { order: m.order, thank_you: 'نشكرك على ثقتك. سنتواصل معك لتنسيق التوصيل والتركيب.' }, 'thank-you'],
    '/knx': () => sysPage(9001, 'نظام واحد يدير المنزل كله.', ''),
    '/zigbee': () => sysPage(9002, 'منزل ذكي بلا تمديدات.', ''),
    '/control4': () => sysPage(9003, 'واجهة واحدة لكل المنزل.', ''),
    '/about': () => sysPage(9004, 'من نحن', '<p>SMARTTRUST علامة سعودية متخصصة في أنظمة المنازل الذكية. نصمم ونوفر مفاتيح ولوحات تحكم بلغة تصميم واحدة، وننفذ مشاريع KNX وZigbee وControl4 من المخطط حتى التسليم.</p><p>[نص «من نحن» النهائي يُضاف من لوحة سلة]</p>'),
    '/contact': () => sysPage(9005, 'تواصل معنا', '<p>ساعات العمل: [الأحد – الخميس، 9 ص – 6 م]</p><p>العنوان: [المدينة، الحي]</p>'),
    '/page/privacy': () => sysPage(7001, 'سياسة الخصوصية', '<p>[نص سياسة الخصوصية من لوحة سلة]</p>'),
    '/page/shipping': () => sysPage(7002, 'الشحن والاسترجاع', '<p>[نص سياسة الشحن والاسترجاع من لوحة سلة]</p>'),
    '/projects': () => ['pages.blog.index', { page: { title: 'المشاريع', slug: 'blog.index' }, categories: [{ name: 'المشاريع', url: U('/projects'), is_current: true }, { name: 'المدونة', url: U('/projects'), is_current: false }], articles: Object.assign(m.articles.slice(), { next_page: null }) }, 'blog.index'],
    '/brands': () => ['pages.brands.index', { page: { title: 'الماركات' }, brands: { s: [{ name: 'SMARTTRUST', url: U('/brand/1'), logo: A('images/brand/logo-dark.svg') }] } }, 'brands.index'],
    '/brand/1': () => ['pages.brands.single', { brand: { id: 1, name: 'SMARTTRUST', logo: A('images/brand/logo-dark.svg'), description: 'مفاتيح ولوحات ذكية بتصميم زجاجي موحّد.' } }, 'brands.single'],
    '/account/orders': () => ['pages.customer.orders.index', { page: { title: 'الطلبات' } }, 'customer.orders.index'],
    '/account/order': () => ['pages.customer.orders.single', { order: m.order }, 'customer.orders.single'],
    '/account/profile': () => ['pages.customer.profile', { page: { title: 'الملف الشخصي' } }, 'customer.profile'],
    '/account/wishlist': () => ['pages.customer.wishlist', { page: { title: 'المفضلة' } }, 'customer.wishlist'],
    '/account/notifications': () => ['pages.customer.notifications', { page: { title: 'الإشعارات' } }, 'customer.notifications'],
    '/account/wallet': () => ['pages.customer.wallet', { page: { title: 'المحفظة' } }, 'customer.wallet'],
    '/testimonials': () => ['pages.testimonials', { page: { title: 'آراء العملاء' } }, 'testimonials'],
  };
  m.categories.forEach((c) => {
    r['/category/' + c.id] = () => ['pages.product.index', { page: { title: c.name, slug: 'product.index', id: c.id }, category: Object.assign({}, c, { sub_categories: [] }), filters: true, sort_options: sorts }, 'product.index'];
  });
  m.products.forEach((p) => { r['/product/' + p.id] = () => ['pages.product.single', { product: p, page: { title: p.name, slug: 'product.single', id: p.id } }, 'product.single']; });
  m.articles.forEach((a) => { r['/projects/' + a.id] = () => ['pages.blog.single', { article: a, page: { title: a.title } }, 'blog.single']; });
  ['KNX', 'Zigbee', 'Control4'].forEach((q) => {
    r['/search?q=' + q] = () => ['pages.product.index', { page: { title: q, slug: 'product.index', id: 0 }, search_query: q, filters: false, sort_options: sorts }, 'product.index'];
  });
  r.byId = byId;
  return r;
}

function render(route, { mode = 'dev', lang = 'ar', overrides = {} } = {}) {
  const { U, A } = linker(mode);
  const m = createMock({ U, A });
  const table = routes(m, U, A);
  let key = route;
  if (key.startsWith('/search')) {
    const q = new URLSearchParams(key.split('?')[1] || '').get('q') || '';
    table[key] = () => ['pages.product.index', { page: { title: q, slug: 'product.index', id: 0 }, search_query: q, filters: false, sort_options: [] }, 'product.index'];
  }
  const fn = table[key];
  if (!fn) return null;
  const [tpl, vars, slug, extra = {}] = fn();

  loadTemplates();
  // ?set___blank=1 mimics Salla's theme editor: every collection of every home section holds one blank item
  const BLANK = ['steps', 'scenes', 'systems', 'pillars', 'items', 'logos', 'locations', 'projects'];
  const home = (extra.home || []).map((h) => (overrides.__blank ? { path: h.path, data: Object.assign({}, h.data, Object.fromEntries(BLANK.map((k) => [k, [{}]]))) } : h));
  state = { home, page: slug, lang, mode, loc: JSON.parse(fs.readFileSync(path.join(ROOT, 'src/locales', lang + '.json'), 'utf8')) };

  const settings = Object.assign({}, m.settings, overrides);
  const theme = {
    id: 1, name: 'SMARTTRUST', mode: 'preview', is_rtl: lang === 'ar',
    font: { name: 'IBM Plex Sans Arabic', path: 'fonts/plex.css' },
    color: { primary: '#111214', reverse_text: '#FFFFFF', darker: () => '#000000', lighter: () => '#2A2B2D' },
    settings: { get: (k, d) => (k in settings && settings[k] !== null ? settings[k] : (d === undefined ? null : d)), set: (k, v) => { settings[k] = v; return ''; } },
  };
  Twig.extend((T) => {
    T.exports.extendFunction('link', (p) => U('/' + String(p).replace(/^\//, '').replace(/^wishlist$/, 'account/wishlist')));
    T.exports.extendFilter('asset', (v) => A(v));
  });

  const ctx = Object.assign({
    theme, store: m.store, language: { code: lang }, cart: { items_count: m.cart.items_count }, user: { can_access_wallet: false },
    page: { title: m.store.name, slug, id: 0 },
  }, vars);
  let html = Twig.twig({ ref: tpl }).render(ctx);

  // dev-only runtime: mock `salla` + web-component shims (NOT part of the theme)
  const devData = {
    mode, lang, products: m.products, categories: m.categories, menu: m.menu, footerMenu: m.footerMenu, cart: m.cart, store: m.store,
    loc: state.loc, links: { home: U('/'), cart: U('/cart'), orders: U('/account/orders'), order: U('/account/order'), profile: U('/account/profile'), wishlist: U('/account/wishlist'), notifications: U('/account/notifications'), search: U('/search?q=') },
  };
  const shim = mode === 'export' ? 'assets/dev/salla-shim.js' : '/__dev/salla-shim.js';
  const head = `<script>window.__ST_DEV__=${JSON.stringify(devData).replace(/</g, '\\u003c')};</script>\n<script src="${shim}"></script>\n${mode === 'dev' ? '<script src="/__dev/reload.js"></script>\n' : ''}`;
  html = html.replace(/<head>/i, '<head>\n' + head);
  return html;
}

function allRoutes() {
  const { U, A } = linker('dev');
  return Object.keys(routes(createMock({ U, A }), U, A)).filter((k) => k !== 'byId');
}

module.exports = { render, allRoutes, linker, ROOT };
