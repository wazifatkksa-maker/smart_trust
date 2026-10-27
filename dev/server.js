/* SMARTTRUST — local preview server.
 *   npm run dev      → http://localhost:3000  (Arabic)   ·  ?lang=en for English
 * Renders the real theme templates with mock data, rebuilds CSS/JS with webpack --watch,
 * and reloads the browser when anything in src/ or public/ changes. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { render, allRoutes, ROOT } = require('./render');

const PORT = Number(process.env.PORT || 3000);
const PUB = path.join(ROOT, 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };

// 1) webpack in watch mode (skip with --no-build)
if (!process.argv.includes('--no-build')) {
  const wp = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['webpack', '--mode', 'development', '--watch'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'], shell: process.platform === 'win32' });
  wp.stdout.on('data', (d) => { const s = d.toString(); if (/compiled|error/i.test(s)) process.stdout.write('[webpack] ' + s.split('\n').filter((l) => /compiled|error/i.test(l)).join('\n') + '\n'); });
  process.on('exit', () => wp.kill());
}

// 2) live reload via Server-Sent Events
const clients = new Set();
let timer = null;
const reload = (file) => { clearTimeout(timer); timer = setTimeout(() => { console.log('[reload]', path.relative(ROOT, file || '')); clients.forEach((res) => res.write('data: reload\n\n')); }, 150); };
for (const dir of ['src/views', 'src/locales', 'public']) {
  const abs = path.join(ROOT, dir);
  if (fs.existsSync(abs)) fs.watch(abs, { recursive: true }, (e, f) => reload(path.join(abs, f || '')));
}

const send = (res, code, body, type) => { res.writeHead(code, { 'content-type': type || 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end(body); };

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = decodeURIComponent(url.pathname);

  if (p === '/__dev/events') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
    res.write('retry: 1000\n\n'); clients.add(res); req.on('close', () => clients.delete(res)); return;
  }
  // dev-only KNX endpoint: /__dev/knx?status=500 | ?status=200 | ?status=200&json=fail | ?delay=40000
  if (p === '/__dev/knx') {
    const code = Number(url.searchParams.get('status') || 200);
    const body = url.searchParams.get('json') === 'fail' ? '{"success":false}' : '{"success":true}';
    req.resume();
    return setTimeout(() => send(res, code, body, 'application/json'), Number(url.searchParams.get('delay') || 300));
  }
  if (p === '/__dev/reload.js') return send(res, 200, "new EventSource('/__dev/events').onmessage=()=>location.reload();", TYPES['.js']);
  if (p === '/__dev/salla-shim.js') return send(res, 200, fs.readFileSync(path.join(__dirname, 'salla-shim.js')), TYPES['.js']);
  if (p === '/__dev/routes') {
    const list = allRoutes().map((r) => `<li><a href="${r}">${r}</a></li>`).join('');
    return send(res, 200, `<!doctype html><meta charset="utf-8"><title>SMARTTRUST routes</title><body style="font:15px system-ui;padding:32px"><h1>كل صفحات المتجر</h1><ul style="line-height:2">${list}</ul>`);
  }
  if (p.startsWith('/public/')) {
    const f = path.join(PUB, p.slice(8));
    if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return send(res, 404, 'not found', 'text/plain');
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
    return fs.createReadStream(f).pipe(res);
  }
  const route = p === '/search' ? '/search' + url.search : p.replace(/\/$/, '') || '/';
  try {
    // ?set_<setting>=<value> overrides a theme setting for this request (e.g. set_knx_box_mode=form)
    const overrides = {};
    url.searchParams.forEach((v, k) => { if (k.startsWith('set_')) overrides[k.slice(4)] = v === 'true' ? true : v === 'false' ? false : v; });
    const html = render(route, { mode: 'dev', lang: url.searchParams.get('lang') === 'en' ? 'en' : 'ar', overrides });
    if (html === null) return send(res, 404, `<!doctype html><meta charset="utf-8"><body style="font:16px system-ui;padding:40px">404 — <a href="/__dev/routes">كل الصفحات</a></body>`);
    return send(res, 200, html);
  } catch (e) {
    console.error(e);
    return send(res, 500, `<!doctype html><meta charset="utf-8"><script src="/__dev/reload.js"></script><body style="font:14px ui-monospace,monospace;padding:32px;background:#111;color:#f1ede6"><h2 style="color:#E3D24A">Twig error</h2><pre style="white-space:pre-wrap">${String((e && (e.message || e)) || e).replace(/</g, '&lt;')}${e && e.file ? '\n\nfile: ' + e.file : ''}</pre></body>`);
  }
}).listen(PORT, () => {
  console.log(`\n  SMARTTRUST preview →  http://localhost:${PORT}\n  All pages          →  http://localhost:${PORT}/__dev/routes\n  English            →  add ?lang=en\n`);
});
