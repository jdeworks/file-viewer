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

const dicom = REGISTRY.find((type) => type.id === 'dicom');
assert.ok(dicom, 'dicom type is registered');
const dicomInfo = getTypeInfo(dicom, null, { filename: 'sample.dcm' });
assert.equal(dicomInfo.name, 'DICOM medical image');
assert.match(dicomInfo.description, /CT, MRI/);
assert.match(dicomInfo.fileExamplesHref, /fileexamples\.com.*dicom/i);

const dmp = REGISTRY.find((type) => type.id === 'dmp');
assert.ok(dmp, 'dmp type is registered');
const dmpInfo = getTypeInfo(dmp, null, { filename: 'sample.dmp' });
assert.equal(dmpInfo.name, 'Windows minidump');
assert.match(dmpInfo.description, /crash diagnostics/);
assert.match(dmpInfo.fileExamplesHref, /fileexamples\.com.*dmp/i);

const dwg = REGISTRY.find((type) => type.id === 'dwg');
assert.ok(dwg, 'dwg type is registered');
const dwgInfo = getTypeInfo(dwg, null, { filename: 'sample.dwg' });
assert.equal(dwgInfo.name, 'AutoCAD DWG drawing');
assert.match(dwgInfo.description, /CAD workflows/);
assert.match(dwgInfo.fileExamplesHref, /fileexamples\.com.*dwg/i);

const exe = REGISTRY.find((type) => type.id === 'exe');
assert.ok(exe, 'exe type is registered');
const exeInfo = getTypeInfo(exe, null, { filename: 'sample.elf' });
assert.equal(exeInfo.name, 'Executable binary');
assert.match(exeInfo.description, /ELF, PE\/COFF, and Mach-O/);
assert.match(exeInfo.fileExamplesHref, /fileexamples\.com.*exe/i);

const exr = REGISTRY.find((type) => type.id === 'exr');
assert.ok(exr, 'exr type is registered');
const exrInfo = getTypeInfo(exr, null, { filename: 'sample.exr' });
assert.equal(exrInfo.name, 'OpenEXR image');
assert.match(exrInfo.description, /compositing workflows/);
assert.match(exrInfo.fileExamplesHref, /fileexamples\.com.*exr/i);

console.log('type info: ok');
