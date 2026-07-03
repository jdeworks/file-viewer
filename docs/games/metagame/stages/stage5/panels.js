// panels.js — Stage 5 Signal Racer: pure DOM builders for the side-panel widgets (per-round packet
// estimate span + the ascension ladder). They take plain inputs and return elements; the renderer owns
// the click wiring (via data- attributes) and repaint cadence. Kept out of renderer.js to hold both
// files under the soft LOC cap. (The vehicle shop that used to live here is gone — upgrades are now an
// in-flow PIT STOP; see overlay.js / pitstop.js.)

// Muted per-round packet-reward estimate span for a round-selector button (renderer appends it).
export function roundEstEl(low, high) {
  const span = document.createElement('span');
  span.className = 's5-round-est';
  span.textContent = ` ~${low}–${high}p`;
  return span;
}

// Ascension rungs (0 = base .. maxUnlocked). Empty until the stage's been beaten once (replay depth).
export function ascensionPanelEls({ ascension, defeated = false, playing = false, mods = [] }) {
  const unlocked = ascension.maxUnlocked();
  if (!defeated || unlocked <= 0 || ascension.maxLevel <= 0) return [];
  const head = document.createElement('div');
  head.className = 's5-asc-head';
  head.textContent = `ASCENSION (cleared A${ascension.maxCleared()})`;
  const sel = ascension.level();
  const buttons = [];
  for (let lvl = 0; lvl <= unlocked; lvl += 1) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.ascend = String(lvl);
    btn.disabled = playing;
    btn.textContent = `A${lvl}${sel === lvl ? ' ✓' : ''}`;
    const mod = mods.find((m) => m.level === lvl);
    if (mod) btn.title = `${mod.label} — ${mod.desc}`;
    if (sel === lvl) btn.classList.add('s5-asc-active');
    buttons.push(btn);
  }
  return [head, ...buttons];
}
