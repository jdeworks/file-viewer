import assert from 'node:assert/strict';

import { REGISTRY } from '../docs/core/registry.js';
import { getTypeInfo } from '../docs/core/type-info.js';

const javaClass = REGISTRY.find((type) => type.id === 'java-class');
assert.ok(javaClass, 'java-class type is registered');

const info = getTypeInfo(javaClass, null, { filename: 'sample.class' });
assert.equal(info.name, 'Java class');
assert.match(info.description, /compiled Java bytecode/);
assert.match(info.href, /jvms-4/);

const clip = REGISTRY.find((type) => type.id === 'clip');
assert.ok(clip, 'clip type is registered');
const clipInfo = getTypeInfo(clip, null, { filename: 'sample.clip' });
assert.equal(clipInfo.name, 'Clip Studio Paint');
assert.match(clipInfo.fileExamplesHref, /fileexamples\.com.*clip/i);

const dbf = REGISTRY.find((type) => type.id === 'dbf');
assert.ok(dbf, 'dbf type is registered');
const dbfInfo = getTypeInfo(dbf, null, { filename: 'sample.dbf' });
assert.equal(dbfInfo.name, 'dBase / DBF Database');
assert.match(dbfInfo.fileExamplesHref, /fileexamples\.com.*dbf/i);

const deb = REGISTRY.find((type) => type.id === 'deb');
assert.ok(deb, 'deb type is registered');
const debInfo = getTypeInfo(deb, null, { filename: 'sample.deb' });
assert.equal(debInfo.name, 'Debian package');
assert.match(debInfo.description, /Debian, Ubuntu/);
assert.match(debInfo.fileExamplesHref, /fileexamples\.com.*deb/i);

console.log('type info: ok');
