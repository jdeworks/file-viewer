import assert from 'node:assert/strict';
import { createLatestRequestController } from '../docs/core/request-lifecycle.js';

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

console.log('preview request lifecycle: all assertions passed');
