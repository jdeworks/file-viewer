function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function fmtBytes(n) {
  if (typeof n !== 'number' || n < 0) return '—';
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB';
  return (n / 1073741824).toFixed(2) + ' GB';
}

// Map JVM major version to Java release name.
function javaVersion(major) {
  if (major < 45) return 'Pre-Java 1';
  if (major === 45) return 'Java 1';
  if (major === 46) return 'Java 2';
  if (major === 47) return 'Java 3';
  if (major === 48) return 'Java 4';
  if (major === 49) return 'Java 5';
  if (major === 50) return 'Java 6';
  if (major === 51) return 'Java 7';
  if (major === 52) return 'Java 8';
  if (major === 53) return 'Java 9';
  if (major === 54) return 'Java 10';
  if (major === 55) return 'Java 11';
  if (major === 56) return 'Java 12';
  if (major === 57) return 'Java 13';
  if (major === 58) return 'Java 14';
  if (major === 59) return 'Java 15';
  if (major === 60) return 'Java 16';
  if (major === 61) return 'Java 17';
  if (major === 62) return 'Java 18';
  if (major === 63) return 'Java 19';
  if (major === 64) return 'Java 20';
  if (major === 65) return 'Java 21';
  if (major === 66) return 'Java 22';
  if (major === 67) return 'Java 23';
  if (major === 68) return 'Java 24';
  return `Java ${major - 44} (major ${major})`;
}

// Walk the constant pool starting at byte 8.
function parseConstantPool(b) {
  if (b.length < 10) return null;
  const cpCount = (b[8] << 8) | b[9];
  if (cpCount < 1) return null;
  const utf8 = new Map();
  const classes = [];
  let off = 10;
  let i = 1;
  while (i < cpCount) {
    if (off >= b.length) return null;
    const tag = b[off++];
    switch (tag) {
      case 1: { // Utf8
        if (off + 2 > b.length) return null;
        const len = (b[off] << 8) | b[off + 1];
        off += 2;
        if (off + len > b.length) return null;
        try {
          const str = new TextDecoder('utf-8', { fatal: false }).decode(b.slice(off, off + len));
          utf8.set(i, str);
        } catch { /* skip */ }
        off += len;
        i += 1;
        break;
      }
      case 3: case 4: off += 4; i += 1; break;
      case 5: case 6: off += 8; i += 2; break;
      case 7:
        if (off + 2 > b.length) return null;
        classes.push({ index: i, nameIndex: (b[off] << 8) | b[off + 1] });
        off += 2; i += 1; break;
      case 8: off += 2; i += 1; break;
      case 9: case 10: case 11: case 12: off += 4; i += 1; break;
      case 15: off += 3; i += 1; break;
      case 16: off += 2; i += 1; break;
      case 17: case 18: off += 4; i += 1; break;
      case 19: case 20: off += 2; i += 1; break;
      default:
        return { utf8, classes, cpCount, error: `Unknown CP tag ${tag} at offset ${off - 1}` };
    }
  }
  return { utf8, classes, cpCount, error: null };
}

const STYLE = `
body {
  font-family: system-ui, -apple-system, sans-serif;
  color: var(--fg, #1a1a1a);
  background: var(--bg, #f8f8f8);
  margin: 0;
  padding: 20px 16px;
  font-size: 13px;
  line-height: 1.5;
}
.card {
  background: var(--panel, #fff);
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 8px;
  padding: 20px;
  max-width: 560px;
}
.magic-badge {
  display: inline-block;
  font-family: monospace;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--fg, #1a1a1a);
  background: var(--badge-bg, #f0f0f0);
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 4px;
  padding: 3px 10px;
  margin-bottom: 16px;
}
.class-name {
  font-family: monospace;
  font-size: 17px;
  font-weight: 600;
  word-break: break-all;
  margin-bottom: 4px;
  color: var(--fg, #1a1a1a);
}
.class-name-package {
  color: var(--fg2, #666);
  font-weight: 400;
}
.unknown {
  font-size: 15px;
  font-style: italic;
  color: var(--fg2, #888);
  margin-bottom: 4px;
}
dl {
  margin: 16px 0 0;
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 4px 12px;
}
dt {
  color: var(--fg2, #666);
  font-size: 12px;
  font-weight: 500;
  padding-top: 2px;
}
dd {
  margin: 0;
  word-break: break-word;
}
.error-box {
  margin-top: 12px;
  padding: 8px 12px;
  background: var(--err-bg, #fff3f3);
  border: 1px solid var(--err-border, #f5c6c6);
  border-radius: 4px;
  color: var(--err-fg, #b00020);
  font-size: 12px;
}
`;

export function render(intake) {
  const b = intake.bytes;

  // Guard: need at least 8 bytes for magic + version
  if (!b || b.length < 8) {
    const html = `<style>${STYLE}</style><div class="card">` +
      `<span class="magic-badge">CA FE BA BE</span>` +
      `<div class="error-box">File too small to be a valid Java class file (${b ? b.length : 0} bytes).</div>` +
      `</div>`;
    return { bodyHtml: html, hadUnsafe: false };
  }

  const minor = (b[4] << 8) | b[5];
  const major = (b[6] << 8) | b[7];
  const jv = javaVersion(major);

  const cp = parseConstantPool(b);

  let className = null;
  let cpCount = null;
  let parseError = null;

  if (cp) {
    cpCount = cp.cpCount - 1;
    if (cp.error) parseError = cp.error;
    for (const cls of cp.classes) {
      const name = cp.utf8.get(cls.nameIndex);
      if (name) { className = name; break; }
    }
  } else {
    parseError = 'Constant pool is truncated or malformed.';
  }

  // Format class name: split package from simple name
  let classNameHtml = '';
  if (className) {
    const parts = className.split('/');
    const simple = parts.pop();
    const pkg = parts.join('.');
    classNameHtml = pkg
      ? `<div class="class-name"><span class="class-name-package">${esc(pkg)}.</span>${esc(simple)}</div>`
      : `<div class="class-name">${esc(simple)}</div>`;
  } else {
    classNameHtml = `<div class="unknown">Unknown class</div>`;
  }

  let html = `<style>${STYLE}</style><div class="card">`;
  html += `<span class="magic-badge">CA FE BA BE</span>`;
  html += classNameHtml;
  html += `<dl>`;
  html += `<dt>Java version</dt><dd>${esc(jv)} (major: ${esc(String(major))}, minor: ${esc(String(minor))})</dd>`;
  html += `<dt>File size</dt><dd>${esc(fmtBytes(intake.size))}</dd>`;
  if (cpCount !== null) {
    html += `<dt>Constant pool</dt><dd>${esc(String(cpCount))} entries</dd>`;
  }
  html += `</dl>`;

  if (parseError) {
    html += `<div class="error-box">Parse note: ${esc(parseError)}</div>`;
  }

  html += `</div>`;
  return { bodyHtml: html, hadUnsafe: false };
}
