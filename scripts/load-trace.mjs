#!/usr/bin/env node
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join, normalize } from 'node:path';
import { performance } from 'node:perf_hooks';

function loadChromium() {
  const bases = [
    '/home/jens/repos/make-it-look-good/',
    new URL('../tests/', import.meta.url).pathname,
    process.cwd() + '/',
  ];
  for (const base of bases) {
    try { return createRequire(base)('playwright').chromium; } catch { /* try next */ }
  }
  throw new Error('Playwright not found. Run: cd tests && npm install && npx playwright install chromium');
}

const ROOT = new URL('../docs/', import.meta.url).pathname;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.md': 'text/markdown',
  '.txt': 'text/plain', '.wasm': 'application/wasm',
};

let phase = 'setup';
const serverHits = [];
const server = http.createServer(async (req, res) => {
  try {
    let path = normalize(decodeURIComponent(req.url.split('?')[0]));
    if (path === '/') path = '/index.html';
    const file = join(ROOT, path);
    if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    const body = await readFile(file);
    serverHits.push({ phase, path, size: body.length, status: 200 });
    res.writeHead(200, {
      'content-type': MIME[extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch {
    serverHits.push({ phase, path: req.url, size: 0, status: 404 });
    res.writeHead(404).end('not found');
  }
});

function byType(rows, key) {
  const grouped = Object.groupBy(rows, (row) => row[key] || '');
  return Object.fromEntries(Object.entries(grouped).map(([name, list]) => [name, {
    count: list.length,
    bytes: list.reduce((sum, row) => sum + (row.encoded || row.size || 0), 0),
    sw: list.filter((row) => row.fromSW).length,
  }]));
}

function summarizePhase(requests, hits, name) {
  const visible = requests.filter((row) => row.phase === name);
  const server = hits.filter((row) => row.phase === name);
  return {
    phase: name,
    visibleRequests: visible.length,
    visibleEncodedBytes: visible.reduce((sum, row) => sum + (row.encoded || 0), 0),
    visibleFromServiceWorker: visible.filter((row) => row.fromSW).length,
    visibleByType: byType(visible, 'type'),
    serverRequests: server.length,
    serverBytes: server.reduce((sum, row) => sum + row.size, 0),
  };
}

await new Promise((resolve) => server.listen(0, resolve));
const origin = `http://localhost:${server.address().port}`;
const browser = await loadChromium().launch({
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});
const ctx = await browser.newContext({ viewport: { width: 1365, height: 900 }, serviceWorkers: 'allow' });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Network.enable');

const requests = new Map();
const marks = [];
const mark = (name) => marks.push({ phase, name, t: Math.round(performance.now()) });

page.on('domcontentloaded', () => mark('domcontentloaded'));
page.on('load', () => mark('load'));

cdp.on('Network.requestWillBeSent', (event) => {
  if (!event.request.url.startsWith(origin)) return;
  requests.set(event.requestId, {
    phase,
    url: event.request.url.replace(origin, ''),
    method: event.request.method,
    type: event.type,
    start: performance.now(),
    initiator: event.initiator?.type || '',
    stack: event.initiator?.stack?.callFrames?.[0]?.url?.replace(origin, '') || '',
  });
});
cdp.on('Network.responseReceived', (event) => {
  const row = requests.get(event.requestId);
  if (!row) return;
  row.status = event.response.status;
  row.mime = event.response.mimeType;
  row.fromSW = !!event.response.fromServiceWorker;
  row.fromDisk = !!event.response.fromDiskCache;
});
cdp.on('Network.loadingFinished', (event) => {
  const row = requests.get(event.requestId);
  if (!row) return;
  row.end = performance.now();
  row.duration = Math.round(row.end - row.start);
  row.encoded = event.encodedDataLength || 0;
});
cdp.on('Network.loadingFailed', (event) => {
  const row = requests.get(event.requestId);
  if (!row) return;
  row.end = performance.now();
  row.duration = Math.round(row.end - row.start);
  row.failed = event.errorText;
});

async function runPhase(name, action) {
  phase = name;
  mark(name + ':start');
  await action();
  await page.waitForLoadState('load');
  await page.waitForFunction(() => window.__fvReady && typeof window.__fv !== 'undefined', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller).catch(() => false);
  mark(`${name}:controlled=${controlled}`);
}

await runPhase('first', () => page.goto(origin + '/', { waitUntil: 'load' }));
await runPhase('reload', () => page.reload({ waitUntil: 'load' }));
await runPhase('reload-warm', () => page.reload({ waitUntil: 'load' }));

const rows = [...requests.values()].sort((a, b) => a.start - b.start);
const summary = [
  summarizePhase(rows, serverHits, 'first'),
  summarizePhase(rows, serverHits, 'reload'),
  summarizePhase(rows, serverHits, 'reload-warm'),
];
console.log(JSON.stringify({ origin, marks, summary }, null, 2));
console.log('\nVisible requests');
console.table(rows.map((row) => ({
  phase: row.phase,
  url: row.url,
  type: row.type,
  status: row.status,
  sw: row.fromSW ? 'SW' : '',
  encoded: row.encoded || 0,
  duration: row.duration || '',
  initiator: row.initiator,
  stack: row.stack,
})));
console.log('\nServer hits');
console.table(serverHits.map((row) => ({
  phase: row.phase,
  path: row.path,
  status: row.status,
  size: row.size,
})));

await browser.close();
server.close();
