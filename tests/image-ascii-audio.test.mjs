import assert from 'node:assert/strict';
import { attachBestEffortAudio } from '../docs/types/image/ascii/audio-track.js';

const originalWindow = globalThis.window;

function installAudioContext(impl) {
  globalThis.window = { AudioContext: impl };
}

function recStream() {
  const tracks = [];
  return {
    tracks,
    addTrack(track) { tracks.push(track); },
  };
}

{
  const seen = { started: null, stopped: false, closed: false };
  const track = { kind: 'audio', stop() { seen.stopped = true; } };
  installAudioContext(class {
    async decodeAudioData() { return { duration: 1.25 }; }
    createBufferSource() {
      return {
        buffer: null,
        connect() {},
        start(when, offset) { seen.started = { when, offset }; },
        stop() { seen.stopped = true; },
      };
    }
    createMediaStreamDestination() { return { stream: { getAudioTracks: () => [track] } }; }
    close() { seen.closed = true; }
  });
  const stream = recStream();
  const handle = await attachBestEffortAudio(new Blob(['fake media']), {}, stream);
  assert.equal(handle.included, true);
  assert.equal(handle.method, 'decoded');
  assert.deepEqual(stream.tracks, [track]);
  handle.start(0.5);
  assert.deepEqual(seen.started, { when: 0, offset: 0.5 });
  handle.cleanup();
  assert.equal(seen.closed, true);
}

{
  installAudioContext(class {
    async decodeAudioData() { throw new Error('decode denied'); }
    createMediaElementSource() { throw new Error('media denied'); }
    close() {}
  });
  const stream = recStream();
  const handle = await attachBestEffortAudio(new Blob(['fake media']), {}, stream);
  assert.equal(handle.included, false);
  assert.equal(handle.method, 'silent');
  assert.match(handle.warning, /silent video/i);
  assert.equal(stream.tracks.length, 0);
}

globalThis.window = originalWindow;
console.log('image ascii audio: ok');
