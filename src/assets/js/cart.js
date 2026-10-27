/* SMARTTRUST — cart: item quantity/notes (salla.form.onChange), delete, free-shipping bar, line totals.
 * Totals, coupons and checkout are handled by <salla-cart-summary-card> and <salla-cart-coupons>.
 * Failures are shown on the affected row (the SDK also shows its own toast). */
import { $, $$, onSalla, escapeHtml, moneyHtml, setMoney } from './services/utils';

const row = (id) => document.getElementById(`item-${id}`);
// reload to the empty-cart view only after the visitor changed something here — never on a load-time event (no reload loops)
let changedHere = false;

function setRowState(id, { busy = false, error = '' } = {}) {
  const el = row(id);
  if (!el) return;
  el.classList.toggle('is-busy', busy);
  el.setAttribute('aria-busy', busy ? 'true' : 'false');
  const status = $('[data-st-item-status]', el);
  if (status) {
    status.textContent = error;
    status.hidden = !error;
  }
}

/** Salla's own validation text (e.g. "not available in this quantity"), else null */
const apiMessage = (err) => {
  try {
    const e = err && err.response && err.response.data && err.response.data.error;
    const fields = e && e.fields;
    const first = fields && Object.values(fields).flat().find((m) => typeof m === 'string' && m.trim());
    return (first || (e && typeof e.message === 'string' && e.message) || '').trim() || null;
  } catch (x) { return null; }
};

const qtyOf = (id) => {
  const form = row(id);
  if (!form) return null;
  return { form, el: form.querySelector('salla-quantity-input'), input: form.querySelector('salla-quantity-input input') };
};

function onUpdated(cart) {
  if (!cart) return;
  const fb = cart.free_shipping_bar;
  const bar = $('[data-st-freeship]');
  if (bar && fb) {
    const fill = $('[data-st-freeship-fill]', bar);
    if (fill) fill.style.width = `${Math.min(100, fb.percent || 0)}%`;
    const msg = $('[data-st-freeship-msg]', bar);
    if (msg) {
      if (fb.has_free_shipping) msg.textContent = msg.dataset.done;
      else msg.innerHTML = escapeHtml(msg.dataset.tpl).replace(':amount', moneyHtml(fb.remaining));
    }
  }
  (cart.items || []).forEach((it) => {
    const el = $(`#item-${it.id} [data-st-item-total]`);
    setMoney(el, it.total);
  });
  if (cart.count === 0 && changedHere) window.location.reload();
}

onSalla(() => {
  const root = $('[data-st-cart]');
  if (!root || !window.salla || !salla.cart) return;
  const msg = root.dataset;

  $$('[data-st-item-form]').forEach((form) => {
    const qty = form.querySelector('salla-quantity-input');
    if (qty) form.dataset.stQty = qty.getAttribute('value') || '';
    form.addEventListener('change', (e) => {
      const id = form.querySelector('[name="id"]').value;
      changedHere = true;
      setRowState(id, { busy: true });
      // safety net: never leave the row dimmed if the SDK emits nothing (e.g. debounced/aborted request)
      clearTimeout(form.stBusyTimer);
      form.stBusyTimer = setTimeout(() => { if (row(id) && row(id).classList.contains('is-busy')) setRowState(id); }, 20000);
      salla.form.onChange('cart.updateItem', e);
    });
  });

  $$('[data-st-remove]').forEach((btn) => btn.addEventListener('click', () => {
    const id = btn.dataset.stRemove;
    changedHere = true;
    btn.disabled = true;
    setRowState(id, { busy: true });
    salla.cart.deleteItem(id).then(() => {
      const el = row(id);
      if (el) el.remove();
    }).catch((err) => {
      console.warn('[smarttrust] cart delete', err);
      btn.disabled = false;
      setRowState(id, { error: apiMessage(err) || msg.errorRemove });
    });
  }));

  salla.cart.event.onUpdated(onUpdated);
  salla.cart.event.onItemUpdated((res, itemId) => {
    setRowState(itemId);
    const q = qtyOf(itemId);
    if (q && q.input) q.form.dataset.stQty = q.input.value; // the server accepted this quantity
  });
  salla.cart.event.onItemUpdatedFailed((err, itemId) => {
    console.warn('[smarttrust] cart update', err);
    if (!itemId) return;
    setRowState(itemId, { error: apiMessage(err) || msg.errorUpdate });
    // the server kept the old quantity: show it again (setValue(.., false) does not fire another update)
    const q = qtyOf(itemId);
    if (q && q.el && q.form.dataset.stQty && typeof q.el.setValue === 'function') q.el.setValue(Number(q.form.dataset.stQty), false);
  });
});
