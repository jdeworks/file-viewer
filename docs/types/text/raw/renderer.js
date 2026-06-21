import { escapeHtml } from '../../../core/state.js';

// A self-contained word-wrap toggle for the preview. The preview iframe is a null-origin
// sandbox (allow-scripts), so this inline script runs there; it just flips a class on the
// <pre> between pre-wrap (default) and pre (horizontal scroll). Per-view (not persisted —
// the sandbox has no localStorage); preview.css supplies the .nowrap rule.
const WRAP_TOGGLE_SCRIPT = '<scr' + 'ipt>(function(){'
  + 'var b=document.querySelector(".plain-wrap-btn"),p=document.querySelector(".plain-text");'
  + 'if(!b||!p)return;'
  + 'b.addEventListener("click",function(){'
  + 'var on=b.getAttribute("aria-pressed")!=="true";'
  + 'b.setAttribute("aria-pressed",on?"true":"false");'
  + 'b.textContent=on?"\\u21A9 Wrap: on":"\\u2192 Wrap: off";'
  + 'p.classList.toggle("nowrap",!on);'
  + '});'
  + '})();</scr' + 'ipt>';

export async function render(intake) {
  const text = intake.text || '';
  const empty = text.length === 0;
  const body = empty
    ? '<p class="plain-empty">Empty text file</p>'
    : '<div class="plain-toolbar"><button type="button" class="plain-wrap-btn" aria-pressed="true" title="Toggle word wrap">↩ Wrap: on</button></div>'
      + '<pre class="plain-text">' + escapeHtml(text) + '</pre>'
      + WRAP_TOGGLE_SCRIPT;
  return {
    bodyHtml: '<article class="plain-doc">' + body + '</article>',
    hadUnsafe: false,
  };
}
