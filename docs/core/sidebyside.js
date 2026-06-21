// Side-by-side: view two files at once (incl. PDFs/images) in a full-screen overlay. Each pane
// renders independently via renderFileInto, which doesn't touch global state. Extracted from app.js;
// imports shared state + primitives from state.js (no circular dep back into app.js).
import { state, $, toast, themeIsDark, escapeHtml } from './state.js';
import { pickType } from './detect.js';
import { matchKnown } from '../known/registry.generated.js';
import { mountPreview } from './iframe.js';
import { previewStyle } from './settings-schema.js';
import { intakeFromFile } from './intake.js';

// Render an intake's preview into an arbitrary host (standalone — does not touch global state).
// Used by the side-by-side overlay so two files render independently next to each other.
async function renderFileInto(host, intake) {
  const { type } = pickType(intake);
  const known = matchKnown(intake, type);
  const useKnown = known && known.loadRenderer;
  const canPrev = (type.capabilities.preview || useKnown) && !(intake.isBinary && !type.capabilities.preview && !useKnown);
  host.innerHTML = '';
  if (!canPrev || (!type.loadRenderer && !useKnown)) {
    host.innerHTML = '<p class="sbs-note">No preview for this file type.</p>';
    return { destroy() { host.innerHTML = ''; } };
  }
  try {
    const mod = useKnown ? await known.loadRenderer() : await type.loadRenderer();
    const rendered = await mod.render(intake, { settings: {}, folder: null });
    if (rendered.parentNode) {
      host.appendChild(rendered.parentNode);
      return { destroy() { rendered.revoke?.(); host.innerHTML = ''; } };
    }
    const ctrl = mountPreview(host, {
      bodyHtml: rendered.bodyHtml, fullDoc: rendered.fullDoc, allowScripts: !!rendered.ranScripts,
      theme: themeIsDark() ? 'dark' : 'light', style: previewStyle(state.settingsModel.values),
    });
    return { destroy() { ctrl.destroy(); } };
  } catch (e) {
    host.innerHTML = '<p class="sbs-note">Preview failed: ' + escapeHtml(e.message) + '</p>';
    return { destroy() { host.innerHTML = ''; } };
  }
}

export function startSideBySide() {
  if (!state.intake) return;
  $('sbsInput').value = '';
  $('sbsInput').click();
}

export async function openSideBySide(file2) {
  let intake2;
  try { intake2 = await intakeFromFile(file2); } catch (e) { toast('Could not read file: ' + e.message); return; }
  const overlay = document.createElement('div');
  overlay.className = 'sbs-overlay';
  overlay.innerHTML =
    '<div class="sbs-head"><span class="sbs-title">Side by side</span><button class="sbs-close" aria-label="Close">✕</button></div>'
    + '<div class="sbs-body">'
    + '<div class="sbs-pane"><div class="sbs-name"></div><div class="sbs-host"></div></div>'
    + '<div class="sbs-pane"><div class="sbs-name"></div><div class="sbs-host"></div></div>'
    + '</div>';
  document.body.appendChild(overlay);
  const panes = overlay.querySelectorAll('.sbs-pane');
  panes[0].querySelector('.sbs-name').textContent = state.intake.filename || 'current';
  panes[1].querySelector('.sbs-name').textContent = intake2.filename || 'file 2';
  const ctrls = [];
  ctrls.push(await renderFileInto(panes[0].querySelector('.sbs-host'), state.intake));
  ctrls.push(await renderFileInto(panes[1].querySelector('.sbs-host'), intake2));
  function close() {
    ctrls.forEach((c) => c && c.destroy && c.destroy());
    overlay.remove();
    document.removeEventListener('keydown', onEsc, true);
  }
  function onEsc(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
  overlay.querySelector('.sbs-close').addEventListener('click', close);
  document.addEventListener('keydown', onEsc, true);
}
