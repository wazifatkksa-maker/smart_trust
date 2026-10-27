/* SMARTTRUST — static checks before pushing the theme (no network, no Salla account needed).
 *   npm run verify   (run after `npm run production`)
 * Checks: twilight.json shape · every Twig template parses · every translation key used exists in ar + en
 *         · public/ has every built entry and no dev/mock code · no placeholder URLs.
 * Passing this does NOT prove the theme works on a real store — that needs `salla theme preview`. */
const fs = require('fs');
const path = require('path');
const Twig = require('twig');

const ROOT = path.resolve(__dirname, '..');
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const walk = (d) => (fs.existsSync(d) ? fs.readdirSync(d).flatMap((f) => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? walk(p) : [p]; }) : []);
const errors = [];
const ok = [];
const fail = (msg) => errors.push(msg);

// 1) twilight.json
const tw = JSON.parse(fs.readFileSync(path.join(ROOT, 'twilight.json'), 'utf8'));
for (const k of ['name', 'repository', 'author_email', 'settings', 'components']) if (!tw[k]) fail(`twilight.json: missing "${k}"`);
if (!('support_url' in tw)) fail('twilight.json: missing "support_url"');
const realUrl = (u) => /^https:\/\//.test(u || '') && !/OWNER|example\.com/i.test(u);
if (!realUrl(tw.repository)) fail(`twilight.json: "repository" is not a real https URL: ${tw.repository}`);
// Salla syncs support_url from the Partners portal and writes null when it is empty there — allowed; a placeholder is not
if (tw.support_url != null && !realUrl(tw.support_url)) fail(`twilight.json: "support_url" is not a real https URL: ${tw.support_url}`);
const fieldIds = (fields, where) => {
  const seen = new Set();
  (fields || []).forEach((f) => {
    if (!f.id) fail(`${where}: field without id`);
    else if (seen.has(f.id)) fail(`${where}: duplicate id "${f.id}"`);
    seen.add(f.id);
    if (f.fields) fieldIds(f.fields, `${where}>${f.id}`);
  });
};
fieldIds(tw.settings, 'settings');
tw.components.forEach((c) => {
  fieldIds(c.fields, c.path);
  const tpl = path.join(ROOT, 'src/views/components', c.path.replace(/\./g, '/') + '.twig');
  if (!fs.existsSync(tpl)) fail(`component ${c.path}: template ${rel(tpl)} missing`);
});
const keys = tw.components.map((c) => c.key);
keys.forEach((k, i) => { if (keys.indexOf(k) !== i) fail(`duplicate component key ${k}`); });
ok.push(`twilight.json: ${tw.settings.length} settings, ${tw.components.length} components`);

// 2) Twig templates parse (Salla tags registered as no-ops)
Twig.extend((T) => {
  for (const type of ['hook', 'component']) {
    T.exports.extendTag({ type, regex: new RegExp(`^${type}\\s+(.+)$`), next: [], open: true, compile(t) { delete t.match; return t; }, parse(t, ctx, chain) { return { chain, output: '' }; } });
  }
});
const views = walk(path.join(ROOT, 'src/views')).filter((f) => f.endsWith('.twig'));
views.forEach((f) => {
  try { Twig.twig({ data: fs.readFileSync(f, 'utf8'), rethrow: true, allowInlineIncludes: true }); } catch (e) { fail(`twig parse ${rel(f)}: ${e.message || e}`); }
});
ok.push(`twig: ${views.length} templates parsed`);

// 3) translation keys used in templates/JS exist in both locales
const loc = { ar: JSON.parse(fs.readFileSync(path.join(ROOT, 'src/locales/ar.json'), 'utf8')), en: JSON.parse(fs.readFileSync(path.join(ROOT, 'src/locales/en.json'), 'utf8')) };
const get = (o, k) => k.split('.').reduce((a, p) => (a == null ? a : a[p]), o);
const used = new Set();
views.forEach((f) => {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/trans\('([a-z0-9_.]+)'\)/g)) used.add(m[1]);
  const prefix = (src.match(/{%\s*set k = '([a-z0-9_.]+)'\s*%}/) || [])[1];
  if (prefix) for (const m of src.matchAll(/trans\(k ~ '([a-z0-9_]+)'\)/g)) used.add(prefix + m[1]);
});
walk(path.join(ROOT, 'src/assets/js')).forEach((f) => {
  for (const m of fs.readFileSync(f, 'utf8').matchAll(/\bt\('([a-z0-9_.]+)'/g)) used.add(m[1]);
});
used.forEach((k) => {
  // keys outside "blocks." come from Salla's own translations (common.*, pages.*)
  if (!k.startsWith('blocks.')) return;
  for (const l of ['ar', 'en']) if (typeof get(loc[l], k) !== 'string') fail(`locale ${l}: missing "${k}"`);
});
ok.push(`locales: ${used.size} keys checked in ar + en`);

// 4) built output: every entry present, no dev/mock code
const pub = path.join(ROOT, 'public');
for (const f of ['app.css', 'app.js', 'product-card.js', 'home.js', 'product.js', 'products.js', 'checkout.js', 'pages.js']) {
  if (!fs.existsSync(path.join(pub, f))) fail(`public/${f} missing — run npm run production`);
}
const banned = [/__ST_DEV__/, /salla-shim/, /st-dev-toast/, /localhost:\d+/, /\/__dev\//];
walk(pub).filter((f) => /\.(js|css|html|json)$/.test(f)).forEach((f) => {
  const src = fs.readFileSync(f, 'utf8');
  banned.forEach((re) => { if (re.test(src)) fail(`${rel(f)}: contains dev-only code (${re})`); });
});
walk(path.join(ROOT, 'src')).filter((f) => /\.(twig|js|scss|json)$/.test(f)).forEach((f) => {
  const src = fs.readFileSync(f, 'utf8');
  if (/require\(['"][./]*dev\/|from ['"][./]*\.\.\/\.\.\/dev\/|__ST_DEV__/.test(src)) fail(`${rel(f)}: references dev/ mock runtime`);
});
ok.push('public/: entries present, no dev/mock code');

// 5) Salla's theme editor adds a section with ONE BLANK collection item: sections must fall back to their defaults
try {
  const { render } = require('./render');
  const html = render('/', { lang: 'ar', overrides: { __blank: true } }).replace(/<script[\s\S]*?<\/script>/g, '');
  if (/src=""/.test(html)) fail('home (editor blank items): an <img> renders with src=""');
  if (/<li><b><\/b><span><\/span><\/li>/.test(html)) fail('home (editor blank items): an empty list item is rendered');
  ok.push('home: editor-added sections with blank items fall back to defaults');
} catch (e) { fail('home blank-item render: ' + (e.message || e)); }

ok.forEach((m) => console.log('  ✓ ' + m));
if (errors.length) {
  errors.forEach((m) => console.error('  ✗ ' + m));
  console.error(`\n${errors.length} problem(s).`);
  process.exit(1);
}
console.log('\nverify: all static checks passed.');
