import assert from 'node:assert/strict';
import { isAllowedHarnessUrl, isSameOriginUrl } from './harness.mjs';

const origin = 'http://localhost:8123';

assert.equal(isSameOriginUrl(origin + '/docs/app.js', origin), true);
assert.equal(isSameOriginUrl('/docs/app.js', origin), false);
assert.equal(isSameOriginUrl('http://user:pass@localhost:8123/docs/app.js', origin), true);
assert.equal(isSameOriginUrl('http://localhost:8123@evil.example/docs/app.js', origin), false);
assert.equal(isSameOriginUrl('http://localhost:8123.evil.example/docs/app.js', origin), false);
assert.equal(isSameOriginUrl('http://localhost:8124/docs/app.js', origin), false);
assert.equal(isSameOriginUrl('https://localhost:8123/docs/app.js', origin), false);
assert.equal(isSameOriginUrl('not a valid absolute url %', origin), false);
assert.equal(isAllowedHarnessUrl('data:text/plain,local', origin), true);
assert.equal(isAllowedHarnessUrl('blob:http://localhost:8123/example', origin), true);
assert.equal(isAllowedHarnessUrl('https://evil.example/track', origin), false);

console.log('harness exact-origin regressions passed');
