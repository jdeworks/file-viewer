// Export framework. Collects the "Export / Download as…" actions available for the current view:
// generic ones provided by core, plus per-type actions a type declares via its `loadExports()`
// descriptor hook (module exports `getExports(intake, state) => [{ label, run }]`). Modular, like
// loadDiffRenderer — core stays free of per-type logic. Each action is `{ label, run() }`.
import { printBodyHtml } from './iframe.js';

// Download a Blob/bytes as a file (shared helper for type exports).
export function downloadBlob(data, filename, mime) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function getExports(state, ctx) {
  const out = [];
  // Generic: Print / Save as PDF for any sanitized-HTML preview (we keep the body for this + the
  // screenshot path). Highest-fidelity Markdown/HTML → PDF, zero dependency.
  if (state.lastBodyHtml) {
    out.push({ label: 'Print / Save as PDF', run: () => printBodyHtml(state.lastBodyHtml, { style: ctx.previewStyle }) });
  }
  // Per-type exports (lazy-loaded only when the menu is opened).
  if (state.type && state.type.loadExports) {
    try {
      const mod = await state.type.loadExports();
      const items = await (mod.getExports || mod.default)(state.intake, state);
      if (Array.isArray(items)) out.push(...items.filter((i) => i && i.label && i.run));
    } catch { /* a broken type export never breaks the menu */ }
  }
  return out;
}

// True if the current view offers any export (used to show/hide the toolbar button) — cheap,
// synchronous check that doesn't lazy-load the type module.
export function hasExports(state) {
  return !!(state.lastBodyHtml || (state.type && state.type.loadExports));
}
