// Mutt/NeoMutt configuration renderer.
// Parses `set key = value`, `bind`, `macro`, `color`, `folder-hook`, `send-hook`,
// `message-hook`, and `source` directives from plain muttrc text.
// Passwords are never displayed — values for imap_pass/smtp_pass show [configured].
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function parseMuttrc(text) {
  const lines = text.split(/\r?\n/);
  const data = {
    from: null,
    realname: null,
    folder: null,
    imapUser: null,
    imapPassConfigured: false,
    smtpUrl: null,
    smtpPassConfigured: false,
    mboxType: null,
    sort: null,
    dateFormat: null,
    indexFormat: null,
    bindCount: 0,
    macroCount: 0,
    colorLines: [],
    folderHooks: 0,
    sendHooks: 0,
    messageHooks: 0,
    sourceFiles: [],
    isNeomutt: false,
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    // Detect NeoMutt-specific directives
    if (/\bneomutt\b/i.test(line) || /\bset sidebar_visible\b/i.test(line)) {
      data.isNeomutt = true;
    }

    // set key = value
    const setMatch = line.match(/^set\s+([a-zA-Z_]+)\s*=\s*"?([^"#]*)"?/);
    if (setMatch) {
      const key = setMatch[1].toLowerCase();
      const val = setMatch[2].trim();
      switch (key) {
        case 'from': data.from = val; break;
        case 'realname': data.realname = val; break;
        case 'folder': data.folder = val; break;
        case 'imap_user': data.imapUser = val; break;
        case 'imap_pass': data.imapPassConfigured = true; break;
        case 'smtp_url': data.smtpUrl = val; break;
        case 'smtp_pass': data.smtpPassConfigured = true; break;
        case 'mbox_type': data.mboxType = val; break;
        case 'sort': data.sort = val; break;
        case 'date_format': data.dateFormat = val; break;
        case 'index_format': data.indexFormat = val; break;
      }
      // If the password is embedded in a URL (smtp_url), mask it
      if (key === 'smtp_url' && val.includes(':') && val.includes('@')) {
        // e.g. smtps://user:PASS@host → smtps://user:[masked]@host
        data.smtpUrl = val.replace(/:([^/@]+)@/, ':[masked]@');
      }
      continue;
    }

    // bind
    if (/^bind\s+/i.test(line)) { data.bindCount++; continue; }

    // macro
    if (/^macro\s+/i.test(line)) { data.macroCount++; continue; }

    // color lines
    const colorMatch = line.match(/^color\s+(\S+)/i);
    if (colorMatch) { data.colorLines.push(colorMatch[1]); continue; }

    // hooks
    if (/^folder-hook\s+/i.test(line)) { data.folderHooks++; continue; }
    if (/^send-hook\s+/i.test(line)) { data.sendHooks++; continue; }
    if (/^message-hook\s+/i.test(line)) { data.messageHooks++; continue; }

    // source
    const sourceMatch = line.match(/^source\s+(.+)/i);
    if (sourceMatch) {
      data.sourceFiles.push(sourceMatch[1].trim().replace(/^~/, '~'));
      continue;
    }
  }

  return data;
}

const CSS = `
.muttrc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.muttrc-head{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:14px;}
.muttrc-title{font-size:18px;font-weight:700;margin:0;}
.muttrc-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a1a2e;color:#fff;vertical-align:middle;}
.muttrc-meta{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:4px;}
.muttrc-tag{font-size:11px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);color:var(--fg-2,#666);}
.muttrc-card{margin:10px 0;background:var(--bg-2,#f9fafb);border:1px solid var(--border,#e8eaed);border-radius:8px;overflow:hidden;}
.muttrc-card-head{padding:7px 14px;background:var(--bg-3,#f1f3f5);border-bottom:1px solid var(--border,#e8eaed);font-size:12px;font-weight:600;color:var(--fg,#24292f);}
.muttrc-list{list-style:none;margin:0;padding:0;}
.muttrc-item{display:flex;align-items:baseline;gap:8px;padding:5px 14px;border-bottom:1px solid var(--border,#f0f0f0);font-size:13px;}
.muttrc-item:last-child{border-bottom:none;}
.muttrc-key{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#666);min-width:130px;flex-shrink:0;}
.muttrc-val{font:12px/1.6 ui-monospace,monospace;font-weight:600;word-break:break-all;}
.muttrc-hint{font-size:11px;color:var(--fg-2,#888);}
.muttrc-chip{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;background:var(--bg-3,#eef);border:1px solid var(--border,#cce);color:var(--fg-2,#446);}
.muttrc-masked{color:var(--fg-2,#888);font-style:italic;}
`;

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'muttrc-doc';
  const text = intake.text || '';
  const d = parseMuttrc(text);

  const appLabel = d.isNeomutt ? 'NeoMutt' : 'Mutt';
  const badge = `<span class="muttrc-badge">${appLabel}</span>`;

  const totalHooks = d.folderHooks + d.sendHooks + d.messageHooks;
  const totalBindings = d.bindCount + d.macroCount;
  const tags = [
    totalBindings ? `<span class="muttrc-tag">${totalBindings} binding${totalBindings !== 1 ? 's' : ''}</span>` : '',
    d.colorLines.length ? `<span class="muttrc-tag">${d.colorLines.length} color rule${d.colorLines.length !== 1 ? 's' : ''}</span>` : '',
    totalHooks ? `<span class="muttrc-tag">${totalHooks} hook${totalHooks !== 1 ? 's' : ''}</span>` : '',
    d.sourceFiles.length ? `<span class="muttrc-tag">${d.sourceFiles.length} sourced file${d.sourceFiles.length !== 1 ? 's' : ''}</span>` : '',
  ].filter(Boolean).join('');

  let html = `<style>${CSS}</style>
<div class="muttrc-head">
  <h1 class="muttrc-title">${badge} Mutt Configuration</h1>
</div>
<div class="muttrc-meta">${tags}</div>`;

  // Account settings card
  const accountRows = [];
  if (d.from) accountRows.push(`<li class="muttrc-item"><span class="muttrc-key">from</span><span class="muttrc-val">${esc(d.from)}</span></li>`);
  if (d.realname) accountRows.push(`<li class="muttrc-item"><span class="muttrc-key">realname</span><span class="muttrc-val">${esc(d.realname)}</span></li>`);
  if (d.imapUser) accountRows.push(`<li class="muttrc-item"><span class="muttrc-key">imap_user</span><span class="muttrc-val">${esc(d.imapUser)}</span></li>`);
  if (d.imapPassConfigured) accountRows.push(`<li class="muttrc-item"><span class="muttrc-key">imap_pass</span><span class="muttrc-val muttrc-masked">[configured]</span></li>`);
  if (d.folder) {
    // Try to derive IMAP server from folder URL
    const serverMatch = d.folder.match(/^imaps?:\/\/([^/]+)/);
    accountRows.push(`<li class="muttrc-item"><span class="muttrc-key">folder</span><span class="muttrc-val">${esc(d.folder)}</span>${serverMatch ? `<span class="muttrc-hint"> IMAP: ${esc(serverMatch[1])}</span>` : ''}</li>`);
  }
  if (d.smtpUrl) accountRows.push(`<li class="muttrc-item"><span class="muttrc-key">smtp_url</span><span class="muttrc-val">${esc(d.smtpUrl)}</span></li>`);
  if (d.smtpPassConfigured) accountRows.push(`<li class="muttrc-item"><span class="muttrc-key">smtp_pass</span><span class="muttrc-val muttrc-masked">[configured]</span></li>`);

  if (accountRows.length) {
    html += `<div class="muttrc-card"><div class="muttrc-card-head">Account</div><ul class="muttrc-list">${accountRows.join('')}</ul></div>`;
  }

  // Mailbox settings card
  const mailboxRows = [];
  if (d.mboxType) mailboxRows.push(`<li class="muttrc-item"><span class="muttrc-key">mbox_type</span><span class="muttrc-val">${esc(d.mboxType)}</span></li>`);
  if (d.sort) mailboxRows.push(`<li class="muttrc-item"><span class="muttrc-key">sort</span><span class="muttrc-val">${esc(d.sort)}</span></li>`);
  if (d.dateFormat) mailboxRows.push(`<li class="muttrc-item"><span class="muttrc-key">date_format</span><span class="muttrc-val">${esc(d.dateFormat)}</span></li>`);
  if (d.indexFormat) mailboxRows.push(`<li class="muttrc-item"><span class="muttrc-key">index_format</span><span class="muttrc-val">${esc(d.indexFormat)}</span></li>`);

  if (mailboxRows.length) {
    html += `<div class="muttrc-card"><div class="muttrc-card-head">Mailbox</div><ul class="muttrc-list">${mailboxRows.join('')}</ul></div>`;
  }

  // Keybindings / macros
  if (totalBindings) {
    html += `<div class="muttrc-card"><div class="muttrc-card-head">Keybindings &amp; Macros</div><ul class="muttrc-list">`;
    if (d.bindCount) html += `<li class="muttrc-item"><span class="muttrc-key">bind</span><span class="muttrc-val">${d.bindCount} binding${d.bindCount !== 1 ? 's' : ''}</span></li>`;
    if (d.macroCount) html += `<li class="muttrc-item"><span class="muttrc-key">macro</span><span class="muttrc-val">${d.macroCount} macro${d.macroCount !== 1 ? 's' : ''}</span></li>`;
    html += `</ul></div>`;
  }

  // Color scheme
  if (d.colorLines.length) {
    // Show up to 6 unique color targets
    const unique = [...new Set(d.colorLines)].slice(0, 6);
    const chips = unique.map((c) => `<span class="muttrc-chip">${esc(c)}</span>`).join(' ');
    const extra = d.colorLines.length > 6 ? ` <span class="muttrc-hint">+${d.colorLines.length - 6} more</span>` : '';
    html += `<div class="muttrc-card"><div class="muttrc-card-head">Color Scheme <span style="font-weight:400;color:var(--fg-2,#888)">(${d.colorLines.length} rules)</span></div>
<div style="padding:8px 14px;display:flex;flex-wrap:wrap;gap:4px;align-items:center">${chips}${extra}</div></div>`;
  }

  // Hooks
  if (totalHooks) {
    html += `<div class="muttrc-card"><div class="muttrc-card-head">Hooks</div><ul class="muttrc-list">`;
    if (d.folderHooks) html += `<li class="muttrc-item"><span class="muttrc-key">folder-hook</span><span class="muttrc-val">${d.folderHooks}</span></li>`;
    if (d.sendHooks) html += `<li class="muttrc-item"><span class="muttrc-key">send-hook</span><span class="muttrc-val">${d.sendHooks}</span></li>`;
    if (d.messageHooks) html += `<li class="muttrc-item"><span class="muttrc-key">message-hook</span><span class="muttrc-val">${d.messageHooks}</span></li>`;
    html += `</ul></div>`;
  }

  // Sourced files
  if (d.sourceFiles.length) {
    const items = d.sourceFiles.map((f) => `<li class="muttrc-item"><code class="muttrc-key">${esc(f)}</code></li>`).join('');
    html += `<div class="muttrc-card"><div class="muttrc-card-head">Sourced Files <span style="font-weight:400;color:var(--fg-2,#888)">(${d.sourceFiles.length})</span></div><ul class="muttrc-list">${items}</ul></div>`;
  }

  host.innerHTML = html;
  return { parentNode: host };
}
