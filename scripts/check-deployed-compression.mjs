#!/usr/bin/env node
// Verify the actual static host negotiates compression. Precompressed .gz/.br files are not
// evidence by themselves: the deployed response must carry Content-Encoding and Vary headers.
import http from 'node:http';
import https from 'node:https';

const DEFAULT_BASE = 'https://jdeworks.github.io/file-viewer/';
const TARGETS = [
  'core/app.generated.js',
  'assets/app.css',
  'core/registry-runtime.generated.js',
];

function normalizeBase(raw) {
  const url = new URL(raw);
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url;
}

function requestHead(url, redirects = 0) {
  if (redirects > 5) return Promise.reject(new Error(`${url}: too many redirects`));
  const client = url.protocol === 'http:' ? http : https;
  return new Promise((resolve, reject) => {
    const request = client.request(url, {
      method: 'HEAD',
      headers: {
        'accept-encoding': 'br, gzip',
        'user-agent': 'file-viewer-deployment-check/1',
      },
    }, (response) => {
      response.resume();
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        resolve(requestHead(new URL(response.headers.location, url), redirects + 1));
        return;
      }
      resolve({ url, status: response.statusCode, headers: response.headers });
    });
    request.setTimeout(20_000, () => request.destroy(new Error(`${url}: timed out`)));
    request.on('error', reject);
    request.end();
  });
}

const base = normalizeBase(process.argv[2] || process.env.FV_DEPLOY_URL || DEFAULT_BASE);
let failures = 0;
for (const path of TARGETS) {
  const result = await requestHead(new URL(path, base));
  const encoding = String(result.headers['content-encoding'] || '').toLowerCase();
  const vary = String(result.headers.vary || '').toLowerCase();
  const type = String(result.headers['content-type'] || '').toLowerCase();
  const problems = [];
  if (result.status !== 200) problems.push(`HTTP ${result.status}`);
  if (!/^(?:br|gzip)$/.test(encoding)) problems.push(`Content-Encoding=${encoding || '<missing>'}`);
  if (!vary.split(',').map((value) => value.trim()).includes('accept-encoding')) problems.push(`Vary=${vary || '<missing>'}`);
  if (!/(?:javascript|text\/css)/.test(type)) problems.push(`Content-Type=${type || '<missing>'}`);
  if (problems.length) {
    failures++;
    console.error(`✗ ${result.url}: ${problems.join('; ')}`);
  } else {
    console.log(`✓ ${result.url} — ${encoding}, Vary: Accept-Encoding`);
  }
}

if (failures) {
  console.error(`deployment compression: ${failures} failure(s)`);
  process.exitCode = 1;
} else {
  console.log(`deployment compression: ok (${TARGETS.length} representative assets)`);
}
