import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { metadataArtifact, metadataRows } from "../content.js";
import { buildEntityFPhotoOpenOptions } from "../renderer.js";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../../../../../..");
const fixtureDir = resolve(repo, "docs/examples/metagame/stage7");

async function assertPngFixture(name) {
  const bytes = await readFile(resolve(fixtureDir, name));
  assert.deepEqual([...bytes.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.ok(bytes.length > 60, `${name} should be a real PNG fixture`);
}

await assertPngFixture("entity_a_verification.png");
await assertPngFixture("entity_f_verification.png");

const sidecar = JSON.parse(await readFile(resolve(fixtureDir, "entity_metadata.json"), "utf8"));
assert.deepEqual(sidecar, metadataArtifact);
assert.equal(sidecar.entities.A.GPSInfo, Object.fromEntries(metadataRows.A).GPSInfo);
assert.equal(sidecar.entities.F.GPSInfo, "52.3N, 4.8E / outside known layers");

const opts = buildEntityFPhotoOpenOptions();
assert.equal(opts.mime, "image/png");
assert.equal(opts.metadataField, "GPSInfo");
assert.equal(opts.entity, "F");
assert.equal(opts.metadataSidecar, "/docs/examples/metagame/stage7/entity_metadata.json");
assert.equal("text" in opts, false);
assert.deepEqual(opts.metadataRows, metadataRows.F.map(([field, value]) => ({ field, value })));

console.log("stage7 artifact tests passed");
