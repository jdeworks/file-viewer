// Jupyter Notebook (.ipynb) preview: render each cell to sanitized HTML for the secure
// iframe. Markdown cells go through markdown-it; code cells show source + their saved
// outputs (stream/text/html/image/error). All HTML-bearing outputs are DOMPurify'd — a
// notebook's display_data can contain arbitrary HTML. Notebook code is NEVER executed.
import { loadGlobal, vendor } from '../../core/script-loader.js';

let mdInstance = null;

async function ensureLibs() {
  const [markdownit, DOMPurify] = await Promise.all([
    loadGlobal(vendor('markdown-it/markdown-it.min.js'), 'markdownit'),
    loadGlobal(vendor('dompurify/purify.min.js'), 'DOMPurify'),
  ]);
  if (!mdInstance) mdInstance = markdownit({ html: true, linkify: true, typographer: true });
  return { md: mdInstance, DOMPurify };
}

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const stripAnsi = (s) => String(s).replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '');
const joinSrc = (s) => (Array.isArray(s) ? s.join('') : (s || ''));
const b64 = (s) => String(joinSrc(s)).replace(/\s+/g, '');

const SAN_OPTS = { FORBID_TAGS: ['script', 'style'], FORBID_ATTR: ['onerror', 'onload', 'onclick'] };

function renderOutputs(outputs, DOMPurify) {
  let html = '';
  let unsafe = false;
  const sanitize = (raw) => {
    DOMPurify.removed = [];
    const clean = DOMPurify.sanitize(raw, SAN_OPTS);
    if (DOMPurify.removed.length) unsafe = true;
    return clean;
  };
  for (const out of outputs || []) {
    switch (out.output_type) {
      case 'stream':
        html += '<pre class="nb-stream' + (out.name === 'stderr' ? ' nb-stderr' : '') + '">'
          + esc(stripAnsi(joinSrc(out.text))) + '</pre>';
        break;
      case 'error':
        html += '<pre class="nb-error">' + esc(stripAnsi((out.traceback || []).join('\n'))) + '</pre>';
        break;
      case 'execute_result':
      case 'display_data': {
        const data = out.data || {};
        if (data['text/html']) html += '<div class="nb-rich">' + sanitize(joinSrc(data['text/html'])) + '</div>';
        else if (data['image/png']) html += '<img class="nb-img" alt="output" src="data:image/png;base64,' + b64(data['image/png']) + '">';
        else if (data['image/jpeg']) html += '<img class="nb-img" alt="output" src="data:image/jpeg;base64,' + b64(data['image/jpeg']) + '">';
        else if (data['image/svg+xml']) html += '<div class="nb-rich">' + sanitize(joinSrc(data['image/svg+xml'])) + '</div>';
        else if (data['text/plain']) html += '<pre class="nb-result">' + esc(joinSrc(data['text/plain'])) + '</pre>';
        break;
      }
      default:
        break;
    }
  }
  return { html, unsafe };
}

export async function render(intake, _ctx) {
  const { md, DOMPurify } = await ensureLibs();
  let nb;
  try {
    nb = JSON.parse(intake.text || '');
  } catch (err) {
    return { bodyHtml: '<div class="json-error"><strong>Invalid notebook</strong><br>' + esc(err.message) + '</div>', hadUnsafe: false };
  }

  // nbformat 4 = nb.cells; nbformat 3 nests under worksheets[0].cells.
  const cells = nb.cells || (nb.worksheets && nb.worksheets[0] && nb.worksheets[0].cells) || [];
  let body = '';
  let unsafe = false;

  for (const cell of cells) {
    const src = joinSrc(cell.source != null ? cell.source : cell.input);
    if (cell.cell_type === 'markdown') {
      DOMPurify.removed = [];
      const clean = DOMPurify.sanitize(md.render(src), SAN_OPTS);
      if (DOMPurify.removed.length) unsafe = true;
      body += '<div class="nb-cell nb-md">' + clean + '</div>';
    } else if (cell.cell_type === 'code') {
      const count = cell.execution_count != null ? cell.execution_count : ' ';
      let cellHtml = '<div class="nb-cell nb-code">'
        + '<div class="nb-in"><span class="nb-prompt">In [' + esc(count) + ']:</span>'
        + '<pre class="nb-src"><code>' + esc(src) + '</code></pre></div>';
      const outs = renderOutputs(cell.outputs, DOMPurify);
      if (outs.unsafe) unsafe = true;
      if (outs.html) cellHtml += '<div class="nb-out">' + outs.html + '</div>';
      body += cellHtml + '</div>';
    } else {
      body += '<div class="nb-cell nb-raw"><pre>' + esc(src) + '</pre></div>';
    }
  }

  if (!body) body = '<p class="nb-empty">Empty notebook (no cells).</p>';
  return { bodyHtml: '<div class="nb-notebook">' + body + '</div>', hadUnsafe: unsafe };
}
