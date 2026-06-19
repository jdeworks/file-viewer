import assert from 'node:assert/strict';

import { REGISTRY } from '../docs/core/registry.js';
import { getTypeInfo } from '../docs/core/type-info.js';

const javaClass = REGISTRY.find((type) => type.id === 'java-class');
assert.ok(javaClass, 'java-class type is registered');

const info = getTypeInfo(javaClass, null, { filename: 'sample.class' });
assert.equal(info.name, 'Java class');
assert.match(info.description, /compiled Java bytecode/);
assert.match(info.href, /jvms-4/);

console.log('type info: ok');
