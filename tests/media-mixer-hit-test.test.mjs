import assert from 'node:assert/strict';

import {
  buildMixerLayout,
  createProjectFromAssetMetadata,
  hitTestMixer,
  MIXER_LAYOUT,
  pointToTimeMs,
  createMixerSnapshot,
} from '../docs/types/media/mixer/index.js';

const project = createProjectFromAssetMetadata({
  id: 'asset-audio',
  name: 'sample.wav',
  capabilities: { hasAudio: true },
  media: { durationMs: 10000 },
});
const snapshot = createMixerSnapshot(project);
const viewport = { cursorMs: 1000, scrollLeft: 0, pxPerMs: 0.1, width: 1000 };
const layout = buildMixerLayout(snapshot, viewport);
const elementRect = layout.elementRects[0];

assert.equal(layout.laneRects.length, 1, 'hit-test: layout has one lane rect');
assert.equal(layout.elementRects.length, 1, 'hit-test: layout has one element rect');
assert.equal(layout.playheadX, MIXER_LAYOUT.gutterWidth + 100, 'hit-test: playhead derives from cursor and zoom');

{
  const hit = hitTestMixer({ x: MIXER_LAYOUT.gutterWidth + 250, y: 12 }, snapshot, viewport);
  assert.equal(hit.type, 'ruler', 'hit-test: ruler region detected');
  assert.equal(Math.round(hit.timeMs), 2500, 'hit-test: ruler hit maps x to time');
}

{
  const hit = hitTestMixer({ x: 20, y: layout.laneRects[0].y + 20 }, snapshot, viewport);
  assert.equal(hit.type, 'lane', 'hit-test: lane header detected');
  assert.equal(hit.region, 'lane-header', 'hit-test: lane header region named');
}

{
  const hit = hitTestMixer({
    x: elementRect.x + elementRect.width / 2,
    y: elementRect.y + elementRect.height / 2,
  }, snapshot, viewport);
  assert.equal(hit.type, 'element', 'hit-test: element body detected');
  assert.equal(hit.region, 'body', 'hit-test: element body region named');
  assert.equal(hit.elementId, project.elements[0].id, 'hit-test: element id returned');
}

{
  const left = hitTestMixer({ x: elementRect.x + 2, y: elementRect.y + 30 }, snapshot, viewport);
  assert.equal(left.region, 'trim-start', 'hit-test: left trim handle detected');
  const right = hitTestMixer({ x: elementRect.x + elementRect.width - 2, y: elementRect.y + 30 }, snapshot, viewport);
  assert.equal(right.region, 'trim-end', 'hit-test: right trim handle detected');
}

{
  const fadeIn = hitTestMixer({ x: elementRect.x + 12, y: elementRect.y + 8 }, snapshot, viewport);
  assert.equal(fadeIn.region, 'fade-in', 'hit-test: fade-in handle detected');
  const fadeOut = hitTestMixer({ x: elementRect.x + elementRect.width - 12, y: elementRect.y + 8 }, snapshot, viewport);
  assert.equal(fadeOut.region, 'fade-out', 'hit-test: fade-out handle detected');
}

{
  const hit = hitTestMixer({
    x: elementRect.x + elementRect.width + 40,
    y: elementRect.y + elementRect.height / 2,
  }, snapshot, viewport);
  assert.equal(hit.type, 'lane', 'hit-test: empty lane area detected');
  assert.equal(hit.region, 'empty-lane', 'hit-test: empty lane region named');
}

{
  assert.equal(Math.round(pointToTimeMs(MIXER_LAYOUT.gutterWidth + 333, viewport)), 3330, 'hit-test: pointToTimeMs converts with zoom');
  assert.equal(Math.round(pointToTimeMs(MIXER_LAYOUT.gutterWidth + 333, { ...viewport, scrollLeft: 100 })), 4330, 'hit-test: pointToTimeMs includes pan scroll');
}

