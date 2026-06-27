import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { metadataArtifact, metadataRows } from "../content.js";
import { buildEntityFPhotoOpenOptions } from "../renderer.js";
import { parseExif } from "../../../../../types/image/exif.js";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../../../../../..");
const fixtureDir = resolve(repo, "docs/examples/metagame/stage7");

async function assertPngFixture(name) {
  const bytes = await readFile(resolve(fixtureDir, name));
  assert.deepEqual([...bytes.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.ok(bytes.length > 60, `${name} should be a real PNG fixture`);
}

async function assertJpegFixture(name) {
  const bytes = await readFile(resolve(fixtureDir, name));
  // JPEG magic: SOI = FF D8, and the stream ends with EOI = FF D9.
  assert.deepEqual([...bytes.subarray(0, 2)], [0xff, 0xd8], `${name} should start with JPEG SOI`);
  assert.deepEqual([...bytes.subarray(bytes.length - 2)], [0xff, 0xd9], `${name} should end with JPEG EOI`);
  assert.ok(bytes.length > 60, `${name} should be a real JPEG fixture`);
  return bytes;
}

// Entity A keeps its minimal PNG stub (only used in optional compare); Entity F is now a REAL JPEG
// carrying the GPS EXIF the boss un-cheat reads.
await assertPngFixture("entity_a_verification.png");
const fBytes = await assertJpegFixture("entity_f_verification.jpg");

// The JPEG's embedded EXIF must contain the contradicting GPS — parsed by the SAME app parser the
// metadata pane uses, so this proves the data is in the image, not a sidecar.
const ex = parseExif(fBytes);
assert.ok(ex, "Entity F JPEG must have parseable EXIF");
assert.ok(Math.abs(ex.gpsLat - 52.3) < 0.05, `gpsLat ${ex.gpsLat} ~ 52.3`);
assert.ok(Math.abs(ex.gpsLon - 4.8) < 0.05, `gpsLon ${ex.gpsLon} ~ 4.8`);
assert.equal(ex.gpsLatRef, "N");
assert.equal(ex.gpsLonRef, "E");

const sidecar = JSON.parse(await readFile(resolve(fixtureDir, "entity_metadata.json"), "utf8"));
assert.deepEqual(sidecar, metadataArtifact);
assert.equal(sidecar.entities.A.GPSInfo, Object.fromEntries(metadataRows.A).GPSInfo);
assert.equal(sidecar.entities.F.GPSInfo, "52.3N, 4.8E / outside known layers");

const opts = buildEntityFPhotoOpenOptions();
assert.equal(opts.mime, "image/jpeg");
assert.equal(opts.entity, "F");
assert.equal(opts.source, "stage7");
// The sidecar/staged-metadata fields are GONE — the metadata comes from real EXIF now.
assert.equal("metadataSidecar" in opts, false);
assert.equal("metadataRows" in opts, false);
assert.equal("metadataField" in opts, false);
assert.equal("text" in opts, false);

console.log("stage7 artifact tests passed");
