// shop.js — shared, data-driven upgrade shop for the metagame stages.
//
// Every stage with permanent upgrades has hand-rolled the same shop: a list of items with an
// escalating price, a per-item level, an affordability gate against the stage currency, and an
// "apply my upgrades to the run" fold (Stage 2's Glyph Shop and Stage 5's deck-removal both do
// this). This generalizes it: a stage supplies DATA (item defs), not DOM, and
// gets a pure core that owns levels, escalating costs, buy/affordability, and an effect fold. It
// pairs with shared/economy.js for the currency side.
//
// Construct with `createShop({ economy, items, save, stageId, slot = 'shop' })`. The pure core needs
// no DOM. An optional thin `renderShop` helper is feature-detected (typeof document) so the core
// unit-tests under Node. NOT imported by any stage yet (Phase 0 foundation); tested standalone and
// retrofitted later, so it never enters a stage's `stage.generated.js` bundle.
//
// Item shape: { id, label, desc, cost, costScale = 1, effect, repeatable = false, maxLevel }
//   cost      — base price of the FIRST level.
//   costScale — geometric growth per owned level: price(level) = round(cost × costScale^level).
//   effect    — OPTIONAL. How this upgrade folds into a target in applyAll/effects (see below).
//   repeatable— false ⇒ a one-shot (effective max level 1); true ⇒ leveled.
//   maxLevel  — cap for a repeatable item (omit ⇒ unbounded). Ignored when repeatable is false.
//
// State persisted at stageState[stageId][slot]: { levels: { [itemId]: level } }. Merged, never
// clobbering sibling slots (see the save-shape constraint in shared/economy.js / CLAUDE.md).

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function maxLevelOf(def) {
  if (!def.repeatable) return 1;
  const m = Number(def.maxLevel);
  return Number.isFinite(m) ? Math.max(1, Math.floor(m)) : Infinity;
}

export function createShop({ economy, items = [], save, stageId, slot = 'shop' } = {}) {
  const defs = Array.isArray(items) ? items.filter((it) => it && it.id != null) : [];
  const byId = new Map(defs.map((it) => [it.id, it]));

  // Resolve (creating if needed) save.stageState[stageId][slot] and merge a defaults shape under any
  // existing data without clobbering it. Returns the live object inside the save (writes pass through).
  function load() {
    if (!plainObject(save) || !plainObject(save.stageState)) return { levels: {} };
    let st = save.stageState[stageId];
    if (!plainObject(st)) { st = {}; save.stageState[stageId] = st; }
    const cur = plainObject(st[slot]) ? st[slot] : {};
    const levels = plainObject(cur.levels) ? cur.levels : {};
    const merged = { ...cur, levels };
    st[slot] = merged;
    return merged;
  }

  const data = load();

  function levelOf(id) {
    return Math.max(0, Math.floor(Number(data.levels[id]) || 0));
  }

  function maxLevelFor(id) {
    const def = byId.get(id);
    return def ? maxLevelOf(def) : 0;
  }

  function isMaxed(id) {
    return levelOf(id) >= maxLevelFor(id);
  }

  // Price of the NEXT level (the one a buy would purchase), or Infinity if already maxed.
  function costOf(id) {
    const def = byId.get(id);
    if (!def || isMaxed(id)) return Infinity;
    const scale = Number.isFinite(Number(def.costScale)) ? Number(def.costScale) : 1;
    return Math.round((Number(def.cost) || 0) * Math.pow(scale, levelOf(id)));
  }

  function canBuy(id) {
    if (!byId.has(id) || isMaxed(id)) return false;
    return economy ? economy.canAfford(costOf(id)) : false;
  }

  // buy(id) — purchase the next level: debit the economy, raise the level. Returns
  // { ok, level, cost, reason }. reason ∈ unknown | maxed | no-economy | insufficient | ok.
  function buy(id) {
    const def = byId.get(id);
    if (!def) return { ok: false, reason: 'unknown', level: 0, cost: Infinity };
    if (isMaxed(id)) return { ok: false, reason: 'maxed', level: levelOf(id), cost: Infinity };
    if (!economy) return { ok: false, reason: 'no-economy', level: levelOf(id), cost: costOf(id) };
    const cost = costOf(id);
    if (!economy.spend(cost)) {
      return { ok: false, reason: 'insufficient', level: levelOf(id), cost };
    }
    const level = levelOf(id) + 1;
    data.levels[id] = level;
    return { ok: true, reason: 'ok', level, cost };
  }

  // Fold all OWNED items (level > 0), in declared order, into a target object. An item's `effect`
  // may be:
  //   - a function (acc, level, def) => acc — a reducer (e.g. set/adjust fields on the run); its
  //     return value becomes the new accumulator (return acc if you mutate in place).
  //   - any other value — stored verbatim at acc[id] (a plain lookup table of resolved effects).
  // Items with no `effect` are skipped. applyAll clones `target` first (pure); effects() = applyAll({}).
  function applyAll(target = {}) {
    let acc = { ...(plainObject(target) ? target : {}) };
    for (const def of defs) {
      const level = levelOf(def.id);
      if (level <= 0 || def.effect == null) continue;
      if (typeof def.effect === 'function') {
        const next = def.effect(acc, level, def);
        if (plainObject(next)) acc = next;
      } else {
        acc[def.id] = def.effect;
      }
    }
    return acc;
  }

  function effects() {
    return applyAll({});
  }

  function state() {
    return { levels: { ...data.levels } };
  }

  // set(id, level) — force a level (dev / cheat affordance; does not touch the economy).
  function set(id, level) {
    if (!byId.has(id)) return false;
    const cap = maxLevelFor(id);
    data.levels[id] = Math.max(0, Math.min(Math.floor(Number(level) || 0), Number.isFinite(cap) ? cap : Number.MAX_SAFE_INTEGER));
    return true;
  }

  return {
    items: defs,
    stageId,
    slot,
    levelOf,
    maxLevelFor,
    isMaxed,
    costOf,
    canBuy,
    buy,
    applyAll,
    effects,
    set,
    state,
  };
}

// ── optional thin DOM render helper (feature-detected; never required by the pure core) ─────────────
// renderShop({ shop, economy, onChange }) → { el, paint } | null (null when there's no document).
// Deliberately minimal and class-named generically (mg-shop-*); a stage can style or replace it.
export function renderShop({ shop, economy, onChange } = {}) {
  if (typeof document === 'undefined' || !shop) return null;
  const box = document.createElement('div');
  box.className = 'mg-shop';

  function rowHtml(def) {
    const level = shop.levelOf(def.id);
    const max = shop.maxLevelFor(def.id);
    const maxed = shop.isMaxed(def.id);
    const cap = Number.isFinite(max) ? `/${max}` : '';
    const label = maxed ? 'MAX' : `${shop.costOf(def.id)}`;
    const disabled = maxed || !shop.canBuy(def.id);
    return `<div class="mg-shop-row">
      <div class="mg-shop-info">
        <strong>${def.label ?? def.id}</strong> <span class="mg-shop-lv">Lv ${level}${cap}</span>
        <div class="mg-shop-desc">${def.desc ?? ''}</div>
      </div>
      <button type="button" data-buy="${def.id}"${disabled ? ' disabled' : ''}>${label}</button>
    </div>`;
  }

  function paint() {
    const bal = economy ? economy.balance() : 0;
    box.innerHTML = `<div class="mg-shop-head">${economy ? economy.currency : 'Shop'}
        <span class="mg-shop-bal">${Math.floor(bal)}</span></div>
      <div class="mg-shop-list">${shop.items.map(rowHtml).join('')}</div>`;
    box.querySelectorAll('[data-buy]').forEach((b) => b.addEventListener('click', () => {
      const res = shop.buy(b.dataset.buy);
      if (res.ok && typeof onChange === 'function') onChange(res);
      paint();
    }));
  }

  paint();
  return { el: box, paint };
}
