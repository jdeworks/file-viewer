// Unified-diff / patch viewer: colorizes added / removed / hunk-header / file-header lines, and
// adds per-hunk include/exclude checkboxes that rebuild a valid partial patch (selected hunks only)
// into a copyable textarea — the in-sandbox equivalent of "download selected hunks" (the preview
// iframe is a null-origin allow-scripts sandbox, so it can't trigger a download). Pure presentation
// + selection — no patching applied. Line text is HTML-escaped before insertion.
import { esc } from '../../../core/template.js';

function classOf(line) {
  if (/^(diff --git|index |--- |\+\+\+ |new file|deleted file|rename |similarity )/.test(line)) return 'p-file';
  if (/^@@/.test(line)) return 'p-hunk';
  if (/^\+/.test(line)) return 'p-add';
  if (/^-/.test(line)) return 'p-del';
  return '';
}
const plLine = (l) => '<span class="pl ' + classOf(l) + '">' + (esc(l) || '&nbsp;') + '</span>';

// Group the flat line list into files → hunks. A file starts at `diff --git` (git patches) or at a
// `--- ` header (plain patches); a hunk starts at `@@`. Lines before the first hunk are the file's
// header; lines before the first file are kept as a leading preamble file with no hunks.
function parsePatch(lines) {
  const files = [];
  let cur = null, hunk = null;
  const startFile = () => { cur = { header: [], hunks: [] }; files.push(cur); hunk = null; };
  for (const l of lines) {
    const isGit = /^diff --git /.test(l);
    const isMinus = /^--- /.test(l);
    if (isGit || (isMinus && (!cur || cur.hunks.length))) { startFile(); cur.header.push(l); continue; }
    if (/^@@/.test(l)) { if (!cur) startFile(); hunk = { header: l, body: [] }; cur.hunks.push(hunk); continue; }
    if (hunk) { hunk.body.push(l); continue; }
    if (!cur) startFile();
    cur.header.push(l);
  }
  return files;
}

export async function render(intake, _ctx) {
  const lines = (intake.text || '').split(/\r?\n/);
  const files = parsePatch(lines);
  const filesHtml = files.map((f) => {
    const head = f.header.length ? `<div class="patch-fhead">${f.header.map(plLine).join('')}</div>` : '';
    const hunks = f.hunks.map((h) => `<div class="patch-hunk">
      <label class="patch-hctl"><input type="checkbox" class="patch-hcb" checked> include</label>
      <div class="patch-hlines">${plLine(h.header)}${h.body.map(plLine).join('')}</div>
    </div>`).join('');
    return `<div class="patch-file">${head}${hunks}</div>`;
  }).join('');
  const hasHunks = files.some((f) => f.hunks.length);

  return {
    hadUnsafe: false,
    bodyHtml: `<div class="patch-doc">
  <style>
    .patch-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 10px}
    .patch-controls button{cursor:pointer;border:1px solid #cbd5e1;background:transparent;color:inherit;border-radius:6px;padding:3px 10px;font:600 12px system-ui,sans-serif}
    body.fv-dark .patch-controls button{border-color:#3a3a3d}
    .patch-count{font-size:.83rem;color:#5a6678}body.fv-dark .patch-count{color:#9aa0a8}
    .patch-hunk{position:relative;margin:0 0 4px}
    .patch-hctl{display:inline-flex;align-items:center;gap:5px;font:600 11px system-ui,sans-serif;color:#5a6678;padding:2px 6px;cursor:pointer;user-select:none}
    body.fv-dark .patch-hctl{color:#9aa0a8}
    .patch-hunk:has(.patch-hcb:not(:checked)) .patch-hlines{opacity:.4}
    .patch-out-wrap{margin-top:12px}
    .patch-out-label{font-size:.8rem;color:#5a6678;margin:0 0 4px}body.fv-dark .patch-out-label{color:#9aa0a8}
    .patch-out{width:100%;box-sizing:border-box;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;border:1px solid #d8dce2;border-radius:6px;padding:8px;background:#fff;color:#1a1d21;resize:vertical}
    body.fv-dark .patch-out{background:#0d1320;color:#e6e6e6;border-color:#3a3a3d}
  </style>
  ${hasHunks ? `<div class="patch-controls"><button type="button" class="patch-all">All</button><button type="button" class="patch-none">None</button><span class="patch-count"></span></div>` : ''}
  <div class="patch">${filesHtml}</div>
  ${hasHunks ? `<div class="patch-out-wrap"><div class="patch-out-label">Filtered patch (selected hunks) — select all to copy:</div><textarea class="patch-out" readonly rows="8" aria-label="Filtered patch"></textarea></div>` : ''}
</div>
<script>
(function () {
  var NL = String.fromCharCode(10), NBSP = String.fromCharCode(160);
  var root = document.querySelector('.patch');
  var out = document.querySelector('.patch-out');
  var count = document.querySelector('.patch-count');
  if (!root || !out) return;
  function linesOf(el) { return [].slice.call(el.querySelectorAll('.pl')).map(function (s) { var t = s.textContent; return t === NBSP ? '' : t; }); }
  function rebuild() {
    var total = 0, sel = 0, parts = [];
    [].slice.call(root.querySelectorAll('.patch-file')).forEach(function (f) {
      var head = f.querySelector('.patch-fhead');
      var chosen = [].slice.call(f.querySelectorAll('.patch-hunk')).filter(function (h) { total++; var c = h.querySelector('.patch-hcb').checked; if (c) sel++; return c; });
      if (!chosen.length) return;
      if (head) parts = parts.concat(linesOf(head));
      chosen.forEach(function (h) { parts = parts.concat(linesOf(h.querySelector('.patch-hlines'))); });
    });
    out.value = parts.join(NL);
    if (count) count.textContent = sel + ' of ' + total + ' hunks selected';
  }
  root.addEventListener('change', function (e) { if (e.target.classList.contains('patch-hcb')) rebuild(); });
  function setAll(v) { [].slice.call(root.querySelectorAll('.patch-hcb')).forEach(function (cb) { cb.checked = v; }); rebuild(); }
  var a = document.querySelector('.patch-all'), n = document.querySelector('.patch-none');
  if (a) a.addEventListener('click', function () { setAll(true); });
  if (n) n.addEventListener('click', function () { setAll(false); });
  rebuild();
})();
</scr` + `ipt>`,
  };
}

// Quick stats for the metadata panel.
export function patchStats(text) {
  const lines = (text || '').split(/\r?\n/);
  let added = 0, removed = 0, files = 0, hunks = 0, newFiles = 0, deletedFiles = 0, renames = 0;
  let sawGitHeader = false;
  for (const l of lines) {
    if (/^\+(?!\+\+ )/.test(l)) added++;
    else if (/^-(?!-- )/.test(l)) removed++;
    if (/^diff --git/.test(l)) { files++; sawGitHeader = true; }
    if (/^@@/.test(l)) hunks++;
    if (/^new file mode\b/.test(l)) newFiles++;
    if (/^deleted file mode\b/.test(l)) deletedFiles++;
    if (/^rename from\b/.test(l)) renames++;
  }
  if (!sawGitHeader) files = lines.filter((l) => /^--- /.test(l)).length;
  return { added, removed, files, hunks, newFiles, deletedFiles, renames };
}
