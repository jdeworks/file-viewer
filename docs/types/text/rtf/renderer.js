// RTF viewer — text extraction only. RTF is a complex binary-ish format; we strip
// all control words and extract plain text. A partial-support banner makes this clear.
// No off-origin requests. No DOMPurify needed (we build safe HTML from extracted text).

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Windows-1252 code page table for 0x80–0x9F (the range where W1252 diverges from ISO-8859-1)
const W1252 = {
  0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…',
  0x86: '†', 0x87: '‡', 0x88: 'ˆ', 0x89: '‰', 0x8A: 'Š',
  0x8B: '‹', 0x8C: 'Œ', 0x8E: 'Ž', 0x91: '‘', 0x92: '’',
  0x93: '“', 0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—',
  0x98: '˜', 0x99: '™', 0x9A: 'š', 0x9B: '›', 0x9C: 'œ',
  0x9E: 'ž', 0x9F: 'Ÿ',
};

function hexCharW1252(hex) {
  const code = parseInt(hex, 16);
  if (code in W1252) return W1252[code];
  // For values 0xA0–0xFF, Windows-1252 == Latin-1 == Unicode
  return String.fromCodePoint(code);
}

// Skip destination control words — groups starting with these should be silently dropped.
const SKIP_DESTINATIONS = new Set([
  'fonttbl', 'colortbl', 'stylesheet', 'info', 'pict', 'object',
  'fldinst', 'fldrslt', 'header', 'footer', 'headerf', 'footerf',
  'headerl', 'footerl', 'headerr', 'footerr', 'listtable', 'listoverridetable',
  'revtbl', 'rsidtbl', 'mmathPr', 'themedata', 'colorschememapping',
  'datastore', 'latentstyles', 'pgdsctbl', 'xmlnstbl',
]);

// Control words that produce text output
const CTRL_TEXT = {
  par: '\n', pard: '\n', line: '\n', sect: '\n\n',
  tab: '\t', cell: '\t', row: '\n',
  page: '\f',
  endash: '–', emdash: '—', lquote: '‘', rquote: '’',
  ldblquote: '“', rdblquote: '”', bullet: '•',
  '~': ' ', '_': '‑',
};

/**
 * Extract plain text from an RTF string.
 * Returns the extracted text.
 */
export function extractText(rtf) {
  let i = 0;
  const n = rtf.length;
  const out = [];

  // Stack: each entry = { skip: boolean }
  // skip = true means we're inside a destination group that should be ignored
  const stack = [{ skip: false }];

  function top() { return stack[stack.length - 1]; }

  while (i < n) {
    const ch = rtf[i];

    if (ch === '{') {
      // New group: inherit skip from parent, may become a destination
      stack.push({ skip: top().skip });
      i++;
      // Check for \* destination marker
      if (rtf[i] === '\\' && rtf[i + 1] === '*') {
        top().skip = true;
        i += 2;
        // skip whitespace after \*
        while (i < n && rtf[i] === ' ') i++;
      }
      continue;
    }

    if (ch === '}') {
      if (stack.length > 1) stack.pop();
      i++;
      continue;
    }

    if (ch === '\\') {
      i++; // consume backslash
      if (i >= n) break;

      const nc = rtf[i];

      // Escaped special chars
      if (nc === '{' || nc === '}' || nc === '\\') {
        if (!top().skip) out.push(nc);
        i++;
        continue;
      }

      // Hex escape \'XX
      if (nc === "'") {
        i++;
        const hex = rtf.slice(i, i + 2);
        i += 2;
        if (!top().skip && /^[0-9a-fA-F]{2}$/.test(hex)) {
          out.push(hexCharW1252(hex));
        }
        continue;
      }

      // Unicode escape \uN
      if (nc === 'u' && i + 1 < n && /\d|-/.test(rtf[i + 1])) {
        i++;
        let numStr = '';
        if (rtf[i] === '-') { numStr = '-'; i++; }
        while (i < n && /\d/.test(rtf[i])) { numStr += rtf[i]; i++; }
        // optional trailing space after the number
        if (rtf[i] === ' ') i++;
        if (!top().skip) {
          let cp = parseInt(numStr, 10);
          if (cp < 0) cp += 65536; // RTF uses signed 16-bit for unicode
          out.push(String.fromCodePoint(cp));
        }
        // Skip the RTF fallback character (one following char or group)
        if (rtf[i] === '{') {
          // skip the whole group
          let depth = 0;
          while (i < n) {
            if (rtf[i] === '{') depth++;
            else if (rtf[i] === '}') { depth--; if (depth === 0) { i++; break; } }
            i++;
          }
        } else {
          i++; // skip single fallback char
        }
        continue;
      }

      // Special non-alpha escapes: \- (soft hyphen), \| (formula char), \: (index subentry)
      if (nc === '-') { i++; continue; } // soft hyphen, ignore
      if (nc === '|' || nc === ':' || nc === ';') { i++; continue; }

      // Newline / CR as control — \<newline> = paragraph break
      if (nc === '\n' || nc === '\r') {
        if (!top().skip) out.push('\n');
        i++;
        continue;
      }

      // Control word: \word or \word-N or \wordN
      if (/[a-zA-Z]/.test(nc)) {
        let word = '';
        while (i < n && /[a-zA-Z]/.test(rtf[i])) { word += rtf[i]; i++; }
        // optional numeric param (may be negative)
        let param = null;
        if (i < n && (rtf[i] === '-' || /\d/.test(rtf[i]))) {
          let ps = '';
          if (rtf[i] === '-') { ps = '-'; i++; }
          while (i < n && /\d/.test(rtf[i])) { ps += rtf[i]; i++; }
          param = parseInt(ps, 10);
        }
        // consume one optional trailing space delimiter
        if (rtf[i] === ' ') i++;

        // Check if this is a skip destination right after { (already handled \*, handle named ones)
        if (SKIP_DESTINATIONS.has(word)) {
          top().skip = true;
          continue;
        }

        if (!top().skip) {
          if (word in CTRL_TEXT) {
            out.push(CTRL_TEXT[word]);
          }
          // \~ non-breaking space (already handled as special char above, but \~ is ctrl word too)
          // Note: \~, \-, \\_ handled in special char block above; word-form redundancy is fine
        }
        continue;
      }

      // Unknown single-char control symbol — skip
      i++;
      continue;
    }

    // Literal character
    if (!top().skip) {
      // skip CR/LF inside RTF (they're formatting, not content)
      if (ch !== '\r' && ch !== '\n') out.push(ch);
    }
    i++;
  }

  // Collapse 3+ consecutive newlines to 2, trim
  return out.join('').replace(/\n{3,}/g, '\n\n').trim();
}

function countWords(text) {
  return (text.match(/\S+/g) || []).length;
}

function countParagraphs(text) {
  // Count runs of newlines as paragraph breaks
  return (text.split(/\n+/).filter((p) => p.trim().length > 0)).length;
}

export async function render(intake, _ctx) {
  const src = intake.text || '';

  if (!src || !src.trimStart().startsWith('{\\rtf')) {
    return {
      bodyHtml: '<div style="font-family:system-ui,sans-serif;padding:2rem;color:#666">Not a valid RTF file.</div>',
      hadUnsafe: false,
    };
  }

  const extracted = extractText(src);
  const words = countWords(extracted);
  const chars = extracted.length;
  const paras = countParagraphs(extracted);

  const bodyHtml = `
<style>
  *,*::before,*::after{box-sizing:border-box}
  body{margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;background:#fff;color:#1a1a1a}
  @media(prefers-color-scheme:dark){body{background:#1e1e1e;color:#e0e0e0}}
  .rtf-wrap{max-width:800px;margin:0 auto;padding:1.5rem 1.5rem 2rem}
  .rtf-banner{display:flex;align-items:flex-start;gap:.75rem;background:#fffbeb;border:1px solid #f59e0b;border-radius:6px;padding:.75rem 1rem;margin-bottom:1.25rem;font-size:13px;line-height:1.5}
  @media(prefers-color-scheme:dark){.rtf-banner{background:#2d2500;border-color:#b45309;color:#fcd34d}}
  .rtf-banner-icon{flex-shrink:0;font-size:16px;line-height:1.4}
  .rtf-banner-text{flex:1}
  .rtf-banner-close{flex-shrink:0;background:none;border:none;cursor:pointer;font-size:16px;line-height:1;padding:0;color:inherit;opacity:.6}
  .rtf-banner-close:hover{opacity:1}
  .rtf-content{white-space:pre-wrap;font-size:14px;line-height:1.6;padding:1.25rem 1.5rem;border:1px solid #e5e7eb;border-radius:6px;background:#fafafa;overflow-x:auto;word-break:break-word}
  @media(prefers-color-scheme:dark){.rtf-content{background:#252525;border-color:#3a3a3a}}
  .rtf-empty{padding:2rem;text-align:center;color:#999;font-style:italic;border:1px solid #e5e7eb;border-radius:6px}
  @media(prefers-color-scheme:dark){.rtf-empty{border-color:#3a3a3a;color:#666}}
  .rtf-footer{margin-top:.75rem;font-size:12px;color:#888;display:flex;gap:1.5rem;flex-wrap:wrap}
  @media(prefers-color-scheme:dark){.rtf-footer{color:#555}}
  .rtf-stat-label{color:#aaa}
  @media(prefers-color-scheme:dark){.rtf-stat-label{color:#444}}
</style>
<div class="rtf-wrap">
  <div class="rtf-banner" id="rtf-banner">
    <span class="rtf-banner-icon">&#9888;</span>
    <span class="rtf-banner-text">RTF is partially supported &mdash; text content extracted; formatting, images, and tables are not rendered.</span>
    <button class="rtf-banner-close" onclick="document.getElementById('rtf-banner').remove()" title="Dismiss" aria-label="Dismiss">&times;</button>
  </div>
  ${extracted.length < 10
    ? '<div class="rtf-empty">No readable text found in this RTF file.</div>'
    : `<pre class="rtf-content">${esc(extracted)}</pre>
  <div class="rtf-footer">
    <span><span class="rtf-stat-label">Words: </span>${words.toLocaleString()}</span>
    <span><span class="rtf-stat-label">Characters: </span>${chars.toLocaleString()}</span>
    <span><span class="rtf-stat-label">Paragraphs: </span>${paras.toLocaleString()}</span>
  </div>`
  }
</div>`;

  return { bodyHtml, hadUnsafe: false };
}
