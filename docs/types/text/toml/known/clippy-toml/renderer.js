import { parseTOML } from '../../toml.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.clippy-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.clippy-header{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:2px;}
.clippy-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f74c00;color:#fff;vertical-align:middle;margin-right:4px;}
.clippy-title{font-size:18px;font-weight:700;}
.clippy-subtitle{font-size:12px;color:var(--fg-2,#888);margin:2px 0 10px;}
.clippy-meta{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 12px;}
.clippy-chip{display:inline-block;font-size:12px;padding:2px 9px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.clippy-chip.msrv{background:#fff3e0;border-color:#ffb74d;color:#7a3000;font-weight:700;font-size:13px;}
.clippy-sec{margin:14px 0;}
.clippy-sec h3{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-2,#888);margin:0 0 7px;}
.clippy-pills{display:flex;flex-wrap:wrap;gap:5px;}
.clippy-pill{font-size:12px;padding:2px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.clippy-pill.allow{background:#f0fdf4;border-color:#bbf7d0;color:#166534;}
.clippy-pill.deny{background:#fef2f2;border-color:#fecaca;color:#991b1b;}
.clippy-pill.ident{background:#eff6ff;border-color:#bfdbfe;color:#1e3a5f;}
`;

function boolPill(label, val, allowIsGreen) {
  if (val == null) return '';
  const on = val === true || val === 'true';
  const cls = allowIsGreen ? (on ? 'allow' : 'deny') : (on ? 'allow' : 'deny');
  return `<span class="clippy-pill ${cls}">${esc(label)}: ${on ? 'true' : 'false'}</span>`;
}

export function render(intake) {
  let cfg = {};
  try { cfg = parseTOML(intake.text || '') || {}; } catch { cfg = {}; }

  const msrv = cfg['msrv'];
  const cogComplexity = cfg['cognitive-complexity-threshold'];
  const typeComplexity = cfg['type-complexity-threshold'];
  const tooManyArgs = cfg['too-many-arguments-threshold'];
  const tooManyLines = cfg['too-many-lines-threshold'];
  const tooLargeStack = cfg['too-large-for-stack'];
  const passByValue = cfg['pass-by-value-size-limit'];
  const enumVariant = cfg['enum-variant-size-threshold'];
  const trivialCopy = cfg['trivial-copy-size-limit'];
  const docValidIdents = cfg['doc-valid-idents'];
  const disallowedNames = cfg['disallowed-names'];
  const allowDbg = cfg['allow-dbg-in-tests'];
  const allowPrint = cfg['allow-print-in-tests'];
  const allowUnwrap = cfg['allow-unwrap-in-tests'];
  const allowExpect = cfg['allow-expect-in-tests'];
  const allowPanic = cfg['allow-panic-in-tests'];

  const hasComplexity = cogComplexity != null || typeComplexity != null || tooManyArgs != null || tooManyLines != null;
  const hasSizes = tooLargeStack != null || passByValue != null || enumVariant != null || trivialCopy != null;
  const hasTestAllowances = allowDbg != null || allowPrint != null || allowUnwrap != null || allowExpect != null || allowPanic != null;
  const hasIdents = Array.isArray(docValidIdents) && docValidIdents.length > 0;
  const hasDisallowed = Array.isArray(disallowedNames) && disallowedNames.length > 0;

  const host = document.createElement('div');
  host.className = 'clippy-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="clippy-header">
  <span class="clippy-badge">Clippy</span>
  <span class="clippy-title">clippy.toml</span>
</div>
<div class="clippy-subtitle">Rust linter configuration</div>
<div class="clippy-meta">
  ${msrv != null ? `<span class="clippy-chip msrv">MSRV ${esc(msrv)}</span>` : ''}
</div>

${hasComplexity ? `<div class="clippy-sec"><h3>Complexity Thresholds</h3><div class="clippy-pills">
  ${cogComplexity != null ? `<span class="clippy-pill">cognitive-complexity: ${esc(cogComplexity)}</span>` : ''}
  ${typeComplexity != null ? `<span class="clippy-pill">type-complexity: ${esc(typeComplexity)}</span>` : ''}
  ${tooManyArgs != null ? `<span class="clippy-pill">too-many-arguments: ${esc(tooManyArgs)}</span>` : ''}
  ${tooManyLines != null ? `<span class="clippy-pill">too-many-lines: ${esc(tooManyLines)}</span>` : ''}
</div></div>` : ''}

${hasSizes ? `<div class="clippy-sec"><h3>Size Limits</h3><div class="clippy-pills">
  ${tooLargeStack != null ? `<span class="clippy-pill">too-large-for-stack: ${esc(tooLargeStack)}</span>` : ''}
  ${passByValue != null ? `<span class="clippy-pill">pass-by-value-size-limit: ${esc(passByValue)}</span>` : ''}
  ${enumVariant != null ? `<span class="clippy-pill">enum-variant-size: ${esc(enumVariant)}</span>` : ''}
  ${trivialCopy != null ? `<span class="clippy-pill">trivial-copy-size: ${esc(trivialCopy)}</span>` : ''}
</div></div>` : ''}

${hasTestAllowances ? `<div class="clippy-sec"><h3>Test Allowances</h3><div class="clippy-pills">
  ${allowDbg != null ? boolPill('allow-dbg-in-tests', allowDbg, true) : ''}
  ${allowPrint != null ? boolPill('allow-print-in-tests', allowPrint, true) : ''}
  ${allowUnwrap != null ? boolPill('allow-unwrap-in-tests', allowUnwrap, true) : ''}
  ${allowExpect != null ? boolPill('allow-expect-in-tests', allowExpect, true) : ''}
  ${allowPanic != null ? boolPill('allow-panic-in-tests', allowPanic, true) : ''}
</div></div>` : ''}

${hasIdents ? `<div class="clippy-sec"><h3>Valid Identifiers (${docValidIdents.length})</h3><div class="clippy-pills">
  ${docValidIdents.map(i => `<span class="clippy-pill ident">${esc(i)}</span>`).join('')}
</div></div>` : ''}

${hasDisallowed ? `<div class="clippy-sec"><h3>Disallowed Names</h3><div class="clippy-pills">
  ${disallowedNames.map(n => `<span class="clippy-pill deny">${esc(n)}</span>`).join('')}
</div></div>` : ''}`;

  return { parentNode: host };
}
