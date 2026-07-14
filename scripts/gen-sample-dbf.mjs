// Deterministic dBASE III+ fixture with a standards-compliant last-update year byte.
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const fields = [
  { name: 'NAME', type: 'C', length: 20 },
  { name: 'AGE', type: 'N', length: 3 },
  { name: 'CITY', type: 'C', length: 15 },
  { name: 'ACTIVE', type: 'L', length: 1 },
];
const records = [
  ['Alice Johnson', '30', 'New York', 'T'],
  ['Bob Smith', '45', 'Chicago', 'F'],
  ['Carol Williams', '28', 'San Diego', 'T'],
];
const headerSize = 32 + fields.length * 32 + 1;
const recordSize = 1 + fields.reduce((sum, field) => sum + field.length, 0);
const bytes = Buffer.alloc(headerSize + records.length * recordSize + 1);
bytes[0] = 0x03;
bytes[1] = 2024 - 1900;
bytes[2] = 6;
bytes[3] = 19;
bytes.writeUInt32LE(records.length, 4);
bytes.writeUInt16LE(headerSize, 8);
bytes.writeUInt16LE(recordSize, 10);
fields.forEach((field, index) => {
  const off = 32 + index * 32;
  bytes.write(field.name, off, 11, 'ascii');
  bytes[off + 11] = field.type.charCodeAt(0);
  bytes[off + 16] = field.length;
});
bytes[headerSize - 1] = 0x0d;
records.forEach((record, row) => {
  let off = headerSize + row * recordSize;
  bytes[off++] = 0x20;
  fields.forEach((field, column) => {
    const value = String(record[column]);
    if (field.type === 'N') bytes.write(value.padStart(field.length, ' '), off, field.length, 'ascii');
    else bytes.write(value, off, Math.min(value.length, field.length), 'ascii');
    off += field.length;
  });
});
bytes[bytes.length - 1] = 0x1a;
await writeFile(resolve('docs/examples/sample.dbf'), bytes);
console.log('Wrote docs/examples/sample.dbf');
