// boss1-style.js — Stage 1 Defragmenter arena stylesheet (injected once). Pulled out of boss1.js so
// the boss mount stays under the LOC cap. Pure DOM side-effect, no game logic.

const STYLE_ID = 'mg-defrag-style';

export function injectStyle() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
.mg-defrag-arena { text-align:center; padding:18px 14px; border:1px solid var(--border); border-radius:12px;
  background:var(--bg-2); transition:box-shadow .15s, border-color .15s; }
.mg-defrag-header { font:700 22px/1.1 ui-monospace, monospace; letter-spacing:2px; color:#e0742f; margin-bottom:10px; }
.mg-defrag-intro { font-size:13px; color:var(--fg-2); margin-bottom:12px; }
.mg-defrag-hint { font-size:12px; color:var(--accent); background:color-mix(in srgb, var(--accent) 10%, transparent);
  border:1px solid color-mix(in srgb, var(--accent) 35%, transparent); border-radius:8px; padding:7px 10px; margin:8px 0; }
.mg-defrag-taunt-wrap { min-height:64px; margin:8px 0; }
.boss-taunt { display:flex; align-items:flex-start; gap:8px; justify-content:center; text-align:left; }
.boss-taunt-avatar { font-size:26px; line-height:1; flex:0 0 auto; animation:mg-defrag-gear 4s linear infinite; }
@keyframes mg-defrag-gear { to { transform:rotate(360deg); } }
.boss-taunt-bubble { position:relative; background:var(--bg); border:1px solid var(--border); border-radius:10px;
  padding:8px 12px; font-size:13px; color:var(--fg); max-width:300px; min-height:1.2em; }
.mg-defrag-scores { display:flex; align-items:center; justify-content:center; gap:14px; margin:14px 0; }
.mg-defrag-side { flex:1 1 0; min-width:80px; }
.mg-defrag-label { font-size:11px; letter-spacing:2px; color:var(--fg-2); }
.mg-defrag-score { font:700 40px/1 ui-monospace, monospace; transition:color .12s; }
.mg-defrag-boss .mg-defrag-score { color:#e0742f; }
.mg-defrag-bar { height:8px; border-radius:4px; background:var(--border); margin-top:6px; overflow:hidden; }
.mg-defrag-bar::after { content:''; display:block; height:100%; width:var(--w,0%); background:currentColor; transition:width .1s linear; }
.user-bar { color:#3fb950; } .boss-bar { color:#e0742f; }
.mg-defrag-timer { font:700 22px/1 ui-monospace, monospace; flex:0 0 auto; min-width:64px; }
.mg-defrag-tap { display:block; width:100%; margin:6px 0; padding:26px 0; font:700 22px/1 ui-monospace, monospace;
  letter-spacing:3px; color:var(--accent-fg); background:var(--accent); border:0; border-radius:12px; cursor:pointer;
  user-select:none; -webkit-user-select:none; touch-action:manipulation; }
.mg-defrag-tap:active { transform:scale(.98); }
.mg-defrag-tap:disabled { opacity:.5; cursor:default; }
.mg-defrag-status { font-size:13px; color:var(--fg-2); min-height:1.4em; margin-top:6px; }
.mg-defrag-burst-hot { border-color:#e0742f; box-shadow:0 0 0 2px #e0742f88, 0 0 22px #e0742f55; }
.mg-defrag-burst-hot .mg-defrag-boss .mg-defrag-score { color:#ff7a18; animation:mg-defrag-pulse .25s ease infinite alternate; }
.mg-defrag-burst-warm { border-color:#e8c339; box-shadow:0 0 0 2px #e8c33988; }
.mg-defrag-burst-warm .mg-defrag-boss .mg-defrag-score { color:#e8c339; }
@keyframes mg-defrag-pulse { from { transform:scale(1); } to { transform:scale(1.12); } }
.mg-defrag-lobby-btns { display:flex; gap:8px; justify-content:center; margin-top:10px; flex-wrap:wrap; }
.mg-defrag-btn { background:var(--accent); color:var(--accent-fg); border:0; border-radius:8px; padding:9px 18px;
  cursor:pointer; font-size:14px; }
.mg-defrag-btn.alt { background:var(--bg); color:var(--fg); border:1px solid var(--border); }
.mg-defrag-btn:disabled { opacity:.5; cursor:default; }
.mg-defrag-overlay { margin-top:10px; padding:14px; border-radius:10px; border:1px solid var(--border); background:var(--bg); }
.mg-defrag-result { font:700 28px/1 ui-monospace, monospace; letter-spacing:2px; margin-bottom:8px; }
.mg-defrag-result.win { color:#3fb950; } .mg-defrag-result.lose { color:#e03131; }
.mg-defrag-arena.mg-fade-in { animation:mg-defrag-fade .4s ease; }
@keyframes mg-defrag-fade { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
`;
  document.head.appendChild(el);
}
