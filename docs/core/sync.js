// Magic selector + scroll sync: the two-way mapping between the raw editor and the rendered
// preview. Magic selector maps a clicked/hovered preview block (data-fv-src="start:end") to the
// source lines and back; scroll sync keeps the two panes aligned. All state-based — no app-core
// dependency — so this lives outside the orchestrator. app.js wires these as the rawview/preview
// onSelect/onHover/onScroll callbacks.
import { state } from './state.js';

/* ── Magic selector ── (preview element carries data-fv-src="startLine:endLine", 0-based, end-exclusive) */
export function mapPreviewToRaw(src, moveCursor = true) {
  if (!src || !state.rawview) return;
  const [a, b] = src.split(':').map(Number);
  const startLine = a + 1, endLine = Math.max(startLine, b);
  state.rawview.decorate(startLine, endLine);
  if (moveCursor) state.rawview.reveal(startLine);
}

export function mapRawToPreview(line) {
  if (!state.preview) return;
  // Find the nearest source block whose range covers this line (0-based).
  state.preview.highlight((line - 1) + ':' + line);
}

/* ── Scroll sync ── */
export function syncScrollFromRaw() {
  if (state.syncing || !state.preview || !state.settingsModel.values.syncScroll) return;
  if (!state.rawview?.canSync()) return;
  const { top, max } = state.rawview.scrollInfo();
  state.syncing = true;
  state.preview.scrollTo(max > 0 ? top / max : 0);
  requestAnimationFrame(() => (state.syncing = false));
}
export function syncScrollFromPreview(ratio) {
  if (state.syncing || !state.rawview || !state.settingsModel.values.syncScroll) return;
  if (!state.rawview.canSync()) return;
  const { max } = state.rawview.scrollInfo();
  state.syncing = true;
  state.rawview.setScrollTop(ratio * Math.max(0, max));
  requestAnimationFrame(() => (state.syncing = false));
}
