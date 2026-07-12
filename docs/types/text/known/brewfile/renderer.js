import { describeCollectionCap } from '../../../../core/collection-cap.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.brewfile-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-brew{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#FBB040;color:#3e2000;vertical-align:middle;margin-right:8px;}
.brew-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.brew-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.brew-sec{margin:14px 0;}
.brew-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;display:flex;align-items:center;gap:6px;}
.brew-count{font-size:11px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:0 6px;color:var(--fg-2,#888);}
.brew-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:3px;}
.brew-item{display:flex;align-items:baseline;gap:6px;font-size:13px;padding:3px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.brew-item:last-child{border-bottom:none;}
.brew-name{font-family:ui-monospace,monospace;font-size:12px;}
.brew-args{font-size:11px;color:var(--fg-2,#888);font-family:ui-monospace,monospace;}
.brew-tag{display:inline-block;font-size:10px;padding:1px 6px;border-radius:6px;background:#fff3e0;border:1px solid #FBB040;color:#7c5200;font-weight:600;}
.brew-id{font-size:11px;color:var(--fg-2,#888);}
.brew-chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px;}
.brew-chip{font-size:11px;padding:2px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);color:var(--fg-2,#888);}
`;

function parseBrewfile(text) {
  const lines = text.split(/\r?\n/);
  const taps = [], formulas = [], casks = [], mas = [], vscode = [];
  for (const raw of lines) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    let m;
    // tap "homebrew/cask"
    if ((m = line.match(/^tap\s+["']([^"']+)["']/))) {
      taps.push(m[1]);
      continue;
    }
    // brew "git" or brew "git", args: ["--with-doc"]
    if ((m = line.match(/^brew\s+["']([^"']+)["'](.*)/))) {
      const name = m[1];
      const rest = m[2];
      const argsMatch = rest.match(/args:\s*\[([^\]]*)\]/);
      const args = argsMatch
        ? argsMatch[1].replace(/["']/g, '').split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      formulas.push({ name, args });
      continue;
    }
    // cask "visual-studio-code"
    if ((m = line.match(/^cask\s+["']([^"']+)["']/))) {
      casks.push(m[1]);
      continue;
    }
    // mas "Xcode", id: 497799835
    if ((m = line.match(/^mas\s+["']([^"']+)["'],\s*id:\s*(\d+)/))) {
      mas.push({ name: m[1], id: m[2] });
      continue;
    }
    // vscode "ms-python.python"
    if ((m = line.match(/^vscode\s+["']([^"']+)["']/))) {
      vscode.push(m[1]);
      continue;
    }
  }
  return { taps, formulas, casks, mas, vscode };
}

function section(title, count, html) {
  return `<div class="brew-sec"><h3>${esc(title)} <span class="brew-count">${count}</span></h3>${html}</div>`;
}

export function render(intake) {
  const { taps, formulas, casks, mas, vscode } = parseBrewfile(intake.text || '');
  const parts = [];

  const displayTaps = taps.slice(0, 8);
  const displayFormulas = formulas.slice(0, 30);
  const displayCasks = casks.slice(0, 20);
  const displayMas = mas.slice(0, 10);
  const displayVscode = vscode.slice(0, 10);
  const tapCap = describeCollectionCap(taps, displayTaps);
  const formulaCap = describeCollectionCap(formulas, displayFormulas);
  const caskCap = describeCollectionCap(casks, displayCasks);
  const masCap = describeCollectionCap(mas, displayMas);
  const vscodeCap = describeCollectionCap(vscode, displayVscode);

  if (displayTaps.length) {
    const rows = displayTaps.map((t) => `<li class="brew-item"><span class="brew-name">${esc(t)}</span></li>`).join('');
    parts.push(section('Taps', tapCap.label, `<ul class="brew-list">${rows}</ul>`));
  }
  if (displayFormulas.length) {
    const rows = displayFormulas.map((f) => {
      const args = f.args.length ? `<span class="brew-args">${esc(f.args.join(' '))}</span>` : '';
      return `<li class="brew-item"><span class="brew-name">${esc(f.name)}</span>${args}</li>`;
    }).join('');
    parts.push(section('Formulae', formulaCap.label, `<ul class="brew-list">${rows}</ul>`));
  }
  if (displayCasks.length) {
    const rows = displayCasks.map((c) => `<li class="brew-item"><span class="brew-name">${esc(c)}</span><span class="brew-tag">cask</span></li>`).join('');
    parts.push(section('Casks', caskCap.label, `<ul class="brew-list">${rows}</ul>`));
  }
  if (displayMas.length) {
    const rows = displayMas.map((a) => `<li class="brew-item"><span class="brew-name">${esc(a.name)}</span><span class="brew-id">id: ${esc(a.id)}</span></li>`).join('');
    parts.push(section('Mac App Store', masCap.label, `<ul class="brew-list">${rows}</ul>`));
  }
  if (displayVscode.length) {
    const rows = displayVscode.map((e) => `<li class="brew-item"><span class="brew-name">${esc(e)}</span></li>`).join('');
    parts.push(section('VS Code Extensions', vscodeCap.label, `<ul class="brew-list">${rows}</ul>`));
  }

  const chipParts = [
    taps.length && `${taps.length} tap${taps.length !== 1 ? 's' : ''}`,
    formulas.length && `${formulas.length} formulae`,
    casks.length && `${casks.length} cask${casks.length !== 1 ? 's' : ''}`,
    mas.length && `${mas.length} MAS app${mas.length !== 1 ? 's' : ''}`,
    vscode.length && `${vscode.length} VS Code ext${vscode.length !== 1 ? 's' : ''}`,
  ].filter(Boolean);

  const chipsHtml = chipParts.length
    ? `<div class="brew-chips">${chipParts.map((c) => `<span class="brew-chip">${esc(c)}</span>`).join('')}</div>`
    : '';

  const host = document.createElement('div');
  host.className = 'brewfile-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="brew-title"><span class="badge-brew">Homebrew</span>Brewfile</div>
${chipsHtml}
${parts.join('') || '<p style="color:var(--fg-2,#888);font-size:13px;">No Homebrew entries found.</p>'}`;
  return { parentNode: host };
}
