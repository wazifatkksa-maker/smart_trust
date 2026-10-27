/* Cinematic hero: poster first, video after load (desktop/mobile sources), pause control, pause when off-screen */
import { $, once, reducedMotion, saveData } from './utils';

export default function initHero(hosts) {
  hosts.forEach((hero) => {
    if (!once(hero)) return;
    const video = $('video', hero);
    const toggle = $('.st-hero__toggle', hero);
    if (!video) { toggle && (toggle.hidden = true); return; }
    const mobile = window.matchMedia('(max-width: 767px)').matches;
    const src = (mobile && video.dataset.srcMobile) || video.dataset.src;
    if (!src || reducedMotion() || saveData()) { toggle && (toggle.hidden = true); return; }

    const start = () => {
      video.src = src;
      video.muted = true;
      video.play().then(() => video.classList.add('is-playing')).catch(() => { toggle && (toggle.hidden = true); });
    };
    if (document.readyState === 'complete') setTimeout(start, 300);
    else window.addEventListener('load', () => setTimeout(start, 300), { once: true });

    let userPaused = false;
    const setState = (playing) => {
      if (!toggle) return;
      toggle.setAttribute('aria-pressed', playing ? 'false' : 'true');
      toggle.setAttribute('aria-label', playing ? toggle.dataset.pause : toggle.dataset.play);
      $('[data-i="pause"]', toggle).style.display = playing ? '' : 'none';
      $('[data-i="play"]', toggle).style.display = playing ? 'none' : '';
    };
    toggle && toggle.addEventListener('click', () => {
      if (video.paused) { userPaused = false; video.play(); setState(true); } else { userPaused = true; video.pause(); setState(false); }
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        if (!video.src || userPaused) return;
        if (e.isIntersecting) video.play().catch(() => {}); else video.pause();
      }, { threshold: 0.15 }).observe(hero);
    }
    setState(true);
  });
}
