/* SMARTTRUST product card — replaces Salla's default card everywhere salla-products-list / slider renders products.
 * Must be defined before those lists initialise, so this entry is loaded in <head>. */
import { escapeHtml, safeUrl, t, moneyHtml } from '../services/utils';

const HEART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/></svg>';
const SYSTEMS = [['knx', 'KNX'], ['zigbee', 'ZIGBEE'], ['control4', 'CONTROL4'], ['control 4', 'CONTROL4']];

const cfg = () => {
  const d = document.body ? document.body.dataset : {};
  return {
    quote: (d.stQuote || '').trim().toLowerCase(),
    quoteZero: d.stQuoteZero === '1',
    quoteUrl: d.stQuoteUrl || '',
    add: d.stCardAdd !== '0',
    plate: d.stPlate || 'stone',
  };
};

const textBag = (p) => [p.name, p.subtitle, p.promotion_title, ...(Array.isArray(p.tags) ? p.tags.map((x) => (x && x.name) || x) : [])]
  .filter(Boolean).join(' ').toLowerCase();

export function systemTag(p) {
  const bag = textBag(p);
  const found = SYSTEMS.filter(([k]) => bag.includes(k)).map(([, v]) => v);
  return Array.from(new Set(found)).join(' · ');
}

/** quote = merchant tagged it with the quote keyword; a zero price counts only when the store opted in
 *  (a product left at 0 by mistake must not silently lose its buy button). */
export function isQuote(p, keyword, zeroIsQuote = false) {
  if (keyword && textBag(p).includes(keyword)) return true;
  if (!zeroIsQuote || p.starting_price) return false;
  const price = Number(p.price_as_float != null ? p.price_as_float : (typeof p.price === 'object' ? p.price && p.price.amount : p.price));
  return !Number.isNaN(price) && price === 0;
}

const isGuest = () => {
  try { return salla.config.isGuest(); } catch (e) { return true; }
};

const inWishlist = (p) => {
  try {
    if (!isGuest()) return salla.storage.get('salla::wishlist', []).includes(p.id);
  } catch (e) { /* storage unavailable: fall back to the API flag */ }
  return !!p.is_in_wishlist;
};

class StProductCard extends HTMLElement {
  connectedCallback() {
    if (!this.product) {
      try { this.product = JSON.parse(this.getAttribute('product') || 'null'); } catch (e) { this.product = null; }
    }
    if (!this.product) return;
    if (window.salla && salla.lang && salla.lang.onLoaded) salla.lang.onLoaded(() => this.render());
    this.render();
  }

  priceHtml(p, quote) {
    if (quote) return `<p class="st-card__price"><span class="st-card__quote">${escapeHtml(t('blocks.product.request_quote', 'اطلب عرض سعر'))}</span></p>`;
    if (p.is_on_sale && p.sale_price) {
      return `<p class="st-card__price is-sale"><ins>${moneyHtml(p.sale_price)}</ins><del>${moneyHtml(p.regular_price)}</del></p>`;
    }
    const from = p.starting_price ? `${escapeHtml(t('blocks.product.from', 'يبدأ من'))} ` : '';
    return `<p class="st-card__price">${from}${moneyHtml(p.starting_price || p.price)}</p>`;
  }

  render() {
    const p = this.product;
    const c = cfg();
    const quote = isQuote(p, c.quote, c.quoteZero);
    const url = safeUrl(p.url) || '';
    const name = escapeHtml(p.name);
    const img = (p.image && p.image.url) || (p.thumbnail) || '';
    const alt = escapeHtml((p.image && p.image.alt) || p.name);
    const opaque = /\.(jpe?g)(\?|$)/i.test(img);
    const plate = c.plate === 'none' ? 'st-plate--none' : c.plate === 'dark' ? 'st-plate--dark' : '';
    const out = p.is_out_of_stock || p.status === 'out';
    const tag = systemTag(p);
    const badge = out
      ? `<span class="st-card__badge st-card__badge--out">${escapeHtml(t('blocks.product.out_of_stock', 'نفدت الكمية'))}</span>`
      : (p.promotion_title && !quote ? `<span class="st-card__badge">${escapeHtml(p.promotion_title)}</span>`
        : (p.is_on_sale && p.discount_percentage ? `<span class="st-card__badge"><bdi dir="ltr">−${escapeHtml(p.discount_percentage)}</bdi></span>` : ''));
    const wishOn = inWishlist(p);
    const wishLabel = escapeHtml(t('blocks.product.wishlist', 'المفضلة'));
    const canAdd = c.add && !quote && !out && p.id;
    const addLabel = escapeHtml(p.add_to_cart_label || t('blocks.product.add_to_cart', 'أضف إلى السلة'));
    const add = canAdd
      ? `<div class="st-card__add"><salla-add-product-button product-id="${escapeHtml(p.id)}" product-status="${escapeHtml(p.status || 'sale')}" product-type="${escapeHtml(p.type || 'product')}" width="wide">${addLabel}</salla-add-product-button></div>`
      : '';

    this.innerHTML = `
      <article class="st-card st-card--has-wish${out ? ' is-out' : ''}${c.plate === 'dark' ? ' st-card--dark' : ''}">
        <div class="st-card__media">
          <div class="st-plate ${plate}"><img src="${escapeHtml(img)}" alt="${alt}" loading="lazy" decoding="async" width="600" height="600"${opaque || c.plate === 'none' ? ' class="is-photo"' : ''}></div>
          ${tag ? `<span class="st-card__tag">${escapeHtml(tag)}</span>` : ''}
          ${badge}
          <button type="button" class="st-card__wish${wishOn ? ' is-added' : ''}" aria-pressed="${wishOn}" aria-label="${wishLabel}">${HEART}</button>
          ${add}
        </div>
        <div class="st-card__body">
          <h3 class="st-card__name"><a href="${url}">${name}</a></h3>
          ${this.priceHtml(p, quote)}
        </div>
        ${p.subtitle ? `<p class="st-card__sub">${escapeHtml(p.subtitle)}</p>` : ''}
      </article>`;

    const wish = this.querySelector('.st-card__wish');
    wish && wish.addEventListener('click', (e) => {
      e.preventDefault();
      if (!window.salla || !salla.wishlist) return;
      if (isGuest()) {
        salla.event.dispatch('login::open');
        return;
      }
      wish.disabled = true;
      salla.wishlist.toggle(p.id).then(() => {
        const on = !wish.classList.contains('is-added');
        wish.classList.toggle('is-added', on);
        wish.setAttribute('aria-pressed', String(on));
      }).catch((err) => {
        // the SDK already shows the error toast; keep the heart in its real state
        console.warn('[smarttrust] wishlist', err);
      }).finally(() => { wish.disabled = false; });
    });
  }
}

if (!customElements.get('custom-salla-product-card')) {
  customElements.define('custom-salla-product-card', StProductCard);
}
