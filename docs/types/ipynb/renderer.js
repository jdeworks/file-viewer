// Jupyter Notebook (.ipynb) preview: render each cell to sanitized HTML for the secure
// iframe. Markdown cells go through markdown-it; code cells show source + their saved
// outputs (stream/text/html/image/error). All HTML-bearing outputs are DOMPurify'd — a
// notebook's display_data can contain arbitrary HTML. Notebook code is NEVER executed.
// Markup lives in sibling .html templates (error/notebook/cell-md/cell-code/cell-raw) and
// is filled via core/template.js. Pre-escaped values use {{&slot}} raw injection; already-safe
// sanitized HTML (DOMPurify output) also uses {{&slot}}.
import { loadGlobal, vendor } from '../../core/script-loader.js';
import { loadTemplate, fill } from '../../core/template.js';

const ERROR_TPL   = new URL('./error.html',    import.meta.url);
const NOTEBOOK_TPL = new URL('./notebook.html', import.meta.url);
const CELL_MD_TPL  = new URL('./cell-md.html',  import.meta.url);
const CELL_CODE_TPL = new URL('./cell-code.html', import.meta.url);
const CELL_RAW_TPL = new URL('./cell-raw.html', import.meta.url);

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

// A notebook's markdown cells (rendered with html:true) and code-cell display_data/
// execute_result outputs can carry arbitrary attacker-controlled HTML — same threat model as
// an email HTML body (see docs/types/eml/renderer.js, whose FORBID list this mirrors). Beyond
// <script>/on*, DOMPurify's default allowlist still permits several vectors that trigger an
// eager off-origin fetch with no user interaction: style="" / <style> (CSS url()), the legacy
// background= attribute, <base href> (turns even a *relative* <img src> off-origin),
// <link>/<meta>, and autoplaying/preloading <video>/<audio>/<source>/<track>/<iframe>/
// <object>/<embed>. None of these have a legitimate use in a rendered notebook cell.
const SAN_OPTS = {
  FORBID_TAGS: ['script', 'style', 'link', 'iframe', 'object', 'embed', 'video', 'audio', 'source', 'track', 'form', 'meta', 'base'],
  FORBID_ATTR: ['srcset', 'style', 'background', 'poster', 'onerror', 'onload', 'onclick'],
};

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
  const [errorTpl, notebookTpl, cellMdTpl, cellCodeTpl, cellRawTpl] = await Promise.all([
    loadTemplate(ERROR_TPL),
    loadTemplate(NOTEBOOK_TPL),
    loadTemplate(CELL_MD_TPL),
    loadTemplate(CELL_CODE_TPL),
    loadTemplate(CELL_RAW_TPL),
  ]);

  const { md, DOMPurify } = await ensureLibs();
  let nb;
  try {
    nb = JSON.parse(intake.text || '');
  } catch (err) {
    return { bodyHtml: fill(errorTpl, { errMsg: esc(err.message) }), hadUnsafe: false };
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
      body += fill(cellMdTpl, { content: clean });
    } else if (cell.cell_type === 'code') {
      const count = cell.execution_count != null ? cell.execution_count : ' ';
      const outs = renderOutputs(cell.outputs, DOMPurify);
      if (outs.unsafe) unsafe = true;
      const out = outs.html ? '<div class="nb-out">' + outs.html + '</div>' : '';
      body += fill(cellCodeTpl, { count: esc(count), src: esc(src), out });
    } else {
      body += fill(cellRawTpl, { src: esc(src) });
    }
  }

  if (!body) body = '<p class="nb-empty">Empty notebook (no cells).</p>';
  return { bodyHtml: fill(notebookTpl, { body }), hadUnsafe: unsafe };
}
