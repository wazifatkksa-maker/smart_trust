/* SMARTTRUST — thank-you page: copy order reference */
import { $, onSalla } from './services/utils';

onSalla(() => {
  const btn = $('[data-st-copy]');
  if (!btn || !navigator.clipboard) return;
  btn.addEventListener('click', () => {
    navigator.clipboard.writeText(btn.dataset.stCopy).then(() => {
      const old = btn.textContent;
      btn.textContent = btn.dataset.done || old;
      setTimeout(() => { btn.textContent = old; }, 1800);
    });
  });
});
