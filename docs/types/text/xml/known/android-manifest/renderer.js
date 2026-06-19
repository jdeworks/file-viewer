const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.am-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-am{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#3ddc84;color:#1a1a1a;vertical-align:middle;margin-right:8px}
.am-title{font-size:18px;font-weight:700;margin:0 0 2px}
.am-ver{font-size:13px;color:var(--fg-2,#888);margin:0 0 4px}
.am-meta-row{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px}
.am-meta-chip{font-size:12px;padding:3px 10px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0)}
.am-sec{margin:14px 0}
.am-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;display:flex;align-items:center;gap:6px}
.am-count{font-size:11px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:0 6px;color:var(--fg-2,#888)}
.am-perm-list{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.am-perm{font-size:11px;padding:3px 9px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.am-perm.danger{background:#fee2e2;border-color:#fca5a5;color:#991b1b}
.am-table{width:100%;border-collapse:collapse;font-size:12px}
.am-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px 4px 0;border-bottom:2px solid var(--border,#e0e0e0)}
.am-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12px;word-break:break-all}
.am-table tr:last-child td{border-bottom:none}
.am-comp-tag{display:inline-block;font-size:10px;padding:1px 5px;border-radius:5px;font-weight:600;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);color:var(--fg-2,#888);margin-left:4px}
.am-comp-tag.exported{background:#d1fae5;border-color:#6ee7b7;color:#065f46}
.am-comp-tag.launcher{background:#dbeafe;border-color:#93c5fd;color:#1e40af}
.am-err{color:#b91c1c;font-size:13px}
.am-note{color:var(--fg-2,#888);font-size:13px;font-style:italic}
`;

// Dangerous permissions that deserve visual callout
const DANGER_PERMS = new Set([
  'android.permission.READ_CONTACTS', 'android.permission.WRITE_CONTACTS',
  'android.permission.ACCESS_FINE_LOCATION', 'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.READ_CALL_LOG', 'android.permission.WRITE_CALL_LOG',
  'android.permission.READ_SMS', 'android.permission.SEND_SMS',
  'android.permission.RECEIVE_SMS', 'android.permission.CAMERA',
  'android.permission.RECORD_AUDIO', 'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE', 'android.permission.PROCESS_OUTGOING_CALLS',
  'android.permission.GET_ACCOUNTS', 'android.permission.USE_BIOMETRIC',
]);

function attr(el, name) {
  // Android attributes are in the android: namespace
  return (el.getAttributeNS('http://schemas.android.com/apk/res/android', name.replace(/^android:/, ''))
    || el.getAttribute(name) || '').trim();
}

function shortName(fullName) {
  if (!fullName) return '';
  const parts = fullName.split('.');
  return parts.length > 2 ? '….' + parts.slice(-2).join('.') : fullName;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const doc = new DOMParser().parseFromString(text, 'text/xml');

  if (doc.getElementsByTagName('parsererror').length) {
    const d = document.createElement('div');
    d.className = 'am-doc';
    d.innerHTML = `<style>${CSS}</style><p class="am-err">Could not parse AndroidManifest.xml as XML.</p>`;
    return { parentNode: d };
  }

  const manifest = doc.documentElement;
  const pkg = manifest.getAttribute('package') || '';
  const versionCode = attr(manifest, 'android:versionCode');
  const versionName = attr(manifest, 'android:versionName');

  // Permissions
  const permEls = [...doc.getElementsByTagName('uses-permission')];
  const permissions = permEls.map((el) => attr(el, 'android:name') || el.getAttribute('android:name') || '').filter(Boolean);

  // Application element
  const appEl = doc.getElementsByTagName('application')[0];
  const appLabel = appEl ? (attr(appEl, 'android:label') || '') : '';

  // Components
  const activities = [...doc.getElementsByTagName('activity')];
  const services = [...doc.getElementsByTagName('service')];
  const receivers = [...doc.getElementsByTagName('receiver')];
  const providers = [...doc.getElementsByTagName('provider')];

  function compName(el) {
    const n = attr(el, 'android:name') || el.getAttribute('android:name') || '';
    return n.startsWith('.') ? pkg + n : n;
  }

  function isExported(el) {
    const v = attr(el, 'android:exported') || el.getAttribute('android:exported');
    if (v === 'true') return true;
    if (v === 'false') return false;
    // Check if has intent-filter (implies exported by default on older API)
    return el.getElementsByTagName('intent-filter').length > 0;
  }

  function isLauncher(el) {
    for (const filter of [...el.getElementsByTagName('intent-filter')]) {
      const cats = [...filter.getElementsByTagName('category')];
      if (cats.some((c) => (attr(c, 'android:name') || c.getAttribute('android:name') || '').includes('LAUNCHER'))) return true;
    }
    return false;
  }

  // Permissions section
  const permsHtml = permissions.length
    ? `<div class="am-sec"><h3>Permissions <span class="am-count">${permissions.length}</span></h3>
<ul class="am-perm-list">
${permissions.map((p) => `<li class="am-perm${DANGER_PERMS.has(p) ? ' danger' : ''}" title="${esc(p)}">${esc(p.replace('android.permission.', ''))}</li>`).join('')}
</ul></div>` : '';

  function componentTable(els, title) {
    if (!els.length) return '';
    const rows = els.slice(0, 20).map((el) => {
      const name = compName(el);
      const exp = isExported(el);
      const launcher = title === 'Activities' && isLauncher(el);
      const tags = [
        launcher ? '<span class="am-comp-tag launcher">launcher</span>' : '',
        exp ? '<span class="am-comp-tag exported">exported</span>' : '',
      ].filter(Boolean).join('');
      return `<tr><td>${esc(shortName(name))}${tags}</td></tr>`;
    }).join('');
    const more = els.length > 20 ? `<tr><td style="color:var(--fg-2,#888)">…and ${els.length - 20} more</td></tr>` : '';
    return `<div class="am-sec"><h3>${title} <span class="am-count">${els.length}</span></h3>
<table class="am-table"><thead><tr><th>Name</th></tr></thead><tbody>${rows}${more}</tbody></table></div>`;
  }

  const metaChips = [
    pkg && `<span class="am-meta-chip"><code>${esc(pkg)}</code></span>`,
    versionName && `<span class="am-meta-chip">v${esc(versionName)}</span>`,
    versionCode && `<span class="am-meta-chip">versionCode ${esc(versionCode)}</span>`,
    appLabel && !appLabel.startsWith('@') && `<span class="am-meta-chip">${esc(appLabel)}</span>`,
  ].filter(Boolean).join('');

  const host = document.createElement('div');
  host.className = 'am-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="am-title"><span class="badge-am">Android</span>AndroidManifest.xml</div>
${versionName ? `<div class="am-ver">Version ${esc(versionName)}${versionCode ? ` (code ${esc(versionCode)})` : ''}</div>` : ''}
${metaChips ? `<div class="am-meta-row">${metaChips}</div>` : ''}
${permsHtml}
${componentTable(activities, 'Activities')}
${componentTable(services, 'Services')}
${componentTable(receivers, 'Broadcast Receivers')}
${componentTable(providers, 'Content Providers')}`;
  return { parentNode: host };
}
