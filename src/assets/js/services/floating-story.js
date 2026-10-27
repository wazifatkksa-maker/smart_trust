/* Floating product story: sticky stage; scroll progress picks the active step. Static stack on mobile / reduced motion. */
import { $, $$, once, reducedMotion } from './utils';

export default function initFloating(hosts) {
  hosts.forEach((sec) => {
    if (!once(sec)) return;
    const steps = $$('.st-float__step', sec);
    const imgs = $$('.st-float__product img', sec);
    const rail = $$('.st-float__rail span', sec);
    const count = $('[data-st-count]', sec);
    const track = $('.st-float__track', sec);
    const bar = $('.st-float__progress', sec);
    const n = steps.length;
    if (!n) return;

    const mq = window.matchMedia('(min-width: 1024px)');
    let active = -1;
    const setActive = (i) => {
      if (i === active) return;
      active = i;
      steps.forEach((s, k) => { s.classList.toggle('is-active', k === i); s.setAttribute('aria-hidden', k === i ? 'false' : 'true'); });
      imgs.forEach((im, k) => im.classList.toggle('is-active', k === i));
      rail.forEach((r, k) => r.classList.toggle('is-active', k === i));
      if (count) count.textContent = `${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;
    };

    let ticking = false;
    const onScroll = () => {
      ticking = false;
      const r = track.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
      if (bar) bar.style.setProperty('--p', p.toFixed(3));
      setActive(Math.min(n - 1, Math.floor(p * n * 0.999)));
    };
    const handler = () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } };

    const apply = () => {
      const animated = mq.matches && !reducedMotion() && n > 1;
      sec.classList.toggle('st-float--static', !animated);
      if (animated) {
        track.style.height = `${n * 90 + 10}vh`;
        window.addEventListener('scroll', handler, { passive: true });
        active = -1;
        onScroll();
      } else {
        track.style.height = '';
        window.removeEventListener('scroll', handler);
        steps.forEach((s) => s.removeAttribute('aria-hidden'));
      }
    };
    mq.addEventListener ? mq.addEventListener('change', apply) : mq.addListener(apply);
    apply();
  });
}
