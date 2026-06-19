// Enhanced web.config view. Rendered in the parent pane (trusted DOM).
// Shows connectionStrings (masked passwords), appSettings (masked secrets),
// system.web auth mode, and system.webServer handlers.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SECRET_KEYS = /password|secret|key|token|pwd|apikey|api[_-]?key/i;

function maskValue(key, value) {
  if (SECRET_KEYS.test(key)) return '••••••••';
  // Mask password= in connection strings
  return value.replace(/(password|pwd)\s*=\s*[^;"]*/gi, '$1=••••••••');
}

const CSS = `
.wc-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.wc-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
.badge-wc{display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;background:#68217a;color:#fff;vertical-align:middle;}
.wc-title{font-size:18px;font-weight:700;margin:0;}
.wc-sec{margin-top:16px;}
.wc-sec h3{font-size:13px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.05em;margin:0 0 6px;}
.wc-kv-list{list-style:none;margin:0;padding:0;}
.wc-kv-item{display:grid;grid-template-columns:220px 1fr;gap:8px;font-size:12px;padding:4px 0;border-bottom:1px solid var(--border,#e8eaed);}
.wc-kv-item:last-child{border-bottom:none;}
.wc-kv-key{font-family:ui-monospace,monospace;font-weight:600;color:#68217a;word-break:break-all;}
.wc-kv-val{font-family:ui-monospace,monospace;color:var(--fg,#24292f);word-break:break-all;}
.wc-kv-val.masked{color:var(--fg-2,#888);letter-spacing:.05em;}
.wc-conn-list{list-style:none;margin:0;padding:0;}
.wc-conn-item{padding:8px 0;border-bottom:1px solid var(--border,#e8eaed);}
.wc-conn-item:last-child{border-bottom:none;}
.wc-conn-name{font-family:ui-monospace,monospace;font-weight:700;font-size:13px;color:#68217a;}
.wc-conn-provider{font-size:11px;color:var(--fg-2,#888);margin-top:1px;}
.wc-conn-str{font-size:12px;font-family:ui-monospace,monospace;color:var(--fg,#24292f);margin-top:3px;word-break:break-all;}
.wc-info-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;}
.wc-tag{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:600;background:#f0e8f5;color:#68217a;border:1px solid #d8c3e0;}
.wc-empty{color:var(--fg-2,#888);font-size:13px;font-style:italic;}
.wc-err{color:#c62828;font-size:13px;}
.wc-handler-list{list-style:none;margin:0;padding:0;}
.wc-handler-item{display:flex;flex-direction:column;padding:5px 0;border-bottom:1px solid var(--border,#e8eaed);}
.wc-handler-item:last-child{border-bottom:none;}
.wc-handler-name{font-family:ui-monospace,monospace;font-weight:600;font-size:13px;}
.wc-handler-detail{font-size:11px;color:var(--fg-2,#888);font-family:ui-monospace,monospace;}
`;

function getAttr(el, ...names) {
  for (const n of names) {
    const v = el.getAttribute(n) || el.getAttribute(n.toLowerCase()) || el.getAttribute(n.toUpperCase());
    if (v != null) return v;
  }
  return '';
}

function getChildrenByTag(parent, tag) {
  return Array.from(parent.getElementsByTagName(tag));
}

function getFirst(doc, tag) {
  return doc.getElementsByTagName(tag)[0] || null;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const host = document.createElement('div');
  host.className = 'wc-doc';

  let doc = null;
  try { doc = new DOMParser().parseFromString(text, 'text/xml'); } catch (e) {
    host.innerHTML = `<style>${CSS}</style><p class="wc-err">Failed to parse XML: ${esc(e.message)}</p>`;
    return { parentNode: host };
  }
  if (doc.getElementsByTagName('parsererror').length) {
    host.innerHTML = `<style>${CSS}</style><p class="wc-err">Could not parse web.config as XML.</p>`;
    return { parentNode: host };
  }

  // connectionStrings
  const connStrings = getChildrenByTag(doc, 'add').filter((el) => {
    const p = el.parentElement;
    return p && p.tagName.toLowerCase() === 'connectionstrings';
  });

  // appSettings
  const appSettingsEl = getFirst(doc, 'appSettings');
  const appSettings = appSettingsEl
    ? getChildrenByTag(appSettingsEl, 'add').map((el) => ({
        key: getAttr(el, 'key'),
        value: getAttr(el, 'value'),
      }))
    : [];

  // system.web — authentication mode
  const systemWeb = getFirst(doc, 'system.web');
  let authMode = '';
  if (systemWeb) {
    const authEl = getFirst(systemWeb, 'authentication');
    if (authEl) authMode = getAttr(authEl, 'mode');
  }

  // system.webServer — handlers
  const systemWebServer = getFirst(doc, 'system.webServer');
  let handlers = [];
  if (systemWebServer) {
    const handlersEl = getFirst(systemWebServer, 'handlers');
    if (handlersEl) {
      handlers = getChildrenByTag(handlersEl, 'add').map((el) => ({
        name: getAttr(el, 'name'),
        path: getAttr(el, 'path'),
        verb: getAttr(el, 'verb'),
        type: getAttr(el, 'type'),
      }));
    }
  }

  // httpErrors
  let httpErrorsMode = '';
  if (systemWebServer) {
    const httpErrorsEl = getFirst(systemWebServer, 'httpErrors');
    if (httpErrorsEl) httpErrorsMode = getAttr(httpErrorsEl, 'errorMode') || getAttr(httpErrorsEl, 'mode');
  }

  // Build HTML
  const infoTags = [];
  if (authMode) infoTags.push(`<span class="wc-tag">Auth: ${esc(authMode)}</span>`);
  if (httpErrorsMode) infoTags.push(`<span class="wc-tag">HTTP Errors: ${esc(httpErrorsMode)}</span>`);
  if (appSettings.length) infoTags.push(`<span class="wc-tag">${appSettings.length} app setting${appSettings.length !== 1 ? 's' : ''}</span>`);
  if (connStrings.length) infoTags.push(`<span class="wc-tag">${connStrings.length} connection string${connStrings.length !== 1 ? 's' : ''}</span>`);

  const connHtml = connStrings.length
    ? `<div class="wc-sec"><h3>Connection Strings</h3><ul class="wc-conn-list">${connStrings.map((el) => {
        const name = getAttr(el, 'name');
        const connStr = maskValue('connectionString', getAttr(el, 'connectionString'));
        const provider = getAttr(el, 'providerName');
        return `<li class="wc-conn-item">
          <div class="wc-conn-name">${esc(name)}</div>
          ${provider ? `<div class="wc-conn-provider">${esc(provider)}</div>` : ''}
          <div class="wc-conn-str">${esc(connStr)}</div>
        </li>`;
      }).join('')}</ul></div>`
    : '';

  const appSettingsHtml = appSettings.length
    ? `<div class="wc-sec"><h3>App Settings <span style="font-size:11px;font-weight:400;">(${appSettings.length})</span></h3><ul class="wc-kv-list">${appSettings.map(({ key, value }) => {
        const isMasked = SECRET_KEYS.test(key);
        const display = isMasked ? '••••••••' : value;
        return `<li class="wc-kv-item"><span class="wc-kv-key">${esc(key)}</span><span class="wc-kv-val${isMasked ? ' masked' : ''}">${esc(display)}</span></li>`;
      }).join('')}</ul></div>`
    : '';

  const handlersHtml = handlers.length
    ? `<div class="wc-sec"><h3>Handlers <span style="font-size:11px;font-weight:400;">(${handlers.length})</span></h3><ul class="wc-handler-list">${handlers.map((h) =>
        `<li class="wc-handler-item">
          <span class="wc-handler-name">${esc(h.name)}</span>
          <span class="wc-handler-detail">${esc(h.path)}${h.verb ? ` [${esc(h.verb)}]` : ''}${h.type ? ` → ${esc(h.type)}` : ''}</span>
        </li>`
      ).join('')}</ul></div>`
    : '';

  const nothingShown = !connStrings.length && !appSettings.length && !handlers.length && !authMode;

  host.innerHTML = `<style>${CSS}</style>
<div class="wc-head">
  <span class="badge-wc">ASP.NET</span>
  <div class="wc-title">web.config</div>
</div>
${infoTags.length ? `<div class="wc-info-row">${infoTags.join('')}</div>` : ''}
${connHtml}
${appSettingsHtml}
${handlersHtml}
${nothingShown ? '<p class="wc-empty">No recognized configuration sections found.</p>' : ''}`;

  return { parentNode: host };
}
