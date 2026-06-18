// Move-aware diff algorithm (WP15). Standard diffs show a moved paragraph as a delete +
// an unrelated add. This classifies blocks (paragraphs) as unchanged / modified / moved /
// moved-modified / added / removed, so the renderer (WP16) can draw a move arrow instead.
//
// Pure logic, no DOM — unit-tested in tests/movediff.test.mjs.
//
// Approach:
//   1. Split both sides into blocks (paragraphs: runs of non-blank lines).
//   2. Pair blocks: exact-content matches first, then similarity >= threshold (greedy).
//   3. Of the paired blocks, the longest in-order run (LIS on target index) is the stable
//      backbone; pairs OUTSIDE it are moves. similarity==1 -> moved; <1 -> moved-modified.
//      Backbone pairs with similarity<1 are in-place modifications.
//   4. Unpaired original blocks are removals; unpaired current blocks are additions.

const DEFAULT_THRESHOLD = 0.8;

function splitBlocks(text) {
  const lines = (text ?? '').split('\n');
  const blocks = [];
  let start = -1;
  for (let i = 0; i <= lines.length; i++) {
    const blank = i === lines.length || lines[i].trim() === '';
    if (!blank && start === -1) start = i;
    if (blank && start !== -1) {
      blocks.push({ start, end: i, lines: lines.slice(start, i) });   // [start, end)
      start = -1;
    }
  }
  const nonblank = lines.filter((l) => l.trim() !== '').length;
  if (blocks.length <= 1 && nonblank > 1) {
    return lines
      .map((line, i) => ({ line, i }))
      .filter((x) => x.line.trim() !== '')
      .map((x) => ({ start: x.i, end: x.i + 1, lines: [x.line] }));
  }
  return blocks;
}

const norm = (block) => block.lines.map((l) => l.trim()).join('\n');
const tokens = (block) => norm(block).toLowerCase().split(/\s+/).filter(Boolean);

// Token multiset similarity: 2*|intersection| / (|a|+|b|)  (Sørensen–Dice).
function similarity(a, b) {
  const ta = tokens(a), tb = tokens(b);
  if (!ta.length && !tb.length) return 1;
  if (!ta.length || !tb.length) return 0;
  const counts = new Map();
  for (const t of ta) counts.set(t, (counts.get(t) || 0) + 1);
  let inter = 0;
  for (const t of tb) { const c = counts.get(t) || 0; if (c > 0) { inter++; counts.set(t, c - 1); } }
  return (2 * inter) / (ta.length + tb.length);
}

// Max-WEIGHT increasing subsequence over target indices `seq`, weighted by `weight[i]`.
// Returns the set of kept indices = the stable backbone. Weighting by similarity makes
// exact-match blocks (weight 1) anchor the backbone, so an edited+moved block is correctly
// the one classified as moved rather than its untouched neighbour (move detection is
// inherently symmetric; this picks the interpretation that keeps anchors in place).
function backboneIndices(seq, weight) {
  const n = seq.length;
  if (!n) return new Set();
  const dp = new Array(n), prev = new Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    dp[i] = weight[i];
    for (let j = 0; j < i; j++) {
      if (seq[j] < seq[i] && dp[j] + weight[i] > dp[i]) { dp[i] = dp[j] + weight[i]; prev[i] = j; }
    }
  }
  let best = 0;
  for (let i = 1; i < n; i++) if (dp[i] > dp[best]) best = i;
  const keep = new Set();
  for (let k = best; k !== -1; k = prev[k]) keep.add(k);
  return keep;
}

// Word-level diff between two blocks (the displayed text of a matched pair). Returns
// per-side token runs {text, changed} so the renderer highlights ONLY the changed words
// instead of flat-marking the whole paragraph. Tokens are words + whitespace runs (so the
// exact text reconstructs); comparison is by token equality, common tokens via LCS.
const tokenizeWords = (text) => (text ?? '').match(/\s+|\S+/g) || [];

export function wordDiff(aText, bText) {
  const a = tokenizeWords(aText), b = tokenizeWords(bText);
  // Guard against pathological sizes — fall back to "all changed" so we never hang.
  if (a.length * b.length > 1_000_000) {
    return { a: a.length ? [{ text: aText, changed: true }] : [], b: b.length ? [{ text: bText, changed: true }] : [] };
  }
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));   // LCS length table
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const aMark = new Array(m).fill(true), bMark = new Array(n).fill(true);   // true = changed
  let i = 0, j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) { aMark[i] = false; bMark[j] = false; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  const runs = (tokens, mark) => {
    const out = [];
    for (let k = 0; k < tokens.length; k++) {
      const changed = mark[k] && tokens[k].trim() !== '';   // pure-whitespace stays unmarked
      const last = out[out.length - 1];
      if (last && last.changed === changed) last.text += tokens[k];
      else out.push({ text: tokens[k], changed });
    }
    return out;
  };
  return { a: runs(a, aMark), b: runs(b, bMark) };
}

export function computeMoveDiff(originalText, currentText, { threshold = DEFAULT_THRESHOLD } = {}) {
  const A = splitBlocks(originalText);
  const B = splitBlocks(currentText);

  const usedB = new Set();
  const pairForA = new Array(A.length).fill(-1);   // A index -> B index
  const simForA = new Array(A.length).fill(0);

  // Pass 1: exact content matches (in source order, first free identical target).
  const bByNorm = new Map();
  B.forEach((b, j) => { const k = norm(b); (bByNorm.get(k) || bByNorm.set(k, []).get(k)).push(j); });
  A.forEach((a, i) => {
    const cands = bByNorm.get(norm(a));
    if (!cands) return;
    const j = cands.find((x) => !usedB.has(x));
    if (j !== undefined) { pairForA[i] = j; simForA[i] = 1; usedB.add(j); }
  });

  // Pass 2: similarity matching for the rest (greedy best-match >= threshold).
  for (let i = 0; i < A.length; i++) {
    if (pairForA[i] !== -1) continue;
    let bestJ = -1, bestSim = threshold;
    for (let j = 0; j < B.length; j++) {
      if (usedB.has(j)) continue;
      const s = similarity(A[i], B[j]);
      if (s >= bestSim) { bestSim = s; bestJ = j; }
    }
    if (bestJ !== -1) { pairForA[i] = bestJ; simForA[i] = bestSim; usedB.add(bestJ); }
  }

  // Backbone: longest in-order run of paired (A,B). Pairs outside it are moves.
  const paired = [];
  for (let i = 0; i < A.length; i++) if (pairForA[i] !== -1) paired.push({ aIndex: i, bIndex: pairForA[i], similarity: simForA[i] });
  paired.sort((p, q) => p.aIndex - q.aIndex);
  const backbone = backboneIndices(paired.map((p) => p.bIndex), paired.map((p) => p.similarity));

  let moveId = 0;
  const pairs = paired.map((p, idx) => {
    const stationary = backbone.has(idx);
    const exact = p.similarity >= 0.999;
    let kind;
    if (stationary) kind = exact ? 'unchanged' : 'modified';
    else kind = exact ? 'moved' : 'moved-modified';
    const out = { ...p, kind, moveId: stationary ? null : moveId++ };
    return out;
  });

  const removed = [];
  for (let i = 0; i < A.length; i++) if (pairForA[i] === -1) removed.push(i);
  const added = [];
  for (let j = 0; j < B.length; j++) if (!usedB.has(j)) added.push(j);

  const stats = { unchanged: 0, modified: 0, moved: 0, 'moved-modified': 0, added: added.length, removed: removed.length };
  for (const p of pairs) stats[p.kind]++;

  return { threshold, blocksA: A, blocksB: B, pairs, removed, added, stats };
}
