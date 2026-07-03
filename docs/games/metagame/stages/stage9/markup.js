// markup.js — Stage 9 Observer State: the static DOM template (no logic). Kept out of renderer.js so
// the renderer stays under the LOC cap and reads as behaviour, not scaffolding. Aid cards render name +
// cost + a VISIBLE one-line description (UX audit #5) — no title= tooltips — with an "offline only" tag
// for offline-gated aids. The kbd hints on CROSS/OBSERVE are hidden on coarse pointers via CSS.

function aidCard(a) {
  return `
    <button type="button" class="s9-aid-card" data-action="aid" data-aid="${a.id}" data-field="aid-${a.id}">
      <span class="s9-aid-head"><span class="s9-aid-name">${a.label}</span><span class="s9-aid-cost">${a.cost}</span></span>
      <span class="s9-aid-desc">${a.desc}</span>
      ${a.offlineOnly ? '<span class="s9-aid-tag">offline only</span>' : ""}
    </button>`;
}

export function stage9Markup(AIDS, BOSS_LEVEL) {
  return `
    <header class="s9-hud">
      <strong>OBSERVER STATE</strong>
      <span>level <b data-field="level"></b>/${BOSS_LEVEL}</span>
      <span>movement <b data-field="movement"></b></span>
      <span>clarity <b data-field="clarity"></b></span>
      <span data-field="tachWrap" hidden>tach <b data-field="tach"></b></span>
      <span class="s9-seed" data-field="seedWrap" hidden><b data-field="seed"></b></span>
    </header>
    <div class="s9-layout">
      <div class="s9-arena-wrap">
        <div class="s9-marker" data-field="marker" aria-hidden="true">&#9660;</div>
        <pre class="s9-arena" data-field="arena" tabindex="0" role="button" aria-label="observer ring — tap or press Space to CROSS"></pre>
        <span class="s9-beat" data-field="beat" hidden aria-hidden="true"></span>
        <span class="s9-streak" data-field="streak" hidden></span>
        <div class="s9-readout" data-field="readout" aria-live="polite"></div>
      </div>
      <div class="s9-actions">
        <button type="button" class="s9-cross" data-action="cross">CROSS<kbd class="s9-kbd">Space</kbd></button>
        <button type="button" class="s9-observe" data-action="observe"><span data-field="observeLabel">OBSERVE</span><kbd class="s9-kbd">R</kbd></button>
      </div>
      <aside class="s9-side">
        <div class="s9-aids" data-field="aids" hidden>
          <strong>calibration (spend clarity)</strong>
          ${AIDS.map(aidCard).join("")}
        </div>
        <hr>
        <button type="button" data-action="notes">open service-worker-notes.txt</button>
        <button type="button" data-action="offline" hidden>Activate Offline Mode (Stage 9)</button>
        <pre data-field="notes" hidden></pre>
      </aside>
    </div>
    <div class="s9-boss" data-field="bossPanel">
      <div class="s9-boss-chip" data-field="bossChip"></div>
      <div class="s9-boss-full">
        <strong>THE OBSERVER EFFECT (FULL)</strong>
        <div data-field="boss"></div>
        <div data-field="hint"></div>
      </div>
    </div>
    <div class="s9-log-row">
      <ol class="s9-log" data-field="log"></ol>
      <button type="button" class="s9-log-more" data-action="log">full log</button>
    </div>
    <div class="s9-controls">
      <button type="button" data-action="bts" hidden>open observer_state.bts</button>
    </div>
  `;
}
