/* Reveal on scroll — IntersectionObserver, stagger via --i */
import { $$, reducedMotion } from './utils';

export default function initReveal(root = document) {
  const items = $$('[data-reveal]:not(.is-in)', root);
  if (!items.length) return;
  if (reducedMotion() || !('IntersectionObserver' in window) || !document.body.classList.contains('st-motion')) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  items.forEach((el) => io.observe(el));
}
