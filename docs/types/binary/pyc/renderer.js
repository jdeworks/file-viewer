function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function readU32le(b, off) {
  return (b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24)) >>> 0;
}

function getPythonVersion(magic) {
  if (magic >= 62061 && magic <= 62211) return '2.7';
  if (magic >= 50700 && magic <= 50823) return '2.6';
  if (magic >= 20115 && magic <= 23012) return '2.0–2.5';
  if (magic >= 3571) return '3.13+';
  if (magic >= 3530) return '3.12';
  if (magic >= 3450) return '3.11';
  if (magic >= 3430) return '3.10';
  if (magic >= 3420) return '3.9';
  if (magic >= 3401) return '3.8';
  if (magic >= 3390) return '3.7';
  if (magic >= 3360) return '3.6';
  if (magic >= 3310) return '3.5';
  if (magic >= 3250) return '3.4';
  if (magic >= 3190) return '3.3';
  if (magic >= 3151) return '3.2';
  if (magic >= 3131) return '3.1';
  if (magic >= 3000) return '3.0';
  return `unknown (magic ${magic})`;
}

export function render(intake) {
  const b = intake.bytes;
  if (!b || b.length < 16) {
    return { bodyHtml: '<p class="viewer-message">File too small for a .pyc header.</p>', hadUnsafe: false };
  }
  if (b[2] !== 0x0d || b[3] !== 0x0a) {
    return { bodyHtml: '<p class="viewer-message">Not a valid Python bytecode file.</p>', hadUnsafe: false };
  }

  const magic = b[0] | (b[1] << 8);
  const pyVersion = getPythonVersion(magic);
  const py3x = magic >= 3000 && magic <= 3600;
  // PEP 552 (hash-based .pyc files) landed in Python 3.7 (magic 3390+): from
  // that version on, the header always carries a 4-byte bit field after the
  // magic number, replacing the plain timestamp/size layout used by 3.0-3.6.
  const py37plus = magic >= 3390 && magic <= 3600;

  let srcTimestamp = null;
  let srcSize = null;
  let isHashBased = false;

  if (py37plus) {
    const bitField = readU32le(b, 4);
    isHashBased = (bitField & 1) === 1;
    if (!isHashBased) {
      srcTimestamp = readU32le(b, 8);
      srcSize = readU32le(b, 12);
    }
  } else if (py3x) {
    srcTimestamp = readU32le(b, 4);
    if (magic >= 3190) srcSize = readU32le(b, 8);
  }

  const rows = [
    ['Format', 'Python Bytecode'],
    ['Python version', pyVersion],
    ['Magic number', `${magic} (0x${magic.toString(16).padStart(4, '0')})`],
    isHashBased ? ['Validation', 'Hash-based (source hash, not timestamp)'] : null,
    srcTimestamp != null ? ['Source timestamp', new Date(srcTimestamp * 1000).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'] : null,
    srcSize != null ? ['Source size', `${srcSize.toLocaleString()} bytes`] : null,
    ['Bytecode size', `${b.length.toLocaleString()} bytes`],
  ].filter(Boolean).map(([k, v]) =>
    `<div class="meta-row"><span class="meta-key">${esc(k)}</span><span class="meta-val">${esc(v)}</span></div>`
  ).join('');

  return {
    bodyHtml: `
      <style>.badge-pyc { background: #1565c0; color: #fff; }</style>
      <div class="badge-row"><span class="badge badge-pyc">PYC</span></div>
      <div class="meta-section">
        <h4 class="meta-section-title">Bytecode Info</h4>
        ${rows}
      </div>
      <div class="meta-section">
        <h4 class="meta-section-title">About this format</h4>
        <p style="font-size:0.85rem;line-height:1.6;margin:0">
          Python bytecode (.pyc) is the compiled form of a Python source file, cached by the
          interpreter for faster loading. The magic number encodes the Python version.
          Use <code>dis</code> (stdlib) or <strong>uncompyle6</strong> / <strong>decompile3</strong>
          to disassemble or decompile.
        </p>
      </div>`,
    hadUnsafe: false,
  };
}
