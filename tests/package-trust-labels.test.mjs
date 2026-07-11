import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

import { analyzeAndroidPackage, hasApkSigningBlock } from '../docs/types/binary/apk/layout.js';
import { render as renderPem } from '../docs/types/text/pem/renderer.js';

const require = createRequire(import.meta.url);
const JSZip = require('jszip');
const examples = new URL('../docs/examples/', import.meta.url);

const incidentalMeta = analyzeAndroidPackage([
  'AndroidManifest.xml', 'classes.dex', 'META-INF/NOTICE.txt',
], new Uint8Array(), 'apk');
assert.match(incidentalMeta.signatureEvidence, /No recognized signature material/);
assert.doesNotMatch(incidentalMeta.signatureEvidence, /v1\/JAR/);

const v1Artifacts = analyzeAndroidPackage([
  'AndroidManifest.xml', 'classes.dex', 'META-INF/MANIFEST.MF', 'META-INF/CERT.SF', 'META-INF/CERT.RSA',
], new Uint8Array(), 'apk');
assert.match(v1Artifacts.signatureEvidence, /v1\/JAR signature files present \(not cryptographically verified\)/);
assert.equal(v1Artifacts.jarManifestPath, 'META-INF/MANIFEST.MF');

const aab = analyzeAndroidPackage([
  'base/manifest/AndroidManifest.xml', 'base/dex/classes.dex', 'base/lib/arm64-v8a/libdemo.so',
  'base/resources.pb', 'base/assets/config.json', 'feature/manifest/AndroidManifest.xml',
], new Uint8Array(), 'aab');
assert.deepEqual(aab.manifestFiles, ['base/manifest/AndroidManifest.xml', 'feature/manifest/AndroidManifest.xml']);
assert.deepEqual(aab.dexFiles, ['base/dex/classes.dex']);
assert.deepEqual(aab.abiDirs, ['arm64-v8a']);
assert.deepEqual(aab.resources, ['base/resources.pb']);
assert.equal(aab.assetCount, 1);

const xapk = analyzeAndroidPackage([
  'manifest.json', 'base.apk', 'config.arm64_v8a.apk', 'icon.png',
], new Uint8Array(), 'xapk');
assert.deepEqual(xapk.embeddedApks, ['base.apk', 'config.arm64_v8a.apk']);
assert.equal(xapk.descriptor, 'manifest.json');
assert.match(xapk.signatureEvidence, /embedded APK signatures not inspected/);

const signingBlockBytes = Buffer.alloc(62);
signingBlockBytes.writeBigUInt64LE(32n, 0);
signingBlockBytes.writeBigUInt64LE(32n, 16);
signingBlockBytes.write('APK Sig Block 42', 24, 'ascii');
signingBlockBytes.writeUInt32LE(0x06054b50, 40);
signingBlockBytes.writeUInt32LE(40, 56);
assert.equal(hasApkSigningBlock(signingBlockBytes), true);
assert.equal(hasApkSigningBlock(Buffer.from('APK Sig Block 42')), false, 'magic text alone is not signing-block evidence');
assert.match(analyzeAndroidPackage(['AndroidManifest.xml'], signingBlockBytes, 'apk').signatureEvidence,
  /APK Signing Block present \(not cryptographically verified\)/);

const sampleApkBytes = await readFile(new URL('sample.apk', examples));
const sampleZip = await JSZip.loadAsync(sampleApkBytes);
const sampleLayout = analyzeAndroidPackage(
  Object.values(sampleZip.files).filter((entry) => !entry.dir).map((entry) => entry.name),
  sampleApkBytes,
  'apk',
);
assert.deepEqual(sampleLayout.manifestFiles, ['AndroidManifest.xml']);
assert.deepEqual(sampleLayout.dexFiles, ['classes.dex']);
assert.deepEqual(sampleLayout.abiDirs, ['arm64-v8a', 'x86_64']);
assert.match(sampleLayout.signatureEvidence, /No recognized signature material/);

const pemText = await readFile(new URL('sample.pem', examples), 'utf8');
const renderCertificate = async (text) => (await renderPem({
  text,
  bytes: new TextEncoder().encode(text),
  isBinary: false,
})).bodyHtml;
const assertHonestCertificateLabels = (html) => {
  assert.match(html, /Self-issued \(signature not verified\)/);
  assert.match(html, /Signature and trust chain are not verified\./);
  assert.match(html, /Within validity dates|Expires soon|Expired \(date\)|Not yet within validity dates/);
  assert.doesNotMatch(html, /Self-signed/);
  assert.doesNotMatch(html, /badge-valid">Valid</);
};
assertHonestCertificateLabels(await renderCertificate(pemText));

const match = pemText.match(/-----BEGIN CERTIFICATE-----([\s\S]+?)-----END CERTIFICATE-----/);
const corruptDer = Buffer.from(match[1].replace(/\s/g, ''), 'base64');
corruptDer[corruptDer.length - 1] ^= 1;
const corruptBase64 = corruptDer.toString('base64').match(/.{1,64}/g).join('\n');
assertHonestCertificateLabels(await renderCertificate(
  `-----BEGIN CERTIFICATE-----\n${corruptBase64}\n-----END CERTIFICATE-----\n`,
));

const invalidDateDer = Buffer.from(match[1].replace(/\s/g, ''), 'base64');
const originalNotAfter = Buffer.from('350604110438Z');
const notAfterOffset = invalidDateDer.indexOf(originalNotAfter);
assert.notEqual(notAfterOffset, -1, 'sample certificate contains the expected notAfter field');
Buffer.from('359904110438Z').copy(invalidDateDer, notAfterOffset);
const invalidDateBase64 = invalidDateDer.toString('base64').match(/.{1,64}/g).join('\n');
const invalidDateHtml = await renderCertificate(
  `-----BEGIN CERTIFICATE-----\n${invalidDateBase64}\n-----END CERTIFICATE-----\n`,
);
assert.match(invalidDateHtml, /Invalid\/unknown validity dates/);
assert.doesNotMatch(invalidDateHtml, /Within validity dates/);

console.log('package and certificate trust-label tests passed');
