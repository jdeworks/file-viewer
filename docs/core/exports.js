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

// Wrap the current sanitized preview body in a minimal, self-contained HTML document and download
// it. The body is already DOMPurify'd by the type renderer, so this is safe + portable (opens in
// any browser, fully offline). Reading typography mirrors the in-app preview.
function downloadStandaloneHtml(state, ctx) {
  const maxw = (ctx && ctx.previewStyle && ctx.previewStyle.maxWidth) || 820;
  const title = (state.intake && state.intake.filename || 'document').replace(/\.[^.]+$/, '');
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const css = 'body{font:16px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:'
    + (Number(maxw) || 820) + 'px;margin:0 auto;padding:24px;color:#1a1a1a;background:#fff;}'
    + 'img{max-width:100%;height:auto;}pre{overflow:auto;}table{border-collapse:collapse;}'
    + 'th,td{border:1px solid #ddd;padding:4px 8px;}';
  const doc = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
    + '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    + '<title>' + esc(title) + '</title>\n<style>' + css + '</style>\n</head>\n<body>\n'
    + state.lastBodyHtml + '\n</body>\n</html>\n';
  downloadBlob(doc, title + '.html', 'text/html');
}

export async function getExports(state, ctx) {
  const out = [];
  // Generic: Print / Save as PDF for any sanitized-HTML preview (we keep the body for this + the
  // screenshot path). Highest-fidelity Markdown/HTML → PDF, zero dependency.
  if (state.lastBodyHtml) {
    out.push({ label: 'Print / Save as PDF', run: () => printBodyHtml(state.lastBodyHtml, { style: ctx.previewStyle }) });
    out.push({ label: 'Download as HTML', run: () => downloadStandaloneHtml(state, ctx) });
    out.push({ label: 'Download as Word (.docx)', run: async () => {
      const { buildDocx } = await import('./docx-export.js');
      const base = (state.intake && state.intake.filename || 'document').replace(/\.[^.]+$/, '');
      downloadBlob(await buildDocx(state.lastBodyHtml), base + '.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    } });
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
