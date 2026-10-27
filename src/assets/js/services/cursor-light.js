/* Soft light that follows the cursor on dark sections (desktop, fine pointer only) */
import { $$, reducedMotion } from './utils';

export default function initCursorLight() {
  if (reducedMotion() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  $$('.st-cursor-light').forEach((el) => {
    let raf = 0;
    el.addEventListener('pointermove', (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
        raf = 0;
      });
    }, { passive: true });
    el.addEventListener('pointerenter', () => el.classList.add('is-lit'));
    el.addEventListener('pointerleave', () => el.classList.remove('is-lit'));
  });
}
