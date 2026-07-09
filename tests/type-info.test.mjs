import assert from 'node:assert/strict';

import { REGISTRY } from '../docs/core/registry.js';
import { getTypeInfo } from '../docs/core/type-info.js';

const javaClass = REGISTRY.find((type) => type.id === 'java-class');
assert.ok(javaClass, 'java-class type is registered');

const info = getTypeInfo(javaClass, null);
assert.equal(info.name, 'Java class');
assert.match(info.description, /compiled Java bytecode/);
assert.match(info.href, /jvms-4/);

const clip = REGISTRY.find((type) => type.id === 'clip');
assert.ok(clip, 'clip type is registered');
const clipInfo = getTypeInfo(clip, null);
assert.equal(clipInfo.name, 'Clip Studio Paint');

const dbf = REGISTRY.find((type) => type.id === 'dbf');
assert.ok(dbf, 'dbf type is registered');
const dbfInfo = getTypeInfo(dbf, null);
assert.equal(dbfInfo.name, 'dBase / DBF Database');

const deb = REGISTRY.find((type) => type.id === 'deb');
assert.ok(deb, 'deb type is registered');
const debInfo = getTypeInfo(deb, null);
assert.equal(debInfo.name, 'Debian package');
assert.match(debInfo.description, /Debian, Ubuntu/);

const dicom = REGISTRY.find((type) => type.id === 'dicom');
assert.ok(dicom, 'dicom type is registered');
const dicomInfo = getTypeInfo(dicom, null);
assert.equal(dicomInfo.name, 'DICOM medical image');
assert.match(dicomInfo.description, /CT, MRI/);

const dmp = REGISTRY.find((type) => type.id === 'dmp');
assert.ok(dmp, 'dmp type is registered');
const dmpInfo = getTypeInfo(dmp, null);
assert.equal(dmpInfo.name, 'Windows minidump');
assert.match(dmpInfo.description, /crash diagnostics/);

const dwg = REGISTRY.find((type) => type.id === 'dwg');
assert.ok(dwg, 'dwg type is registered');
const dwgInfo = getTypeInfo(dwg, null);
assert.equal(dwgInfo.name, 'AutoCAD DWG drawing');
assert.match(dwgInfo.description, /CAD workflows/);

const exe = REGISTRY.find((type) => type.id === 'exe');
assert.ok(exe, 'exe type is registered');
const exeInfo = getTypeInfo(exe, null);
assert.equal(exeInfo.name, 'Executable binary');
assert.match(exeInfo.description, /ELF, PE\/COFF, and Mach-O/);

const exr = REGISTRY.find((type) => type.id === 'exr');
assert.ok(exr, 'exr type is registered');
const exrInfo = getTypeInfo(exr, null);
assert.equal(exrInfo.name, 'OpenEXR image');
assert.match(exrInfo.description, /compositing workflows/);

const f3d = REGISTRY.find((type) => type.id === 'f3d');
assert.ok(f3d, 'f3d type is registered');
const f3dInfo = getTypeInfo(f3d, null);
assert.equal(f3dInfo.name, 'Fusion 360 design');
assert.match(f3dInfo.description, /ZIP-backed project archives/);

const fbx = REGISTRY.find((type) => type.id === 'fbx');
assert.ok(fbx, 'fbx type is registered');
const fbxInfo = getTypeInfo(fbx, null);
assert.equal(fbxInfo.name, 'FBX 3D animation');
assert.match(fbxInfo.description, /animation exchange/);

const gamerom = REGISTRY.find((type) => type.id === 'gamerom');
assert.ok(gamerom, 'gamerom type is registered');
const gameromInfo = getTypeInfo(gamerom, null);
assert.equal(gameromInfo.name, 'Game ROM');
assert.match(gameromInfo.description, /NES, SNES, Game Boy/);

console.log('type info: ok');
