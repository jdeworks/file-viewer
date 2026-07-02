// Markdown exports: render to a self-contained HTML file using markdown-it + DOMPurify.
import { downloadBlob } from '../../core/exports.js';
import { loadGlobal, vendor } from '../../core/script-loader.js';

export function getExports(intake) {
  const base = (intake.filename || 'document').replace(/\.[^.]+$/, '');
  return [
    { label: 'Export as HTML', run: async () => {
      const [markdownit, DOMPurify] = await Promise.all([
        loadGlobal(vendor('markdown-it/markdown-it.min.js'), 'markdownit'),
        loadGlobal(vendor('dompurify/purify.min.js'), 'DOMPurify'),
      ]);
      const md = markdownit({ html: true, linkify: true, typographer: true });
      const dirty = md.render(intake.text || '');
      // Same vector list as the live renderer (renderer.js) — this file is downloaded and opened
      // directly (no sandboxed iframe), so an under-forbidden sanitize() here is just as exploitable.
      const clean = DOMPurify.sanitize(dirty, {
        FORBID_TAGS: ['script', 'style', 'link', 'iframe', 'object', 'embed', 'video', 'audio', 'source', 'track', 'form', 'meta', 'base'],
        FORBID_ATTR: ['srcset', 'style', 'background', 'poster', 'onerror', 'onload', 'onclick'],
      });
      const title = base;
      const html = '<!DOCTYPE html>\n<html><head><meta charset="utf-8"><title>' + title + '</title>\n'
        + '<style>body{font-family:system-ui;max-width:800px;margin:0 auto;padding:20px;line-height:1.6}\n'
        + 'h1,h2,h3{border-bottom:1px solid #eee}code{background:#f4f4f4;padding:2px 4px;border-radius:3px}\n'
        + 'pre code{display:block;padding:12px;overflow:auto}</style></head>\n'
        + '<body>' + clean + '</body></html>';
      downloadBlob(html, base + '.html', 'text/html');
    } },
  ];
}
