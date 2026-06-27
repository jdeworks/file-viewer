import assert from "node:assert/strict";
import {
  recordMetagameViewerOpen,
  recordStage7MetadataInspection,
  shouldSetStage7ExifContradiction
} from "../../../viewer-actions.js";
import { buildEntityFPhotoOpenOptions } from "../renderer.js";

const ACTION = "exif_contradiction_found";

function collector() {
  const calls = [];
  const setAction = (stage, action, detail) => { calls.push({ stage, action, detail }); };
  return { calls, setAction, fired: () => calls.some((c) => c.stage === 7 && c.action === ACTION) };
}

// 1. Opening the Entity F photo must NOT unlock the boss. recordMetagameViewerOpen is the file-open
//    path; the EXIF contradiction was removed from it, so opening the photo (even with its real
//    open-options) fires nothing for stage 7's boss.
{
  const c = collector();
  recordMetagameViewerOpen({
    file: "entity_f_verification.jpg",
    opts: buildEntityFPhotoOpenOptions(),
    setAction: c.setAction
  });
  assert.equal(c.fired(), false, "opening the photo must NOT fire the boss un-cheat");
}

// 2. The metadata-render path DOES fire it. This is exactly what metadata.js calls when the GPS row
//    renders in the Metadata pane — the only path that unlocks the boss now.
{
  const c = collector();
  const ok = recordStage7MetadataInspection({
    file: "entity_f_verification.jpg",
    field: "GPSInfo",
    entity: "F",
    setAction: c.setAction
  });
  assert.equal(ok, true);
  assert.equal(c.fired(), true, "rendering the GPS row in the metadata pane fires the boss un-cheat");
  const rec = c.calls.find((x) => x.action === ACTION);
  assert.equal(rec.detail.source, "viewer-metadata");
  assert.equal(rec.detail.field, "GPSInfo");
  assert.equal(rec.detail.entity, "F");
}

// 3. The gate is the new JPEG fixture, keyed on filename + field + entity (deterministic, no RNG).
assert.equal(shouldSetStage7ExifContradiction({ file: "entity_f_verification.jpg", field: "GPSInfo", entity: "F" }), true);
assert.equal(shouldSetStage7ExifContradiction({ file: "entity_f_verification.png", field: "GPSInfo", entity: "F" }), false, "the old PNG stub no longer triggers the boss");
assert.equal(shouldSetStage7ExifContradiction({ file: "vacation_photo.jpg", field: "GPSInfo", entity: "F" }), false, "an unrelated geotagged photo never triggers the boss");
assert.equal(shouldSetStage7ExifContradiction({ file: "entity_f_verification.jpg", field: "Make", entity: "F" }), false, "a non-GPS metadata row does not trigger the boss");

console.log("stage7 un-cheat tests passed");
