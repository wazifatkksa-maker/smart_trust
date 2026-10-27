/* SMARTTRUST — export the whole store as standalone HTML pages (site/).
 *   npm run export   → site/index.html, site/product-3.html, … (open directly or host anywhere)
 * The pages use the same templates, CSS and JS as the Salla theme, with mock data. */
const fs = require('fs');
const path = require('path');
const { render, allRoutes, linker, ROOT } = require('./render');

const OUT = path.join(ROOT, 'site');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'assets/dev'), { recursive: true });
fs.cpSync(path.join(ROOT, 'public'), path.join(OUT, 'assets'), { recursive: true });
fs.copyFileSync(path.join(__dirname, 'salla-shim.js'), path.join(OUT, 'assets/dev/salla-shim.js'));

const { U } = linker('export');
let n = 0;
for (const r of allRoutes()) {
  const html = render(r, { mode: 'export', lang: 'ar' });
  const file = U(r).split('#')[0];
  fs.writeFileSync(path.join(OUT, file), html);
  n++;
}
// English home + product as a sample of the LTR layout
fs.writeFileSync(path.join(OUT, 'en-index.html'), render('/', { mode: 'export', lang: 'en' }));
fs.writeFileSync(path.join(OUT, 'en-product-3.html'), render('/product/3', { mode: 'export', lang: 'en' }));
console.log(`exported ${n + 2} pages → ${path.relative(ROOT, OUT)}/`);
