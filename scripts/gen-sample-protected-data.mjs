// Deterministic synthetic DER fixture for the metadata-only Windows protected-data viewer.
// It contains only public format identifiers and dummy payload bytes — no key material or secrets.
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

function oidValue(text) {
  const parts = text.split('.').map(Number);
  const out = [parts[0] * 40 + parts[1]];
  for (const part of parts.slice(2)) {
    const encoded = [part & 0x7f];
    let value = Math.floor(part / 128);
    while (value) { encoded.unshift(0x80 | (value & 0x7f)); value = Math.floor(value / 128); }
    out.push(...encoded);
  }
  return Buffer.from(out);
}

function tlv(tag, value) {
  const length = value.length < 128 ? Buffer.from([value.length]) : Buffer.from([0x81, value.length]);
  return Buffer.concat([Buffer.from([tag]), length, value]);
}

const body = Buffer.concat([
  ...['1.2.840.113549.1.7.3', '1.3.6.1.4.1.311.74.1', '1.3.6.1.4.1.311.74.1.8',
    '2.16.840.1.101.3.4.1.45', '2.16.840.1.101.3.4.1.46'].map((oid) => tlv(0x06, oidValue(oid))),
  tlv(0x0c, Buffer.from('LOCAL')),
  tlv(0x0c, Buffer.from('user')),
]);
const dummyPayload = Buffer.from('000102030405060708090a0b0c0d0e0f', 'hex');
await writeFile(resolve('docs/examples/sample-protected-data.dat'), Buffer.concat([tlv(0x30, body), dummyPayload]));
console.log('Wrote docs/examples/sample-protected-data.dat');
