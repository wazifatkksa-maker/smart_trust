/* Journey section: map pins <-> project list, and the interactive dimmer
 * (drag / turn the knob, use the slider, or just scroll: the room lights up as it enters the screen). */
import { $, $$, once, reducedMotion } from './utils';

/* ---------- map: city pins, clusters that zoom, city → projects ---------- */
function initMap(sec) {
  const vp = $('[data-st-map-viewport]', sec);
  if (!vp) return;
  const layer = $('.st-map__pins', vp);
  const pins = $$('.st-pin[data-city]', vp);
  const outBtn = $('[data-st-map-out]', sec);
  const hint = $('[data-st-map-hint]', sec);
  const title = $('[data-st-map-title]', sec);
  const reset = $('[data-st-map-reset]', sec);
  const cityList = $('[data-st-map-cities]', sec);
  const projList = $('[data-st-map-projects]', sec);
  const rows = $$('.st-map__row', sec);
  const view = { s: 1, cx: 50, cy: 50 };
  // zoom by animating the SVG viewBox (keeps strokes and text crisp at any zoom)
  const svg = $('svg', vp);
  const base = svg.getAttribute('viewBox').split(/\s+/).map(Number); // [0, 0, W, H]
  let vb = base.slice();
  let anim = 0;
  const ease = (t) => 1 - Math.pow(1 - t, 3.2);
  const setVB = (target, animate) => {
    cancelAnimationFrame(anim);
    if (!animate) { vb = target; svg.setAttribute('viewBox', vb.map((n) => n.toFixed(2)).join(' ')); return; }
    const from = vb.slice(); const t0 = performance.now(); const dur = 800;
    const step = (now) => {
      const k = ease(Math.min(1, (now - t0) / dur));
      vb = from.map((f, i) => f + (target[i] - f) * k);
      svg.setAttribute('viewBox', vb.map((n) => n.toFixed(2)).join(' '));
      if (k < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  };
  const P = pins.map((el) => ({ el, city: el.dataset.city, n: Number(el.dataset.count || 1), x: parseFloat(el.style.getPropertyValue('--x')), y: parseFloat(el.style.getPropertyValue('--y')) }));
  let selected = null;

  const toPx = (p) => {
    const W = vp.clientWidth; const H = vp.clientHeight;
    return [((p.x - view.cx) * view.s + 50) / 100 * W, ((p.y - view.cy) * view.s + 50) / 100 * H];
  };

  function labels() {
    const placed = [];
    const hit = (a) => placed.some((b) => !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom));
    $$('.st-pin', layer).forEach((p) => p.classList.remove('is-flip', 'is-nolabel'));
    $$('.st-pin:not(.is-clustered):not(.is-out)', layer).forEach((p) => {
      const lab = $('.st-pin__city', p); if (!lab) return;
      const d = p.getBoundingClientRect();
      placed.push({ left: d.left + 6, right: d.right - 6, top: d.top + 6, bottom: d.bottom - 6 });
      let r = lab.getBoundingClientRect();
      if (hit(r)) { p.classList.add('is-flip'); r = lab.getBoundingClientRect(); }
      if (hit(r)) { p.classList.remove('is-flip'); p.classList.add('is-nolabel'); return; }
      placed.push(r);
    });
  }

  function cluster() {
    $$('.st-pin--cluster', layer).forEach((c) => c.remove());
    const W = vp.clientWidth; const H = vp.clientHeight;
    const pts = P.map((p) => { const [px, py] = toPx(p); return { p, px, py, out: px < -10 || py < -10 || px > W + 10 || py > H + 10 }; });
    const R = W < 520 ? 40 : 46; // ≥ cluster marker size, so nothing hides under a marker
    const used = new Set();
    pts.forEach((a, i) => {
      a.p.el.classList.toggle('is-out', a.out);
      a.p.el.classList.remove('is-clustered');
      if (used.has(i) || a.out) return;
      const group = [a]; used.add(i);
      pts.forEach((b, j) => { if (!used.has(j) && !b.out && Math.hypot(a.px - b.px, a.py - b.py) < R) { group.push(b); used.add(j); } });
      if (group.length < 2) return;
      // absorb anything that would sit under the marker (centroid check)
      let grew = true;
      while (grew) {
        grew = false;
        const mx = group.reduce((t, g) => t + g.px, 0) / group.length;
        const my = group.reduce((t, g) => t + g.py, 0) / group.length;
        pts.forEach((b, j) => { if (!used.has(j) && !b.out && Math.hypot(mx - b.px, my - b.py) < R * 1.3) { group.push(b); used.add(j); grew = true; } });
      }
      group.forEach((g) => g.p.el.classList.add('is-clustered'));
      const gx = group.reduce((t, g) => t + g.p.x, 0) / group.length;
      const gy = group.reduce((t, g) => t + g.p.y, 0) / group.length;
      const n = group.reduce((t, g) => t + g.p.n, 0);
      const names = group.map((g) => g.p.city).join('، ');
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'st-pin st-pin--cluster';
      btn.style.setProperty('--x', gx); btn.style.setProperty('--y', gy);
      btn.setAttribute('aria-label', names + ' — ' + n);
      btn.innerHTML = `<span>${n}</span><span class="st-pin__city" aria-hidden="true">${names.length > 26 ? names.slice(0, 24) + '…' : names}</span>`;
      btn.addEventListener('click', () => zoomTo(group.map((g) => g.p)));
      layer.appendChild(btn);
    });
    requestAnimationFrame(labels);
  }

  function apply(animate = true) {
    const W = base[2]; const H = base[3];
    setVB([view.cx / 100 * W - W / (2 * view.s), view.cy / 100 * H - H / (2 * view.s), W / view.s, H / view.s], animate && !reducedMotion());
    vp.style.setProperty('--s', view.s.toFixed(3));
    vp.style.setProperty('--cx', view.cx.toFixed(3));
    vp.style.setProperty('--cy', view.cy.toFixed(3));
    if (outBtn) outBtn.hidden = view.s <= 1.01;
    if (hint) hint.hidden = view.s > 1.01;
    $$('.st-pin--cluster', layer).forEach((c) => c.remove());
    setTimeout(cluster, animate && !reducedMotion() ? 820 : 0);
  }

  function zoomTo(group) {
    const W = vp.clientWidth; const H = vp.clientHeight;
    const xs = group.map((p) => p.x); const ys = group.map((p) => p.y);
    const spanX = Math.max(0.6, Math.max(...xs) - Math.min(...xs)) / 100 * W;
    const spanY = Math.max(0.6, Math.max(...ys) - Math.min(...ys)) / 100 * H;
    const s = Math.min(48, 0.5 * Math.min(W / spanX, H / spanY));
    view.s = Math.max(view.s * 1.6, s);
    view.cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    view.cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    apply();
  }

  function selectCity(city, fromList) {
    selected = city;
    P.forEach((p) => p.el.classList.toggle('is-selected', p.city === city));
    rows.forEach((r) => r.classList.toggle('is-active', r.dataset.city === city));
    const items = $$('li[data-city]', projList);
    items.forEach((li) => { li.hidden = li.dataset.city !== city; });
    if (cityList) cityList.hidden = true;
    if (projList) projList.hidden = false;
    if (title) title.textContent = title.dataset.tpl.replace(':city', city);
    if (reset) reset.hidden = false;
    const pin = P.find((p) => p.city === city);
    if (pin && (fromList || pin.el.classList.contains('is-clustered') || pin.el.classList.contains('is-out'))) {
      if (pin.el.classList.contains('is-clustered') || pin.el.classList.contains('is-out')) {
        // zoom until the city stands on its own
        const W = vp.clientWidth; const H = vp.clientHeight; const R = W < 520 ? 40 : 46;
        let s = Math.max(view.s, 2);
        const near = (sc) => P.some((o) => o !== pin && Math.hypot((o.x - pin.x) / 100 * W * sc, (o.y - pin.y) / 100 * H * sc) < R * 1.1);
        while (near(s) && s < 60) s *= 1.4;
        view.s = s; view.cx = pin.x; view.cy = pin.y; apply();
      }
    }
  }

  function clearCity() {
    selected = null;
    P.forEach((p) => p.el.classList.remove('is-selected'));
    rows.forEach((r) => r.classList.remove('is-active'));
    if (cityList) cityList.hidden = false;
    if (projList) projList.hidden = true;
    if (title) title.textContent = title.dataset.all;
    if (reset) reset.hidden = true;
  }

  P.forEach((p) => p.el.addEventListener('click', () => selectCity(p.city, false)));
  rows.forEach((r) => r.addEventListener('click', () => selectCity(r.dataset.city, true)));
  reset && reset.addEventListener('click', () => { clearCity(); rows[0] && rows[0].focus(); });
  outBtn && outBtn.addEventListener('click', () => { view.s = 1; view.cx = 50; view.cy = 50; apply(); });

  let t; window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(cluster, 150); });
  apply(false);
  void selected;
}

function initDimmer(card) {
  const range = $('[data-st-dimmer-range]', card);
  const out = $('[data-st-dimmer-out]', card);
  const knob = $('[data-st-dimmer-knob]', card);
  let touched = false;
  const apply = (v) => {
    const val = Math.round(Math.min(100, Math.max(30, v)));
    card.style.setProperty('--lvl', (val / 100).toFixed(3));
    if (out) out.textContent = val;
    if (range && Number(range.value) !== val) range.value = val;
  };
  range && range.addEventListener('input', () => { touched = true; apply(Number(range.value)); });

  // turn the knob: angle around its centre → 30..100
  if (knob) {
    let start = null;
    const angle = (e) => { const r = knob.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI; };
    knob.addEventListener('pointerdown', (e) => {
      touched = true; knob.setPointerCapture(e.pointerId);
      start = { a: angle(e), v: Number(range ? range.value : 30), y: e.clientY };
    });
    knob.addEventListener('pointermove', (e) => {
      if (!start) return;
      let da = angle(e) - start.a;
      if (da > 180) da -= 360; if (da < -180) da += 360;
      const dy = start.y - e.clientY; // vertical drag also works (touch friendly)
      apply(start.v + da * 0.32 + dy * 0.25);
    });
    ['pointerup', 'pointercancel'].forEach((ev) => knob.addEventListener(ev, () => { start = null; }));
  }

  // scroll-linked: light rises as the card travels up the screen, until the visitor takes control
  if (!reducedMotion()) {
    let ticking = false;
    const onScroll = () => {
      ticking = false;
      if (touched) return;
      const r = card.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.9)));
      apply(30 + p * 55);
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();
  }
}

export default function initJourney(hosts) {
  hosts.forEach((sec) => {
    if (!once(sec)) return;
    initMap(sec);
    $$('[data-st-dimmer]', sec).forEach(initDimmer);
  });
}
