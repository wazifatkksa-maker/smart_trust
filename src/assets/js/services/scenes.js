/* Smart scenes: accessible tabs that swap the room image and the state panel */
import { $, $$, once } from './utils';

export default function initScenes(hosts) {
  hosts.forEach((sec) => {
    if (!once(sec)) return;
    const tabs = $$('[role="tab"]', sec);
    const imgs = $$('.st-scenes__img', sec);
    const panels = $$('[role="tabpanel"]', sec);
    const select = (i, focus) => {
      tabs.forEach((t, k) => {
        const on = k === i;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        if (on && focus) t.focus();
      });
      panels.forEach((p, k) => { p.hidden = k !== i; });
      imgs.forEach((im, k) => {
        if (k === i && im.dataset.src && !im.getAttribute('src')) im.src = im.dataset.src;
        im.classList.toggle('is-active', k === i);
      });
      // warm the next image
      const nx = imgs[(i + 1) % imgs.length];
      if (nx && nx.dataset.src && !nx.getAttribute('src')) nx.src = nx.dataset.src;
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i, false));
      t.addEventListener('keydown', (e) => {
        const rtl = document.dir === 'rtl';
        const next = rtl ? 'ArrowLeft' : 'ArrowRight';
        const prev = rtl ? 'ArrowRight' : 'ArrowLeft';
        if (e.key === next) { e.preventDefault(); select((i + 1) % tabs.length, true); }
        if (e.key === prev) { e.preventDefault(); select((i - 1 + tabs.length) % tabs.length, true); }
        if (e.key === 'Home') { e.preventDefault(); select(0, true); }
        if (e.key === 'End') { e.preventDefault(); select(tabs.length - 1, true); }
      });
    });
  });
}
