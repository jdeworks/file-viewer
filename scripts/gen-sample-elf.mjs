#!/usr/bin/env node
// Generates docs/examples/sample.elf — a deterministic, structurally complete ELF64 executable
// with two program headers, a tiny Linux x86-64 exit routine, and real section/symbol tables.
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = 0x400000n;
const TEXT_OFFSET = 0x100;
const SHSTRTAB_OFFSET = 0x110;
const SHSTRTAB = Buffer.from('\0.text\0.shstrtab\0.symtab\0.strtab\0');
const STRTAB_OFFSET = 0x138;
const STRTAB = Buffer.from('\0_start\0');
const SYMTAB_OFFSET = 0x140;
const SECTION_OFFSET = 0x180;
const SECTION_COUNT = 5;
const output = Buffer.alloc(SECTION_OFFSET + SECTION_COUNT * 64);

function u16(offset, value) { output.writeUInt16LE(value, offset); }
function u32(offset, value) { output.writeUInt32LE(value, offset); }
function u64(offset, value) { output.writeBigUInt64LE(BigInt(value), offset); }

// ELF identification and file header.
output.set([0x7f, 0x45, 0x4c, 0x46, 2, 1, 1, 0], 0);
u16(16, 2);                 // ET_EXEC
u16(18, 0x3e);              // EM_X86_64
u32(20, 1);                 // EV_CURRENT
u64(24, BASE + BigInt(TEXT_OFFSET));
u64(32, 64);                // program-header table
u64(40, SECTION_OFFSET);    // section-header table
u32(48, 0);
u16(52, 64);                // ELF header size
u16(54, 56);                // program-header entry size
u16(56, 2);                 // program-header count
u16(58, 64);                // section-header entry size
u16(60, SECTION_COUNT);
u16(62, 2);                 // .shstrtab index

// PT_LOAD: read/execute headers and .text. PT_GNU_STACK: explicitly non-executable stack.
u32(64, 1); u32(68, 5); u64(72, 0); u64(80, BASE); u64(88, BASE);
u64(96, TEXT_OFFSET + 9); u64(104, TEXT_OFFSET + 9); u64(112, 0x1000);
u32(120, 0x6474e551); u32(124, 6); u64(128, 0); u64(136, 0); u64(144, 0);
u64(152, 0); u64(160, 0); u64(168, 16);

// _start: mov eax,60; xor edi,edi; syscall.
output.set([0xb8, 0x3c, 0, 0, 0, 0x31, 0xff, 0x0f, 0x05], TEXT_OFFSET);
SHSTRTAB.copy(output, SHSTRTAB_OFFSET);
STRTAB.copy(output, STRTAB_OFFSET);

// Symbol table: null symbol followed by global function `_start` in .text.
u32(SYMTAB_OFFSET + 24, 1);
output[SYMTAB_OFFSET + 28] = 0x12; // STB_GLOBAL | STT_FUNC
u16(SYMTAB_OFFSET + 30, 1);
u64(SYMTAB_OFFSET + 32, BASE + BigInt(TEXT_OFFSET));
u64(SYMTAB_OFFSET + 40, 9);

function section(index, { name, type, flags = 0, addr = 0, offset = 0, size = 0, link = 0, info = 0, align = 1, entsize = 0 }) {
  const at = SECTION_OFFSET + index * 64;
  u32(at, name); u32(at + 4, type); u64(at + 8, flags); u64(at + 16, addr);
  u64(at + 24, offset); u64(at + 32, size); u32(at + 40, link); u32(at + 44, info);
  u64(at + 48, align); u64(at + 56, entsize);
}

section(1, { name: 1, type: 1, flags: 6, addr: BASE + BigInt(TEXT_OFFSET), offset: TEXT_OFFSET, size: 9, align: 16 });
section(2, { name: 7, type: 3, offset: SHSTRTAB_OFFSET, size: SHSTRTAB.length });
section(3, { name: 17, type: 2, offset: SYMTAB_OFFSET, size: 48, link: 4, info: 1, align: 8, entsize: 24 });
section(4, { name: 25, type: 3, offset: STRTAB_OFFSET, size: STRTAB.length });

const destination = join(new URL('../docs/examples/', import.meta.url).pathname, 'sample.elf');
await writeFile(destination, output);
console.log(`Wrote ${destination} (${output.length} bytes, ELF64 x86-64)`);
