import assert from 'node:assert/strict';
import { esc, maskedValue, secretReason } from '../docs/core/known-ui.js';

assert.equal(esc('<tag attr="x">&'), '&lt;tag attr=&quot;x&quot;&gt;&amp;');

assert.equal(secretReason('POSTGRES_PASSWORD', 'secret').includes('POSTGRES_PASSWORD'), true);
assert.deepEqual(maskedValue('POSTGRES_PASSWORD', 'secret'), {
  text: '********',
  masked: true,
  reason: 'masked because "POSTGRES_PASSWORD" looks sensitive',
});

assert.deepEqual(maskedValue('NODE_ENV', 'production'), {
  text: 'production',
  masked: false,
  reason: '',
});

console.log('known-ui tests passed');
