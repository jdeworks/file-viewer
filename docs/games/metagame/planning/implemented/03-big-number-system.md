# 03 — Big-Number System (BigNum)

Technical design for the big-number subsystem Stage 1 needs. The current engine
(`docs/games/metagame/metagame.js`) stores bits as plain JS numbers and formats with a `fmt()`
that stops at `Sx` (≈10^21). Both are insufficient once timed bursts, multipliers, and prestige
compound. This doc specifies a `{m, e}` representation, its operations, the display notation, when
the switch becomes mandatory, and a growth simulation to validate the tuning in `02`.

---

## A. Notation standard

After the four named tiers, suffixes are a two-letter base-26 sequence; each step is +3 to the
exponent (one "tier"). `tier = e / 3`.

| Exponent `e` | Suffix | | `e` | Suffix |
|---|---|---|---|---|
| 0   | *(none)* | | 24 | ad |
| 3   | K | | 27 | ae |
| 6   | M | | 30 | af |
| 9   | B | | … | … |
| 12  | T | | 87 | ay |
| 15  | aa | | 90 | az |
| 18  | ab | | 93 | ba |
| 21  | ac | | 96 | bb |

**Suffix function:**
```js
function suffix(e) {
  if (e === 0) return '';
  const tier = e / 3;                 // e is always a multiple of 3
  if (tier <= 4) return ['K','M','B','T'][tier - 1];
  const k = tier - 5;                 // 0 → 'aa'
  const a = Math.floor(k / 26), b = k % 26;
  return String.fromCharCode(97 + a) + String.fromCharCode(97 + b);
}
// tier 5→'aa', 6→'ab', … 30→'az', 31→'ba', … up to 'zz' = tier 5+675 = e 2040 (10^2040)
```
That ceiling (`zz`, 10^2040) is *vastly* beyond anything Stage 1 reaches; a third letter can be
added later if a far stage needs it. No need to implement it now.

---

## B. Storage format

```js
// BigNum: value = m × 10^e
//   m : mantissa, normalized to 1 ≤ m < 1000   (one "tier" of mantissa headroom)
//   e : exponent, always a multiple of 3, integer ≥ 0
// Zero is the special case { m: 0, e: 0 }.
// (Stage-1 bits are non-negative; sub() clamps at 0. No sign field needed.)
const ZERO = { m: 0, e: 0 };
```

Keeping `1 ≤ m < 1000` (rather than `1 ≤ m < 10`) means `e` is always a multiple of 3, so it maps
directly to a suffix tier and display is just `m.toFixed(2) + suffix(e)`.

**Serialization:** store as `{ m, e }` in the existing `localStorage` save (`fv:games:metagame`).
Migration: on load, if `bits` is a legacy plain number, `bits = fromNumber(bits)`.

---

## C. Core operations (pseudocode)

```js
const BASE = 1000;        // mantissa rolls over every 10^3
const LOG_BASE = 3;       // log10(BASE)

// Re-normalize so 1 ≤ m < 1000 (or value is exactly zero).
function norm(a) {
  if (a.m === 0) return ZERO;
  let { m, e } = a;
  while (m >= BASE) { m /= BASE; e += LOG_BASE; }
  while (m < 1 && e > 0) { m *= BASE; e -= LOG_BASE; }
  // floats can leave m slightly < 1 at e === 0; that's a small real number, keep as-is.
  return { m, e };
}

function fromNumber(n) {
  if (!isFinite(n) || n <= 0) return ZERO;
  let e = 0, m = n;
  while (m >= BASE) { m /= BASE; e += LOG_BASE; }
  return { m, e };
}

// Compare. Returns true if a ≥ b.
function gte(a, b) {
  if (a.m === 0) return b.m === 0;
  if (b.m === 0) return true;
  if (a.e !== b.e) return a.e > b.e;
  return a.m >= b.m;
}
const lt = (a, b) => !gte(a, b);

// Add. Align to the larger exponent, sum mantissas, normalize.
function add(a, b) {
  if (a.m === 0) return b;
  if (b.m === 0) return a;
  let hi = a, lo = b;
  if (b.e > a.e) { hi = b; lo = a; }
  const diff = hi.e - lo.e;
  // If lo is more than ~16 tiers smaller, it's below float precision — drop it.
  if (diff > 48) return hi;
  const m = hi.m + lo.m / Math.pow(10, diff);
  return norm({ m, e: hi.e });
}

// Subtract (a − b), clamped to ZERO (bits never go negative).
function sub(a, b) {
  if (b.m === 0) return a;
  if (gte(b, a)) return ZERO;            // result would be ≤ 0
  const diff = a.e - b.e;                // a ≥ b ⇒ a.e ≥ b.e
  if (diff > 48) return a;               // b negligible
  const m = a.m - b.m / Math.pow(10, diff);
  return norm({ m, e: a.e });
}

// Multiply. Multiply mantissas, add exponents, normalize.
function mul(a, b) {
  if (a.m === 0 || b.m === 0) return ZERO;
  return norm({ m: a.m * b.m, e: a.e + b.e });
}

// Multiply a BigNum by a plain JS scalar (very common: × clickPower, × pull, × level).
function mulScalar(a, k) {
  if (a.m === 0 || k === 0) return ZERO;
  return norm({ m: a.m * k, e: a.e });
}

// Display: 2 decimals + suffix. Small values show fewer/no decimals for readability.
function toDisplay(a) {
  if (a.m === 0) return '0';
  if (a.e === 0) return (Math.floor(a.m * 10) / 10).toString().replace(/\.0$/, '');
  return a.m.toFixed(2) + suffix(a.e);
}

// Serialize / deserialize for the save file.
const toStore   = (a) => ({ m: a.m, e: a.e });
const fromStore = (o) => (o && typeof o.m === 'number') ? norm(o) : ZERO;
```

**Edge cases to test:**
- `add` of two equal values doubles correctly across a tier boundary (e.g. `999.9K + 0.2K`).
- `sub` clamps to `ZERO` and `gte(b,a)` short-circuits before float subtraction.
- `fromNumber(0)`, `fromNumber(Infinity)`, `fromNumber(-5)` all return `ZERO`.
- `norm` handles `m` landing exactly on `1000` after a multiply.
- The `diff > 48` precision cutoff: a value 48 orders of magnitude smaller is correctly ignored.

---

## D. When BigNum becomes necessary

A JS double represents integers exactly only up to `Number.MAX_SAFE_INTEGER = 2^53 − 1 ≈
9.007 × 10^15` — i.e. about **`9.0aa`** in our notation. Past that, integer bit counts start
losing precision (off-by-some errors that compound through `costOf` and `totalRate`).

From the `02` sub-stage table, Stage 1 crosses 10^15 during the **Neural Net (unlock 1M ever) →
Quantum Tap (unlock at 5M, then multiplied by Neural Net and prestige)** phase, and the
**boss ticket is 1B** with post-boss spoils of `goal × 5`. With timed bursts × multipliers ×
prestige stacking, values blow past 2^53 well before the player finishes Stage 1.

**Recommendation: use BigNum for *all* bit storage from the start of Stage 1.** Small numbers
(`{m: 5, e: 0}` = 5 bits) work fine in the same representation, so there's no dual-path
complexity. The current `fmt()` and the raw-number arithmetic in `metagame.js`
(`state.bits += clickPower()`, `costOf`, the `setInterval` rate tick) are all replaced with the
BigNum ops above. This avoids a mid-game precision cliff and a risky later migration.

**Migration of existing saves:** on `load()`, detect a legacy numeric `bits`/cost field and wrap
with `fromNumber`. Keep `totalBits` as BigNum too (it's the prestige input and grows fastest).

---

## E. Growth simulation

Rough projection of a fresh Stage-1 run using the `02` tuning (manual tapping + a moderate manager
fleet; ~3 taps/sec early, managers carrying the mid-game). **Approximate** — meant to validate the
shape of the curve and the suffix transitions, not to be exact. Re-run with the real numbers once
implemented.

| Elapsed | Bits on hand (≈) | Notation | What's happening |
|---------|------------------|----------|------------------|
| 0:00 | 0 | `0` | empty screen, first taps reveal the grid |
| 0:30 | 100 | `100` | first **Multiplier** affordable |
| 2:00 | 600 | `600` | **Bit Box** unlocks (500 on hand) |
| 5:00 | 3.2K | `3.20K` | **Signal Booster** unlocks; Managers tab appears |
| 9:00 | 15K | `15.0K` | **Core Cluster** unlocks; first manager hired |
| 14:00 | 90K | `90.0K` | **Processing Array** unlocks — first passive income |
| 20:00 | 1.4M | `1.40M` | **Neural Net** unlocks (1M ever); Research tab appears |
| 27:00 | 12M | `12.0M` | **Quantum Tap** unlocks (Neural Net ≥3) |
| 33:00 | 250M | `250M` | net rate negative if over-hired — the trap bites |
| 38:00 | 1.1B | `1.10B` | **boss ticket** (1B) affordable; all sub-stages owned |
| 40:00 | — | — | **The Overwriter** fight → Stage 2 |
| *(post-prestige)* | 8.0aa total | `8.00aa` | first **Gravitational Pull** ≈ ×3; next run ~3× faster |

**Validation checks this gives us:**
- The first suffix transition (`K`) happens ~5 min in — early enough that the buy-multiplier
  overlay (which the current code shows at ≥1000 bits) has a reason to exist.
- 2^53 (`9.0aa`) is only crossed *after* the boss, during prestige accounting — confirming that
  `totalBits`/`pull` math is where BigNum precision matters most, and reinforcing "use BigNum
  from the start."
- Total active time to boss ≈ 40 min, matching the `02` target. If playtests run long, lower the
  later base costs or raise timed payouts; if too short, raise growth rates toward 1.15.
