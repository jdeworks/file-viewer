// s1layout.js — Stage 1 static markup + grid constants + the Defrag-Echo glyph stylesheet. Pure
// presentation pulled out of stage1.js to keep the orchestrator under the LOC cap.

export const GRID_COLS = 20, GRID_ROWS = 5, GRID_CELLS = GRID_COLS * GRID_ROWS;   // 20×5 = 100

export function stage1Markup(multTier) {
  return '<div class="mg-wrap mg-s1">'
    + '<div class="mg-s1-hud" hidden>'
    + '  <span class="mg-s1-grav" hidden>🌀 ×1.0</span>'
    + '  <span class="mg-s1-score"><strong class="mg-s1-score-val">0</strong> bits</span>'
    + '</div>'
    + '<div class="mg-s1-help" hidden></div>'
    + '<button class="mg-s1-echo" type="button" hidden aria-label="defrag the corrupted glyph">👾<span class="mg-s1-echo-t"></span></button>'
    + '<div class="mg-s1-top">'
    + '  <div class="mg-s1-tap" aria-label="tap to compute"></div>'
    + '  <div class="mg-s1-stage">'
    + '    <button class="mg-s1-btn mg-compute" type="button">' + (multTier ? multTier.icon + ' ' + multTier.name : 'Compute') + '</button>'
    + '    <div class="mg-s1-grid" aria-hidden="true"></div>'
    + '  </div>'
    + '</div>'
    + '<div class="mg-s1-tabs" role="tablist"></div>'
    + '<div class="mg-s1-panels"></div>'
    + '</div>';
}

const ECHO_STYLE_ID = 'mg-s1-echo-style';
export function injectEchoStyle() {
  if (typeof document === 'undefined' || document.getElementById(ECHO_STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = ECHO_STYLE_ID;
  el.textContent = `
.mg-s1-echo { position:absolute; top:48px; right:14px; z-index:6; display:flex; flex-direction:column; align-items:center;
  gap:1px; background:#3a1020; color:#ff6b9d; border:1px solid #ff6b9d; border-radius:10px; padding:6px 9px;
  font-size:20px; cursor:pointer; animation:mg-s1-echo-pulse .7s ease infinite alternate; }
.mg-s1-echo .mg-s1-echo-t { font:600 10px ui-monospace,monospace; color:#ff6b9d; }
@keyframes mg-s1-echo-pulse { from { transform:scale(1); box-shadow:0 0 0 0 #ff6b9d55; } to { transform:scale(1.08); box-shadow:0 0 12px 2px #ff6b9d55; } }
`;
  document.head.appendChild(el);
}
