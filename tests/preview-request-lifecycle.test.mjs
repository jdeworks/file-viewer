import assert from 'node:assert/strict';
import { createLatestRequestController } from '../docs/core/request-lifecycle.js';
import { state } from '../docs/core/state.js';
import { syncScrollFromPreview, syncScrollFromRaw } from '../docs/core/sync.js';

const cleanupErrors = [];
const controller = createLatestRequestController({ onCleanupError: (error) => cleanupErrors.push(error.message) });
const events = [];

const first = controller.begin({ filename: 'package.json', mode: 'enhanced' });
assert.equal(first.isCurrent(), true);
assert.equal(first.signal.aborted, false);
assert.equal(Object.isFrozen(first.snapshot), true);
first.registerCleanup(() => events.push('first-a'));
first.registerCleanup(() => { events.push('first-b'); throw new Error('cleanup-b'); });

const second = controller.begin({ filename: 'Dockerfile', mode: 'enhanced' });
assert.equal(first.isCurrent(), false);
assert.equal(first.signal.aborted, true);
assert.deepEqual(events, ['first-b', 'first-a'], 'superseded cleanup is LIFO and continues after errors');
assert.deepEqual(cleanupErrors, ['cleanup-b']);
assert.equal(second.isCurrent(), true);

let lateRuns = 0;
first.registerCleanup(() => { lateRuns++; });
first.registerCleanup(() => { lateRuns++; });
assert.equal(lateRuns, 2, 'late registration on an invalid request cleans up immediately');

let secondRuns = 0;
const unregister = second.registerCleanup(() => { secondRuns++; });
unregister();
const deduplicatedCleanup = () => { secondRuns++; };
second.registerCleanup(deduplicatedCleanup);
second.registerCleanup(deduplicatedCleanup);
controller.invalidate('file-cleared');
controller.invalidate('already-cleared');
second.dispose('already-disposed');
assert.equal(secondRuns, 1, 'cleanup runs exactly once; an explicitly released cleanup does not run');
assert.equal(second.signal.aborted, true);
assert.equal(controller.current(), null);

const third = controller.begin({ filename: 'third.txt' });
assert.equal(controller.isCurrent(third), true);
third.dispose();
assert.equal(controller.isCurrent(third), false);

// Alternate/transient text sources (for example the compressed-autosave probe) need not expose
// Monaco's scroll API. A queued scroll callback must treat that as non-syncable, not throw.
const previous = { rawview: state.rawview, preview: state.preview, settingsModel: state.settingsModel };
state.rawview = { getValue: () => 'temporary source' };
state.preview = {};
state.settingsModel = { values: { syncScroll: true } };
assert.doesNotThrow(syncScrollFromRaw);
assert.doesNotThrow(() => syncScrollFromPreview(0.5));
Object.assign(state, previous);

console.log('preview request lifecycle: all assertions passed');
