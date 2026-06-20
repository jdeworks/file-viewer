const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.logrot-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.logrot-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#5a7a3a;color:#fff;vertical-align:middle;margin-right:8px;}
.logrot-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.logrot-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.logrot-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:12px 16px;margin-bottom:10px;}
.logrot-card-hd{display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;}
.logrot-path{font-family:ui-monospace,monospace;font-size:13px;font-weight:700;word-break:break-all;}
.logrot-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px;}
.logrot-chip{display:inline-block;font-size:11px;padding:2px 8px;border-radius:10px;font-weight:600;border:1px solid;}
.logrot-chip-freq{background:#dce8f5;color:#1a4a80;border-color:#b0cce8;}
.logrot-chip-rotate{background:#e2d9f3;color:#4a235a;border-color:#c9b8e8;}
.logrot-chip-compress{background:#d4edda;color:#155724;border-color:#c3e6cb;}
.logrot-chip-nocompress{background:#f8d7da;color:#721c24;border-color:#f5c6cb;}
.logrot-chip-missing{background:#fff3cd;color:#856404;border-color:#ffc107;}
.logrot-chip-size{background:#e9ecef;color:#495057;border-color:#ced4da;}
.logrot-chip-other{background:#e9ecef;color:#495057;border-color:#ced4da;}
.logrot-post{font-size:11px;font-family:ui-monospace,monospace;background:var(--bg-3,#eef0f2);border-radius:4px;padding:4px 8px;margin-top:6px;white-space:pre-wrap;word-break:break-all;color:var(--fg,#24292f);}
`;

function parseLogrotate(text) {
  const blocks = [];
  const lines = text.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    // Skip comments and blanks
    if (!line || line.startsWith('#')) { i++; continue; }
    // A block starts with a path (contains '/') and optionally has '{' on the same line or next
    if (line.includes('/') || line.includes('*')) {
      // Collect path pattern — may span multiple lines until '{'
      let pathPart = '';
      let braceFound = false;
      while (i < lines.length) {
        const l = lines[i].trim();
        if (!l || l.startsWith('#')) { i++; continue; }
        if (l.includes('{')) {
          pathPart += (pathPart ? ' ' : '') + l.replace('{', '').trim();
          braceFound = true;
          i++;
          break;
        }
        pathPart += (pathPart ? ' ' : '') + l;
        i++;
      }
      if (!braceFound) continue;
      // Collect directives until '}'
      const directives = {};
      let postrotate = null;
      let inPost = false;
      while (i < lines.length) {
        const l = lines[i].trim();
        i++;
        if (l === '}') break;
        if (!l || l.startsWith('#')) continue;
        if (l === 'postrotate' || l === 'prerotate' || l === 'firstaction' || l === 'lastaction') {
          inPost = true;
          postrotate = '';
          continue;
        }
        if (l === 'endscript') { inPost = false; continue; }
        if (inPost) { postrotate = (postrotate || '') + l + '\n'; continue; }
        // Parse directive
        const spaceIdx = l.indexOf(' ');
        if (spaceIdx === -1) {
          directives[l.toLowerCase()] = true;
        } else {
          directives[l.slice(0, spaceIdx).toLowerCase()] = l.slice(spaceIdx + 1).trim();
        }
      }
      blocks.push({ path: pathPart.trim(), directives, postrotate });
    } else {
      i++;
    }
  }
  return blocks;
}

function freqChip(directives) {
  if (directives['daily']) return '<span class="logrot-chip logrot-chip-freq">daily</span>';
  if (directives['weekly']) return '<span class="logrot-chip logrot-chip-freq">weekly</span>';
  if (directives['monthly']) return '<span class="logrot-chip logrot-chip-freq">monthly</span>';
  if (directives['yearly']) return '<span class="logrot-chip logrot-chip-freq">yearly</span>';
  return '';
}

export function render(intake) {
  const blocks = parseLogrotate(intake.text || '');

  function renderBlock(block) {
    const chips = [];
    const freq = freqChip(block.directives);
    if (freq) chips.push(freq);

    const rotate = block.directives['rotate'];
    if (rotate != null) chips.push(`<span class="logrot-chip logrot-chip-rotate">rotate ${esc(rotate)}</span>`);

    if (block.directives['compress'] === true) chips.push('<span class="logrot-chip logrot-chip-compress">compress</span>');
    if (block.directives['nocompress'] === true) chips.push('<span class="logrot-chip logrot-chip-nocompress">nocompress</span>');

    if (block.directives['missingok'] === true) chips.push('<span class="logrot-chip logrot-chip-missing">missingok</span>');
    if (block.directives['notifempty'] === true) chips.push('<span class="logrot-chip logrot-chip-other">notifempty</span>');
    if (block.directives['sharedscripts'] === true) chips.push('<span class="logrot-chip logrot-chip-other">sharedscripts</span>');
    if (block.directives['delaycompress'] === true) chips.push('<span class="logrot-chip logrot-chip-other">delaycompress</span>');

    const maxsize = block.directives['maxsize'];
    if (maxsize != null) chips.push(`<span class="logrot-chip logrot-chip-size">maxsize ${esc(maxsize)}</span>`);

    const postHtml = block.postrotate != null
      ? `<div class="logrot-post">${esc(block.postrotate.trimEnd())}</div>`
      : '';

    return `<div class="logrot-card">
  <div class="logrot-card-hd">
    <span class="logrot-path">${esc(block.path)}</span>
  </div>
  <div class="logrot-chips">${chips.join('')}</div>
  ${postHtml}
</div>`;
  }

  const count = blocks.length;
  const subLine = `${count} log target${count !== 1 ? 's' : ''}`;

  const host = document.createElement('div');
  host.className = 'logrot-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="logrot-title"><span class="logrot-badge">logrotate</span>Logrotate Configuration</div>
<div class="logrot-sub">${subLine}</div>
${blocks.map(renderBlock).join('')}
${!blocks.length ? '<p style="color:var(--fg-2,#888);font-size:13px;">No logrotate blocks found.</p>' : ''}`;

  return { parentNode: host };
}
