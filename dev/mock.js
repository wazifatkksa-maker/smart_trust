/* SMARTTRUST — mock store used by the local dev server and the static export.
 * Everything here is SAMPLE data: prices, projects and orders are placeholders until the real store is connected.
 * U(path) builds a link, A(file) builds an asset URL — both switch between dev routes and exported .html files. */

module.exports = function createMock({ U, A }) {
  const img = (f) => A('images/' + f);

  const categories = [
    { id: 1, name: 'مفاتيح اللمس', en: 'Touch switches', url: U('/category/1') },
    { id: 2, name: 'الإضاءة والديمرات', en: 'Lighting & dimmers', url: U('/category/2') },
    { id: 3, name: 'الستائر', en: 'Curtains', url: U('/category/3') },
    { id: 4, name: 'الطاقة والمقابس', en: 'Power & sockets', url: U('/category/4') },
    { id: 5, name: 'لوحات المشاهد', en: 'Scene panels', url: U('/category/5') },
    { id: 6, name: 'الأمان والدخول', en: 'Security & access', url: U('/category/6') },
  ];

  // 13 products — images are the real product cut-outs; prices are samples
  const P = (id, name, cat, pic, price, sys, extra = {}) => Object.assign({
    id, name, url: U('/product/' + id), price, regular_price: price, sale_price: 0, is_on_sale: false,
    status: 'sale', type: 'product', category: categories[cat - 1], category_id: cat,
    image: { url: img('products/' + pic + '.webp'), alt: name },
    images: [{ url: img('products/' + pic + '.webp'), alt: name, type: 'image' }],
    tags: sys.map((s) => ({ name: s, url: U('/search?q=' + s) })), subtitle: '', promotion_title: '',
    sku: 'ST-' + String(id).padStart(3, '0'), is_taxable: true, max_quantity: 20, base_currency_price: price,
    rating: { count: 8 + id, stars: 5 }, has_metadata: true, add_to_cart_label: 'أضف إلى السلة', options: [],
  }, extra);

  // product photos supplied by SMARTTRUST (cut out + normalised). Names/systems/prices are placeholders to confirm.
  const products = [
    P(1, 'مفتاح لمس ثلاثي · أسود', 1, 'sw-black-3', 450, ['KNX', 'Zigbee'], {
      is_on_sale: true, sale_price: 399, regular_price: 450, discount_percentage: '11%',
      subtitle: 'لوح زجاجي واحد بثلاث مناطق لمس ومؤشر ضوئي لكل منطقة.',
      images: [
        { url: img('products/sw-black-3.webp'), alt: 'مفتاح لمس ثلاثي أسود', type: 'image' },
        { url: img('scenes/shot03-switch.webp'), alt: 'المفتاح على الجدار', type: 'image' },
      ],
    }),
    P(14, 'جهاز التحكم بالدخول · Access Door', 6, 'access-door', 0, ['Smart Access'], {
      subtitle: 'كاميرا مزدوجة، بصمة، بطاقة، وجرس — دخول ذكي من الباب.',
      promotion_title: 'عرض سعر',
    }),
    P(2, 'مفتاح لمس ثنائي · أسود', 1, 'sw-black-2', 320, ['Zigbee', 'KNX'], { subtitle: 'لوحان زجاجيان بمؤشر لكل خط.' }),
    P(3, 'مفتاح لمس أحادي · أسود', 1, 'sw-black-1', 240, ['Zigbee'], { subtitle: 'منطقة لمس واحدة ومؤشر هادئ.' }),
    P(4, 'مفتاح لمس ثلاثي · أبيض', 1, 'sw-white-3', 450, ['Zigbee']),
    P(5, 'مفتاح لمس ثنائي · أبيض', 1, 'sw-white-2', 320, ['Zigbee']),
    P(6, 'مفتاح لمس أحادي · أبيض', 1, 'sw-white-1', 240, ['Zigbee']),
    P(7, 'ديمر دوّار', 2, 'dimmer', 0, ['KNX'], { subtitle: 'دوران واحد من 30% إلى 100%.' }),
    P(8, 'كشاف سقفي ذكي', 2, 'downlight', 190, ['Zigbee'], {
      subtitle: 'إضاءة ناعمة قابلة للتعتيم.',
      images: [{ url: img('products/downlight.webp'), alt: 'كشاف سقفي', type: 'image' }, { url: img('products/downlight-on.webp'), alt: 'الكشاف مضاء', type: 'image' }],
    }),
    P(9, 'مفتاح الستائر · أسود', 3, 'sw-black-curtain', 360, ['Zigbee', 'KNX'], { subtitle: 'فتح · إيقاف · إغلاق.' }),
    P(10, 'مفتاح المشاهد · أسود', 5, 'sw-black-scene', 0, ['KNX'], { promotion_title: 'عرض سعر' }),
    P(11, 'مفتاح 40A للسخان والمكيف', 4, 'sw-black-40a', 380, ['Zigbee']),
    P(12, 'لوحة تحكم ذكية بشاشة', 5, 'panel-screen', 0, ['KNX', 'Control4'], { subtitle: 'المشاهد والتكييف والإضاءة من شاشة واحدة.' }),
    P(13, 'مقبس ذكي 13A مع USB', 4, 'socket', 180, [], { is_out_of_stock: true, status: 'out' }),
  ];
  products.forEach((p) => {
    if (p.id === 14) { p.description = '<p>وحدة دخول ذكية للباب الرئيسي: كاميرا مزدوجة للتعرّف، قارئ بصمة، قارئ بطاقات، وزر جرس — بواجهة زجاجية سوداء وإطار معدني بلغة تصميم سمارترست.</p><h3>طرق الدخول</h3><ul><li>البصمة</li><li>البطاقة الذكية</li><li>التعرّف بالكاميرا [تأكيد]</li><li>الجرس والاتصال المرئي [تأكيد]</li></ul>'; return; }
    p.description = '<p>لا إطار بارز، ولا أزرار ميكانيكية. لوح هادئ يندمج مع الحجر والخشب، ولا يظهر إلا حين تحتاجه.</p>'
      + '<h3>التركيب</h3><ul><li>علبة تركيب قياسية [المقاس — تأكيد]</li><li>التوصيل والبرمجة بواسطة فني معتمد</li><li>ربط المشاهد حسب مخطط المنزل</li></ul>'
      + '<h3>المواصفات</h3><table><tr><th>الأبعاد</th><td>86 × 86 mm [تأكيد]</td></tr><tr><th>الواجهة</th><td>زجاج مقسّى [تأكيد]</td></tr><tr><th>الضمان</th><td>[—]</td></tr></table>';
  });

  const articles = [
    { id: 1, title: 'فيلا خاصة، الرياض', url: U('/projects/1'), image: { url: img('scenes/sh02-villa-on.webp'), alt: '' }, created_at: '2026-05-12', summary: 'نظام KNX كامل: إضاءة، ستائر، تكييف، ومشاهد لكل طابق.' },
    { id: 2, title: 'شقة، جدة', url: U('/projects/2'), image: { url: img('scenes/sc-home.webp'), alt: '' }, created_at: '2026-04-02', summary: 'تحديث منزل قائم عبر Zigbee دون تمديدات.' },
    { id: 3, title: 'مكتب تنفيذي، الرياض', url: U('/projects/3'), image: { url: img('scenes/cu-corridor.webp'), alt: '' }, created_at: '2026-03-18' },
    { id: 4, title: 'صالة سينما خاصة', url: U('/projects/4'), image: { url: img('scenes/sc-cinema.webp'), alt: '' }, created_at: '2026-02-09' },
  ];
  articles.forEach((a) => Object.assign(a, {
    has_image: true, author: { name: 'SMARTTRUST' }, tags: [{ name: 'KNX', url: U('/search?q=KNX') }], related: [],
    body: '<p>' + (a.summary || 'تفاصيل المشروع.') + '</p><h2>النطاق</h2><ul><li>الإضاءة</li><li>الستائر</li><li>التكييف</li><li>المشاهد</li></ul><p>[صور ومحتوى المشروع الحقيقي تُضاف لاحقًا]</p>',
  }));
  articles.forEach((a) => { a.related = articles.filter((b) => b.id !== a.id); });

  const menu = [
    { title: 'المنتجات', url: U('/products'), children: categories.map((c) => ({ title: c.name, url: c.url })) },
    { title: 'المشاريع', url: U('/projects') },
    { title: 'من نحن', url: U('/about') },
    { title: 'تواصل معنا', url: U('/contact') },
  ];
  const footerMenu = [
    { title: 'KNX', url: U('/knx') }, { title: 'Zigbee', url: U('/zigbee') }, { title: 'Control4', url: U('/control4') },
    { title: 'المشاريع', url: U('/projects') }, { title: 'من نحن', url: U('/about') },
    { title: 'سياسة الخصوصية', url: U('/page/privacy') }, { title: 'الشحن والاسترجاع', url: U('/page/shipping') },
  ];

  const cartItems = [products[2], products[7]].map((p, i) => ({
    id: 100 + i, url: p.url, product_id: p.id, product_image: p.image.url, product_name: p.name,
    product_price: p.is_on_sale ? p.sale_price : p.price, quantity: i + 1, max_quantity: 10,
    total: (p.is_on_sale ? p.sale_price : p.price) * (i + 1), is_available: true, can_add_note: i === 0, options: [],
    offer: i === 1 ? { names: 'خصم 10% على المقابس' } : null,
  }));
  const sub = cartItems.reduce((s, i) => s + i.total, 0);
  const cart = {
    items_count: cartItems.reduce((s, i) => s + i.quantity, 0), items: cartItems, sub_total: sub, total: sub,
    free_shipping_bar: { minimum_amount: 1000, has_free_shipping: sub >= 1000, percent: Math.min(100, Math.round(sub / 10)), remaining: Math.max(0, 1000 - sub) },
  };

  const order = {
    id: 5521, reference_id: 884217, created_at: '2026-09-21', status: { name: 'قيد التنفيذ', color: '#E3D24A' },
    items: cartItems.map((i) => ({ name: i.product_name, image: i.product_image, price: i.product_price, quantity: i.quantity, total: i.total, options: [] })),
    sub_total: sub, total: sub + 35, shipping: { name: 'شحن سريع', cost: 35 }, tax: { amount: Math.round(sub * 0.13) }, discounts: [],
    links: [{ url: '#', label: 'طباعة الفاتورة' }],
  };

  const store = {
    id: 1, name: 'SMARTTRUST', username: 'smarttrust', url: U('/'), logo: img('brand/logo-light.svg'),
    contacts: { whatsapp: '966541725801', mobile: '+966 54 172 5801', phone: '', email: 'zalfuwayris@smartrust.com.sa' },
    social: { instagram: '#', twitter: '#', snapchat: '#', tiktok: '#' },
    settings: { cart: { apply_coupon_enabled: true }, is_multilingual: false, currencies_enabled: false },
  };

  const settings = {
    whatsapp_number: '966541725801', whatsapp_name: 'أ. منال',
    maintenance_number: '', maintenance_name: 'م. ريان',
    menu_zigbee_products: U('/search?q=Zigbee'), menu_knx_about: U('/knx'), menu_knx_wiring: U('/knx') + '#knx-wiring',
    menu_knx_products: U('/search?q=KNX'), menu_c4_products: U('/search?q=Control4'), menu_contact: U('/contact'), knx_page_url: U('/knx') + '#knx-request',
    page_knx: '9001', page_zigbee: '9002', page_control4: '9003', page_about: '9004', page_contact: '9005',
    footer_cr: '[رقم السجل]', footer_vat: '[الرقم الضريبي]',
  };

  // home components exactly as a merchant would arrange them
  const home = [
    { path: 'home.hero-cinematic', data: {} },
    { path: 'home.statement', data: { about_url: U('/about') } },
    { path: 'home.floating-story', data: { steps: [
      { tag: '3-GANG · KNX · ZIGBEE', title: 'لأنماط مختلفة\nبلمسة واحدة.', text: 'ألواح زجاجية تتحكم بالإضاءة والستائر والمشاهد من مكان واحد. مؤشر صغير يخبرك بما يحدث، ولا شيء أكثر.', image: img('products/sw-black-3.webp'), url: U('/product/1') },
      { tag: 'ROTARY DIMMER · KNX', title: 'إضاءة مثالية\nلكل لحظة.', text: 'دوران واحد من 30% إلى 100%. إضاءة المساء والقراءة والضيافة من قرص واحد.', image: img('products/dimmer.webp'), url: U('/product/7') },
      { tag: 'CURTAIN · ZIGBEE', title: 'ترف منزلك\nيُدار بلمسة.', text: 'أناقة ظلالك بتحكم ذكي.', image: img('products/sw-black-curtain.webp'), url: U('/product/9') },
      { tag: 'SMART PANEL · SCENES', title: 'أجواء تتشكل\nبذكاء.', text: 'لوحة الأشعة تحت الحمراء تجمع التكييف والشاشة والمشاهد في واجهة واحدة.', image: img('products/panel-screen.webp'), url: U('/product/12') },
      { tag: 'SMART POWER · 13A', title: 'مقبس ذكي\nبنفس نقط التصميم.', text: 'مقابس بمنافذ USB بنفس الزجاج والخطوط، لتكتمل الجدران.', image: img('products/socket.webp'), url: U('/product/13') },
    ] } },
    { path: 'home.featured-products', data: { source: 'latest', limit: 8, more_url: U('/products') } },
    { path: 'home.systems-showcase', data: { systems: [
      { name: 'KNX', tagline: 'أتمتة احترافية للمشاريع المتقدمة.', meta: 'شبكة سلكية تبدأ من تأسيس منزلك', image: img('scenes/cu-corridor.webp'), cta: 'اطلب تصميم نظام KNX', url: U('/knx') },
      { name: 'Control4', tagline: 'تحكم موحّد للمنزل كله.', meta: 'وحدة مركزية تجمع الصوت والصورة والإضاءة', image: img('scenes/cu-ir.webp'), cta: 'عن Control4', url: U('/control4') },
      { name: 'Zigbee', tagline: 'منزل ذكي لاسلكي ومرن.', meta: 'شبكة لاسلكية للمباني القائمة', image: img('scenes/cu-curtain.webp'), cta: 'عن Zigbee', url: U('/zigbee') },
    ] } },
    { path: 'home.smart-scenes', data: {} },
    { path: 'home.projects-showcase', data: { more_url: U('/projects') } },
    { path: 'home.knx-request', data: {} },
    { path: 'home.faq', data: {} },
  ];

  return { products, categories, articles, menu, footerMenu, cart, order, store, settings, home };
};
