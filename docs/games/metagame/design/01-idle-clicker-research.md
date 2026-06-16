# 01 — Idle / Clicker Genre Research

Reference research for the **Bit Foundry** Stage 1 redesign. This is a developer-facing
distillation of how the genre's seminal games work, the reusable mechanic taxonomy, the
standard formulas, big-number compression, UX conventions, and the pitfalls to design
around. The companion doc `02-our-game-design.md` maps all of this onto our specific game.

---

## A. The seminal games and what each contributed

| Game | Year / author | Core contribution we care about |
|------|---------------|---------------------------------|
| **Cookie Clicker** | 2013, Julien "Orteil" Thiennot | The archetype. Establishes: one tappable resource (the cookie), a column of *buildings* (cursor, grandma, farm…) each producing cookies/sec, per-building *upgrades* that multiply output, *achievements* that grant a global mult, geometric cost scaling (×1.15/buy), and the "buy ×1/×10/×100" selector. Almost every convention below traces back here. |
| **AdVenture Capitalist** | 2014, Hyper Hippo | **Time-based production with managers.** Each business has a *cycle time* — you tap it, a progress bar fills, and on completion it pays out. *Managers* are a one-time purchase that auto-taps a business forever. Also popularized *angel investors* (a prestige currency) and the "everything runs while you're away" offline-progress loop. This timed-button + manager model is the direct ancestor of our **Bit Box / Box Operator** design. |
| **Clicker Heroes** | 2014, Playsaurus | **Prestige as the spine.** "Ascension" hard-resets your gold and heroes but grants *Hero Souls* (a permanent currency) that give +10% DPS each. Reframes the whole game as repeated runs that each go further. Our **Gravitational Pull** is this idea with a multiplicative twist. |
| **Realm Grinder** | 2015, Divine Games | **Many independent multiplier sources.** Factions (Fairy/Elf/Goblin/…) each restyle the economy and stack different bonuses; *spells*, *assault*, *research*. Lesson: multiplier *variety* keeps an economy interesting far longer than a single ramping number. |
| **NGU Idle** | 2019, somethingggg | **Many parallel systems + humour-first framing.** Energy, magic, adventure, gear, NGUs (Number Go Up bars). Lots of softly-gated sub-systems that unlock over hours. Lesson: stagger system unlocks so the player is never shown everything at once. Tone is jokey and self-aware — close to our fourth-wall, bell-narrated voice. |
| **Antimatter Dimensions** | 2016, Hevipelle | **Deep nested prestige layers + abstract resources.** Dimensions buy higher dimensions; *Infinity* resets dimensions for Infinity Points; *Eternity* resets Infinity; etc. Pioneered making numbers themselves the content (values reach 10^300+) and normalized **`Decimal`/break_infinity.js** big-number math. The reason our `03-big-number-system.md` exists. |
| **Idle Mine / PickCrafter** | 2014–15 | **Resource chains.** Mine ore → smelt → craft → sell; output of one node is the input of the next. Lesson for us: later sub-stages should *consume or boost* earlier ones rather than being independent, so the economy feels like a machine, not a list. |
| **A Dark Room** | 2013, Doublespeak Games | **Narrative-integrated, minimalist idle.** Text-first, mechanics revealed slowly, story *is* the progression. Lesson: an idle game can be a *reveal* (our empty-screen pixel start + commentary bell are squarely in this lineage). |

---

## B. Core mechanics taxonomy

For each: what it is, how it's typically implemented, and the usual formula.

### 1. Click / tap (base resource generation)
- **What:** A manual action that adds resource. The only thing available at t=0.
- **Impl:** Tap handler does `resource += clickPower`.
- **Formula:** `clickPower = base + Σ(clickUpgradeOwned × perLevel)`, then multiplied by global/prestige mults.

### 2. Auto-generators (buildings / structures)
- **What:** Owned things that produce resource/sec without input. The backbone of "idle."
- **Impl:** A fixed-interval tick (e.g. 100 ms) adds `totalRate × dt`. Each generator type has a `baseRate` and an `owned` count.
- **Formula:** `totalRate = Σ(owned[i] × baseRate[i]) × globalMult`.

### 3. Upgrades
- **What:** Boosts to a specific generator or to clicking. Usually *multiplicative* ("×2 cursor output"), sometimes additive.
- **Impl:** One-shot purchases that flip a flag / add a multiplier into the rate calculation.
- **Formula:** `effectiveRate[i] = baseRate[i] × Π(upgradeMult applied to i)`.

### 4. Prestige / ascension (soft reset)
- **What:** Voluntarily wipe most progress in exchange for a permanent currency/multiplier, so the next run is faster and goes further.
- **Impl:** Snapshot a lifetime stat (total earned), convert it to prestige currency via a sub-linear curve (usually log or sqrt), reset the run state, keep the prestige bonus.
- **Formula (Clicker-Heroes style):** `prestigeMult = 1 + souls × 0.10`. (Our variant is multiplicative — see §C.5.)

### 5. Managers / automation
- **What:** Removes the manual step from a mechanic (auto-clicks a timed button, auto-buys, etc.).
- **Impl (standard):** A one-time purchase that sets `autoFire = true` for one mechanic; a timer fires it on the mechanic's own cycle.
- **Our twist:** managers cost resource **per second** to run, can be *levelled* for speed, and shut down if you can't pay (see `02` §C and §C.8 below).

### 6. Achievements
- **What:** Milestone flags ("own 10 of X", "earn 1M total"). Often grant a small permanent multiplier on top of the dopamine.
- **Impl:** A set of predicate→flag checks run on relevant events; first time a predicate is true, set the flag and apply its reward.
- **Formula:** `achievementMult = 1 + (count × 0.01)` (additive, Cookie-Clicker style) **or** `Π(1.02)` per achievement (multiplicative).

### 7. Research (passive tree)
- **What:** A tree/list of unlockable upgrades, frequently *exponent-based* (raise a formula's exponent, not just its coefficient) so effects compound hard.
- **Impl:** Nodes with prerequisites + a resource cost; buying a node applies a permanent modifier. Often gated behind a slow secondary resource ("research points").
- **Formula example:** an exponent node changes `output ∝ owned` into `output ∝ owned^1.05`.

### 8. Challenges
- **What:** Optional runs with a special rule (e.g. "no auto-generators", "costs scale 2× faster") that, if completed, grant a permanent reward.
- **Impl:** A flagged run-mode that overrides parts of the economy, with a win condition; reward applied on completion.

### 9. Events / time-based content
- **What:** Limited-window modifiers (seasonal multipliers, "golden cookie" spawns granting bursts).
- **Impl:** A spawner on a randomized timer; clicking within the window grants a buff. (Out of scope for Stage 1 but worth noting for later stages.)

### 10. Big-number compression
- **What:** Once values exceed what a float represents exactly (≈9×10^15), or simply exceed what a player can read, switch to compact notation and (eventually) a `{mantissa, exponent}` representation. See §D and `03-big-number-system.md`.

---

## C. Standard formulas

### 1. Geometric cost progression
```
cost(n) = baseCost × growthRate^n
```
`n` = count already owned. Typical `growthRate` 1.07–1.15. Lower rate ⇒ you can mass-buy
cheaply (flatter curve); higher rate ⇒ each purchase is a meaningful decision.
*Our existing `metagame.js` already implements exactly this:* `costOf = ceil(t.base × t.mult^count)`.

### 2. Bulk-purchase cost (buy `n` starting from `owned = k`)
Sum of a geometric series:
```
totalCost(k, n) = baseCost × growthRate^k × (growthRate^n − 1) / (growthRate − 1)
```
Use this for the `×10 / ×100 / ×1000` buttons so the displayed cost is the *true* total,
not n× the next single item.

### 3. Max affordable (closed form)
Given `bits` on hand and `owned` already bought, the most you can buy:
```
maxN = floor( log(1 + bits × (growthRate − 1) / (baseCost × growthRate^owned)) / log(growthRate) )
```
Closed-form is O(1) and avoids the loop. *Note:* the current code instead loops
(`while (bought < limit) …`) which is fine for small counts but should move to this
formula once counts get large (or numbers become BigNum). Always recompute `cost(owned + bought)`
when displaying the price for the selected buy-count.

### 4. DPS / resource rate
```
totalRate = Σ(owned[i] × baseRate[i]) × globalMult × achievementMult × prestigeMult
```

### 5. Prestige multiplier (multiplicative stack — our model)
```
prestigeBonus = Π(pullFactor[j])   for every reset j
effectiveClick = baseClick × prestigeBonus
```
Contrast with the additive industry norm (`1 + souls × 0.1`). Multiplicative stacking ramps
faster, so the per-reset `pullFactor` must be *small* and *log-scaled* (see `02` §D) to avoid runaway.

### 6. Time-to-afford (for "X in 0:42" UI hints)
```
timeRemaining = (cost − currentBits) / totalRate     // if totalRate > 0
```

### 7. Achievement multiplier
```
achievementMult = 1 + (achievementsUnlocked × 0.01)   // +1% each, additive
// or, multiplicative:
achievementMult = Π over unlocked of 1.02
```
Additive is gentler and easier to reason about; prefer it for Stage 1.

### 8. Manager running cost — *our non-standard twist*
```
runningCost = Σ over managers of (managerCostPerSec[type] × level^1.3)
netRate     = totalRate − runningCost
```
If `netRate < 0`, bits drain toward 0; when bits hit 0, **all production stops** and the
managed buttons disappear (see `02` §F.3). The `level^1.3` super-linear term is what makes
over-hiring a real trap rather than a free upgrade.

---

## D. Big-number notation standard

The genre converges on grouping by powers of 1000 with letter suffixes:

| Value | Suffix |
|-------|--------|
| 10^3  | K |
| 10^6  | M |
| 10^9  | B (US billion) |
| 10^12 | T |
| 10^15 | aa |
| 10^18 | ab |
| 10^21 | ac |
| …     | … |
| 10^90 | az |
| 10^93 | ba |
| 10^96 | bb |

After the four "named" tiers (K/M/B/T) the convention is a **two-letter base-26 sequence**
`aa, ab, … az, ba, bb, …` where each step is +3 to the exponent. (Cookie Clicker uses long
*words* — "million, billion, … decillion"; Antimatter Dimensions and most modern idles use
the letter-pair scheme because it's compact and unbounded. We adopt the letter-pair scheme.)

**Representation.** Store value as `{ m, e }` where value = `m × 10^e`, `1 ≤ m < 1000`,
`e` a multiple of 3. Operations (add/mul/compare) run on the pair, not on a float, so the
game keeps working past float precision. Full spec in `03-big-number-system.md`.

**Display.**
```
suffix(e) =
  e === 0  ? ''  :
  e < 15   ? ['K','M','B','T'][e/3 - 1] :
  letterPair((e - 15) / 3)              // 0→'aa', 1→'ab', …
display(a) = a.m.toFixed(2) + suffix(a.e)
```

---

## E. Common UX patterns

- **Buy-count selector:** `[×1] [×10] [×100] [×1000] [MAX]`, with the active one highlighted; the displayed cost reflects the *selected* count (true bulk cost, §C.2); the buy button is disabled if unaffordable. *(We already have ×1/×10/×100/Max in `metagame.js`.)*
- **Progress bars on timed actions:** any "completes in N seconds" button shows a filling bar; on completion it pays out and (if a manager is assigned) auto-restarts.
- **Notification / discovery moments:** a bell or toast announces each new unlock. *(We have the commentary bell.)* Greyed-out, visible-but-locked elements telegraph what's coming.
- **Tab structure:** the standard column is **Main / Upgrades (or Multipliers) / Managers / Achievements / Research / Reset**, each tab appearing only once its first item is reachable.
- **First-time tooltips / "locked" affordances:** show locked items dimmed with their unlock condition, so the player always has a next goal in view.
- **Offline / catch-up:** on return, credit `elapsed × netRate` (capped). *(Optional for us; our SW makes this feasible later.)*

---

## F. Common design pitfalls to avoid

1. **Death spirals / soft-locks.** The player reaches a state where they can't afford anything *and* can't generate enough to recover. Our manager-running-cost twist makes this *possible by design*, so the recovery path must be explicit (you can still fire managers manually from a stats menu, and clicking always works — see `02` §F).
2. **Runaway prestige.** If a reset bonus is too strong, the entire pre-reset game becomes trivial instantly and the loop loses tension. Keep per-reset `pullFactor` log-scaled and small.
3. **Tab/feature overload.** Showing six tabs and twenty buttons at once is paralysing. Gate every tab and every sub-stage behind a threshold so complexity arrives one piece at a time (our sub-stage cadence).
4. **Unclear unlock conditions.** If the player doesn't know what they're working toward, the idle loop feels aimless. Always surface the *next* unlock's condition (the pixel-reveal grid is literally this — it visualizes progress to the next sub-stage).
5. **Flat decision-making.** If buying is always "buy the cheapest thing," there's no game. Differentiate sub-stages by *role* (burst vs. passive vs. multiplier vs. enabler) so purchases are choices, not chores.
6. **Number illegibility.** Raw `1.2e21` is unreadable. Compact notation isn't cosmetic — it's required for the late game to be playable.

---

## G. How this maps to Bit Foundry (pointer)

Our Stage 1 keeps the empty-screen *reveal* lineage of A Dark Room, layers on the
AdVenture-Capitalist timed-button + manager loop (with our running-cost twist), borrows the
Cookie-Clicker cost/achievement formulas verbatim, adopts Antimatter-Dimensions-style
`{m,e}` big numbers, and caps the otherwise-infinite loop with a **boss gate** (genre-unusual).
The full mapping, sub-stage list, and tuned numbers are in `02-our-game-design.md`.
