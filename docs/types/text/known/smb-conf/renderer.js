const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.smbcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.smbcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1F4E78;color:#fff;vertical-align:middle;margin-right:8px;}
.smbcfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.smbcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.smbcfg-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:12px 16px;margin-bottom:12px;}
.smbcfg-card-hd{font-family:ui-monospace,monospace;font-size:13px;font-weight:700;color:var(--fg,#24292f);margin:0 0 8px;padding-bottom:6px;border-bottom:1px solid var(--border,#e0e0e0);}
.smbcfg-table{width:100%;border-collapse:collapse;font-size:13px;}
.smbcfg-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.smbcfg-table tr:last-child td{border-bottom:none;}
.smbcfg-table td:first-child{color:var(--fg-2,#666);width:35%;white-space:nowrap;font-family:ui-monospace,monospace;font-size:12px;}
.smbcfg-val{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg,#24292f);word-break:break-word;}
.smbcfg-shares-hd{font-size:14px;font-weight:700;margin:16px 0 8px;color:var(--fg,#24292f);}
.smbcfg-share{border:1px solid var(--border,#e0e0e0);border-radius:6px;margin-bottom:8px;overflow:hidden;}
.smbcfg-share-hd{padding:8px 12px;background:var(--bg-2,#f6f8fa);font-family:ui-monospace,monospace;font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.smbcfg-share-body{padding:8px 12px;}
.smbcfg-share-table{width:100%;border-collapse:collapse;font-size:12px;}
.smbcfg-share-table td{padding:3px 8px 3px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.smbcfg-share-table tr:last-child td{border-bottom:none;}
.smbcfg-share-table td:first-child{color:var(--fg-2,#666);width:35%;white-space:nowrap;font-family:ui-monospace,monospace;}
.smbcfg-share-val{font-family:ui-monospace,monospace;color:var(--fg,#24292f);word-break:break-word;}
.smbcfg-chip{display:inline-block;padding:1px 7px;border-radius:10px;font-size:11px;font-weight:600;}
.smbcfg-chip-pub{background:#d4edda;color:#155724;border:1px solid #c3e6cb;}
.smbcfg-chip-priv{background:#d1ecf1;color:#0c5460;border:1px solid #bee5eb;}
.smbcfg-chip-rw{background:#fff3cd;color:#856404;border:1px solid #ffc107;}
.smbcfg-chip-ro{background:#e2e3e5;color:#383d41;border:1px solid #d6d8db;}
.smbcfg-chip-special{background:#e8d5f5;color:#4a1a6b;border:1px solid #c9a8e8;}
.smbcfg-empty{color:var(--fg-2,#888);font-size:12px;font-style:italic;}
`;

const GLOBAL_KEYS = ['workgroup', 'netbios name', 'server string', 'security', 'map to guest', 'interfaces'];
const SHARE_KEYS = ['comment', 'path', 'browsable', 'read only', 'guest ok', 'valid users', 'write list'];

function parseIni(text) {
  const sections = new Map();
  let current = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const secMatch = line.match(/^\[([^\]]+)\]$/);
    if (secMatch) {
      current = secMatch[1];
      if (!sections.has(current)) sections.set(current, []);
      continue;
    }
    const kvMatch = line.match(/^([^=]+?)\s*=\s*(.*)$/);
    if (kvMatch && current) {
      sections.get(current).push([kvMatch[1].trim(), kvMatch[2].trim()]);
    }
  }
  return sections;
}

function getVal(entries, key) {
  const found = entries.find(([k]) => k.toLowerCase() === key.toLowerCase());
  return found ? found[1] : null;
}

function accessChips(entries) {
  const guestOk = getVal(entries, 'guest ok');
  const readOnly = getVal(entries, 'read only');
  const isPublic = guestOk === 'yes' || guestOk === 'true' || guestOk === '1';
  const isReadOnly = readOnly === 'yes' || readOnly === 'true' || readOnly === '1';
  const chips = [];
  chips.push(isPublic
    ? '<span class="smbcfg-chip smbcfg-chip-pub">public</span>'
    : '<span class="smbcfg-chip smbcfg-chip-priv">private</span>');
  chips.push(isReadOnly
    ? '<span class="smbcfg-chip smbcfg-chip-ro">read-only</span>'
    : '<span class="smbcfg-chip smbcfg-chip-rw">writable</span>');
  return chips.join('');
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const sections = parseIni(text);

  // [global] section
  const globalEntries = sections.get('global') || sections.get('Global') || sections.get('GLOBAL') || [];
  const globalRows = GLOBAL_KEYS
    .map((k) => {
      const v = getVal(globalEntries, k);
      if (v == null) return null;
      return `<tr><td>${esc(k)}</td><td><span class="smbcfg-val">${esc(v)}</span></td></tr>`;
    })
    .filter(Boolean)
    .join('');

  const globalCard = `<div class="smbcfg-card">
<div class="smbcfg-card-hd">[global] — Server Settings</div>
${globalRows ? `<table class="smbcfg-table"><tbody>${globalRows}</tbody></table>` : '<p class="smbcfg-empty">No global settings.</p>'}
</div>`;

  // Special shares: [homes] and [printers]
  const SPECIAL = new Set(['global', 'homes', 'printers']);
  const specialNames = ['homes', 'printers'].filter((s) => sections.has(s));
  const regularNames = [...sections.keys()].filter((s) => !SPECIAL.has(s.toLowerCase()));

  function renderShare(name, isSpecial) {
    const entries = sections.get(name);
    const comment = getVal(entries, 'comment');
    const path = getVal(entries, 'path');

    const chips = isSpecial
      ? '<span class="smbcfg-chip smbcfg-chip-special">special</span>'
      : accessChips(entries);

    const rows = SHARE_KEYS
      .map((k) => {
        const v = getVal(entries, k);
        if (v == null) return null;
        return `<tr><td>${esc(k)}</td><td><span class="smbcfg-share-val">${esc(v)}</span></td></tr>`;
      })
      .filter(Boolean)
      .join('');

    const subLabel = comment ? ` — ${esc(comment)}` : (path ? ` — ${esc(path)}` : '');

    return `<div class="smbcfg-share">
<div class="smbcfg-share-hd"><span>[${esc(name)}]${subLabel}</span>${chips}</div>
${rows ? `<div class="smbcfg-share-body"><table class="smbcfg-share-table"><tbody>${rows}</tbody></table></div>` : ''}
</div>`;
  }

  const allShareNames = [...specialNames, ...regularNames];
  const sharesHtml = allShareNames.map((n) => renderShare(n, specialNames.includes(n))).join('');

  const sharesSection = allShareNames.length
    ? `<div class="smbcfg-shares-hd">Shares (${regularNames.length} data + ${specialNames.length} special)</div>${sharesHtml}`
    : '<p class="smbcfg-empty">No shares defined.</p>';

  const workgroup = getVal(globalEntries, 'workgroup') || '';
  const netbiosName = getVal(globalEntries, 'netbios name') || '';
  const subInfo = [workgroup && `workgroup: ${workgroup}`, netbiosName && `name: ${netbiosName}`].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'smbcfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="smbcfg-title"><span class="smbcfg-badge">Samba</span>SMB Configuration</div>
<div class="smbcfg-sub">${esc(subInfo) || `${allShareNames.length} share${allShareNames.length !== 1 ? 's' : ''}`}</div>
${globalCard}
${sharesSection}`;

  return { parentNode: host };
}
