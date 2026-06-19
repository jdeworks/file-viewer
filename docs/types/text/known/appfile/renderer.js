const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.af-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-af{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e05d44;color:#fff;vertical-align:middle;margin-right:8px;}
.af-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.af-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.af-sec{margin:14px 0;}
.af-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.af-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;display:grid;grid-template-columns:max-content 1fr;gap:6px 14px;font-size:13px;}
.af-lbl{color:var(--fg-2,#888);font-size:12px;white-space:nowrap;align-self:start;padding-top:1px;}
.af-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.af-chip{display:inline-block;font-size:11px;padding:2px 9px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:1px 3px 1px 0;}
.af-block{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:8px 12px;margin:0 0 6px;font-size:12px;}
.af-block-hdr{font-weight:700;font-size:12px;margin:0 0 6px;color:var(--fg,#24292f);}
.af-masked{color:var(--fg-2,#888);font-style:italic;}
`;

function extractVal(text, key) {
  const re = new RegExp(`^\\s*${key}\\s*[\\(\\s]['"\\[]?([^'"\\]\\)\\n]+)['"\\]\\)]?`, 'm');
  const m = text.match(re);
  return m ? m[1].trim() : '';
}

function extractArray(text, key) {
  const re = new RegExp(`^\\s*${key}\\s*[\\(\\s]([^\\n]+)`, 'm');
  const m = text.match(re);
  if (!m) return [];
  const chunk = m[1];
  return [...chunk.matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]);
}

function maskEmail(email) {
  // Show first char, mask middle, show domain
  const at = email.indexOf('@');
  if (at < 2) return email;
  return email[0] + '***' + email.slice(at);
}

function extractBlocks(text, blockType) {
  // for_platform :ios do ... end  /  for_lane :beta do ... end
  const re = new RegExp(`for_${blockType}\\s+:(\\w+)\\s+do([\\s\\S]*?)^end`, 'gm');
  const results = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    results.push({ name: m[1], body: m[2] });
  }
  return results;
}

export function render(intake) {
  const text = intake.text || '';

  const appIdentifier = extractArray(text, 'app_identifier');
  const singleId = !appIdentifier.length ? extractVal(text, 'app_identifier') : '';
  const allIds = appIdentifier.length ? appIdentifier : (singleId ? [singleId] : []);

  const appleId = extractVal(text, 'apple_id');
  const teamId = extractVal(text, 'team_id');
  const teamName = extractVal(text, 'team_name');

  const platforms = extractBlocks(text, 'platform');
  const lanes = extractBlocks(text, 'lane');

  const maskedAppleId = appleId ? maskEmail(appleId) : '';

  const cardRows = [
    allIds.length && `<div class="af-lbl">App ID${allIds.length !== 1 ? 's' : ''}</div><div class="af-val">${allIds.map((id) => `<span class="af-chip">${esc(id)}</span>`).join('')}</div>`,
    maskedAppleId && `<div class="af-lbl">Apple ID</div><div class="af-val"><span class="af-masked">${esc(maskedAppleId)}</span></div>`,
    teamId && `<div class="af-lbl">Team ID</div><div class="af-val">${esc(teamId)}</div>`,
    teamName && `<div class="af-lbl">Team name</div><div class="af-val">${esc(teamName)}</div>`,
  ].filter(Boolean).join('');

  const renderBlock = (label, blocks) => blocks.map((b) => {
    const inner = b.body.trim();
    return `<div class="af-block"><div class="af-block-hdr">${esc(label)} :${esc(b.name)}</div><pre style="margin:0;font-size:11px;white-space:pre-wrap;color:var(--fg-2,#888)">${esc(inner)}</pre></div>`;
  }).join('');

  const host = document.createElement('div');
  host.className = 'af-doc';

  const extras = [
    platforms.length ? `<div class="af-sec"><h3>Platform blocks</h3>${renderBlock('for_platform', platforms)}</div>` : '',
    lanes.length ? `<div class="af-sec"><h3>Lane blocks</h3>${renderBlock('for_lane', lanes)}</div>` : '',
  ].filter(Boolean).join('');

  host.innerHTML = `<style>${CSS}</style>
<div class="af-title"><span class="badge-af">Fastlane</span>Appfile</div>
<div class="af-sub">Fastlane app configuration${allIds.length ? ` · ${allIds.length} app identifier${allIds.length !== 1 ? 's' : ''}` : ''}</div>
${cardRows ? `<div class="af-sec"><div class="af-card">${cardRows}</div></div>` : ''}
${extras}`;

  return { parentNode: host };
}
