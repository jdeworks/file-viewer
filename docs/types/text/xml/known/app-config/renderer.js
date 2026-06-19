// Enhanced app.config view. Rendered in the parent pane (trusted DOM).
// Shows supportedRuntime version, configSections count, appSettings (masked secrets),
// and connectionStrings (masked passwords).
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SECRET_KEYS = /password|secret|key|token|pwd|apikey|api[_-]?key/i;

function maskConnStr(value) {
  return value.replace(/(password|pwd)\s*=\s*[^;"]*/gi, '$1=••••••••');
}

const CSS = `
.ac-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.ac-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
.badge-ac{display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;background:#68217a;color:#fff;vertical-align:middle;}
.ac-title{font-size:18px;font-weight:700;margin:0;}
.ac-sec{margin-top:16px;}
.ac-sec h3{font-size:13px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.05em;margin:0 0 6px;}
.ac-kv-list{list-style:none;margin:0;padding:0;}
.ac-kv-item{display:grid;grid-template-columns:220px 1fr;gap:8px;font-size:12px;padding:4px 0;border-bottom:1px solid var(--border,#e8eaed);}
.ac-kv-item:last-child{border-bottom:none;}
.ac-kv-key{font-family:ui-monospace,monospace;font-weight:600;color:#68217a;word-break:break-all;}
.ac-kv-val{font-family:ui-monospace,monospace;color:var(--fg,#24292f);word-break:break-all;}
.ac-kv-val.masked{color:var(--fg-2,#888);letter-spacing:.05em;}
.ac-conn-list{list-style:none;margin:0;padding:0;}
.ac-conn-item{padding:8px 0;border-bottom:1px solid var(--border,#e8eaed);}
.ac-conn-item:last-child{border-bottom:none;}
.ac-conn-name{font-family:ui-monospace,monospace;font-weight:700;font-size:13px;color:#68217a;}
.ac-conn-provider{font-size:11px;color:var(--fg-2,#888);margin-top:1px;}
.ac-conn-str{font-size:12px;font-family:ui-monospace,monospace;color:var(--fg,#24292f);margin-top:3px;word-break:break-all;}
.ac-info-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;}
.ac-tag{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:600;background:#f0e8f5;color:#68217a;border:1px solid #d8c3e0;}
.ac-runtime-box{padding:10px 14px;border-radius:6px;background:#f8f0fc;border:1px solid #e0c8ea;display:inline-flex;flex-direction:column;gap:2px;margin-bottom:10px;}
.ac-runtime-ver{font-family:ui-monospace,monospace;font-size:15px;font-weight:700;color:#68217a;}
.ac-runtime-sku{font-size:11px;color:var(--fg-2,#888);}
.ac-empty{color:var(--fg-2,#888);font-size:13px;font-style:italic;}
.ac-err{color:#c62828;font-size:13px;}
`;

function getAttr(el, ...names) {
  for (const n of names) {
    const v = el.getAttribute(n) || el.getAttribute(n.toLowerCase());
    if (v != null) return v;
  }
  return '';
}

function getFirst(root, tag) {
  return root.getElementsByTagName(tag)[0] || null;
}

function getChildrenByTag(parent, tag) {
  return Array.from(parent.getElementsByTagName(tag));
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const host = document.createElement('div');
  host.className = 'ac-doc';

  let doc = null;
  try { doc = new DOMParser().parseFromString(text, 'text/xml'); } catch (e) {
    host.innerHTML = `<style>${CSS}</style><p class="ac-err">Failed to parse XML: ${esc(e.message)}</p>`;
    return { parentNode: host };
  }
  if (doc.getElementsByTagName('parsererror').length) {
    host.innerHTML = `<style>${CSS}</style><p class="ac-err">Could not parse app.config as XML.</p>`;
    return { parentNode: host };
  }

  // supportedRuntime from <startup>
  const startupEl = getFirst(doc, 'startup');
  const runtimes = startupEl ? getChildrenByTag(startupEl, 'supportedRuntime') : [];
  const firstRuntime = runtimes[0] || null;
  const runtimeVersion = firstRuntime ? (getAttr(firstRuntime, 'version') || '') : '';
  const runtimeSku = firstRuntime ? (getAttr(firstRuntime, 'sku') || '') : '';

  // configSections count
  const configSectionsEl = getFirst(doc, 'configSections');
  const sectionCount = configSectionsEl ? getChildrenByTag(configSectionsEl, 'section').length : 0;

  // appSettings
  const appSettingsEl = getFirst(doc, 'appSettings');
  const appSettings = appSettingsEl
    ? getChildrenByTag(appSettingsEl, 'add').map((el) => ({
        key: getAttr(el, 'key'),
        value: getAttr(el, 'value'),
      }))
    : [];

  // connectionStrings
  const connStringsEl = getFirst(doc, 'connectionStrings');
  const connStrings = connStringsEl ? getChildrenByTag(connStringsEl, 'add') : [];

  const infoTags = [];
  if (sectionCount) infoTags.push(`<span class="ac-tag">${sectionCount} config section${sectionCount !== 1 ? 's' : ''}</span>`);
  if (appSettings.length) infoTags.push(`<span class="ac-tag">${appSettings.length} app setting${appSettings.length !== 1 ? 's' : ''}</span>`);
  if (connStrings.length) infoTags.push(`<span class="ac-tag">${connStrings.length} connection string${connStrings.length !== 1 ? 's' : ''}</span>`);

  const runtimeHtml = runtimeVersion
    ? `<div class="ac-runtime-box"><span class="ac-runtime-ver">.NET ${esc(runtimeVersion)}</span>${runtimeSku ? `<span class="ac-runtime-sku">${esc(runtimeSku)}</span>` : ''}</div>`
    : '';

  const appSettingsHtml = appSettings.length
    ? `<div class="ac-sec"><h3>App Settings <span style="font-size:11px;font-weight:400;">(${appSettings.length})</span></h3><ul class="ac-kv-list">${appSettings.map(({ key, value }) => {
        const isMasked = SECRET_KEYS.test(key);
        const display = isMasked ? '••••••••' : value;
        return `<li class="ac-kv-item"><span class="ac-kv-key">${esc(key)}</span><span class="ac-kv-val${isMasked ? ' masked' : ''}">${esc(display)}</span></li>`;
      }).join('')}</ul></div>`
    : '';

  const connHtml = connStrings.length
    ? `<div class="ac-sec"><h3>Connection Strings</h3><ul class="ac-conn-list">${connStrings.map((el) => {
        const name = getAttr(el, 'name');
        const connStr = maskConnStr(getAttr(el, 'connectionString'));
        const provider = getAttr(el, 'providerName');
        return `<li class="ac-conn-item">
          <div class="ac-conn-name">${esc(name)}</div>
          ${provider ? `<div class="ac-conn-provider">${esc(provider)}</div>` : ''}
          <div class="ac-conn-str">${esc(connStr)}</div>
        </li>`;
      }).join('')}</ul></div>`
    : '';

  const nothingShown = !runtimeVersion && !appSettings.length && !connStrings.length && !sectionCount;

  host.innerHTML = `<style>${CSS}</style>
<div class="ac-head">
  <span class="badge-ac">.NET</span>
  <div class="ac-title">app.config</div>
</div>
${infoTags.length ? `<div class="ac-info-row">${infoTags.join('')}</div>` : ''}
${runtimeHtml}
${appSettingsHtml}
${connHtml}
${nothingShown ? '<p class="ac-empty">No recognized configuration sections found.</p>' : ''}`;

  return { parentNode: host };
}
