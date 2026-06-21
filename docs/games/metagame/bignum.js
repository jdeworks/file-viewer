// bignum.js — BigNum {m, e} arithmetic for the metagame
// value = m × 10^e  |  1 ≤ m < 1000 (normalized)  |  e always a multiple of 3
// Zero is the special case { m: 0, e: 0 }.
// Stage-1 bits are non-negative; sub() clamps at 0 — no sign field needed.

const BASE = 1000;
const LOG_BASE = 3; // log10(BASE)

export const ZERO = Object.freeze({ m: 0, e: 0 });

// Re-normalize so 1 ≤ m < 1000 (or value is exactly zero).
export function norm(a) {
  if (a.m === 0) return ZERO;
  let { m, e } = a;
  if (!isFinite(m)) return ZERO;   // a NaN/Infinity mantissa would spin the loop below forever
  // Guarded: any FINITE m normalizes in well under 400 steps (10^1200). The cap is purely a
  // freeze backstop against a corrupt/overflowed value — it never trips for real game numbers.
  let g = 0;
  while (m >= BASE && g++ < 400) { m /= BASE; e += LOG_BASE; }
  while (m < 1 && e > 0 && g++ < 800) { m *= BASE; e -= LOG_BASE; }
  // Floats can leave m slightly < 1 at e === 0; that's a small real number, keep as-is.
  return { m, e };
}

// Convert plain JS number to BigNum.
export function fromNumber(n) {
  if (!isFinite(n) || n <= 0) return ZERO;
  let e = 0, m = n;
  while (m >= BASE) { m /= BASE; e += LOG_BASE; }
  return { m, e };
}

// Convert BigNum to plain JS number (m × 10^e), capped at Number.MAX_VALUE.
export function toNumber(a) {
  if (a.m === 0) return 0;
  const result = a.m * Math.pow(10, a.e);
  return Math.min(result, Number.MAX_VALUE);
}

// Returns true if a >= b.
export function gte(a, b) {
  if (a.m === 0) return b.m === 0;
  if (b.m === 0) return true;
  if (a.e !== b.e) return a.e > b.e;
  return a.m >= b.m;
}

// Returns true if a < b.
export const lt = (a, b) => !gte(a, b);

// Add. Align to the larger exponent, sum mantissas, normalize.
export function add(a, b) {
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

// Subtract (a - b), clamped to ZERO (bits never go negative).
export function sub(a, b) {
  if (b.m === 0) return a;
  if (gte(b, a)) return ZERO;           // result would be <= 0
  const diff = a.e - b.e;              // a >= b => a.e >= b.e
  if (diff > 48) return a;             // b negligible
  const m = a.m - b.m / Math.pow(10, diff);
  return norm({ m, e: a.e });
}

// Multiply. Multiply mantissas, add exponents, normalize.
export function mul(a, b) {
  if (a.m === 0 || b.m === 0) return ZERO;
  return norm({ m: a.m * b.m, e: a.e + b.e });
}

// Multiply a BigNum by a plain JS scalar (very common: x clickPower, x pull, x level).
export function mulScalar(a, k) {
  if (a.m === 0 || k === 0) return ZERO;
  return norm({ m: a.m * k, e: a.e });
}

// Suffix string for exponent e.
// Tiers 1-4: K, M, B, T. Tiers 5+: aa, ab, ... az, ba, ... zz (10^2040)
export function suffix(e) {
  if (e === 0) return '';
  const tier = e / 3; // e is always a multiple of 3
  if (tier <= 4) return ['K', 'M', 'B', 'T'][tier - 1];
  const k = tier - 5;                 // 0 -> 'aa'
  const a = Math.floor(k / 26), b = k % 26;
  return String.fromCharCode(97 + a) + String.fromCharCode(97 + b);
}

// Formatted display string: 2 decimals + suffix, or plain integer for small values.
export function toDisplay(a) {
  if (a.m === 0) return '0';
  if (a.e === 0) return (Math.floor(a.m * 10) / 10).toString().replace(/\.0$/, '');
  return a.m.toFixed(2) + suffix(a.e);
}

// Serialize to { m, e } for localStorage.
export const toStore = (a) => ({ m: a.m, e: a.e });

// Deserialize; returns ZERO on bad input.
export const fromStore = (o) => (o && typeof o.m === 'number') ? norm(o) : ZERO;

// ---------------------------------------------------------------------------
// Tests (section C edge cases)
// ---------------------------------------------------------------------------

function assert(cond, msg) {
  if (!cond) throw new Error('BigNum assertion failed: ' + msg);
}

function approxEq(x, y, tol = 1e-9) {
  if (x === 0 && y === 0) return true;
  return Math.abs(x - y) / (Math.abs(x) + Math.abs(y) + 1e-300) < tol;
}

export function runTests() {
  // 1. add crossing a tier boundary: 999.9K + 0.2K ~= 1000.1K -> normalizes to ~1.00M
  {
    // 999,900 + 200 = 1,000,100 -> 1.0001M
    const x = { m: 999.9, e: 3 }; // exactly 999,900
    const y = { m: 200,   e: 0 }; // exactly 200
    const result = add(x, y);
    assert(result.e === 6, 'add tier-cross: e should be 6 (M), got ' + result.e);
    assert(approxEq(result.m, 1.0001, 1e-6), 'add tier-cross: m should be ~1.0001, got ' + result.m);
    assert(toDisplay(result) === '1.00M', 'add tier-cross: display should be "1.00M", got ' + toDisplay(result));
  }

  // 2. sub clamps to ZERO; gte(b,a) short-circuits
  {
    const a = fromNumber(500);
    const b = fromNumber(1000);
    const result = sub(a, b); // 500 - 1000 -> ZERO
    assert(result.m === 0 && result.e === 0, 'sub clamp: expected ZERO, got m=' + result.m + ' e=' + result.e);

    // Equal values also clamp to ZERO
    const c = fromNumber(42);
    const d = fromNumber(42);
    const result2 = sub(c, d);
    assert(result2.m === 0, 'sub equal: expected ZERO');

    // Ensure gte short-circuit works (b > a)
    assert(gte(b, a) === true, 'gte(b,a) with b>a should be true');
    assert(gte(a, b) === false, 'gte(a,b) with a<b should be false');
  }

  // 3. fromNumber edge cases: 0, Infinity, negative -> ZERO
  {
    const z1 = fromNumber(0);
    assert(z1.m === 0 && z1.e === 0, 'fromNumber(0) should be ZERO');

    const z2 = fromNumber(Infinity);
    assert(z2.m === 0 && z2.e === 0, 'fromNumber(Infinity) should be ZERO');

    const z3 = fromNumber(-5);
    assert(z3.m === 0 && z3.e === 0, 'fromNumber(-5) should be ZERO');
  }

  // 4. norm handles m landing exactly on 1000 after multiply
  {
    // mulScalar: 500K x 2 = 1000K -> norm -> 1M
    const a = { m: 500, e: 3 }; // 500K
    const result = mulScalar(a, 2); // should normalize 1000K -> 1M
    assert(result.e === 6, 'norm exact 1000: e should be 6, got ' + result.e);
    assert(approxEq(result.m, 1.0, 1e-12), 'norm exact 1000: m should be 1.0, got ' + result.m);
  }

  // 5. diff > 48 precision cutoff: value 48+ orders smaller is correctly dropped in add
  {
    const big   = { m: 1.5, e: 60 };  // 1.5 x 10^60
    const small = { m: 1.0, e: 0  };  // 1 (60 orders smaller)
    const result = add(big, small);
    // diff = 60 > 48, so small is dropped; result should equal big
    assert(result.e === 60, 'diff>48 cutoff: e should be 60, got ' + result.e);
    assert(approxEq(result.m, 1.5, 1e-12), 'diff>48 cutoff: m should be 1.5, got ' + result.m);

    // Also test the exact boundary: diff = 48 attempts the add (not short-circuited by the > 48 guard).
    // However, 1.0 + 1e-48 underflows in IEEE 754 double precision (~2.2e-16 relative epsilon),
    // so the result rounds to the hi value — this is correct float behavior, not a bug.
    const big2   = { m: 1.0, e: 48 };
    const small2 = { m: 1.0, e: 0  };
    const result2 = add(big2, small2);
    // The add is attempted (diff=48 does NOT trigger the early return), result is hi-normalized.
    assert(result2.e === 48, 'diff=48 boundary: e should still be 48, got ' + result2.e);
    assert(result2.m >= 1.0, 'diff=48 boundary: m should be >= 1.0, got ' + result2.m);
    // With a smaller diff (e.g. 12 orders = diff 12), the add must be visible.
    const big3   = { m: 1.0, e: 12 };  // 1T
    const small3 = { m: 1.0, e: 0  };  // 1 (12 orders smaller)
    const result3 = add(big3, small3);
    assert(result3.m > 1.0, 'diff=12 should be added, m should be > 1.0, got ' + result3.m);
  }

  // Bonus: suffix correctness
  {
    assert(suffix(0)  === '',   'suffix(0) should be ""');
    assert(suffix(3)  === 'K',  'suffix(3) should be "K"');
    assert(suffix(6)  === 'M',  'suffix(6) should be "M"');
    assert(suffix(9)  === 'B',  'suffix(9) should be "B"');
    assert(suffix(12) === 'T',  'suffix(12) should be "T"');
    assert(suffix(15) === 'aa', 'suffix(15) should be "aa"');
    assert(suffix(18) === 'ab', 'suffix(18) should be "ab"');
    assert(suffix(90) === 'az', 'suffix(90) should be "az"');
    assert(suffix(93) === 'ba', 'suffix(93) should be "ba"');
  }

  // Bonus: toDisplay
  {
    assert(toDisplay(ZERO) === '0', 'toDisplay(ZERO) should be "0"');
    assert(toDisplay(fromNumber(5)) === '5', 'toDisplay(5) should be "5"');
    assert(toDisplay(fromNumber(5.5)) === '5.5', 'toDisplay(5.5) should be "5.5"');
    const kval = norm({ m: 3.14159, e: 3 });
    assert(toDisplay(kval) === '3.14K', 'toDisplay(3.14159K) should be "3.14K"');
  }

  // Bonus: toStore / fromStore round-trip
  {
    const orig = fromNumber(12345678);
    const stored = toStore(orig);
    const loaded = fromStore(stored);
    assert(approxEq(toNumber(orig), toNumber(loaded), 1e-9), 'toStore/fromStore round-trip failed');

    const bad = fromStore(null);
    assert(bad.m === 0, 'fromStore(null) should be ZERO');
    const bad2 = fromStore({ x: 1 });
    assert(bad2.m === 0, 'fromStore({x:1}) should be ZERO');
  }
}

// Run tests immediately on module load.
try {
  runTests();
  console.log('[bignum] All tests passed.');
} catch (e) {
  console.error('[bignum] TEST FAILED:', e.message);
}
