# 02 — Bit Foundry: Our Game Design (Stage 1)

Maps the genre research (`01`) onto **Stage 1 of the metagame**. Stage 1 stops being a single
pixel-reveal loop and becomes a **full idle clicker with sub-stages, managers, prestige, and a
boss gate** — while keeping the existing empty-screen / commentary-bell onboarding and the
data-driven, modular stage architecture.

> **Grounding in the current code.** The engine already provides the primitives we build on
> (`docs/games/metagame/`):
> - `costOf(t, n) = ceil(t.base × t.mult^n)` — geometric cost (`metagame.js`).
> - `buyTier(id)` with `state.buyMult ∈ {1,10,100,'max'}` — bulk buy (`metagame.js`).
> - `clickPower()` = `1 + Σ(owned × amount)` over `type:'click'` tiers (`metagame.js`).
> - `totalRate()` = `Σ(owned × rate)` over `type:'auto'` tiers; ticked every 100 ms (`metagame.js`).
> - Stages are **pure data** in `stages.js` (`tiers[]`, `goal`, `resource`, dialog, `mountBoss`).
> - Stage 1 has a **bespoke renderer** `renderStage1()` (`stage1.js`) plus small modules for bell,
>   achievements, managers, and reset.
> - `fmt()` currently stops at `Sx` and uses plain JS numbers — both replaced per `03`.
>
> The redesign **extends** the tier schema and adds **timed** and **manager** tier types plus a
> prestige layer; it does *not* throw away the orchestrator. New tier `type`s and a `managers[]`
> block on the stage config are the main schema additions.

---

## A. Stage 1 sub-stage breakdown

A "sub-stage" = a buyable **thing** that appears in the **Bits** tab as a threshold is crossed.
Each is one entry in `stage.tiers[]` with an extended schema:

```js
// Extended tier schema (superset of the current one):
{
  id, name, icon, desc,
  type: 'click' | 'auto' | 'timed' | 'mult' | 'enabler',
  base, mult,                 // cost(n) = base × mult^n
  amount,                     // for 'click': +bits per click per level
  rate,                       // for 'auto': bits/sec per level
  timeMs, payout, payoutMult, // for 'timed': fills in timeMs, pays payout × level on completion
  globalMult,                 // for 'mult': multiplies a target set of outputs
  unlock: (state) => boolean, // when this tier first appears (greyed before)
  bell: 'message id',         // first-unlock commentary
}
```

`unlock` predicates read `state` (`bits` on hand, `totalBits` ever, `owned[id]` counts).
**Convention:** "on hand" = current `state.bits`; "ever" = `state.totalBits` (monotonic).

### Initial sub-stage table

| # | Name | Type | Unlocks at | Base cost | Output / effect | Growth |
|---|------|------|-----------|-----------|-----------------|--------|
| 1 | **Multiplier** | click | intro button / 1 bit ever | 100 | +1 clickPower per level | 1.12 |
| 2 | **Bit Box** | timed | 500 bits on hand | 500 | 4 s → +100 × level bits | 1.10 |
| 3 | **Signal Booster** | timed | Bit Box owned ≥1 | 2,500 | 5 s → +75 × level bits; **+10%/lvl to Bit Box payout** | 1.10 |
| 4 | **Core Cluster** | timed | Signal Booster owned ≥1 | 12,000 | 8 s → +500 × level bits | 1.08 |
| 5 | **Processing Array** | auto | Core Cluster owned ≥1 | 60,000 | passive +0.5 × level bits/sec | 1.07 |
| 7 | **Neural Net** | mult | 1M bits ever | 500,000 | ×(1 + 0.25 × level) to **all timed payouts** | 1.06 |
| 8 | **Quantum Tap** | click | Neural Net owned ≥3 | 5,000,000 | clickPower ×(1 + level) (re-bases the tap) | 1.05 |

**Design rationale (roles, not just numbers):**
- **2 Multiplier** keeps tapping relevant.
- **3 Bit Box** is the first *timed burst* — the AdVenture-Capitalist loop arrives.
- **4 Signal Booster** is the first *cross-reference*: it both produces and **boosts the previous
  sub-stage** (resource-chain feel, per `01` §A Idle-Mine lesson).
- **5 Core Cluster** is a bigger, slower burst — a decision vs. spamming Bit Box.
- **6 Processing Array** is the first true *idle* (passive) income — the game now plays itself a little.
- **7 Neural Net** is a *global multiplier* node (Realm-Grinder lesson: multiplier variety).
- **8 Quantum Tap** re-bases clicking so the manual action stays meaningful in the late stage.

**Scaling cadence:** each base cost is ≈5–10× the previous; each output is ≈5–10× the previous.
These were the initial tuning values. Current balance and any future tuning work
are tracked only in [`TASKS.md`](../../../../TASKS.md).

**Bell messages on first unlock** (extend `messages1.js`, which already drives the bell):

| Sub-stage | Bell line (id) |
|-----------|----------------|
| Bit Box | `bell-box`: "🧰 a box. it makes more of me." |
| Signal Booster | `bell-boost`: "📡 the box hums louder now." |
| Core Cluster | `bell-cluster`: "🧊 a cluster. things are accelerating." |
| Processing Array | `bell-array`: "🛰 it runs without me. that's new." |
| Neural Net | `bell-neural`: "🧠 it's… thinking? everything multiplies." |
| Quantum Tap | `bell-quantum`: "⚛ my tap fractured into many." |

These fire via the existing `checkMessages('buy', …)` / `'bit-earn'` event path with
`maxCount: 1, removeAfterFire: true` — same pattern as the current `bell-firstsight`.

---

## B. Pixel-reveal scaling across sub-stages

The current 100-cell column-major grid (`stage1.js`, `GRID_COLS=20 × GRID_ROWS=5`) reveals one
cell per bit, then resets on purchase. We **keep the visual** but give it persistent meaning:

> **The grid shows progress toward the *next* unlock, normalized to [0,100] cells.**

```
cellsRevealed = clamp( floor(100 × progressToNextUnlock), 0, 100 )

progressToNextUnlock =
  (currentMetric − thresholdOfCurrentTier) /
  (thresholdOfNextTier − thresholdOfCurrentTier)
```
where `currentMetric` is whatever the *next* sub-stage's `unlock` predicate keys off
(`bits` on hand, `totalBits` ever, or a derived "% of cost saved"). When a sub-stage unlocks,
the grid resets and begins tracking the one after it. When all sub-stages are owned, the grid
tracks **progress toward the boss-ticket cost** (1B bits), so the reveal stays meaningful right
up to the boss gate.

This makes the original pixel-reveal mechanic (no standard-genre equivalent — see `01` §F.4) a
*persistent stage-gate visualization* rather than a one-shot onboarding gimmick. The empty-screen
first-tap experience is unchanged (grid full-covered at 0 progress; first bits reveal the first
column), so the cinematic opening still lands.

**Impl note:** `renderStage1()` already computes `reveal()` from `state.bits`. Generalize it to
`reveal()` from `progressToNextUnlock` and feed it the active next-tier threshold. The
column-major fill order and the `mg-s1-on` / `mg-s1-clear` classes are reused verbatim.

---

## C. Managers tab

Each **timed** sub-stage gets a corresponding **manager** that auto-fires it. Managers live in a
new `stage.managers[]` config block and surface in a **Managers tab** (unlocked when the first
timed button is bought — see §E).

```js
// manager schema
{
  id, name, icon,
  managesTierId,        // which timed tier it auto-fires
  baseCostPerSec,       // running cost at level 1
  hireCost,             // one-time hire = 10 × (managed tier base)
  // level effects:
  // - speed:  effectiveTimeMs = tier.timeMs / level
  // - cost:   runningCost = baseCostPerSec × level^1.3
}
```

| Manager | Manages | Hire cost | Base cost/sec | Effect of a level |
|---------|---------|-----------|---------------|-------------------|
| **Box Operator** | Bit Box | 5,000 (10× base) | 20 | auto-fires; ÷level on cycle time |
| **Signal Engineer** | Signal Booster | 25,000 | 90 | auto-fires; ÷level on cycle time |
| **Cluster Foreman** | Core Cluster | 120,000 | 400 | auto-fires; ÷level on cycle time |

**Properties (per `01` §C.8 — the twist):**
- **Level** raises auto-fire *speed*: `effectiveTimeMs = tier.timeMs / level`. Level 3 Box Operator
  fires the 4 s Bit Box every ≈1.33 s. Each level is bought for an increasing bits cost
  (`levelCost(L) = hireCost × 1.5^L`).
- **Running cost** is **bits per second**, super-linear in level:
  `runningCost = baseCostPerSec × level^1.3`. Summed across all hired managers.
- **Net rate** = `totalRate() + Σ(timed payouts auto-credited) − Σ(running costs)`.
  Surface `netRate` prominently; if it's negative, warn.

**Shutdown rule (the trap):** if `state.bits` would go below 0 from running costs, managers
**shut off** (nothing auto-fires) until bits recover. Over-hiring is a self-inflicted soft-lock
that the player must dig out of — clicking always works, so it's recoverable (see §F.3).

**Why a twist:** in normal idle games a manager is a pure upgrade (one-time cost, free forever).
Making them an ongoing *liability* turns "buy everything" into a budgeting decision and creates
the negative-rate tension that's unique to Bit Foundry.

---

## D. Prestige — "Gravitational Pull"

A **Reset** tab (unlocked when the boss is available — §E) lets the player hard-reset Stage 1 for
a permanent multiplier called **Gravitational Pull**.

- **Unlock threshold:** boss defeated, **or** `totalBits ≥ 1aa` (10^15) ever — whichever first.
- **Resets:** `bits`, all `owned[]` counts, all manager hires/levels, all timed progress.
- **Persists:** `totalBits` (the lifetime counter), achievement flags, and the accumulated pull.
- **Pull gained per reset (log-scaled, small — avoids runaway per `01` §F.2):**
  ```
  pullGain = 1 + floor(log10(totalBitsAtReset / 1e6)) × 0.5
  // 1M total → ×1.5 ;  1B → ×2.0 ;  1T → ×2.5 ;  1aa (1e15) → ×3.0
  ```
- **Accumulated pull (multiplicative stack, per `01` §C.5):**
  ```
  pull = Π(pullGain[j])  over all resets j
  effectiveClick = baseClick × pull          // applied to clickPower()
  ```
  Apply `pull` to `clickPower()` (and optionally to timed payouts) so a 5× pull means every tap
  from the very first one yields 5× bits. Because each `pullGain` is log-scaled, stacking several
  resets compounds *meaningfully but not explosively*.

**State additions:** `state.pull` (number, default 1), `state.resets` (count).
`clickPower()` becomes `(1 + Σ click upgrades) × (state.pull || 1)`.

---

## E. Tabs — unlock sequence

The Bits tab grows into a tabbed UI. Tabs appear one at a time (staggered, per `01` §F.3):

| Tab | Unlocks when | Notes |
|-----|--------------|-------|
| **Bits** (main) | always | tap area + sub-stage shop + pixel grid |
| **Managers** | first **timed** sub-stage (Bit Box) bought | §C |
| **Achievements** | 5 achievements earned | §below |
| **Research** | Neural Net bought | exponent-based passive upgrades (`01` §B.7) |
| **Reset** | boss available (all sub-stages ≥1) **or** 1aa ever | §D |

**Achievements (Stage 1 seed set)** — each grants `achievementMult += 0.01` (additive, `01` §C.7):

| Achievement | Condition |
|-------------|-----------|
| First Blood | first buy of any sub-stage |
| Box Set | own 10× Bit Box |
| Automation | hire your first manager |
| In the Red | run a negative net rate for 10 s (teaches the trap) |
| Millionaire | 1M total bits |
| Gravity Well | first prestige |

Render the locked tabs *greyed with their condition shown* so the player always sees the next goal.

---

## F. Differences from standard idle games (our twists)

1. **Manager running costs (§C).** Implications: must show `netRate` and a clear warning when
   negative; managers auto-shut-off on insolvency rather than overdrafting; level cost and running
   cost both scale super-linearly so there's a *correct* number of managers, not "max everything."
   Anti-pattern to avoid: making running cost so punishing that managers are never worth it — tune
   so a *moderate* fleet is net-positive and only over-hiring goes red.
2. **Boss gate (§G).** Normal idles are infinite; ours **ends Stage 1** at a boss. This prevents
   the loop from going forever and gives the narrative its payoff (Stage 2 unlock + meta humor).
3. **Everything-disappears at 0 bits.** When `state.bits` hits 0, the sub-stage buttons and timed
   bars **vanish** — production fully stops. There's no hard game-over: a **Stats/Score menu**
   remains accessible from which you can still toggle managers, and the **tap area always works**
   (clicking is free), so you grind back. This creates real tension (the screen emptying mirrors
   the cinematic opening — thematically on-brand) with a guaranteed recovery path.
4. **Pixel-reveal as stage-gate visualization (§B).** Original; no standard equivalent. The canvas
   *is* the progress bar toward the next unlock.
5. **Big-number notation extended to `aa+` (`03`).** Some games do this; many stop at scientific.
   We go to letter-pairs so the late Stage-1 / Quantum-Tap numbers stay readable.

---

## G. Boss fight — Stage 1

Stage 1's existing boss is **The Overwriter** (new-file-overwrite, in `stages.js`). The user's
brief proposes a scheduler-themed gate ("The Scheduler"). **Recommendation:** keep **The
Overwriter** as the canonical Stage 1 boss (it's already built and on-brand for the
"defeat via a real app feature" through-line), and *fold the scheduler/idle flavor into the
boss-gate framing* rather than replacing the boss. Documented both ways so the user can choose:

- **Appears when:** all 8 sub-stages owned ≥1 (replaces the current `bought ≥ 5` gate in
  `stage1.js`'s `BOSS_AFTER`).
- **Ticket cost:** **1B bits** to enter the arena (first arena admission). Buying the ticket
  deducts the bits up front.
- **Boss:** *The Overwriter* (built) — re-locks the path on a timer; beaten by creating a new file
  named `boss.lock` with **overwrite** ticked, 3× before he re-locks.
  *Alt flavor ("The Scheduler"):* a CPU scheduler that drains 5% of your bits/sec during the
  fight; win by reaching 10B bits while drained, or surviving 30 taps.
- **Win:** Stage 2 unlocks; bell reveals meta humor — e.g. *"you broke the scheduler. please
  don't tell IT."* (current victory dialog: *"You beat him with the app itself…"*).
- **Lose:** you forfeit the **ticket cost** only; a few-second cooldown, then retry. By the boss
  gate, 1B bits is quick to re-grind, so losing stings without being punishing.

**State additions:** `state.ticketBought` (bool, per attempt), boss gate predicate
`allSubStagesOwned = tiers.every(t => (state.owned[t.id]||0) >= 1)`.

---

## Implementation status

The core game described here is implemented. Unfinished expansion, balance, and polish work is tracked only in [TASKS.md](../../../../TASKS.md).
