// RTF WYSIWYG editor/viewer. Parses RTF → HTML (bold, italic, colour, size), renders in an
// editable A4-paper parentNode. Toolbar: B/I/U/strike + paragraph style + download-as-HTML.
// Images, tables, and complex layouts are not supported — a partial-support note says so.
// No off-origin requests. All user text goes through esc() before being placed in the DOM.

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Windows-1252 code page 0x80–0x9F (diverges from ISO-8859-1)
const W1252 = {
  0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…',
  0x86: '†', 0x87: '‡', 0x88: 'ˆ', 0x89: '‰', 0x8A: 'Š',
  0x8B: '‹', 0x8C: 'Œ', 0x8E: 'Ž', 0x91: ''', 0x92: ''',
  0x93: '"', 0x94: '"', 0x95: '•', 0x96: '–', 0x97: '—',
  0x98: '˜', 0x99: '™', 0x9A: 'š', 0x9B: '›', 0x9C: 'œ',
  0x9E: 'ž', 0x9F: 'Ÿ',
};
function hexCharW1252(hex) {
  const code = parseInt(hex, 16);
  return code in W1252 ? W1252[code] : String.fromCodePoint(code);
}

const SKIP_DESTINATIONS = new Set([
  'fonttbl', 'colortbl', 'stylesheet', 'info', 'pict', 'object',
  'fldinst', 'fldrslt', 'header', 'footer', 'headerf', 'footerf',
  'headerl', 'footerl', 'headerr', 'footerr', 'listtable', 'listoverridetable',
  'revtbl', 'rsidtbl', 'mmathPr', 'themedata', 'colorschememapping',
  'datastore', 'latentstyles', 'pgdsctbl', 'xmlnstbl',
]);

function parseColorTable(rtf) {
  const colors = [null];
  const m = /\{\\colortbl([^}]*)\}/.exec(rtf);
  if (!m) return colors;
  for (const entry of m[1].split(';')) {
    const r = /\\red(\d+)/.exec(entry);
    const g = /\\green(\d+)/.exec(entry);
    const b = /\\blue(\d+)/.exec(entry);
    colors.push(r && g && b ? `rgb(${r[1]},${g[1]},${b[1]})` : null);
  }
  return colors;
}

/** Parse RTF and return a flat array of runs (text segments + paragraph breaks). */
function parseRtfRuns(rtf) {
  const colors = parseColorTable(rtf);
  let i = 0;
  const n = rtf.length;
  const runs = [];

  function mkState(parent) {
    return parent ? { ...parent }
      : { skip: false, bold: false, italic: false, underline: false, strike: false, fontSize: null, colorIdx: 0 };
  }
  const stack = [mkState(null)];
  function top() { return stack[stack.length - 1]; }

  function addText(text) {
    if (!text) return;
    const s = top();
    if (s.skip) return;
    const key = `${s.bold}|${s.italic}|${s.underline}|${s.strike}|${s.fontSize}|${s.colorIdx}`;
    const last = runs[runs.length - 1];
    if (last && last.type === 'text' && last._key === key) { last.text += text; return; }
    runs.push({ type: 'text', text, bold: s.bold, italic: s.italic, underline: s.underline,
      strike: s.strike, fontSize: s.fontSize, colorIdx: s.colorIdx, _key: key });
  }
  function addPara() { if (!top().skip) runs.push({ type: 'para' }); }
  function addBr()   { if (!top().skip) runs.push({ type: 'br' }); }

  function applyCtrl(word, param) {
    const s = top();
    if (s.skip) return;
    const on = param === null || param !== 0;
    switch (word) {
      case 'b':        s.bold      = on; break;
      case 'i':        s.italic    = on; break;
      case 'ul':       s.underline = on; break;
      case 'ulnone': case 'ulhide': s.underline = false; break;
      case 'strike':   s.strike    = on; break;
      case 'striked':  s.strike    = on; break;
      case 'fs':       if (param !== null) s.fontSize  = param; break;
      case 'cf':       if (param !== null) s.colorIdx  = param; break;
      case 'plain':
        s.bold = false; s.italic = false; s.underline = false;
        s.strike = false; s.fontSize = null; s.colorIdx = 0;
        break;
      case 'par': case 'pard': addPara(); break;
      case 'line':              addBr();   break;
      case 'tab': case 'cell': addText('\t'); break;
      case 'row': case 'page': case 'sect': addPara(); break;
      case 'endash':    addText('–'); break;
      case 'emdash':    addText('—'); break;
      case 'lquote':    addText('‘'); break;
      case 'rquote':    addText('’'); break;
      case 'ldblquote': addText('“'); break;
      case 'rdblquote': addText('”'); break;
      case 'bullet':    addText('•');  break;
    }
  }

  while (i < n) {
    const ch = rtf[i];
    if (ch === '{') {
      stack.push(mkState(top()));
      i++;
      if (rtf[i] === '\\' && rtf[i + 1] === '*') {
        top().skip = true; i += 2;
        while (i < n && rtf[i] === ' ') i++;
      }
      continue;
    }
    if (ch === '}') { if (stack.length > 1) stack.pop(); i++; continue; }
    if (ch === '\\') {
      i++;
      if (i >= n) break;
      const nc = rtf[i];
      if (nc === '{' || nc === '}' || nc === '\\') { addText(nc); i++; continue; }
      if (nc === "'") {
        i++;
        const hex = rtf.slice(i, i + 2); i += 2;
        if (!top().skip && /^[0-9a-fA-F]{2}$/.test(hex)) addText(hexCharW1252(hex));
        continue;
      }
      if (nc === 'u' && i + 1 < n && /[\d-]/.test(rtf[i + 1])) {
        i++;
        let numStr = '';
        if (rtf[i] === '-') { numStr = '-'; i++; }
        while (i < n && /\d/.test(rtf[i])) { numStr += rtf[i]; i++; }
        if (rtf[i] === ' ') i++;
        if (!top().skip) {
          let cp = parseInt(numStr, 10);
          if (cp < 0) cp += 65536;
          addText(String.fromCodePoint(cp));
        }
        if (rtf[i] === '{') {
          let depth = 0;
          while (i < n) { if (rtf[i] === '{') depth++; else if (rtf[i] === '}') { depth--; if (!depth) { i++; break; } } i++; }
        } else { i++; }
        continue;
      }
      if (nc === '-' || nc === '|' || nc === ':' || nc === ';') { i++; continue; }
      if (nc === '\n' || nc === '\r') { if (!top().skip) addPara(); i++; continue; }
      if (/[a-zA-Z]/.test(nc)) {
        let word = '';
        while (i < n && /[a-zA-Z]/.test(rtf[i])) { word += rtf[i]; i++; }
        let param = null;
        if (i < n && (rtf[i] === '-' || /\d/.test(rtf[i]))) {
          let ps = '';
          if (rtf[i] === '-') { ps = '-'; i++; }
          while (i < n && /\d/.test(rtf[i])) { ps += rtf[i]; i++; }
          param = parseInt(ps, 10);
        }
        if (rtf[i] === ' ') i++;
        if (SKIP_DESTINATIONS.has(word)) { top().skip = true; continue; }
        applyCtrl(word, param);
        continue;
      }
      i++; continue;
    }
    if (!top().skip && ch !== '\r' && ch !== '\n') addText(ch);
    i++;
  }
  return { runs, colors };
}

/** Convert runs array → safe HTML string with inline formatting spans. */
function runsToHtml(runs, colors) {
  function getStyle(run) {
    const s = [];
    if (run.bold)      s.push('font-weight:bold');
    if (run.italic)    s.push('font-style:italic');
    const deco = [];
    if (run.underline) deco.push('underline');
    if (run.strike)    deco.push('line-through');
    if (deco.length)   s.push('text-decoration:' + deco.join(' '));
    const col = run.colorIdx > 0 && run.colorIdx < colors.length ? colors[run.colorIdx] : null;
    if (col) s.push('color:' + col);
    if (run.fontSize !== null && Math.abs(run.fontSize / 2 - 12) >= 2)
      s.push('font-size:' + Math.round(run.fontSize / 2) + 'pt');
    return s.join(';');
  }

  const parts = [];
  let inP = false, spanOpen = false, lastKey = null;
  function closeSpan() { if (spanOpen) { parts.push('</span>'); spanOpen = false; lastKey = null; } }
  function openP()     { if (!inP) { parts.push('<p>'); inP = true; } }

  let start = 0;
  while (start < runs.length && runs[start].type === 'para') start++;

  for (let j = start; j < runs.length; j++) {
    const run = runs[j];
    if (run.type === 'para') {
      closeSpan();
      if (inP) { parts.push('</p>'); inP = false; }
    } else if (run.type === 'br') {
      closeSpan(); openP(); parts.push('<br>');
    } else if (run.text === '\t') {
      closeSpan(); openP();
      parts.push('<span style="display:inline-block;width:2em"> </span>');
    } else {
      openP();
      const key = run._key;
      if (key !== lastKey) {
        closeSpan();
        const style = getStyle(run);
        if (style) { parts.push(`<span style="${style}">`); spanOpen = true; lastKey = key; }
        else lastKey = null;
      }
      parts.push(esc(run.text));
    }
  }
  closeSpan();
  if (inP) parts.push('</p>');
  return parts.join('').replace(/(<p>\s*<\/p>){3,}/g, '<p></p><p></p>');
}

export function buildHtmlFromRtf(rtf) {
  const { runs, colors } = parseRtfRuns(rtf);
  return runsToHtml(runs, colors);
}

/** Plain-text extraction (for raw/diff view). */
const CTRL_TEXT = {
  par: '\n', pard: '\n', line: '\n', sect: '\n\n',
  tab: '\t', cell: '\t', row: '\n', page: '\f',
  endash: '–', emdash: '—', lquote: '‘', rquote: '’',
  ldblquote: '“', rdblquote: '”', bullet: '•',
  '~': ' ', '_': '‑',
};

export function extractText(rtf) {
  let i = 0;
  const n = rtf.length;
  const out = [];
  const stack = [{ skip: false }];
  function top() { return stack[stack.length - 1]; }

  while (i < n) {
    const ch = rtf[i];
    if (ch === '{') {
      stack.push({ skip: top().skip }); i++;
      if (rtf[i] === '\\' && rtf[i + 1] === '*') {
        top().skip = true; i += 2;
        while (i < n && rtf[i] === ' ') i++;
      }
      continue;
    }
    if (ch === '}') { if (stack.length > 1) stack.pop(); i++; continue; }
    if (ch === '\\') {
      i++; if (i >= n) break;
      const nc = rtf[i];
      if (nc === '{' || nc === '}' || nc === '\\') { if (!top().skip) out.push(nc); i++; continue; }
      if (nc === "'") {
        i++; const hex = rtf.slice(i, i + 2); i += 2;
        if (!top().skip && /^[0-9a-fA-F]{2}$/.test(hex)) out.push(hexCharW1252(hex));
        continue;
      }
      if (nc === 'u' && i + 1 < n && /[\d-]/.test(rtf[i + 1])) {
        i++; let numStr = '';
        if (rtf[i] === '-') { numStr = '-'; i++; }
        while (i < n && /\d/.test(rtf[i])) { numStr += rtf[i]; i++; }
        if (rtf[i] === ' ') i++;
        if (!top().skip) { let cp = parseInt(numStr, 10); if (cp < 0) cp += 65536; out.push(String.fromCodePoint(cp)); }
        if (rtf[i] === '{') { let d = 0; while (i < n) { if (rtf[i] === '{') d++; else if (rtf[i] === '}') { d--; if (!d) { i++; break; } } i++; } } else i++;
        continue;
      }
      if (nc === '-' || nc === '|' || nc === ':' || nc === ';') { i++; continue; }
      if (nc === '\n' || nc === '\r') { if (!top().skip) out.push('\n'); i++; continue; }
      if (/[a-zA-Z]/.test(nc)) {
        let word = '';
        while (i < n && /[a-zA-Z]/.test(rtf[i])) { word += rtf[i]; i++; }
        let param = null;
        if (i < n && (rtf[i] === '-' || /\d/.test(rtf[i]))) {
          let ps = ''; if (rtf[i] === '-') { ps = '-'; i++; }
          while (i < n && /\d/.test(rtf[i])) { ps += rtf[i]; i++; }
          param = parseInt(ps, 10);
        }
        if (rtf[i] === ' ') i++;
        if (SKIP_DESTINATIONS.has(word)) { top().skip = true; continue; }
        if (!top().skip && word in CTRL_TEXT) out.push(CTRL_TEXT[word]);
        continue;
      }
      i++; continue;
    }
    if (!top().skip && ch !== '\r' && ch !== '\n') out.push(ch);
    i++;
  }
  return out.join('').replace(/\n{3,}/g, '\n\n').trim();
}

export async function render(intake, _ctx) {
  const src = intake.text || '';

  if (!src || !src.trimStart().startsWith('{\\rtf')) {
    const el = document.createElement('div');
    el.style.cssText = 'font-family:system-ui,sans-serif;padding:3rem;color:#888;text-align:center;font-size:14px';
    el.textContent = 'Not a valid RTF file.';
    return { parentNode: el };
  }

  const contentHtml = buildHtmlFromRtf(src);
  const filename = (intake.filename || 'document').replace(/\.rtf$/i, '');

  const host = document.createElement('div');
  host.className = 'rtf-doc';

  // ── Toolbar ──
  const toolbar = document.createElement('div');
  toolbar.className = 'rtf-editor-toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'Formatting toolbar');

  // Buttons: bold, italic, underline, strikethrough
  const fmts = [
    { cmd: 'bold',          html: '<b>B</b>',  title: 'Bold (Ctrl+B)' },
    { cmd: 'italic',        html: '<i>I</i>',  title: 'Italic (Ctrl+I)' },
    { cmd: 'underline',     html: '<u>U</u>',  title: 'Underline (Ctrl+U)' },
    { cmd: 'strikeThrough', html: '<s>S</s>',  title: 'Strikethrough' },
  ];
  fmts.forEach(({ cmd, html, title }) => {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'rtf-tb-btn'; btn.title = title;
    btn.innerHTML = html;
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();   // keep selection/focus in paper
      document.execCommand(cmd, false, null);
      paper.focus();
    });
    toolbar.appendChild(btn);
  });

  toolbar.appendChild(Object.assign(document.createElement('div'), { className: 'rtf-tb-sep' }));

  // Paragraph style select
  const styleSelect = document.createElement('select');
  styleSelect.className = 'rtf-tb-select'; styleSelect.title = 'Paragraph style';
  [['', 'Style…'], ['p', 'Normal'], ['h1', 'Heading 1'], ['h2', 'Heading 2'], ['h3', 'Heading 3']].forEach(([v, t]) => {
    styleSelect.appendChild(Object.assign(document.createElement('option'), { value: v, textContent: t }));
  });
  styleSelect.addEventListener('change', () => {
    const val = styleSelect.value;
    if (val) document.execCommand('formatBlock', false, val);
    styleSelect.value = '';
    paper.focus();
  });
  toolbar.appendChild(styleSelect);

  toolbar.appendChild(Object.assign(document.createElement('div'), { className: 'rtf-tb-sep' }));

  // Text align
  const aligns = [
    { cmd: 'justifyLeft',   label: '⬛⬜⬜', title: 'Align left' },
    { cmd: 'justifyCenter', label: '⬜⬛⬜', title: 'Center' },
    { cmd: 'justifyRight',  label: '⬜⬜⬛', title: 'Align right' },
  ];
  aligns.forEach(({ cmd, label, title }) => {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'rtf-tb-btn rtf-tb-align'; btn.title = title;
    // Use text characters for alignment icons
    btn.textContent = title.replace('Align ', '').replace('Center', 'Ctr');
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      document.execCommand(cmd, false, null);
      paper.focus();
    });
    toolbar.appendChild(btn);
  });

  // Download button (pushed to right)
  const dlBtn = document.createElement('button');
  dlBtn.type = 'button'; dlBtn.className = 'rtf-tb-dl'; dlBtn.title = 'Download edited content as HTML';
  dlBtn.textContent = '⬇ HTML';
  dlBtn.addEventListener('click', async () => {
    const { downloadBlob } = await import('../../core/exports.js');
    const safeTitle = esc(filename);
    const html = `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n<title>${safeTitle}</title>\n`
      + `<style>body{font-family:Georgia,serif;font-size:12pt;line-height:1.8;max-width:800px;margin:0 auto;padding:72px 96px}p{margin:0 0 .5em}</style>\n`
      + `</head>\n<body>\n${paper.innerHTML}\n</body>\n</html>`;
    downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), filename + '.html');
  });
  toolbar.appendChild(dlBtn);

  // ── Paper ──
  const paperWrap = document.createElement('div');
  paperWrap.className = 'rtf-paper-wrap';

  const paper = document.createElement('div');
  paper.className = 'rtf-paper';
  paper.contentEditable = 'true';
  paper.spellcheck = false;
  paper.setAttribute('aria-label', 'Document — click to edit');
  paper.setAttribute('role', 'textbox');
  paper.setAttribute('aria-multiline', 'true');
  paper.innerHTML = contentHtml;

  // Ensure Enter key creates <p> not <div> or <br>
  paper.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      document.execCommand('defaultParagraphSeparator', false, 'p');
    }
  });

  const note = document.createElement('p');
  note.className = 'rtf-partial-note';
  note.textContent = '⚠ RTF partially supported — text and basic formatting shown; images and tables are not rendered.';

  paperWrap.append(paper, note);
  host.append(toolbar, paperWrap);
  return { parentNode: host };
}
