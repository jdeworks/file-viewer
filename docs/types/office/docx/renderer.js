// Word (.docx) preview + rich-text editor. mammoth converts to clean semantic HTML which we
// sanitize and show read-only; an "Edit" toggle mounts TipTap over that HTML, and "Download .docx"
// serializes the edited content to a real Word file (core/docx-export.js). Rendered in parentNode
// mode (parent pane) so the editor is interactive without the iframe/postMessage round-trip.
// mammoth runs in the parent and only parses the document; nothing from the file executes.
import { loadGlobal, vendor } from '../../../core/script-loader.js';
import { mountDocxEditor } from './editor.js';

// Kept for any external consumer: raw mammoth HTML conversion.
export async function convert(intake) {
  const mammoth = await loadGlobal(vendor('mammoth/mammoth.browser.min.js'), 'mammoth');
  return mammoth.convertToHtml({ arrayBuffer: intake.bytes.slice().buffer });
}

export async function render(intake, _ctx) {
  const host = document.createElement('div');
  const { destroy } = await mountDocxEditor(intake, host);
  return { parentNode: host, revoke: destroy };
}
