const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.nix-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.nix-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#5277C3;color:#fff;vertical-align:middle;margin-right:8px}
.nix-title{font-size:18px;font-weight:700;margin:0 0 4px}
.nix-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.nix-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}
.nix-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px}
.nix-card strong{display:block;font-size:1.2rem;font-weight:700}
.nix-card span{font-size:.8rem;color:var(--fg-2,#5a6678)}
.nix-section{margin:16px 0;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden}
.nix-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0)}
.nix-attrs{padding:8px 14px;display:flex;flex-wrap:wrap;gap:6px}
.nix-attr{font:12px/1.4 ui-monospace,monospace;background:var(--bg-2,#f0f4fa);border-radius:4px;padding:2px 8px;color:var(--fg,#24292f)}
.nix-kind-badge{display:inline-block;background:#e8f3ff;color:#1a5fb4;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600;margin-bottom:8px}
.nix-pre{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:14px 16px;overflow:auto;font:12px/1.6 ui-monospace,monospace;white-space:pre;tab-size:2;margin:16px 0}
`;

const NIX_KEYWORDS = ['let', 'in', 'rec', 'with', 'inherit', 'if', 'then', 'else', 'assert', 'or', 'and', 'null', 'true', 'false'];

function detectKind(text, filename) {
  const fn = (filename || '').split('/').pop().toLowerCase();
  if (fn === 'flake.nix' || /outputs\s*=/.test(text) && /inputs\s*=/.test(text)) return 'Flake';
  if (fn === 'shell.nix' || /mkShell/.test(text) || /buildInputs/.test(text)) return 'Development shell';
  if (fn === 'home.nix' || /home\.username/.test(text) || /home-manager/.test(text)) return 'Home Manager config';
  if (fn === 'configuration.nix' || /networking\.hostName/.test(text) || /services\.[a-z]/.test(text)) return 'NixOS module';
  if (/stdenv\.mkDerivation/.test(text) || /buildPythonPackage/.test(text) || /mkDerivation/.test(text)) return 'Package derivation';
  return 'Nix expression';
}

function extractTopLevelAttrs(text) {
  // Match top-level attribute names: lines starting with optional whitespace + identifier + =
  // Simplified: match attrs at depth 0 (approximate)
  const attrs = [];
  const re = /^\s{0,2}([a-zA-Z_][a-zA-Z0-9_'-]*)\s*=/gm;
  let m;
  const seen = new Set();
  while ((m = re.exec(text)) !== null) {
    const name = m[1];
    if (!seen.has(name) && !NIX_KEYWORDS.includes(name)) {
      seen.add(name);
      attrs.push(name);
    }
  }
  return attrs.slice(0, 30);
}

function countInputs(text) {
  // Count inputs in flake or import statements
  const flakeInputMatch = text.match(/inputs\s*=\s*\{([^}]+)\}/s);
  if (flakeInputMatch) {
    return [...flakeInputMatch[1].matchAll(/^\s*([a-zA-Z_][a-zA-Z0-9_-]*)\s*=/gm)].length;
  }
  return (text.match(/import\s+/g) || []).length;
}

function highlight(text) {
  const escaped = esc(text);
  // Apply keyword highlighting (using word boundaries via regex on escaped text)
  const kwRe = new RegExp(`\\b(${NIX_KEYWORDS.join('|')})\\b`, 'g');
  return escaped
    .replace(/(#[^\n]*)/g, '<span style="color:#6e7781;font-style:italic">$1</span>')
    .replace(/("(?:[^"\\]|\\.)*")/g, '<span style="color:#0a7d27">$1</span>')
    .replace(/(\${)/g, '<span style="color:#953800">$1</span>')
    .replace(kwRe, '<span style="color:#8250df">$1</span>')
    .replace(/\b(builtins\.[a-zA-Z]+)/g, '<span style="color:#1a5fb4">$1</span>')
    .replace(/(\b\d+(\.\d+)?\b)/g, '<span style="color:#0550ae">$1</span>');
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const filename = intake.name || intake.filename || '';

  const kind = detectKind(text, filename);
  const topAttrs = extractTopLevelAttrs(text);
  const inputCount = countInputs(text);

  const host = document.createElement('div');
  host.className = 'nix-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  // Title
  const title = document.createElement('div');
  title.className = 'nix-title';
  const badge = document.createElement('span');
  badge.className = 'nix-badge';
  badge.textContent = 'nix';
  title.appendChild(badge);
  title.appendChild(document.createTextNode('Expression'));
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'nix-sub';
  const subParts = [`${kind}`];
  if (topAttrs.length) subParts.push(`${topAttrs.length} top-level attr${topAttrs.length !== 1 ? 's' : ''}`);
  if (inputCount) subParts.push(`${inputCount} import${inputCount !== 1 ? 's' : ''}`);
  sub.textContent = subParts.join(' · ');
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'nix-summary';
  const cardData = [
    { value: topAttrs.length, label: 'Attributes' },
    { value: inputCount, label: 'Imports' },
  ];
  for (const { value, label } of cardData) {
    const card = document.createElement('div');
    card.className = 'nix-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Kind section
  const kindSec = document.createElement('div');
  kindSec.className = 'nix-section';
  const kindHd = document.createElement('div');
  kindHd.className = 'nix-section-hd';
  kindHd.textContent = 'Detected kind';
  kindSec.appendChild(kindHd);
  const kindBody = document.createElement('div');
  kindBody.style.cssText = 'padding:10px 14px';
  const kindBadge = document.createElement('span');
  kindBadge.className = 'nix-kind-badge';
  kindBadge.textContent = kind;
  kindBody.appendChild(kindBadge);
  kindSec.appendChild(kindBody);
  host.appendChild(kindSec);

  // Top-level attributes
  if (topAttrs.length) {
    const sec = document.createElement('div');
    sec.className = 'nix-section';
    const hd = document.createElement('div');
    hd.className = 'nix-section-hd';
    hd.textContent = `Top-level attributes (${topAttrs.length})`;
    sec.appendChild(hd);
    const attrsEl = document.createElement('div');
    attrsEl.className = 'nix-attrs';
    for (const attr of topAttrs) {
      const span = document.createElement('span');
      span.className = 'nix-attr';
      span.textContent = attr;
      attrsEl.appendChild(span);
    }
    sec.appendChild(attrsEl);
    host.appendChild(sec);
  }

  // Syntax-highlighted source
  const preHd = document.createElement('div');
  preHd.style.cssText = 'font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:16px 0 6px';
  preHd.textContent = 'Source';
  host.appendChild(preHd);
  const pre = document.createElement('pre');
  pre.className = 'nix-pre';
  pre.innerHTML = highlight(text);
  host.appendChild(pre);

  return { parentNode: host };
}
