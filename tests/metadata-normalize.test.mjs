import assert from 'node:assert/strict';

import { normalizeMetadata } from '../docs/core/meta-drawer.js';
import { genericMetadata } from '../docs/core/generic-metadata.js';
import { extractMetadata as sshMeta } from '../docs/types/text/ssh-config/metadata.js';
import { extractMetadata as wasmMeta } from '../docs/types/binary/wasm/metadata.js';

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

console.log('metadata normalize: ok');
