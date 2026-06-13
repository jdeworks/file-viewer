// Unit tests for the move-aware diff algorithm (WP15). Pure logic, no browser.
import { computeMoveDiff } from '../docs/core/movediff.js';

let failed = 0;
const ok = (cond, msg) => { console.log((cond ? '✓ ' : '✗ ') + msg); if (!cond) failed++; };

const P1 = 'The first paragraph stays put.\nIt has two lines.';
const P2 = 'The second paragraph is the one that moves around the document.';
const P3 = 'A third paragraph at the bottom.';

// 1. Identical -> all unchanged, no moves.
{
  const text = [P1, P2, P3].join('\n\n');
  const r = computeMoveDiff(text, text);
  ok(r.stats.unchanged === 3, 'identical: 3 unchanged');
  ok(r.stats.moved === 0 && r.stats.added === 0 && r.stats.removed === 0, 'identical: no moves/adds/removes');
}

// 2. A paragraph moved (reordered) -> detected as a move, similarity 1, NOT add+remove.
{
  const before = [P1, P2, P3].join('\n\n');
  const after = [P2, P1, P3].join('\n\n');   // P2 hoisted to top
  const r = computeMoveDiff(before, after);
  ok(r.stats.moved >= 1, 'reorder: at least one moved block');
  ok(r.stats.added === 0 && r.stats.removed === 0, 'reorder: no spurious add/remove');
  const mv = r.pairs.find((p) => p.kind === 'moved');
  ok(mv && mv.moveId !== null, 'reorder: move has a moveId linking endpoints');
}

// 3. Moved AND edited (>=80% same) -> moved-modified.
{
  const before = [P1, P2, P3].join('\n\n');
  const edited = 'The second paragraph is the one that moves around the whole document today.';
  const after = [edited, P1, P3].join('\n\n');
  const r = computeMoveDiff(before, after);
  ok(r.stats['moved-modified'] >= 1, 'moved+edited: classified moved-modified');
  const mm = r.pairs.find((p) => p.kind === 'moved-modified');
  ok(mm && mm.similarity >= 0.8 && mm.similarity < 1, `moved-modified similarity in [0.8,1): ${mm && mm.similarity.toFixed(2)}`);
}

// 4. Below threshold -> treated as remove + add, not a move.
{
  const before = [P1, P2].join('\n\n');
  const after = [P1, 'Completely different unrelated sentence with no overlap.'].join('\n\n');
  const r = computeMoveDiff(before, after);
  ok(r.stats.removed === 1 && r.stats.added === 1, 'low similarity: remove + add, not a move');
  ok(r.stats.moved === 0 && r.stats['moved-modified'] === 0, 'low similarity: no move classification');
}

// 5. Pure addition.
{
  const before = [P1, P2].join('\n\n');
  const after = [P1, P2, P3].join('\n\n');
  const r = computeMoveDiff(before, after);
  ok(r.stats.added === 1 && r.stats.unchanged === 2, 'append: 1 added, 2 unchanged');
}

console.log(failed ? `\nMOVEDIFF FAILED (${failed})` : '\nMOVEDIFF PASSED');
process.exit(failed ? 1 : 0);
