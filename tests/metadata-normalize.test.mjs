import assert from 'node:assert/strict';

import { dedupeMetadataRows, metadataSectionForLabel, normalizeMetadata } from '../docs/core/meta-drawer.js';
import { META_KEYS, META_SECTIONS, textFact, securityFact } from '../docs/core/metadata-helpers.js';
import { genericMetadata, localFingerprintMetadata } from '../docs/core/generic-metadata.js';
import { extract as markdownMeta } from '../docs/types/markdown/metadata.js';
import { extract as codeMeta } from '../docs/types/text/code/metadata.js';
import { extractMetadata as sshMeta } from '../docs/types/text/ssh-config/metadata.js';
import { extractMetadata as wasmMeta } from '../docs/types/binary/wasm/metadata.js';
import { riskyArchiveEntries } from '../docs/types/zip/metadata.js';

function value(rows, label) {
  const row = rows.find((r) => r.label === label);
  assert.ok(row, 'missing row ' + label);
  return row.value;
}

{
  const rows = normalizeMetadata(genericMetadata({
    filename: 'src/app.ts',
    mimeType: 'text/typescript',
    bytes: new Uint8Array([0xef, 0xbb, 0xbf, 0x61, 0x0d, 0x0a, 0x0a, 0x62]),
    text: 'a\r\n\nb',
    isBinary: false,
    size: 8,
    loadedBytes: 8,
  }));
  assert.equal(value(rows, 'Extension'), 'ts');
  assert.equal(value(rows, 'Content kind'), 'text');
  assert.equal(value(rows, 'Byte order mark'), 'UTF-8');
  assert.equal(value(rows, 'Line endings'), 'CRLF + LF');
  assert.equal(value(rows, 'Line break count'), '2');
  assert.equal(value(rows, 'Lines'), '3');
  assert.equal(value(rows, 'Blank lines'), '1');
  assert.equal(value(rows, 'Longest line'), '1');
  assert.equal(value(rows, 'Trailing newline'), 'no');
}

{
  const rows = normalizeMetadata(genericMetadata({
    filename: 'disk.img',
    bytes: new Uint8Array([0, 1, 2, 3]),
    text: '',
    isBinary: true,
    size: 4096,
    loadedBytes: 4,
  }));
  assert.equal(value(rows, 'Extension'), 'img');
  assert.equal(value(rows, 'Content kind'), 'binary');
  assert.equal(value(rows, 'Loaded bytes'), '4 of 4,096');
}

{
  const rows = normalizeMetadata(genericMetadata({
    filename: 'invoice.pdf.exe',
    bytes: new Uint8Array([0]),
    text: '',
    isBinary: true,
    size: 1,
    loadedBytes: 1,
  }));
  assert.equal(value(rows, 'Filename risk'), 'high (75/100)');
  assert.equal(value(rows, 'Filename warnings'), 'High-risk double extension ending in executable .exe');
  assert.equal(rows.find((r) => r.label === 'Filename risk').section, 'Security and privacy');
  assert.equal(rows.find((r) => r.label === 'Filename warnings').section, 'Security and privacy');
}

{
  const rows = normalizeMetadata(genericMetadata({
    filename: 'photo.jpg\u202e.exe',
    bytes: new Uint8Array([0]),
    text: '',
    isBinary: true,
    size: 1,
    loadedBytes: 1,
  }));
  assert.equal(value(rows, 'Filename risk'), 'high (100/100)');
  assert.equal(value(rows, 'Filename warnings'), 'Unicode direction controls can disguise the visible extension, High-risk double extension ending in executable .exe');
}

{
  const rows = normalizeMetadata(genericMetadata({
    filename: 'document.pdf.zip',
    bytes: new Uint8Array([0]),
    text: '',
    isBinary: true,
    size: 1,
    loadedBytes: 1,
  }));
  assert.equal(value(rows, 'Filename risk'), 'caution (20/100)');
  assert.equal(value(rows, 'Filename warnings'), 'Multiple extensions; verify the outer format is intentional');
}

{
  const rows = normalizeMetadata(genericMetadata({
    filename: 'jquery.min.js',
    bytes: new Uint8Array([0x63]),
    text: 'c',
    isBinary: false,
    size: 1,
    loadedBytes: 1,
  }));
  assert.equal(rows.some((r) => r.label === 'Filename risk'), false);
}

{
  const rows = normalizeMetadata(genericMetadata({
    filename: 'holiday.jpg',
    mimeType: 'image/jpeg',
    bytes: Uint8Array.from([0x4d, 0x5a, 0x90, 0x00]),
    text: null,
    isBinary: true,
    size: 4,
    loadedBytes: 4,
  }));
  assert.equal(value(rows, 'Detected content'), 'Windows PE/DOS executable');
  assert.equal(value(rows, 'Content risk'), 'high (90/100)');
  assert.match(value(rows, 'Content warnings'), /Extension \.jpg does not match/);
  assert.match(value(rows, 'Content warnings'), /MIME type image\/jpeg does not match/);
  assert.equal(rows.find((r) => r.label === 'Content risk').section, META_SECTIONS.security);
}

{
  const rows = normalizeMetadata(genericMetadata({
    filename: 'document.pdf',
    mimeType: 'application/pdf',
    bytes: Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    text: null,
    isBinary: true,
    size: 8,
    loadedBytes: 8,
  }));
  assert.equal(value(rows, 'Detected content'), 'PNG image');
  assert.equal(value(rows, 'Content risk'), 'caution (45/100)');
}

{
  const rows = normalizeMetadata(genericMetadata({
    filename: 'legacy.txt',
    mimeType: 'text/plain; charset=utf-8',
    bytes: Uint8Array.from([0xff, 0xfe, 0x41, 0x00]),
    text: 'A',
    isBinary: false,
    size: 4,
    loadedBytes: 4,
    encoding: 'UTF-16 LE',
    encodingSource: 'BOM',
    encodingWarnings: ['BOM says UTF-16 LE, but the MIME charset says UTF-8; the BOM took precedence.'],
  }));
  assert.equal(value(rows, 'Text encoding'), 'UTF-16 LE (BOM)');
  assert.match(value(rows, 'Encoding warnings'), /BOM says UTF-16 LE/);
}

{
  const archive = riskyArchiveEntries([
    { name: 'docs/invoice.pdf.exe' },
    { name: 'images/photo.jpg\u202e.exe' },
    { name: 'safe/readme.txt' },
  ]);
  assert.equal(archive.score, 100);
  assert.deepEqual(archive.entries.map((entry) => entry.name), [
    'docs/invoice.pdf.exe',
    'images/photo.jpg\u202e.exe',
  ]);
  assert.equal(archive.entries[0].level, 'high');
}

{
  const rows = normalizeMetadata({ fields: [{ label: 'Rows', value: 4 }] });
  assert.equal(value(rows, 'Rows'), '4');
}

{
  const rows = normalizeMetadata({ hostCount: 2, hasWildcard: true, hosts: [{ alias: 'prod' }] });
  assert.equal(value(rows, 'Host Count'), '2');
  assert.equal(value(rows, 'Has Wildcard'), 'yes');
  assert.equal(value(rows, 'Hosts'), '1');
}

{
  const rows = normalizeMetadata({
    config: { name: 'demo', apiToken: 'abc123' },
    privateKey: '-----BEGIN PRIVATE KEY-----',
  });
  assert.equal(value(rows, 'Config'), '{"name":"demo","apiToken":"redacted"}');
  assert.equal(value(rows, 'Private Key'), 'redacted');
}

{
  const rows = normalizeMetadata([
    { label: 'API title', value: 'Widget API' },
    { label: 'API version', value: '1.0.0' },
  ]);
  assert.equal(value(rows, 'API title'), 'Widget API');
  assert.equal(value(rows, 'API version'), '1.0.0');
}

{
  const rows = normalizeMetadata([
    { label: 'Language', value: 'Python', section: 'Code metrics' },
    ['Lines', 12],
  ]);
  assert.equal(value(rows, 'Language'), 'Python');
  assert.equal(rows.find((r) => r.label === 'Language').section, 'Code metrics');
  assert.equal(value(rows, 'Lines'), '12');
}

{
  const rows = normalizeMetadata({
    fields: [{ label: 'Package', value: 'demo' }],
    sections: [
      {
        title: 'Dependency health',
        open: false,
        fields: [
          { label: 'Packages', value: 8 },
          { label: 'Warnings', value: ['unpinned', 'pre-release'] },
        ],
      },
      {
        title: 'Text structure',
        rows: [{ label: 'Lines', value: 24 }],
      },
    ],
  });
  assert.equal(value(rows, 'Package'), 'demo');
  assert.equal(value(rows, 'Packages'), '8');
  assert.equal(value(rows, 'Warnings'), 'unpinned, pre-release');
  assert.equal(rows.find((r) => r.label === 'Packages').section, 'Dependency health');
  assert.equal(rows.find((r) => r.label === 'Packages').sectionOpen, false);
  assert.equal(rows.find((r) => r.label === 'Lines').section, 'Text structure');
}

{
  const rows = normalizeMetadata([
    { label: 'Lines', value: 10, section: 'Text structure' },
    { label: 'Lines', value: 7, section: 'Code metrics' },
  ]);
  assert.deepEqual(rows.map((r) => `${r.section}:${r.label}=${r.value}`), [
    'Text structure:Lines=10',
    'Code metrics:Lines=7',
  ]);
}

{
  const rows = normalizeMetadata([
    { label: 'Lines', value: 10, section: 'Text structure', dedupeKey: 'logical-lines', priority: 1 },
    { label: 'Lines', value: 8, section: 'Code metrics', dedupeKey: 'logical-lines', priority: 2 },
    { label: 'Line break count', value: 9, section: 'Text structure' },
  ]);
  const deduped = dedupeMetadataRows(rows);
  assert.deepEqual(deduped.map((r) => `${r.section}:${r.label}=${r.value}`), [
    'Code metrics:Lines=8',
    'Text structure:Line break count=9',
  ]);
}

{
  const rows = normalizeMetadata([
    { label: 'Records', value: 4, section: META_SECTIONS.advanced },
    { label: 'Records', value: 4, section: META_SECTIONS.type },
    { label: 'Records', value: 7, section: 'Container details' },
  ]);
  const deduped = dedupeMetadataRows(rows);
  assert.deepEqual(deduped.map((r) => `${r.section}:${r.label}=${r.value}`), [
    `${META_SECTIONS.type}:Records=4`,
    'Container details:Records=7',
  ]);
}

{
  assert.equal(metadataSectionForLabel('Sensitive variables'), META_SECTIONS.security);
  assert.equal(metadataSectionForLabel('Detected JWT'), META_SECTIONS.security);
  assert.equal(metadataSectionForLabel('Inline handlers'), META_SECTIONS.security);
  assert.equal(metadataSectionForLabel('External resources'), META_SECTIONS.security);
  assert.equal(metadataSectionForLabel('Functions'), META_SECTIONS.type);
}

{
  let calls = 0;
  const subtle = {
    async digest(algorithm, bytes) {
      calls += 1;
      assert.equal(algorithm, 'SHA-256');
      assert.deepEqual(Array.from(bytes), [1, 2, 3]);
      return Uint8Array.from({ length: 32 }, (_, i) => i).buffer;
    },
  };
  const rows = normalizeMetadata(await localFingerprintMetadata({
    bytes: new Uint8Array([1, 2, 3]),
    size: 3,
    loadedBytes: 3,
  }, { subtle }));
  assert.equal(calls, 1);
  assert.equal(value(rows, 'SHA-256 (local)'), '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f');
  assert.equal(rows[0].section, META_SECTIONS.advanced);

  const partial = normalizeMetadata(await localFingerprintMetadata({
    bytes: new Uint8Array([1, 2, 3]),
    size: 9,
    loadedBytes: 3,
    truncated: true,
  }, { subtle }));
  assert.equal(calls, 1, 'partial files must not be fingerprinted');
  assert.match(value(partial, 'SHA-256 (local)'), /complete file is not loaded/);
}

{
  const rows = normalizeMetadata([
    ...genericMetadata({
      filename: 'README.md',
      bytes: new TextEncoder().encode('# Title\n\nbody\n'),
      text: '# Title\n\nbody\n',
      isBinary: false,
      size: 14,
      loadedBytes: 14,
    }),
    ...markdownMeta({ text: '# Title\n\nbody\n' }),
  ]);
  const deduped = dedupeMetadataRows(rows);
  assert.equal(deduped.filter((r) => r.dedupeKey === META_KEYS.logicalLines).length, 1);
  assert.equal(value(deduped, 'Lines'), '3');
}

{
  const rows = normalizeMetadata([
    textFact('Blank lines', 2, META_KEYS.blankLines),
    ...codeMeta({ filename: 'main.py', text: 'def main():\n\n    return 1\n' }),
  ]);
  const deduped = dedupeMetadataRows(rows);
  assert.equal(deduped.filter((r) => r.dedupeKey === META_KEYS.blankLines).length, 1);
  assert.equal(value(deduped, 'Blank lines'), '2');
}

{
  const rows = normalizeMetadata(await sshMeta({
    text: [
      'Include ~/.ssh/conf.d/*.conf',
      'Host *',
      '  User deploy',
      '  ForwardAgent yes',
      'Host prod api',
      '  HostName prod.example',
      '  Port 2200',
      '  IdentityFile ~/.ssh/id_prod',
      '  IdentityFile ~/.ssh/id_prod_backup',
      '  ProxyJump ops@bastion:2222,edge',
      '  ProxyCommand ssh bastion nc %h %p',
      '  IdentityAgent ~/.ssh/agent.sock',
      '  StrictHostKeyChecking no',
      '  UserKnownHostsFile /dev/null',
      '  PasswordAuthentication no',
      '  LocalForward 127.0.0.1:5432 db:5432',
      'Match user git',
      '  User git',
      '  AddKeysToAgent yes',
      '  ForwardX11 yes',
      '  RemoteForward 8022 localhost:22',
      '  Include ~/.ssh/git.conf',
    ].join('\n'),
  }));
  assert.equal(value(rows, 'Host blocks'), '1');
  assert.equal(value(rows, 'Wildcard defaults'), 'yes');
  assert.equal(value(rows, 'Host patterns'), '*, prod, api');
  assert.equal(value(rows, 'Users'), 'deploy, git');
  assert.equal(value(rows, 'Ports'), '2200');
  assert.equal(value(rows, 'Identity files'), '~/.ssh/id_prod, ~/.ssh/id_prod_backup');
  assert.equal(value(rows, 'Distinct identity files'), '2');
  assert.equal(value(rows, 'ProxyJump hosts'), 'ops@bastion, edge');
  assert.equal(value(rows, 'ProxyCommand entries'), '1');
  assert.equal(value(rows, 'ProxyCommands'), 'ssh bastion nc %h %p');
  assert.equal(value(rows, 'ForwardAgent enabled'), '1');
  assert.equal(value(rows, 'Add identities to agent'), 'yes');
  assert.equal(value(rows, 'IdentityAgent'), '~/.ssh/agent.sock');
  assert.equal(value(rows, 'ForwardX11 enabled'), '1');
  assert.equal(value(rows, 'Strict host checking disabled'), '1');
  assert.equal(value(rows, 'Security options'), 'StrictHostKeyChecking no, UserKnownHostsFile /dev/null, PasswordAuthentication no');
  assert.equal(value(rows, 'Forwarded ports'), 'local 127.0.0.1:5432 db:5432, remote 8022 localhost:22');
  assert.match(value(rows, 'Security notes'), /agent forwarding/);
  assert.match(value(rows, 'Security notes'), /X11 forwarding/);
  assert.match(value(rows, 'Security notes'), /ProxyCommand/);
  assert.equal(value(rows, 'Includes'), '~/.ssh/conf.d/*.conf, ~/.ssh/git.conf');
  assert.equal(value(rows, 'Match blocks'), 'user git');
}

{
  const wasm = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);
  const rows = normalizeMetadata(wasmMeta({ bytes: wasm, size: wasm.length }));
  assert.equal(value(rows, 'Format'), 'WebAssembly');
  assert.equal(value(rows, 'Version'), '1');
  assert.equal(value(rows, 'Section Count'), '0');
}

// Section routing: generic metadata rows carry explicit section attributes
{
  const rows = normalizeMetadata(genericMetadata({
    filename: 'hello.txt',
    bytes: new TextEncoder().encode('hello\nworld\n'),
    text: 'hello\nworld\n',
    isBinary: false,
    size: 12,
    loadedBytes: 12,
  }));
  // Advanced file facts
  assert.equal(rows.find((r) => r.label === 'Extension')?.section, META_SECTIONS.advanced, 'Extension in Advanced file facts');
  assert.equal(rows.find((r) => r.label === 'Content kind')?.section, META_SECTIONS.advanced, 'Content kind in Advanced file facts');
  assert.equal(rows.find((r) => r.label === 'Byte order mark')?.section, META_SECTIONS.advanced, 'BOM in Advanced file facts');
  // Text structure
  assert.equal(rows.find((r) => r.label === 'Lines')?.section, META_SECTIONS.text, 'Lines in Text structure');
  assert.equal(rows.find((r) => r.label === 'Line endings')?.section, META_SECTIONS.text, 'Line endings in Text structure');
  assert.equal(rows.find((r) => r.label === 'Blank lines')?.section, META_SECTIONS.text, 'Blank lines in Text structure');
  assert.equal(rows.find((r) => r.label === 'Trailing newline')?.section, META_SECTIONS.text, 'Trailing newline in Text structure');
}

// Dedupe keys are present on generic metadata rows
{
  const rows = normalizeMetadata(genericMetadata({
    filename: 'code.py',
    bytes: new TextEncoder().encode('x = 1\n'),
    text: 'x = 1\n',
    isBinary: false,
    size: 6,
    loadedBytes: 6,
  }));
  assert.equal(rows.find((r) => r.label === 'Extension')?.dedupeKey, META_KEYS.extension, 'Extension dedupeKey');
  assert.equal(rows.find((r) => r.label === 'Content kind')?.dedupeKey, META_KEYS.contentKind, 'Content kind dedupeKey');
  assert.equal(rows.find((r) => r.label === 'Byte order mark')?.dedupeKey, META_KEYS.bom, 'BOM dedupeKey');
  assert.equal(rows.find((r) => r.label === 'Line endings')?.dedupeKey, META_KEYS.lineEndings, 'Line endings dedupeKey');
  assert.equal(rows.find((r) => r.label === 'Lines')?.dedupeKey, META_KEYS.logicalLines, 'Lines dedupeKey');
  assert.equal(rows.find((r) => r.label === 'Blank lines')?.dedupeKey, META_KEYS.blankLines, 'Blank lines dedupeKey');
}

// Archive entry risk rows normalize into Security and privacy
{
  const rows = normalizeMetadata([
    securityFact('Archive entry risk', '2 high, 1 caution', META_KEYS.archiveRisk),
    securityFact('Archive entry warnings', 'invoice.pdf.exe, bad.js', META_KEYS.archiveWarnings),
  ]);
  assert.equal(rows.find((r) => r.label === 'Archive entry risk')?.section, META_SECTIONS.security, 'Archive entry risk in Security and privacy');
  assert.equal(rows.find((r) => r.label === 'Archive entry warnings')?.section, META_SECTIONS.security, 'Archive entry warnings in Security and privacy');
  assert.equal(rows.find((r) => r.label === 'Archive entry risk')?.dedupeKey, META_KEYS.archiveRisk, 'Archive entry risk dedupeKey');
  assert.equal(rows.find((r) => r.label === 'Archive entry warnings')?.dedupeKey, META_KEYS.archiveWarnings, 'Archive entry warnings dedupeKey');
}

// Filename risk rows are in Security and privacy (regression guard)
{
  const rows = normalizeMetadata(genericMetadata({
    filename: 'payload.pdf.exe',
    bytes: new Uint8Array([0]),
    text: '',
    isBinary: true,
    size: 1,
    loadedBytes: 1,
  }));
  assert.equal(rows.find((r) => r.label === 'Filename risk')?.section, META_SECTIONS.security, 'Filename risk in Security and privacy');
  assert.equal(rows.find((r) => r.label === 'Filename warnings')?.section, META_SECTIONS.security, 'Filename warnings in Security and privacy');
  assert.equal(rows.find((r) => r.label === 'Filename risk')?.dedupeKey, META_KEYS.filenameRisk, 'Filename risk dedupeKey');
  assert.equal(rows.find((r) => r.label === 'Filename warnings')?.dedupeKey, META_KEYS.filenameWarnings, 'Filename warnings dedupeKey');
}

// Zero-width characters in filename trigger risk
{
  const rows = normalizeMetadata(genericMetadata({
    filename: 'report​.pdf',
    bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
    text: '',
    isBinary: true,
    size: 4,
    loadedBytes: 4,
  }));
  const risk = rows.find((r) => r.label === 'Filename risk');
  assert.ok(risk, 'Filename risk row present for zero-width char');
  assert.ok(/caution|high/.test(risk.value), 'Zero-width char in filename flags caution or high: ' + risk.value);
  const warn = rows.find((r) => r.label === 'Filename warnings');
  assert.ok(warn && /zero-width/i.test(warn.value), 'Zero-width warning message present: ' + warn?.value);
}

// Whitespace-embedded extension triggers risk
{
  const rows = normalizeMetadata(genericMetadata({
    filename: 'invoice.pdf .exe',
    bytes: new Uint8Array([0x4d, 0x5a]),
    text: '',
    isBinary: true,
    size: 2,
    loadedBytes: 2,
  }));
  const risk = rows.find((r) => r.label === 'Filename risk');
  assert.ok(risk, 'Filename risk row present for whitespace extension');
  assert.ok(/caution|high/.test(risk.value), 'Whitespace extension flags caution or high: ' + risk.value);
  const warn = rows.find((r) => r.label === 'Filename warnings');
  assert.ok(warn && /whitespace/i.test(warn.value), 'Whitespace warning message present: ' + warn?.value);
}

console.log('metadata normalize: ok');
