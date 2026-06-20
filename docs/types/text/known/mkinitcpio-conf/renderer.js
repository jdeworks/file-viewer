const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.mki-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.mki-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1d4ed8;color:#fff;vertical-align:middle;margin-right:8px;}
.mki-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.mki-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.mki-section{margin:16px 0;}
.mki-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.mki-pills{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:4px;}
.mki-pill{display:inline-block;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;background:var(--bg-2,#e8f0fe);color:#1e40af;font-family:ui-monospace,monospace;}
.mki-pill.amber{background:#fef3c7;color:#92400e;}
.mki-pill.green{background:#d1fae5;color:#065f46;}
.mki-pill.empty{color:var(--fg-2,#888);font-style:italic;font-family:system-ui,sans-serif;font-size:12px;background:none;padding:0;}
.mki-kv{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:8px 14px;font-family:ui-monospace,monospace;font-size:13px;margin-bottom:4px;}
.mki-kv span{color:var(--fg-2,#888);font-size:11px;font-family:system-ui,sans-serif;}
`;

// Hooks that deserve a call-out (security/storage related)
const NOTABLE_HOOKS = new Set(['encrypt', 'sd-encrypt', 'lvm2', 'mdadm_udev', 'btrfs', 'resume', 'systemd', 'openswap']);

function parseBashArray(val) {
  // val is the string after HOOKS=, e.g. (base udev autodetect ...)
  const m = val.match(/\(([^)]*)\)/);
  if (!m) return [];
  return m[1].trim().split(/\s+/).filter(Boolean);
}

function parseMkinitcpio(text) {
  const result = { MODULES: [], BINARIES: [], FILES: [], HOOKS: [], COMPRESSION: null };
  for (const rawLine of (text || '').split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const m = line.match(/^(MODULES|BINARIES|FILES|HOOKS)\s*=\s*(.*)$/);
    if (m) { result[m[1]] = parseBashArray(m[2]); continue; }
    const c = line.match(/^COMPRESSION\s*=\s*"?([^"]+)"?$/);
    if (c) result.COMPRESSION = c[1].trim();
  }
  return result;
}

export function render(intake) {
  const cfg = parseMkinitcpio(intake.text || '');

  const host = document.createElement('div');
  host.className = 'mki-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const title = document.createElement('div');
  title.className = 'mki-title';
  title.innerHTML = '<span class="mki-badge">mkinitcpio.conf</span>Initramfs Configuration';
  host.appendChild(title);

  const parts = [];
  if (cfg.MODULES.length) parts.push(`${cfg.MODULES.length} module${cfg.MODULES.length !== 1 ? 's' : ''}`);
  if (cfg.HOOKS.length) parts.push(`${cfg.HOOKS.length} hook${cfg.HOOKS.length !== 1 ? 's' : ''}`);
  if (cfg.COMPRESSION) parts.push(`compression: ${cfg.COMPRESSION}`);

  const sub = document.createElement('div');
  sub.className = 'mki-sub';
  sub.textContent = parts.length ? parts.join(' · ') : 'Arch Linux initramfs generator config';
  host.appendChild(sub);

  // HOOKS
  {
    const sec = document.createElement('div');
    sec.className = 'mki-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'HOOKS';
    sec.appendChild(h3);
    const pills = document.createElement('div');
    pills.className = 'mki-pills';
    if (cfg.HOOKS.length === 0) {
      const p = document.createElement('span');
      p.className = 'mki-pill empty';
      p.textContent = '(empty)';
      pills.appendChild(p);
    } else {
      for (const hook of cfg.HOOKS) {
        const p = document.createElement('span');
        p.className = 'mki-pill' + (NOTABLE_HOOKS.has(hook) ? ' amber' : '');
        p.textContent = hook;
        pills.appendChild(p);
      }
    }
    sec.appendChild(pills);
    const notable = cfg.HOOKS.filter((h) => NOTABLE_HOOKS.has(h));
    if (notable.length > 0) {
      const note = document.createElement('div');
      note.style.cssText = 'font-size:12px;color:var(--fg-2,#555);margin-top:4px;';
      note.textContent = `Notable hooks: ${notable.join(', ')}`;
      sec.appendChild(note);
    }
    host.appendChild(sec);
  }

  // MODULES
  {
    const sec = document.createElement('div');
    sec.className = 'mki-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'MODULES';
    sec.appendChild(h3);
    const pills = document.createElement('div');
    pills.className = 'mki-pills';
    if (cfg.MODULES.length === 0) {
      const p = document.createElement('span');
      p.className = 'mki-pill empty';
      p.textContent = '(empty)';
      pills.appendChild(p);
    } else {
      for (const mod of cfg.MODULES) {
        const p = document.createElement('span');
        p.className = 'mki-pill green';
        p.textContent = mod;
        pills.appendChild(p);
      }
    }
    sec.appendChild(pills);
    host.appendChild(sec);
  }

  // BINARIES
  if (cfg.BINARIES.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'mki-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'BINARIES';
    sec.appendChild(h3);
    const pills = document.createElement('div');
    pills.className = 'mki-pills';
    for (const b of cfg.BINARIES) {
      const p = document.createElement('span');
      p.className = 'mki-pill';
      p.textContent = b;
      pills.appendChild(p);
    }
    sec.appendChild(pills);
    host.appendChild(sec);
  }

  // FILES
  if (cfg.FILES.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'mki-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'FILES';
    sec.appendChild(h3);
    const pills = document.createElement('div');
    pills.className = 'mki-pills';
    for (const f of cfg.FILES) {
      const p = document.createElement('span');
      p.className = 'mki-pill';
      p.textContent = f;
      pills.appendChild(p);
    }
    sec.appendChild(pills);
    host.appendChild(sec);
  }

  // COMPRESSION
  if (cfg.COMPRESSION) {
    const sec = document.createElement('div');
    sec.className = 'mki-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'COMPRESSION';
    sec.appendChild(h3);
    const kv = document.createElement('div');
    kv.className = 'mki-kv';
    kv.innerHTML = `${esc(cfg.COMPRESSION)} <span>compression algorithm</span>`;
    sec.appendChild(kv);
    host.appendChild(sec);
  }

  return { parentNode: host };
}
