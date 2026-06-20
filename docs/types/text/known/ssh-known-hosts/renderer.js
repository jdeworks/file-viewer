const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.skh-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-skh{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a7f37;color:#fff;vertical-align:middle;margin-right:8px;}
.skh-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.skh-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.skh-sec{margin:14px 0;}
.skh-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.skh-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.skh-pills{display:flex;flex-wrap:wrap;gap:6px;margin:2px 0;}
.skh-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.skh-pill.ed25519{background:#dcfce7;border-color:#86efac;color:#166534;}
.skh-pill.ecdsa{background:#e0f2fe;border-color:#7dd3fc;color:#075985;}
.skh-pill.rsa{background:#fef9c3;border-color:#fde047;color:#713f12;}
.skh-pill.hashed{background:#fdf4ff;border-color:#e9d5ff;color:#6b21a8;}
.skh-entry{padding:6px 0;border-top:1px solid var(--border,#e0e0e0);font-size:12px;display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;}
.skh-entry:first-child{border-top:none;}
.skh-host{font-family:ui-monospace,monospace;font-weight:600;color:var(--fg,#24292f);word-break:break-all;min-width:160px;}
.skh-keytype{font-family:ui-monospace,monospace;color:var(--fg-2,#888);min-width:120px;}
.skh-fingerprint{font-family:ui-monospace,monospace;color:var(--fg-2,#888);word-break:break-all;font-size:11px;}
.skh-hashed-host{color:#9b59b6;font-style:italic;}
`;

const KEY_ALIASES = {
  'ssh-ed25519': 'ed25519',
  'sk-ssh-ed25519@openssh.com': 'ed25519-sk',
  'ecdsa-sha2-nistp256': 'ecdsa-p256',
  'ecdsa-sha2-nistp384': 'ecdsa-p384',
  'ecdsa-sha2-nistp521': 'ecdsa-p521',
  'ssh-rsa': 'rsa',
  'ssh-dss': 'dsa',
};

function keyClass(keyType) {
  const k = keyType.toLowerCase();
  if (k.includes('ed25519')) return 'ed25519';
  if (k.includes('ecdsa')) return 'ecdsa';
  if (k.includes('rsa')) return 'rsa';
  return '';
}

function parseKnownHosts(text) {
  const entries = [];
  const byKeyType = {};
  let commentCount = 0;
  let hashedCount = 0;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('#')) { commentCount++; continue; }

    // Hashed hostname: |1|<salt>|<hash> keytype key [comment]
    const hashed = line.startsWith('|1|') || line.startsWith('|2|');

    const parts = line.split(/\s+/);
    if (parts.length < 3) continue;

    const hostPart = parts[0];
    const keyType = parts[1];
    const keyBlob = parts[2];
    const comment = parts.slice(3).join(' ');

    if (!/(ssh-|ecdsa-|sk-)/.test(keyType)) continue;

    if (hashed) hashedCount++;

    const alias = KEY_ALIASES[keyType] || keyType;
    byKeyType[alias] = (byKeyType[alias] || 0) + 1;

    // Generate a short fingerprint preview (last 8 chars of base64)
    const fp = keyBlob.length > 12 ? '…' + keyBlob.slice(-8) : keyBlob;

    entries.push({ host: hostPart, keyType, alias, keyBlob, fp, hashed, comment });
  }

  return { entries, byKeyType, commentCount, hashedCount };
}

export function render(intake) {
  const name = (intake.name || intake.filename || '').split('/').pop();
  const text = intake.text || '';
  const { entries, byKeyType, hashedCount } = parseKnownHosts(text);

  // Key type summary pills
  let keyTypesHtml = '';
  const ktEntries = Object.entries(byKeyType).sort(([, a], [, b]) => b - a);
  if (ktEntries.length) {
    const pills = ktEntries.map(([kt, count]) => {
      const cls = keyClass(kt);
      return `<span class="skh-pill${cls ? ' ' + cls : ''}">${esc(kt)} <span style="opacity:.65;margin-left:4px">${count}</span></span>`;
    }).join('');
    keyTypesHtml = `<div class="skh-sec"><h3>Key Types</h3><div class="skh-pills">${pills}</div></div>`;
  }

  // Entries list (cap at 30 to avoid huge renders)
  const MAX = 30;
  const shown = entries.slice(0, MAX);
  const extra = entries.length - shown.length;

  let entriesHtml = '';
  if (shown.length) {
    const rows = shown.map((e) => {
      const hostDisplay = e.hashed
        ? `<span class="skh-host skh-hashed-host" title="Hashed hostname">[hashed]</span>`
        : `<span class="skh-host">${esc(e.host)}</span>`;
      const cls = keyClass(e.alias);
      return `<div class="skh-entry">${hostDisplay}<span class="skh-keytype${cls ? ' skh-pill ' + cls : ''}">${esc(e.alias)}</span><span class="skh-fingerprint">${esc(e.fp)}</span></div>`;
    }).join('');
    const moreHtml = extra > 0 ? `<div class="skh-entry" style="color:var(--fg-2,#888)">… and ${extra} more entr${extra !== 1 ? 'ies' : 'y'}</div>` : '';
    entriesHtml = `<div class="skh-sec"><h3>Entries (${entries.length})</h3><div class="skh-card">${rows}${moreHtml}</div></div>`;
  }

  const subParts = [`${entries.length} entr${entries.length !== 1 ? 'ies' : 'y'}`];
  if (hashedCount > 0) subParts.push(`${hashedCount} hashed`);
  if (ktEntries.length) subParts.push(ktEntries.map(([k]) => k).join(', '));

  const host = document.createElement('div');
  host.className = 'skh-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-skh">SSH Known Hosts</span>
  <span class="skh-title">${esc(name)}</span>
</div>
<div class="skh-sub">${esc(subParts.join(' · '))}</div>
${keyTypesHtml}${entriesHtml}`;
  return { parentNode: host };
}
