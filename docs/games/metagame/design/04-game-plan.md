# 04 — Bit Foundry Stage 1: Implementation Plan (authoritative, agent-ready)

This is the **single source of truth** for building Stage 1 of the Bit Foundry metagame. An agent
reading only this file plus the engine source (`metagame.js`, `stages.js`, `stage1.js`,
`messages1.js`) should be able to build the full idle clicker without further design decisions.

It supersedes `01`/`02`/`03` wherever they conflict. The user decisions baked in here
(base64 saves, prestige-on-boss-availability, free stage switching, multiplicative achievement
mult, multiplicative pull on *all* production, the boss cheat system, etc.) are **final** unless
explicitly labelled `TBD (playtest)`.

Source docs (read for context, not for conflicting numbers):
`01-idle-clicker-research.md` (genre theory) · `02-our-game-design.md` (first design pass) ·
`03-big-number-system.md` (BigNum spec — implement as written there).

> **Naming note.** The Stage 1 boss is renamed from **The Overwriter** (current `stages.js`) to
> **The Defragmenter** — see §10. The existing `mountOverwriter` is *replaced* by a new
> click-contest boss; do not keep the lock/overwrite fight for Stage 1.

---

## Conventions used throughout

- **BigNum** = the `{ m, e }` representation from `03`. All bit values (`bits`, `totalBits`, costs,
  payouts) are BigNum. Plain JS numbers are still used for: `owned` counts, manager levels,
  achievement counts, multipliers (`pull`, `achievMult`), timestamps, CPS, and timer durations.
- `state` = the live game-state object (schema in §9).
- `gte/lt/add/sub/mul/mulScalar/fromNumber/toDisplay` = the BigNum ops from `03 §C`. Implement them
  in a new module `bignum.js` (see WP-S1-01).
- "on hand" = `state.bits` (current). "ever" = `state.totalBits` (monotonic, never decreases).
- `Π(x)` = product over the set. `Σ(x)` = sum over the set.
- All formulas that produce a **bit quantity** must run through BigNum; formulas that produce a
  **scalar multiplier** (pull, achievMult) stay as JS numbers and are applied via `mulScalar`.

---

## Section 1 — Architecture overview

### 1.1 How Stage 1 extends the existing engine

The orchestrator (`metagame.js`) keeps its phase machine (`intro → grind → boss → victory →
next`), its `mount(host,{onExit})` contract, the bell, the debug panel, and the data-driven
`STAGES[]` array. Stage 1 keeps its **bespoke renderer** (`renderStage1` in `stage1.js`) but that
renderer grows from a single pixel-reveal button into a **tabbed idle clicker**.

The redesign is **additive**: new tier `type`s, a new `managers[]` block on the Stage 1 config,
new `state` fields, and new helper functions. Existing stages 2–10 are untouched (they keep
`type:'click'|'auto'` and plain-number bits). To avoid breaking them, **BigNum is scoped to
Stage 1 only** for now: Stage 1 stores `state.bits`/`state.totalBits` as BigNum; the shared
`renderGrind` path for stages 2+ continues to use plain numbers. The orchestrator branches on
`stage().n === 1` (it already does — `renderStageGrind`). See WP-S1-12 for the isolation seam.

New modules created (all under `docs/games/metagame/`):

| File | Purpose |
|------|---------|
| `bignum.js` | BigNum ops + `toDisplay`/`suffix` (from `03`). Pure, no DOM. |
| `s1economy.js` | Stage 1 economy: cost/affordability series math, clickPower, rate, payout, manager math, pull, achievements. Pure, takes `state` + the Stage 1 config. No DOM. |
| `s1state.js` | Stage 1 save schema, defaults, **base64 encode/decode**, migration. |
| `achievements1.js` | The 29 (≥25) achievement definitions (data). |
| `boss1.js` | `mountDefragmenter(arena,{stage,onDefeat})` — the click-contest boss. |
| `s1bell.js` | Shared metagame bell UI + event-message dispatch. |
| `s1achievements.js` | Stage 1 milestone and achievement runtime. |
| `s1managers.js` | Stage 1 Managers tab + manager auto-fire controller. |
| `s1reset.js` | Stage 1 prestige/reset panel. |
| `stage1.js` | Stage 1 orchestration renderer: intro reveal, tabs, Bits tab, timed buttons, and tick loop. |

`stages.js` Stage 1 entry is rewritten to carry the new `tiers[]` (7 sub-stages), `managers[]`,
`bossTicket`, and `mountBoss: mountDefragmenter`. Stages 2–10 entries unchanged.

### 1.2 New `state` fields

Added on top of the current `{ bits, owned, claimed, stage, defeated, introStages, buyMult }`:

| Field | Type | Meaning |
|-------|------|---------|
| `bits` | BigNum | now BigNum (was number) — Stage 1 only |
| `totalBits` | BigNum | lifetime bits ever earned; never resets |
| `timedStates` | `{ [tierId]: { active, startedAt, duration_ms } }` | per timed-tier run state |
| `managers` | `{ [managerId]: { level:number, paused:bool } }` | hired managers |
| `pullFactors` | `number[]` | one factor pushed per prestige; `globalPull = Π(pullFactors)` |
| `achievements` | `string[]` | unlocked achievement ids |
| `milestones` | `string[]` | (existing in `stage1.js`) milestone ids reached |
| `totalBought` | number | (existing) lifetime sub-stage purchases across all resets |
| `buyMult` | `1\|10\|100\|1000\|'max'` | extended with `1000` |
| `bell` | object | bell log is already stored under its own key (`fv:games:mg:bell`); see §9 note |
| `version` | number | save schema version for migration (start at `2`) |

`pull` is **derived** (`Π(pullFactors)`), not stored, so resets can never desync it.

### 1.3 Functions to change / add

Existing engine functions (`metagame.js`) for Stage 1 are superseded by `s1economy.js` versions:

| Existing (`metagame.js`) | Stage 1 replacement (`s1economy.js`) | Change |
|---|---|---|
| `costOf(t,n)=ceil(base·mult^n)` | `costOf(t,n) → BigNum` | returns BigNum; same geometric law |
| — | `totalCost(t,owned,n) → BigNum` | bulk-buy series (§4.1) |
| — | `maxAffordable(bits,t,owned) → number` | closed-form log (§4.2) |
| `clickPower()=1+Σ(owned·amount)` | `clickPower(state,cfg) → number` | adds `mult` tiers + `globalPull` + `achievMult` |
| `totalRate()=Σ(owned·rate)` | `passiveRate(state,cfg) → number` | only `passive` tiers; ×pull ×achievMult |
| — | `managerCostPerSec(state,cfg) → number` | Σ running costs (§6) |
| — | `netRate(state,cfg) → number` | click-equivalent + passive + auto-timed − manager cost (§6) |
| — | `timedPayout(state,cfg,tierId) → BigNum` | one completion payout (§5) |
| — | `globalPull(state) → number` | `Π(pullFactors)` (§8) |
| — | `achievMult(state) → number` | `1.02^achievements.length` (§7) |
| `buyTier(id)` | `buyTier(state,cfg,id,n) → boughtCount` | BigNum costs, `n` from buyMult incl. `1000`/`max` |

`buyTier` for Stage 1: compute `n` (the selected buy-count, or `maxAffordable` for `'max'`),
compute `totalCost`, if `gte(state.bits, totalCost)` then `state.bits = sub(state.bits, totalCost)`
and `state.owned[id] += n`, bump `totalBought`, save, return `n`; else return 0.

### 1.4 Production-multiplier stack (single source of truth)

Every bit-producing quantity is computed as:

```
effectiveOutput = baseOutput × globalPull(state) × achievMult(state)
```

where:
```
globalPull(state)  = Π(state.pullFactors)            // 1 if empty
achievMult(state)  = 1.02 ^ state.achievements.length
```

Applied to (per user decision 7 — pull touches ALL production):
- **clickPower**: `(1 + Σ click/mult upgrades) × globalPull × achievMult`
- **timed payout**: `baseAmount × owned × globalPull × achievMult`
- **passive rate**: `Σ(owned · rate) × globalPull × achievMult`

`achievMult` and `globalPull` are JS scalars; apply them with `mulScalar` on the BigNum base.

---

## Section 2 — Sub-stage unlock tree (complete)

Eight sub-stages, one `tiers[]` entry each. Numbers are the **locked starting values** (user
decision 10 — accept doc 02's proposal; tune in playtest). Costs in BigNum notation
(`500` = `{m:500,e:0}`, `5K` = `{m:5,e:3}`, etc.).

Extended tier schema:

```js
{
  id, name, icon, desc,
  type: 'click_mult' | 'timed' | 'passive' | 'manager',  // 'manager' tiers live in managers[], not tiers[]
  base,        // BigNum base cost
  mult,        // growth rate per purchase (cost(n)=base·mult^n)
  amount,      // click_mult: +clickPower per level
  baseAmount,  // timed: bits per level on completion
  rate,        // passive: bits/sec per level
  boost,       // optional: { targetId, perLevelPct } cross-boost (Signal Booster → Bit Box)
  globalMult,  // mult node: ×(1 + perLevel·level) to a target set
  duration_ms, // timed: fill time
  unlock,      // (state,cfg) => boolean
  bell,        // first-unlock bell message id
}
```

### 2.1 Sub-stage table

| # | id | Name · icon | type | Unlock condition (field / threshold) | Base cost | Growth | Output formula | Timer | Grid id |
|---|----|-------------|------|--------------------------------------|-----------|--------|----------------|-------|---------|
| 1 | `s1-mult` | Multiplier ✖ | `click_mult` | intro button / `totalBits ≥ 1` ever | `100` | 1.12 | `+1 clickPower per level` | — | `g1` |
| 2 | `s1-box` | Bit Box 🧰 | `timed` | `bits ≥ 500` on hand | `500` | 1.10 | `100 × owned × globalPull × achievMult` per cycle | 4000 ms | `g2` |
| 3 | `s1-boost` | Signal Booster 📡 | `timed` | `owned['s1-box'] ≥ 1` | `2.5K` | 1.10 | `75 × owned × …` per cycle; **boost: +10%/lvl to Bit Box payout** | 5000 ms | `g3` |
| 4 | `s1-cluster` | Core Cluster 🧊 | `timed` | `owned['s1-boost'] ≥ 1` | `12K` | 1.08 | `500 × owned × …` per cycle | 8000 ms | `g4` |
| 5 | `s1-array` | Processing Array 🛰 | `passive` | `owned['s1-cluster'] ≥ 1` | `60K` | 1.07 | `0.5 × owned × globalPull × achievMult` bits/sec | — | `g5` |
| 6 | `s1-neural` | Neural Net 🧠 | `click_mult` (mult node) | `totalBits ≥ 1M` ever | `500K` | 1.06 | `globalMult: ×(1 + 0.25 × level)` to **all timed payouts** | — | `g6` |
| 7 | `s1-quantum` | Quantum Tap ⚛ | `click_mult` | `owned['s1-neural'] ≥ 3` | `5M` | 1.05 | `clickPower ×(1 + level)` (re-bases the tap; multiplicative on click) | — | `g7` |

**Notes on the two `click_mult` variants:**
- `s1-mult` and `s1-quantum` are *click* multipliers: `s1-mult` adds (additive `amount`),
  `s1-quantum` multiplies (`×(1+level)`). Compute clickPower as:
  ```
  clickPower = (1 + owned[s1-mult]·1)
               × (1 + owned[s1-quantum])           // Quantum Tap multiplies
               × globalPull × achievMult
  ```
- `s1-neural` is a `globalMult` node applied to **timed payouts only**:
  ```
  neuralMult = 1 + 0.25 × owned[s1-neural]
  timedPayout = baseAmount × owned × neuralMult × boostMult × globalPull × achievMult
  ```

**Signal Booster cross-boost** (resource-chain, `01 §A`):
```
boostMult(Bit Box) = 1 + 0.10 × owned[s1-boost]
```
applied only to the Bit Box payout.

### 2.3 Shipped example file: `Overwriter.frag` (boss cheat carrier)

The boss-cheat mechanism (§10A) keys off a **static example file** named `Overwriter.frag`,
shipped in `docs/examples/` and registered in `examples/index.json` (category `Code`, mime
`text/plain`) so it appears in the examples gallery like any other sample. It is created as part
of **WP-S1-11** (boss implementation) and listed in the asset-manifest by **WP-S1-12**. It looks
like a corrupted memory/defrag dump (~60 lines of hex pairs, fake addresses, noise) with a single
buried line `CHEAT='true'` around line 30–40. The player edits that line in Monaco to disable the
boss cheat — see §10A for the full mechanic.

### 2.2 First-unlock bell messages

Add to `messages1.js` (same `trigger/condition/maxCount/removeAfterFire` shape; all
`maxCount:1, removeAfterFire:true`, trigger `'buy'` or `'bit-earn'` as noted):

| Sub-stage | id | Bell text | trigger | condition |
|-----------|----|-----------|---------|-----------|
| Multiplier | `bell-mult` | ✖ now my taps multiply. | `buy` | `owned['s1-mult'] ≥ 1` |
| Bit Box | `bell-box` | 🧰 a box. it makes more of me. | `bit-earn` | `bits ≥ 500` |
| Signal Booster | `bell-boost` | 📡 the box hums louder now. | `buy` | `owned['s1-boost'] ≥ 1` |
| Core Cluster | `bell-cluster` | 🧊 a cluster. things are accelerating. | `buy` | `owned['s1-cluster'] ≥ 1` |
| Processing Array | `bell-array` | 🛰 it runs without me. that's new. | `buy` | `owned['s1-array'] ≥ 1` |
| Neural Net | `bell-neural` | 🧠 it's… thinking? everything multiplies. | `buy` | `owned['s1-neural'] ≥ 1` |
| Quantum Tap | `bell-quantum` | ⚛ my tap fractured into many. | `buy` | `owned['s1-quantum'] ≥ 1` |

(The existing `bell-firstsight`, `bell-halfway`, `bell-stronger`, etc. stay.)

---

## Section 3 — Pixel-reveal generalization

Keep the 100-cell column-major grid (`GRID_COLS=20 × GRID_ROWS=5`) and the `mg-s1-on` /
`mg-s1-clear` classes. Generalize its *meaning*: **the grid shows progress toward the next gate.**

### 3.1 One grid per gate

There are 8 grids in sequence (`g0…g7` in §2.1) plus a final boss grid (`g8`). At any moment
exactly **one** grid is active — the one whose gate is the next unlock the player hasn't reached.
When a sub-stage unlocks, the active grid resets (all cells off) and starts tracking the next gate.

### 3.2 Gate definitions and metric mapping

Each gate has a `metric(state)` (what to read) and `[from, to]` thresholds. Cells revealed:

```
progress = clamp((metric(state) − from) / (to − from), 0, 1)
cellsRevealed = floor(100 × progress)        // 0…100
```

`metric` returns a **plain number** (use `toNumber(big)` = `m × 10^e`, capped at `Number.MAX_VALUE`
for display-only math; precision loss is irrelevant for a 0–100 bar).

| Grid | Active until | metric | from | to |
|------|--------------|--------|------|----|
| `g0` | Multiplier reachable | `totalBits` | 0 | 1 |
| `g1` | Bit Box reachable | `bits` | 0 | 500 |
| `g2` | Signal Booster reachable | `owned['s1-box']` | 0 | 1 |
| `g3` | Core Cluster reachable | `owned['s1-boost']` | 0 | 1 |
| `g4` | Processing Array reachable | `owned['s1-cluster']` | 0 | 1 |
| `g5` | Neural Net reachable | `totalBits` | thresholdAt(`s1-array` unlock) | 1e6 |
| `g6` | Quantum Tap reachable | `owned['s1-neural']` | 0 | 3 |
| `g7` | Boss reachable | `bits` | 0 | 5e6 (then ramps; see §3.3) |
| `g8` | Boss ticket affordable | `bits` | 0 | 1e9 (ticket cost) |

For boolean/count gates (`g2,g3,g4,g6`) the grid is effectively "fills as you save for the next
item", so use the *cost of the next item* as the live `to` and `bits` as the metric when the
count threshold is the only thing left. Concretely, for a count gate the active metric is:

```
metric = bits ;  to = costOf(nextTier, owned[nextTier])
```

i.e. the grid fills toward affording the next buy. This keeps the bar always meaningful (a saving
progress bar) rather than snapping 0→100 on a single purchase.

### 3.3 Final gate (all sub-stages owned)

Once all 8 sub-stages are owned ≥1, the active grid is `g8` and tracks `bits` toward the **1B
boss ticket**:
```
progress = bits / 1e9
```
When `bits ≥ 1e9` the grid is full and the **Reset tab** + **Confront The Defragmenter** button
both become available (§8 unlock, §10 entry).

### 3.4 Reset behaviour

The grid does **not** reset on prestige; it re-derives its active gate from `state` every render.
After a prestige (owned counts wiped) the active gate is `g0`/`g1` again and the grid naturally
refills as the player re-grinds — the reveal cinematics replay, on-brand with the empty-screen
opening.

### 3.5 Reveal progress

The intro reveal maps current on-hand `bits` to the current `s1-mult` price. A fresh screen shows
only the tap surface; the first tap reveals the ghosted Multiplier button and first grid cell.
When the 100-cell grid is full, the button becomes clickable and buys one `s1-mult`. The tabbed
layout unlocks at `totalBits >= 150`; from there the reveal top stays hidden.

---

## Section 4 — Buy-count system

Selector: `[×1] [×10] [×100] [×1000] [MAX]`. Active button highlighted (`mg-mult-on`). Cost shown
is the **true bulk cost** for the selected count. Button disabled+greyed if unaffordable. MAX
always shows the actual count it would buy.

### 4.1 Bulk cost (geometric series)

For a tier with base cost `B` (BigNum), growth `r`, currently `owned = k`, buying `n`:

```
totalCost(k, n) = B × r^k × (r^n − 1) / (r − 1)
```

Implementation: compute the scalar factor `f = r^k × (r^n − 1)/(r − 1)` as a JS number, then
`mulScalar(B, f)`. For large `k` (where `r^k` overflows a double), compute in log space:

```
logFactor = k·ln(r) + ln(r^n − 1) − ln(r − 1)   // r^n−1 ≈ r^n for n≥10
factor    = exp(logFactor)
totalCost = mulScalar(B, factor)                 // norm() re-tiers the mantissa
```
For Stage 1 counts (`n ≤ ~1000`, `k ≤ a few hundred`), the direct form is fine; use the log form
only if `r^k > 1e290`.

### 4.2 Max affordable (closed form)

Given `bits` on hand (BigNum), `owned = k`, base `B`, growth `r`:

```
maxN = floor( log( 1 + bitsNum × (r − 1) / (B_num × r^k) ) / log(r) )
```
where `bitsNum = toNumber(bits)`, `B_num = toNumber(B)`. Clamp `maxN ≥ 0`. If the argument of the
outer `log` is ≤ 0 (can't afford even one), `maxN = 0`.

For values past double range, do it in log10 space using BigNum exponents directly:
```
// affordable while totalCost(k,n) ≤ bits  →  binary-search n in [0, hi] using gte(bits,totalCost)
```
Provide the closed form as the fast path and a `gte`-based binary search as the precise fallback.

### 4.3 UI behaviour

- `n` for the selected mult: `1/10/100/1000` literal, or `maxAffordable(...)` for `'max'`.
- Cost label = `toDisplay(totalCost(owned, n))`.
- For `'max'`, the buy button label is e.g. `Buy ×37 — 4.20K` (show the real `n`).
- Button `disabled` (and class `mg-buy-locked`/greyed) when `n === 0` or `lt(bits, totalCost)`.
- `mg-afford` class toggled when affordable (existing pattern).
- Recompute every paint (numbers move every tick).

### 4.4 Manager-hire running-cost preview (user decision 1)

When the player **hovers or focuses** a manager's hire/level button, compute the *prospective* net
rate as if that hire happened, and render the Statistics-panel net-rate number in **red** if it
would go negative:

```
previewNet = netRate(stateWithManagerLevel(managerId, level+1), cfg)
if previewNet < 0: add class .mg-net-neg (red) to the net-rate display
```
No modal, no toast — just the live number turning red (and back to normal on mouseout). The actual
hire is unchanged; this is preview-only.

---

## Section 5 — Timed button mechanics

Timed sub-stages: **Bit Box, Signal Booster, Core Cluster** (the three `type:'timed'` tiers).

### 5.1 State

```
state.timedStates[tierId] = { active: bool, startedAt: epochMs, duration_ms: number }
```
`duration_ms` is stored so a save mid-cycle resumes correctly (and so a manager can shorten it).

### 5.2 Interaction

- **Click while `!active`** → start: `active=true`, `startedAt=now`, `duration_ms=baseDuration`,
  lock the button (disabled, shows progress bar). Save.
- **Click while `active`** → ignore (the bar is filling; optionally flash it).
- The button is only **manually** startable; managers auto-start it (§6).

### 5.3 Completion (checked on the game tick, §5.5)

When `now − startedAt ≥ duration_ms`:
```
payout = timedPayout(state, cfg, tierId)
       = baseAmount × owned[tierId]
         × neuralMult(state)          // 1 + 0.25·owned[s1-neural]
         × boostMult(tierId, state)   // Bit Box only: 1 + 0.10·owned[s1-boost]
         × globalPull(state)
         × achievMult(state)
state.bits      = add(state.bits, payout)
state.totalBits = add(state.totalBits, payout)
state.timedStates[tierId].active = false
save(state)
checkMessages('bit-earn', state, bs)   // milestones / bells
```
Button unlocks (re-enabled) for the next manual or auto start.

### 5.4 Progress bar

```
progress = clamp((now − startedAt) / duration_ms, 0, 1)
```
Render as a CSS width on a `.mg-timed-bar` inside the button. While `active`, the button shows the
bar + a countdown `toDisplay`-less label (e.g. `2.1s`); while idle it shows the next payout
preview `→ +<toDisplay(payout)>`.

### 5.5 Game tick

A single `setInterval(…, 100)` (reuse the existing grind timer pattern) drives:
1. passive accrual: `state.bits = add(state.bits, mulScalar(passiveRate(state,cfg)/10))` (per 100 ms)
2. manager cost drain: `state.bits = sub(state.bits, mulScalar(managerCostPerSec/10))`
3. manager auto-fire checks (§6)
4. timed completion checks (§5.3)
5. insolvency check (§6 shutdown)
6. repaint; save every 10 ticks (1 s)

Order matters: **drain managers and accrue passive in the same tick before the insolvency check**,
so a single tick can both pay and bankrupt correctly.

### 5.6 Manager auto-trigger

A manager auto-starts its managed timed button on an interval:
```
autoInterval_ms = baseDuration / (1 + 0.3 × managerLevel)
```
When a manager is active and its managed button is `!active` and `now − lastFire ≥ autoInterval`,
the manager starts a cycle (`active=true, startedAt=now, duration_ms=autoInterval`). The shorter
`duration_ms` means auto-fired cycles also *complete* faster, so a leveled manager raises throughput
both by firing more often and by completing sooner. Track `lastFire` per manager in
`state.managers[id]` (add a `lastFire` field) or recompute from `startedAt`.

---

## Section 6 — Managers system (complete spec)

One manager per timed sub-stage. Managers live in `stage.managers[]` and surface in a **Managers
tab** (unlocked when the first timed button — Bit Box — is bought).

### 6.1 Manager table

| id | Name · icon | Manages | Hire cost (base) | Base cost/sec | Effect per level |
|----|-------------|---------|------------------|---------------|------------------|
| `m-box` | Box Operator 🛠 | `s1-box` | `5K` (= 10× Bit Box base) | 20 | auto-fire faster; see formulas |
| `m-signal` | Signal Engineer 🔧 | `s1-boost` | `25K` | 90 | auto-fire faster |
| `m-cluster` | Cluster Foreman 👷 | `s1-cluster` | `120K` | 400 | auto-fire faster |

### 6.2 Formulas

**Hire / level cost** (BigNum):
```
hireCost(mgr, level) = 10 × baseCost_of_managedTier × 1.15^level
```
where `level` is the *current* level (0 = not hired). Buying level `L→L+1` costs
`hireCost(mgr, L)`. First hire (`L=0`) costs `10 × managedBase`.

**Running cost** (bits/sec, JS scalar, super-linear so over-hiring is a real trap):
```
runningCost(mgr) = 0.5 × hirePriceAtCurrentLevel × managerLevel^0.8
totalManagerCost = Σ over hired managers of runningCost(mgr)
```
`hirePriceAtCurrentLevel = toNumber(hireCost(mgr, level−1))` (price paid for the current level).
A level-0 (un-hired) manager costs 0.

**Auto-fire interval** (§5.6):
```
autoInterval_ms = baseDuration / (1 + 0.3 × managerLevel)
```

**Net rate** (the headline Statistics number, user decision 1):
```
clickEquivRate = 0                              // clicking is manual; not counted in passive net
autoTimedRate  = Σ over timed tiers with an active manager of
                   timedPayout(tier) / (autoInterval_ms/1000)   // bits/sec from auto-fire
passiveRate    = Σ(owned·rate)·globalPull·achievMult            // Processing Array
netRate        = autoTimedRate + passiveRate − totalManagerCost
```
`netRate` is shown as a BigNum-formatted `/s`. If `< 0` → red (`.mg-net-neg`).

### 6.3 Shutdown rule (the trap)

```
if netRate < 0 AND state.bits reaches ZERO:
    set every hired manager.paused = true     // all auto-fire stops
when state.bits > 0 again (player clicks back up):
    set every paused manager.paused = false   // auto-fire resumes
```
While `paused`, managers neither fire nor drain (no running cost charged when paused — they're
"off"). Clicking always works (the tap area is never disabled), so the player digs out by hand.
The sub-stage shop buttons remain visible during shutdown (do **not** hide them — user wants
recovery to be obvious), but timed bars show idle.

> This refines `02 §F.3` ("everything disappears at 0"): instead of vanishing UI, managers *pause*
> and the net-rate goes red. Less punishing, clearer recovery. Locked decision.

### 6.4 Stats / Managers tab UI

The Managers tab lists, per hired manager:
- name, level, managed tier
- `cost/sec` (red if it pushes net negative)
- `Level up — <cost>` button (with hover net-preview, §4.4)
- a **Fire** button (sets `level=0`, refunds nothing, stops its cost) — the manual escape hatch
- the headline **Net rate: <toDisplay>/s** (red when negative)
- a list of all managers including un-hired ones (greyed, showing hire cost) once their managed
  tier is owned ≥1

---

## Section 7 — Achievements (≥25)

Each achievement grants **×1.02 to all production** (user decision 8), stacking multiplicatively:
`achievMult = 1.02^(achievements.length)`. Data lives in `achievements1.js`:

```js
{ id, name, icon, category, secret?:bool, condition:(state,cfg)=>bool, bell:'text' }
```

Achievements are checked on every relevant event (`'buy'`, `'bit-earn'`, `'bit-lose'`, manager
hire, prestige, boss win) via a `checkAchievements(state,cfg,bs)` pass. On first satisfaction:
push id to `state.achievements`, fire a bell line, save. Secret achievements (`secret:true`) show
as `??? ` with a hidden condition in the Achievements tab until unlocked.

### 7.1 Achievement list (28)

| # | id | Name · icon | Category | Condition (field op threshold) | Bell text |
|---|----|-------------|----------|-------------------------------|-----------|
| 1 | `ach-bits-100` | First Hundred 💯 | milestone | `totalBits ≥ 100` | 🏆 100 bits. it begins. |
| 2 | `ach-bits-1k` | Kilobit ⓚ | milestone | `totalBits ≥ 1e3` | 🏆 a thousand bits. |
| 3 | `ach-bits-10k` | Ten-K 🔟 | milestone | `totalBits ≥ 1e4` | 🏆 ten thousand. |
| 4 | `ach-bits-100k` | Six Figures 📈 | milestone | `totalBits ≥ 1e5` | 🏆 a hundred thousand. |
| 5 | `ach-bits-1m` | Megabit 🧮 | milestone | `totalBits ≥ 1e6` | 🏆 one million bits. |
| 6 | `ach-bits-1b` | Gigabit 🌐 | milestone | `totalBits ≥ 1e9` | 🏆 a billion. boss money. |
| 7 | `ach-bits-1aa` | Petascale 🪐 | milestone | `totalBits ≥ 1e15` (1aa) | 🏆 1aa. past safe-integer. |
| 8 | `ach-bits-1bb` | Beyond 🌌 | milestone | `totalBits ≥ 1e96` (1bb) | 🏆 1bb. absurd. |
| 9 | `ach-buy-1` | First Blood 🩸 | behavior | `totalBought ≥ 1` | ⚡ first purchase. |
| 10 | `ach-buy-10` | Shopper 🛒 | behavior | `totalBought ≥ 10` | ⚡ ten buys deep. |
| 11 | `ach-buy-100` | Hoarder 📦 | behavior | `totalBought ≥ 100` | ⚡ a hundred purchases. |
| 12 | `ach-speed-1k-2m` | Quick Start ⏱ | speed | `totalBits ≥ 1e3` within 2 min of run start | 🚀 1K in two minutes. |
| 13 | `ach-speed-1m-15m` | Sprinter 🏃 | speed | `totalBits ≥ 1e6` within 15 min of run start | 🚀 1M in fifteen. |
| 14 | `ach-speed-1b-30m` | Velocity 🌠 | speed | `totalBits ≥ 1e9` within 30 min of run start | 🚀 1B in half an hour. |
| 15 | `ach-mgr-1` | Automation 🤖 | manager | any manager `level ≥ 1` | 🛠 first manager hired. |
| 16 | `ach-mgr-5` | Middle Management 🧑‍💼 | manager | Σ manager levels `≥ 5` | 🛠 five levels of managers. |
| 17 | `ach-mgr-solvent` | In the Black 💹 | manager | `netRate > 0` with ≥3 managers hired | 🛠 three managers, still profitable. |
| 18 | `ach-net-neg` | In the Red 🔻 | behavior | `netRate < 0` sustained 10 s (teaches the trap) | 🔻 you ran negative. lesson learned. |
| 19 | `ach-zero` | Rock Bottom 🕳 | behavior | `bits` hit ZERO after having had `≥ 1e6` ever | 🕳 back to nothing. |
| 20 | `ach-prestige-1` | Gravity Well 🌀 | prestige | `pullFactors.length ≥ 1` | 🌀 first reset. pull begins. |
| 21 | `ach-prestige-3` | Event Horizon 🕳️ | prestige | `pullFactors.length ≥ 3` | 🌀 three resets deep. |
| 22 | `ach-prestige-10aa` | Heavy Pull 🪨 | prestige | reset while `globalPull ≥ 10` (≈10aa-scale run) | 🌀 a reset worth ×10+ pull. |
| 23 | `ach-boss-enter` | Challenger ⚔ | boss | bought a boss ticket (entered arena) | ⚔ you paid to fight. |
| 24 | `ach-boss-lose` | Out-Cheated 😤 | boss | lost a boss fight (cheat still active) | 😤 it cheated. of course it did. |
| 25 | `ach-secret-fast-tap` | ⁇ Hidden | secret | ≥ 12 taps within 1 s (a frantic tapper) | 🤫 you're fast. noted. |
| 26 | `ach-flavor-idle` | Patience ⏳ | behavior | game open ≥ 10 min with `netRate > 0` (true idle) | ⏳ you let it run. it ran. |
| 27 | `ach-boss-seen` | First Encounter 🥊 | boss | boss arena opened for the first time (`state.bossSeen === true`) | 🥊 you stared the Defragmenter down. |
| 28 | `ach-boss-cheat-found` | Suspicious Activity 🕵️ | boss/secret | the `fv:boss-cheat-disable` event fired (cheat turned off, §10A) | 🕵️ something was off. you fixed it. |
| 29 | `ach-boss-victory` | Defragmented 🏆 | boss | defeated The Defragmenter (`defeated.includes(1)`) | 🏆 defragmented — your bits, your win. |

**Counts:** 8 milestone (1–8), 3 buy-count (9–11), 3 speed (12–14), 3 manager (15–17), 3 prestige
(20–22), 1 secret (25), 5 boss (23,24,27–29), plus 3 flavor/behavior (18,19,26) →
**29 total**, satisfying every required category quota.

> **Dedup note (this revision).** The earlier list carried two pairs of duplicate boss achievements;
> they are now merged: `ach-boss-victory` 🏆 "Defragmented" is the **single** boss-win achievement
> (the old `ach-boss-win` 🧩 was removed), and `ach-boss-cheat-found` 🕵️ "Suspicious Activity" is the
> **single** cheat-disable achievement (the old secret `ach-secret-cheat-found` was removed). The
> win/lose handler (§10.7) and the cheat-disable event (§10A.3) each fire exactly one of these ids.
>
> **Boss-hint achievements (27–29)** are the player-facing breadcrumbs of the §10 boss arc:
> `ach-boss-seen` (a standalone — no duplicate) fires the first time the arena mounts (sets
> `state.bossSeen`, §10A — the same "seen" moment that seeds the `fv:boss1:cheat` key);
> `ach-boss-cheat-found` fires off the `fv:boss-cheat-disable` event (§10A); `ach-boss-victory` fires
> on defeating The Defragmenter (`defeated.includes(1)`).

**Run-start timestamp** for speed achievements: store `state.runStartedAt` (epoch ms), set on
mount of a fresh run and reset on prestige. Speed checks compare `now − runStartedAt`.

### 7.2 Achievements tab

Unlocks once `achievements.length ≥ 5` (per `02 §E`). Grid of badges: unlocked show
name+icon+description; `secret && !unlocked` show `???` with no condition text; non-secret locked
show name + condition hint, greyed. Header shows `achievMult` (e.g. `Production ×1.34 from 15
achievements`).

### 7.3 Boss-hint bell messages (additions to `messages1.js`)

The three-tier hint system (§10C) also surfaces through the bell at each loss threshold. Add these
entries to `messages1.js` (same `trigger/condition/maxCount/removeAfterFire` shape). They fire on a
new `'boss-loss'` trigger that `checkMessages('boss-loss', state, bs)` is called with each time the
boss is lost (the loss handler in `boss1.js`/`stage1.js` increments `state.bossLossCount` first,
then fires the trigger):

| id | Bell text | trigger | condition | maxCount | removeAfterFire |
|----|-----------|---------|-----------|----------|-----------------|
| `bell-boss-hint-1` | `💬 "have you tried… looking around?" — The Defragmenter` | `boss-loss` | `bossLossCount ≥ 5` | 1 | true |
| `bell-boss-hint-2` | `💬 "there is nothing in the examples. nothing." — The Defragmenter` | `boss-loss` | `bossLossCount ≥ 10` | 1 | true |
| `bell-boss-hint-3` | `💬 "CHEAT= ? I have no idea what that is." — The Defragmenter` | `boss-loss` | `bossLossCount ≥ 15` | 1 | true |

These mirror the loss-gated **taunt** pool (§10C) — same 5/10/15 thresholds — so a player who misses
the in-lobby taunt still gets the nudge in the bell log, and vice versa.

---

## Section 8 — Prestige / Gravitational Pull (complete spec)

### 8.1 Unlock (user decision 2 — available when boss CAN be fought, not after winning)

```
canFightBoss(state,cfg) = allSubStagesOwned(state,cfg) AND gte(state.bits, TICKET)
allSubStagesOwned       = cfg.tiers.every(t => (state.owned[t.id]||0) >= 1)
TICKET                  = { m:1, e:9 }   // 1B bits
```
The **Reset tab** appears as soon as `canFightBoss === true`. Defeating the boss is what unlocks
**Stage 2** (§10) — *not* what unlocks prestige. The player may prestige instead of (or before)
fighting.

### 8.2 What resets vs. persists

| Resets (wiped to defaults) | Persists |
|----------------------------|----------|
| `bits` → ZERO | `totalBits` (lifetime) |
| `owned` → {} | `achievements` |
| `timedStates` → {} | `pullFactors` (gets one appended) |
| `managers` → {} | `milestones` |
| `runStartedAt` → now | `stage`, `defeated` (stage progress) |
| `buyMult` → 1 | `version` |
| — | `bossSeen` (arena-opened flag, §10A.4) |
| — | `bossLossCount` (boss losses, gates §10C hints) |

### 8.3 Pull gain (user decision 7 formula)

```
pullGain = 1 + floor( log10(max(toNumber(totalBitsAtReset), 1e6)) / 3 − 2 ) × 0.5
pullGain = clamp(pullGain, 0.1, PULL_GAIN_CAP)      // PULL_GAIN_CAP = 50 (playtest)
```
On reset: `state.pullFactors.push(pullGain)`.

Worked values:
| `totalBitsAtReset` | `log10/3` | `−2` | `floor·0.5` | `pullGain` |
|---|---|---|---|---|
| 1e6 (1M) | 2 | 0 | 0 | 1.0 |
| 1e9 (1B) | 3 | 1 | 0.5 | 1.5 |
| 1e12 (1T) | 4 | 2 | 1.0 | 2.0 |
| 1e15 (1aa) | 5 | 3 | 1.5 | 2.5 |
| 1e18 (1ab) | 6 | 4 | 2.0 | 3.0 |

### 8.4 Accumulated pull (applied everywhere)

```
globalPull(state) = Π(state.pullFactors)     // 1 if none
```
Applied (user decision 7) to clickPower, every timed payout, and passive rate — see §1.4. Because
each `pullGain` is log-scaled and small, stacking compounds meaningfully but not explosively.

### 8.5 Reset confirmation UI

A confirm panel before committing:
```
"Reset Stage 1?
 You will gain ×<toDisplay(pullGain)> Gravitational Pull (total ×<globalPull·pullGain>).
 All bits, buildings, and managers will be lost.
 Achievements and pull persist."
 [ Reset ]  [ Cancel ]
```
On confirm: append `pullGain`, wipe the §8.2 reset set, save (base64), re-render Stage 1 from
`g0`/`g1`. Fire `checkAchievements` (prestige achievements) + a bell line
`bell-reset-prestige`: "🌀 collapsed. denser now." (`maxCount:undefined`).

---

## Section 9 — Save state schema

The state object **before** base64 encoding:

```jsonc
{
  "version": 2,                       // schema version for migration
  "bits": { "m": 0, "e": 0 },         // BigNum
  "totalBits": { "m": 0, "e": 0 },    // BigNum, never resets
  "owned": { /* [tierId]: number */ },
  "timedStates": {                    // [tierId]: per-cycle run state
    /* "s1-box": { "active": true, "startedAt": 1730000000000, "duration_ms": 4000 } */
  },
  "managers": {                       // [managerId]: { level, paused, lastFire }
    /* "m-box": { "level": 2, "paused": false, "lastFire": 1730000000000 } */
  },
  "pullFactors": [],                  // number[]; one factor appended per prestige
  "milestones": [],                   // milestone ids reached (sound/anim unlocks etc.)
  "achievements": [],                 // unlocked achievement ids
  "stage": 1,                         // current stage (1-indexed)
  "defeated": [],                     // stages whose boss was defeated
  "bossSeen": false,                  // arena opened ≥1 (§10A.4 cheat seed + ach-boss-seen); persists, not wiped on prestige
  "bossLossCount": 0,                 // boss losses; gates §10C loss-gated taunts + bell-boss-hint-*; persists across prestige
  "totalBought": 0,                   // lifetime sub-stage purchases (across resets)
  "buyMult": 1,                       // 1 | 10 | 100 | 1000 | 'max'
  "runStartedAt": 1730000000000,      // epoch ms; reset on fresh run + prestige (speed achievements)
  "introStages": [1],                 // (existing) per-stage intro-seen list
  "claimed": {}                       // (existing) arcade-bonus claim map
}
```

**Bell** (`bell.messages/fired/removed/lastReadCount`) stays in its **own** localStorage key
`fv:games:mg:bell` (current behaviour in `stage1.js` — do not fold it into the main save). The
schema brief lists it for completeness; in practice it is encoded/persisted separately and is **not
base64-encoded** (it contains no score data). Only the main save (`fv:games:metagame`) is base64.

### 9.1 base64 encoding (user decision 4)

```js
// s1state.js
function encodeSave(state)  { return btoa(unescape(encodeURIComponent(JSON.stringify(state)))); }
function decodeSave(str)    { return JSON.parse(decodeURIComponent(escape(atob(str)))); }
```
`unescape(encodeURIComponent(...))` round-trips non-ASCII (emoji-safe) through `btoa`. On `save`:
`localStorage.setItem(SAVE_KEY, encodeSave(state))`. On `load`: read the string, try
`decodeSave`; **migration fallback** — if `atob`/`JSON.parse` throws *or* the parsed object lacks
`version`, treat the raw value as legacy plain JSON (`JSON.parse(raw)`) and run §9.2 migration. This
is security-by-obscurity (decision 4): non-obvious, not crypto.

### 9.2 Migration (version 1 → 2)

Legacy saves have `bits` as a **plain number** and no `version`. On load:
```
if (typeof s.bits === 'number') s.bits = fromNumber(s.bits)
if (typeof s.totalBits === 'number' || s.totalBits == null)
    s.totalBits = fromNumber(s.totalBits || s.bits_as_number || 0)
s.timedStates ||= {}; s.managers ||= {}; s.pullFactors ||= []
s.achievements ||= []; s.runStartedAt ||= Date.now()
s.bossSeen ||= false; s.bossLossCount ||= 0
s.version = 2
save(state)   // re-persist as base64 v2
```

---

## Section 10 — Boss fight spec (Stage 1)

### 10.1 Boss name: **The Defragmenter** (justification)

Picked over "The Garbage Collector" and "The Checksum":
- **Thematic fit**: a defragmenter *reorganizes scattered bits* — exactly the resource the player
  hoards. In context it's sinister: it will defrag your bits *by taking them*.
- **Mechanic fit**: defrag is an ongoing background *process*, which lands the victory line ("it's
  still running in the background. just slower.") — the boss is never truly killed, only slowed,
  matching the metagame's "cheat-with-real-features" through-line.
- **Gaming connotation**: "frag" reads as a combat term; "The Defragmenter" sounds like a boss.
- Garbage Collector implies *deletion* (less apt than *reorganization-as-theft*); Checksum is too
  passive/verification-flavored for a click-contest.

### 10.2 Entry condition

```
canFightBoss = allSubStagesOwned AND gte(bits, 1B)
```
Player presses **Confront The Defragmenter** → pays the **1B-bit ticket** up front
(`bits = sub(bits, 1e9)`; fire `ach-boss-enter`). Ticket is lost whether they win or lose.
`startBoss()` mounts `boss1.js#mountDefragmenter`.

### 10.3 Arena UI (full-screen takeover)

```
┌──────────────────────────────────────────┐
│            THE DEFRAGMENTER               │
│  ▟ defragmenting your bits… ▙             │
│                                           │
│   YOU            20.0s            BOSS     │
│   [ 0 ]        ⏱ timer         [ 0 ]      │
│   ████░░░░░                ░░░░████        │   ← score bars
│                                           │
│        [   TAP TAP TAP   ]  (huge)        │
│                                           │
│  status line (burst 🔥 / taunts here)     │
└──────────────────────────────────────────┘
```
Split-screen counters (USER vs BOSS, large font), a 20-second countdown, one giant tap target, a
status line that shows burst flames/taunts. Reuse `.mg-arena` host from `startBoss()`. Full
scoring + burst visuals are specified in §10B; cheat state read at fight start in §10A.5.

## Section 10A — Cheat enable/disable mechanism (real-app Monaco hook)

This replaces the prior phantom-Bit-Box cheat (old §10.5/§10.6). The cheat is now a persisted flag
that the player flips by **editing a real example file in the Monaco editor** — a genuine
"cheat-with-real-app-features" discovery.

### 10A.1 The carrier file: `Overwriter.frag`

A static example shipped in `docs/examples/Overwriter.frag` (§2.3), registered in
`examples/index.json`. Its content reads like a fragmented memory/defrag dump — ~60 lines of random
hex pairs, fake hex addresses, and noise — with one line buried around line 30–40 that, on careful
reading, is plainly a switch:

```
CHEAT='true'
```

The surrounding lines must camouflage it (same column width, same hex-ish texture) so a skimmer
misses it but a careful reader spots it. See the **file authoring note** in WP-S1-11 for the
generation recipe.

### 10A.2 Persisted cheat flag: `fv:boss1:cheat`

- **localStorage key:** `'fv:boss1:cheat'`.
- **Value encoding:** `btoa(JSON.stringify(bool))` — i.e. `btoa("true")` (`"dHJ1ZQ=="`) or
  `btoa("false")` (`"ZmFsc2U="`). Read back with `JSON.parse(atob(raw))`.
- **Seeding (on first boss "seen"):** the first time the boss arena opens (`state.bossSeen`
  flips true, §10A.4), write `btoa("true")` **only if the key is not already set**. Never overwrite
  an existing value at seed time — in particular never re-enable a cheat the player has already
  disabled.
- **Invariant (disable is PERMANENT):** once the stored value is `btoa("false")` it is **never**
  written back to `btoa("true")` by the detection hook — not at seed time, and not on any later edit.
  The very first time the hook reads a falsy `CHEAT` value it latches the key to `btoa("false")`
  permanently. Any subsequent edit of the line back to a truthy value is **ignored** (the hook
  no-ops once the key is already `btoa("false")`). From that point the cheat is gone for good and the
  carrier file is removed from the examples gallery (§10A.3 step 5), so re-enabling isn't even
  surfaced to the player. (The only truthy writes the hook performs are the *initial* seed of an
  un-set key, §10A.4, and a truthy edit made while the key is still `btoa("true")` / unset.)

### 10A.3 Detection — Monaco editor content hook (app side)

The file viewer edits text through a single Monaco editor (`createRawView` in
`docs/core/rawview.js`, surfaced via `docs/core/rawpane.js`). Monaco's content-change already flows
into **`onRawEdited(value)` in `docs/core/rawpane.js`** (wired from `rawview.js`
`modifiedModel.onDidChangeContent(...)`, debounced 250 ms in `buildRawView`). That function is the
exact integration point for the hook — it already receives the full editor text on every change and
already owns `state.intake`.

On each change, run this check (added to `onRawEdited`, gated behind a cheap filename test so it
costs nothing for normal files):

1. **Filename match:** `state.intake.filename` matches `/overwriter/i` (case-insensitive, any
   extension). If not, do nothing.
2. **Read content:** the `value` argument already is the full editor text (equivalently
   `state.rawview.getValue()`).
3. **Find the switch line:** first line matching `/CHEAT\s*=\s*['"]?(\w*)['"]?/i`; capture group 1
   is the value token (may be empty).
4. **Evaluate truthiness** (case-insensitive on the token):
   - **Truthy:** `true`, `1`, `yes`, `x`, `on` → cheat active.
   - **Falsy:** `false`, `0`, `no`, `off`, or empty string → cheat disabled.
   - (Any other token: treat as truthy only if it equals one of the truthy set; otherwise leave the
     flag unchanged — do not flip on garbage. Recommended: unknown token → no-op.)
5. **On falsy** (the disable moment — permanent, per §10A.2):
   ```js
   // Latch permanently: if already disabled, this is a no-op (we never re-enable, see step 6).
   localStorage.setItem('fv:boss1:cheat', btoa(JSON.stringify(false)));
   window.dispatchEvent(new CustomEvent('fv:boss-cheat-disable', { detail: { stage: 1 } }));
   showToast("⚙️ The Defragmenter's cheat has been disabled.");  // see "Toast" below
   ```
   Two player-facing consequences fire off this moment (both via the `fv:boss-cheat-disable` event
   and/or directly in the hook):
   - **Toast notification.** Show `"⚙️ The Defragmenter's cheat has been disabled."`. Use the app's
     existing toast system if one exists; otherwise a simple overlay `<div>` that auto-dismisses
     after **3 seconds** (fade-out). This is the only feedback the player gets that the edit "took".
   - **Gallery hide (permanent).** `Overwriter.frag` is **removed from the examples gallery** — from
     the player's view the file simply vanishes. Do **NOT** delete the static file
     (`docs/examples/Overwriter.frag`) or its `examples/index.json` entry. Instead the examples
     gallery, when building its list, **skips rendering the `Overwriter` entry** whenever
     `localStorage.getItem('fv:boss1:cheat') === btoa(JSON.stringify(false))` (i.e. `=== 'ZmFsc2U='`).
     The file stays on disk and offline-cached, but never re-appears in the UI once disabled. This
     gallery-skip check is part of **WP-S1-12** (examples/asset wiring).
6. **On truthy:**
   ```js
   // PERMANENT-DISABLE GUARD: never re-enable a cheat the player already turned off.
   if (localStorage.getItem('fv:boss1:cheat') !== btoa(JSON.stringify(false))) {
     localStorage.setItem('fv:boss1:cheat', btoa(JSON.stringify(true)));
   }
   // else: key is already btoa("false") → IGNORE this edit entirely (no write, no event).
   ```
   Per the §10A.2 invariant the disable is permanent: once the key is `btoa("false")` this branch is
   a hard no-op, so editing the line back to a truthy value does nothing. (And since the carrier file
   has by then vanished from the gallery, the player normally can't even re-open it.) The only time a
   truthy write lands is while the key is still `btoa("true")` or unset.

The `fv:boss-cheat-disable` event is the contract the boss + achievements listen on:
- `boss1.js` listens to lock cheat state at fight start (§10A.5) and to update its status line.
- `ach-boss-cheat-found` (§7, #28) fires on it (the old duplicate secret `ach-secret-cheat-found`
  was merged away — exactly one achievement fires now).

> **Why `onRawEdited` and not `rawview.js`:** the hook needs `state.intake.filename` and runs in the
> app layer, independent of the boss module. `rawview.js` is a generic editor wrapper with no game
> knowledge; `rawpane.js`'s `onRawEdited` is where edited text already meets app state (it is the
> same place the existing `import easteregg` arcade-unlock easter egg lives — follow that pattern).
> Keep the boss completely decoupled: it only ever reads `fv:boss1:cheat` and listens for the event.

### 10A.4 "Boss seen" seeding moment

When `mountDefragmenter` mounts the arena for the first time:
```
if (!state.bossSeen) { state.bossSeen = true; save(state);
                       if (!localStorage.getItem('fv:boss1:cheat'))
                           localStorage.setItem('fv:boss1:cheat', btoa(JSON.stringify(true)));
                       fire ach-boss-seen; }
```
`state.bossSeen` is a new boolean in the save schema (§9 — add to the persisted set; it is part of
"what persists" and is **not** wiped on prestige). Seeding the cheat only after the boss is seen
means a player who never reaches the boss never has the key, and the carrier file reads as inert
noise until it matters.

### 10A.5 Cheat state is locked at fight start

The boss reads `fv:boss1:cheat` **once, on fight initialization** (not mid-fight):
```js
const cheatActive = (() => { try { return JSON.parse(atob(localStorage.getItem('fv:boss1:cheat') || '')); }
                             catch { return false; } })();
```
Editing the file *during* an active fight does not change the in-progress fight — the player must
disable it in the lobby, then start a fresh fight. (The `fv:boss-cheat-disable` listener still
updates the lobby/status UI live, but the locked `cheatActive` drives scoring for the running
fight.) This makes the cause→effect legible: disable the cheat, *then* the next fight is fair.

## Section 10B — Boss scoring (shadow-tick + burst model)

This replaces the prior CPS-ratio scoring (old §10.4). The boss no longer scales to a measured CPS;
instead it **shadows the player's taps** with a small constant edge, plus theatrical **bursts** that
only bite when the cheat is active.

### 10B.1 Counters

```
userScore : integer  — +1 per user tap
bossScore : integer  — displayed boss score = Math.floor(bossAcc)
bossAcc   : float     — the boss accumulator (the real value; bossScore is its display cast)
```
Both scores render as integers, large font, side by side.

### 10B.2 Per-tap shadow tick

Every user tap:
```
userScore += 1
bossAcc   += SHADOW_WEIGHT            // SHADOW_WEIGHT = 1.10, same with or without cheat
bossScore  = Math.floor(bossAcc)
```
The per-tap weight is **identical** whether or not the cheat is active — the cheat's edge comes
entirely from the burst system (§10B.4), not from per-tap weight. Because of the `1.10` factor the
boss pulls ~1 point ahead every ~10 taps: invisible early, decisive late. (Note: with the
auto-tick floor and bursts removed this constant shadow alone would already cost the player ~10%;
the floor and bursts layer on top.)

### 10B.3 Auto-tick floor (boss never falls behind a fast tapper)

The boss also auto-ticks independently so a fast tapper can't simply outrun it on raw rate:
```
userRateMs   = rolling mean inter-tap interval over the last 3 s (ms/tap)
bossFloorMs  = min(500, userRateMs × 0.95)     // just slightly faster than the user, capped at 2/s
every bossFloorMs: bossAcc += 1.0              // no cheat multiplier on the floor tick
                   bossScore = Math.floor(bossAcc)
```
The floor uses a plain `+1.0` (the per-tap shadow already supplies the constant edge). If the user
hasn't tapped recently, `userRateMs` is large, so `bossFloorMs` clamps to 500 ms (2 ticks/s) and the
boss keeps a slow baseline pulse rather than freezing.

### 10B.4 Burst system (the cheat's real teeth)

Pre-compute a **burst schedule** before the fight starts, deterministic within a fight but varied
per attempt:
```
seed       = Date.now() % 1000
rng        = a small seeded PRNG (e.g. mulberry32(seed))   // deterministic from seed
FIGHT_MS   = 20000
```
Schedule N bursts at random start offsets in `[1000, FIGHT_MS − 1000]` ms (so none clip the
start/end), each `BURST_MS = 800` long, sorted, non-overlapping (re-roll or push apart if two land
within 800 ms).

**With cheat active:**
- `N = 3 or 4` bursts (rng pick).
- During a burst: each **user tap** adds `+1.5` to `bossAcc` (instead of `1.10`), **and** the boss
  **auto-fires 4 times** evenly spaced across the 800 ms, each worth `+1.5`.
- Visual: boss side shows a pulsing 🔥 flame; boss counter flashes **orange**; arena border flashes
  orange.

**Without cheat active:**
- `N = 2 or 3` bursts (looks similar — builds the same tension).
- Burst multiplier is **1.0**: user taps during a burst still add the normal `1.10`; the boss
  auto-fires **2 times** across the 800 ms, each worth `+1.0`.
- Visual: counter still flashes but **yellow**, no flame — an "intensity" effect with no real bite.

The burst is **theatrical, not hidden** — it visibly explains why the boss surges, which is exactly
why a suspicious player starts to wonder *why* the surges only stick sometimes (→ the hint arc,
§10C).

### 10B.5 Net effect (tuning targets, `TBD (playtest)`)

At a median 50 taps / 20 s:
- **With cheat:** boss wins by ~15–25%.
- **Without cheat:** boss loses by ~15–20%.
- **Fast tappers (80+/20 s):** can *occasionally* beat the cheat, but it's hard and inconsistent —
  the auto-tick floor + 4×`1.5` burst auto-fires keep it close. This is intended: the cheat should
  feel beatable-in-theory but practically requires disabling it.

Numbers (`SHADOW_WEIGHT`, burst counts, burst weights, floor factor) are playtest-adjustable but
locked as the starting values above.

### 10B.6 Boss arena UI during the fight

- **Split screen:** left = **USER** (name/icon), right = **BOSS** (The Defragmenter — gear/skull
  icon). Scores update in real time, large font.
- **Timer** countdown 20.0 → 0.0 centered between them.
- **Burst feedback:** boss side shows the pulsing flame (cheat) or intensity flash (no cheat);
  border flashes orange (cheat) / yellow (no cheat) for the 800 ms.
- **Reveal:** at timer 0 the scores **freeze**, hold a **1-second pause**, then a `YOU WIN` /
  `YOU LOSE` overlay slides in (§10.7 handles the consequences).

## Section 10C — Boss Taunt Dialog (the Defragmenter taunts; hints are embedded in taunts)

There is **no separate hint-bubble UI element.** The Defragmenter is a *character* who taunts the
player, and the discovery breadcrumbs are delivered **as taunts** — the boss accidentally (or
smugly) reveals the secret through overconfident trash-talk. The loss-gated lines below are the
former "hints", now folded into the taunt pool. The bell still mirrors three of them (§10C.5).

### 10C.1 Loss tracking

`state.bossLossCount` (number, default 0) — **persists across prestige resets** (added to §8.2
"persists" column and §9 schema). Incremented by the loss handler each time a fight is lost,
*before* `checkMessages('boss-loss', …)` fires (so the bell conditions see the new count). The taunt
pools that are gated on losses (§10C.3) read this same counter.

### 10C.2 Taunt dialog component

A reusable speech-bubble component, present **both in the boss lobby AND during the fight**,
attributed to The Defragmenter (a small gear/skull avatar beside the bubble). Implemented as a
`<div class="boss-taunt">` containing the avatar, the speech bubble, and the taunt-text cycling
logic. Two placements, same component:

- **Lobby (idle):** cycles through the applicable pool, showing **one taunt at a time**, switching
  every **8–12 seconds** (random interval per cycle, random pick from the applicable pool). This is
  where the loss-gated breadcrumbs surface.
- **Arena (event-driven):** the same bubble shows **event-triggered** taunts — fired on specific
  fight events (fight start, burst start, fight end, player loss) rather than on the idle timer.

### 10C.3 Taunt pools (all strings + their triggers/conditions)

*General taunts — always available (lobby idle cycle):*
- `"you call that clicking?"`
- `"beep boop. I win again."`
- `"your bits are mine now."`
- `"I've been defragging longer than you've existed."`
- `"don't worry, I'll put your bits in order. my order."`

*During burst, cheat ACTIVE — fired when a burst starts (arena), one picked at random:*
- `"look at this box I found! 📦"`
- `"oh would you look at that, another box! 📦"`
- `"I just love finding these lying around."`

*During burst, NO cheat — fired when a burst starts (arena). Same burst animation, less effect
(§10B.4); the taunt sells the same swagger with no real bite:*
- `"I'm on fire! 🔥"`
- `"is it getting hot in here?"`

*Loss-gated taunts — LOBBY ONLY, each added to the lobby idle pool once `bossLossCount` reaches N:*

| After N losses | Taunt text |
|---|---|
| 3 | `"come back any time. I'll be here. always."` |
| 5 | `"you seem frustrated. have you tried… looking around? no reason."` |
| 7 | `"I am so glad nobody can touch me, The Defragmenter. so glad."` |
| 10 | `"there is nothing in the examples folder that could help you. nothing at all. don't look."` |
| 12 | `"even if someone had hidden something in a file somewhere… hypothetically… you'd never find it."` |
| 15 | `"CHEAT? what CHEAT? I have no idea what a CHEAT= line is. stop looking at me."` |

Once unlocked, a loss-gated line stays in the idle pool permanently (it does not require the player
to be at exactly N losses). The breadcrumb trail therefore deepens monotonically with losses.

*On player WIN — cheat disabled, fired at fight end (arena, §10.7):*
- `"this is… unexpected. my boxes aren't working. who did this."`
- `"I'll be back. after a full defrag."`

*On player LOSS — fired at fight end (arena, §10.7):*
- `"better luck next defrag."`
- `"and stay defragged."`
- `"your bits have been reorganized. you're welcome."`

### 10C.4 Trigger summary

| Event | Pool drawn from |
|-------|-----------------|
| Lobby idle (every 8–12 s) | General + any unlocked loss-gated taunts |
| Fight start | General (or a dedicated "fight start" line if added in playtest) |
| Burst start | Burst-cheat pool (cheat active) **or** burst-no-cheat pool (cheat off) |
| Player win (fight end) | On-win pool |
| Player loss (fight end) | On-loss pool |

### 10C.5 Bell mirror

The three hint-threshold bell messages (`bell-boss-hint-1/2/3`, §7.3) **stay**, but are now gated by
the same loss-count thresholds **5 / 10 / 15** that add the matching loss-gated taunts to the pool,
and their text is updated to match the taunt tone (these are the §7.3 entries — see that table for
the canonical `trigger/condition/maxCount/removeAfterFire` shape):
- hint-1 (5 losses): `'💬 "have you tried… looking around?" — The Defragmenter'`
- hint-2 (10 losses): `'💬 "there is nothing in the examples. nothing." — The Defragmenter'`
- hint-3 (15 losses): `'💬 "CHEAT= ? I have no idea what that is." — The Defragmenter'`

The bell and the in-lobby taunt are redundant on purpose so neither is a single point of failure for
the discovery.

### 10.7 Win / lose

Scoring runs on the §10B model (per-tap shadow tick, auto-tick floor, pre-scheduled bursts); the
100 ms tick drives the auto-tick floor + burst auto-fires, repaints the counters/bars, and
decrements the timer. At timer 0 the scores freeze, hold the 1 s pause (§10B.6), then compare:

- **At 20.0 s** (timer hits 0): compare `userScore` vs `bossScore`.
  - **Win** (`userScore > bossScore`):
    ```
    state.defeated.push(1)                 // unlocks Stage 2
    fire ach-boss-victory                  // single boss-win achievement (ach-boss-win was merged away)
    fire taunt-on-win (§10C) + bell: "you beat The Defragmenter. it's still running in the background. just slower."
    onDefeat()                              // orchestrator advances to victory → Stage 2
    ```
  - **Lose** (`userScore ≤ bossScore`):
    ```
    state.bossLossCount += 1               // persists; gates the §10C hints
    checkMessages('boss-loss', state, bs)  // fires bell-boss-hint-1/2/3 at 5/10/15 (§7.3)
    fire ach-boss-lose (only if cheatActive at loss time)
    ticket already spent (not refunded)
    status: "The Defragmenter wins. It defragged 1B of your bits."
    5-second cooldown (disable Retry), then [ Try Again ] (re-pay ticket) + [ Retreat ]
    ```
- The fight is **never an instant win** — even with the cheat disabled the player must out-tap the
  shadowing boss (per-tap `1.10` edge + auto-tick floor) in real time.

### 10.8 Replaces the current boss

Remove Stage 1's `mountOverwriter`, `lockName/locks/relockMs`, and the `BOSS_AFTER = 5` gate in
`stage1.js`. Stage 1's `mountBoss` becomes `mountDefragmenter`; the gate becomes
`canFightBoss`. `bossName` = "The Defragmenter". Update `bossIntro/hints/victory` dialog to the
click-contest framing (taunt: "your bits are scattered. I'll *reorganize* them — into mine."; the
in-fight hint stays minimal — the real nudge toward the `Overwriter` carrier file comes from the
loss-gated taunts + bell (§10C), not from the boss intro; victory as the bell line above).

---

## Section 11 — Work package breakdown

WPs are partitioned so non-overlapping file sets can run in parallel. Dependency graph at the end.

| WP id | Title | Files (create C / modify M) | Depends on | Cx | What to implement |
|-------|-------|-----------------------------|-----------|----|-------------------|
| **WP-S1-01** | BigNum module | C `bignum.js` | — | M | `{m,e}` ops + `suffix`/`toDisplay`/`fromNumber`/`toNumber` exactly per `03 §C`; unit-test edge cases (`03 §C` list). Pure, no DOM. |
| **WP-S1-02** | Stage 1 config data | M `stages.js` (Stage 1 entry only) | — | S | Rewrite Stage 1 `tiers[]` (8 sub-stages, §2.1), add `managers[]` (§6.1), `bossTicket:{m:1,e:9}`, `mountBoss:mountDefragmenter` import, new boss dialog (§10.8). Don't touch stages 2–10. |
| **WP-S1-03** | Achievement data | C `achievements1.js` | — | S | The 29 definitions (§7.1) as data with `condition(state,cfg)` predicates. No DOM. |
| **WP-S1-04** | Save state + base64 | C `s1state.js` | WP-01 | M | Schema defaults (§9), `encodeSave`/`decodeSave` (§9.1), `migrate` v1→v2 (§9.2). |
| **WP-S1-05** | Economy math | C `s1economy.js` | WP-01, WP-02 | L | `costOf`/`totalCost`/`maxAffordable` (§4), `clickPower`/`passiveRate`/`timedPayout` (§1.4,§5), `globalPull`/`achievMult` (§7,§8), `managerCostPerSec`/`netRate`/`autoInterval` (§6), `pullGain` (§8.3). Pure; takes `state`+cfg. |
| **WP-S1-06** | Achievement runtime | C `s1achievements.js`, uses WP-03/05 | WP-03, WP-05 | S | `checkAchievements(state,cfg,bs)` pass: evaluate predicates, push ids, fire bells, apply via `achievMult`. Wire into event paths. |
| **WP-S1-07** | Bell messages/runtime | C `s1bell.js`; M `messages1.js` | WP-02 | S | Add the §2.2 sub-stage unlock lines + `bell-reset-prestige`. Keep existing entries. Bell UI/event dispatch lives in `s1bell.js`. |
| **WP-S1-08** | Pixel-grid intro reveal | M `stage1.js` (`reveal` logic) | WP-01, WP-02, WP-05 | M | Map current bits to the current `s1-mult` price, reveal 100 cells, and keep grid DOM + classes. |
| **WP-S1-09** | Tabbed UI + shop + timed bars | M `stage1.js` (main render) | WP-04, WP-05, WP-07, WP-08 | L | Tabs (Bits/Managers/Achievements/Reset) with stagger gating (§ tabs); sub-stage shop with §4 buy-count selector (×1/10/100/1000/MAX) + affordability; timed buttons + progress bars + completion (§5); game-tick loop (§5.5). |
| **WP-S1-10** | Managers tab + prestige tab | C `s1managers.js`; C `s1reset.js` | WP-05, WP-09 | L | Managers tab (§6.4): hire/level, Fire, running-cost, net-rate (red, hover-preview §4.4), shutdown/pause (§6.3). Reset tab (§8.5): confirm panel, prestige commit, pull display. |
| **WP-S1-11** | Boss: The Defragmenter + cheat-disable Monaco hook | C `boss1.js`; C `docs/examples/Overwriter.frag`; M `stages.js` (wire `mountBoss`); M `docs/core/rawpane.js` (`onRawEdited` cheat hook) | WP-01, WP-02 | L | `mountDefragmenter` (§10): split-screen arena, 20 s timer, shadow-tick scoring (§10B — per-tap `1.10`, auto-tick floor, seeded pre-scheduled bursts), burst flame/flash visuals, freeze→pause→WIN/LOSE reveal, win/lose handling (incl. `bossLossCount++` + `checkMessages('boss-loss')`), retry+5s cooldown. Cheat: read `fv:boss1:cheat` once at fight start (§10A.5); listen for `fv:boss-cheat-disable`; on first mount set `state.bossSeen` + seed `fv:boss1:cheat=btoa("true")` if unset (§10A.4) + fire `ach-boss-seen`. **Create `Overwriter.frag`** (§2.3, §10A.1 — ~60-line defrag-dump noise with buried `CHEAT='true'` near line 30–40) and register it in `examples/index.json`. **Monaco hook in `rawpane.js#onRawEdited`** (§10A.3 — filename `/overwriter/i` test, `/CHEAT\s*=\s*['"]?(\w*)['"]?/i` parse, truthy/falsy eval, `localStorage['fv:boss1:cheat'] = btoa(JSON.stringify(bool))`, dispatch `fv:boss-cheat-disable {detail:{stage:1}}` on falsy). Wire `ach-boss-cheat-found` to the event. **Boss taunt dialog** (§10C — reusable `<div class="boss-taunt">` with gear/skull avatar + speech bubble; lobby idle cycle every 8–12 s from the general pool + loss-gated taunts unlocked by `bossLossCount` at 3/5/7/10/12/15; arena event-triggered taunts on fight-start / burst-start / win / loss; define all taunt strings as a constants object in `boss1.js`, or in a separate `boss1-taunts.js` if `boss1.js` would exceed 500 LOC). |
| **WP-S1-12** | Orchestrator integration + examples/asset wiring | M `metagame.js`; M `examples/index.json`; M `asset-manifest.json` | WP-04, WP-05, WP-09, WP-11 | M | Route Stage 1 through BigNum + `s1state` save/load (base64); keep stages 2–10 on plain numbers (branch on `stage().n===1`); pass new ctx (`save` via `encodeSave`, economy fns) into `renderStage1`; swap `BOSS_AFTER` gate for `canFightBoss`; ensure prestige does NOT advance stage, boss win DOES. **Add `Overwriter.frag` to `examples/index.json`** (category `Code`, mime `text/plain`) and to `asset-manifest.json` so it ships + is offline-cached; update the examples gallery if needed (it auto-renders from `index.json`). **Gallery-hide for disabled cheat** (§10A.3 step 5): when the gallery builds its list, skip the `Overwriter` entry whenever `localStorage.getItem('fv:boss1:cheat') === btoa(JSON.stringify(false))` — the static file + `index.json` entry stay; only the rendered list omits it. Persist `bossSeen`/`bossLossCount` through save/migration (§9). |

### 11.1 Parallelization

Wave 1 (no deps, fully parallel): **WP-01, WP-02, WP-03** (and **WP-07** depends only on 02's ids,
can start as soon as 02's tier ids are fixed).

Wave 2 (depend on wave 1): **WP-04** (←01), **WP-05** (←01,02).

Wave 3: **WP-06** (←03,05), **WP-08** (←01,02,05), **WP-11** (←01,02). These touch disjoint files
(`stage1.js` additions for 06/08 must be coordinated — both modify `stage1.js`; assign 06 and 08
to the *same* agent or serialize them, OR have 06 land its `checkAchievements` as a separate
exported function appended after 08's grid work).

Wave 4: **WP-09** (←04,05,07,08) — the big render. **WP-10** (←05,09) and **WP-12** (←04,05,09,11)
follow.

> **WP-11's app-layer pieces have no game-module deps.** The new shadow-tick scoring (§10B) measures
> the user's tap rate *inside* the fight (rolling 3 s inter-tap window) and reads the seeded burst
> schedule from `Date.now()` — it no longer needs a pre-fight CPS buffer passed via `ctx`, so the
> earlier `stage1.js` CPS-buffer hook is **dropped**. WP-11's two app-side pieces — the
> `Overwriter.frag` example file and the `rawpane.js#onRawEdited` Monaco cheat hook (§10A.3) — live
> entirely in the **main app** (`docs/examples/`, `docs/core/rawpane.js`), depend on nothing in the
> game modules, and write/read only `localStorage['fv:boss1:cheat']` + the `fv:boss-cheat-disable`
> event. They can be built and verified in isolation *before* the boss module exists (open
> `Overwriter`, edit `CHEAT`, watch the event fire). Sequencing note: the cheat is only *seeded*
> after the boss is "seen" (§10A.4), so the hook can flip the key but the boss reading it
> meaningfully depends on `mountDefragmenter` setting `bossSeen` first — build the hook + file early,
> wire the boss-side read when `boss1.js` lands.

> **Stage 1 module split.** Keep `stage1.js` as the orchestration renderer. Put reusable or
> self-contained pieces in small modules so future stages can plug in their own surfaces:
> - `stage1.js` → intro reveal, tab routing, Bits tab, timed buttons, tick loop.
> - `s1bell.js` → shared bell UI + event-message runtime.
> - `s1achievements.js` → Stage 1 achievements/milestones.
> - `s1managers.js` → managers tab + manager auto-fire.
> - `s1reset.js` → reset/prestige panel.
> - `boss1.js` (C, WP-11) → the boss + lobby/arena taunt dialog (taunt strings; or `boss1-taunts.js` if >500 LOC)
> - `docs/core/rawpane.js` (M, WP-11) → the cheat-disable Monaco hook (app layer, not a game module)
> - `docs/examples/Overwriter.frag` (C, WP-11) → the cheat-carrier example file
> Use the same controller-style pattern (`renderPanel`, `paint`, `runAutoFire`/tick hooks) for
> future stage-specific tabs.

### 11.2 Definition of done (per WP)

- Pure modules (01,03,05) ship with their edge-case behaviour matching the formulas here; no DOM.
- UI WPs (08,09,10,11) render without console errors, persist via base64, and survive a
  reload mid-run (timed cycles resume from `startedAt`).
- WP-12 ends with: fresh run → all 8 sub-stages → 1B ticket → boss arena opens (`bossSeen` set,
  `fv:boss1:cheat` seeded `true`, `ach-boss-seen` fires) → lose with cheat on (`bossLossCount`
  climbs; loss-gated lobby taunts unlock at 3/5/7/10/12/15 and `bell-boss-hint-*` fire at 5/10/15) → open `Overwriter` from
  examples, edit `CHEAT='true'` → `CHEAT='false'` → `fv:boss-cheat-disable` fires (`fv:boss1:cheat`
  → `btoa("false")`, `ach-boss-cheat-found` fires; a "cheat disabled" toast shows and `Overwriter`
  vanishes from the examples gallery) → next fight is
  winnable → win → `ach-boss-victory`, Stage 2 unlocks; prestige reachable at the
  ticket gate and correctly preserves `totalBits`/achievements/pull/`bossSeen`/`bossLossCount`.

### 11.3 Out of scope for Stage 1 (deferred, do not build now)

Research tab (exponent nodes) is **deferred** to the backlog — `02 §E` listed it but no user
decision locked its numbers; ship Stage 1 without it. Offline/catch-up progress, golden-cookie
events, and 3-letter suffixes (>`zz`) are all deferred. The achievement set and sub-stage numbers
are `TBD (playtest)`-adjustable but locked as the starting values above.
