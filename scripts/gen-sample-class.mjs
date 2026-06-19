#!/usr/bin/env node
// Generates docs/examples/sample.class — a minimal valid Java class file.
// Class: public class Sample extends java.lang.Object {}
// Java 17 (major version 61 = 0x3D)
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Constant pool entries (1-indexed; cp_count = n+1):
//   #1 Utf8   "Sample"
//   #2 Class  → #1
//   #3 Utf8   "java/lang/Object"
//   #4 Class  → #3

function utf8(s) {
  const b = Buffer.from(s, 'utf8');
  const out = Buffer.allocUnsafe(3 + b.length);
  out[0] = 0x01;
  out.writeUInt16BE(b.length, 1);
  b.copy(out, 3);
  return out;
}
function classRef(idx) {
  return Buffer.from([0x07, idx >> 8, idx & 0xff]);
}
function u16(n) { return Buffer.from([n >> 8, n & 0xff]); }

const parts = [
  Buffer.from([0xca, 0xfe, 0xba, 0xbe]), // magic
  u16(0),                                  // minor version
  u16(61),                                 // major version (Java 17)
  u16(5),                                  // cp_count (4 entries + 1)
  utf8('Sample'),                          // #1
  classRef(1),                             // #2 → #1
  utf8('java/lang/Object'),               // #3
  classRef(3),                             // #4 → #3
  u16(0x0021),                             // access: ACC_PUBLIC | ACC_SUPER
  u16(2),                                  // this_class: #2
  u16(4),                                  // super_class: #4
  u16(0), u16(0), u16(0), u16(0),         // interfaces / fields / methods / attrs
];

const out = Buffer.concat(parts);
const dest = join(root, 'docs/examples/sample.class');
writeFileSync(dest, out);
console.log(`Wrote ${dest} (${out.length} bytes)`);
