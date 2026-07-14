import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) globalThis.crypto = webcrypto;
if (!globalThis.DOMException) globalThis.DOMException = class DOMException extends Error {};

const { decryptSqlCipherV4, isPlainSqlite, isSqlCipherV4Candidate, SqlCipherPasswordError } =
  await import('../docs/types/sqlite/sqlcipher.js');
const encrypted = new Uint8Array(await readFile(new URL('../docs/examples/sample-sqlcipher.sqlite', import.meta.url)));

assert.equal(isPlainSqlite(encrypted), false);
assert.equal(isSqlCipherV4Candidate(encrypted), true);
await assert.rejects(() => decryptSqlCipherV4(encrypted, 'wrong'), SqlCipherPasswordError);
const decrypted = await decryptSqlCipherV4(encrypted, 'viewer');
assert.equal(new TextDecoder().decode(decrypted.subarray(0, 16)), 'SQLite format 3\0');
assert.equal(new DataView(decrypted.buffer).getUint16(16, false), 4096);
assert.equal(decrypted[20], 80);

console.log('sqlcipher tests passed');
