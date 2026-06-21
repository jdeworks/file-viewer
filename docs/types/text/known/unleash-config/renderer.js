// Unleash client config (unleash.config.{js,ts}) viewer. Extracts the initialize() option
// fields with regex. Pure text parsing — no eval, no execution. Auth tokens are redacted.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.unl-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-unl{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a1a2e;color:#fff;vertical-align:middle;margin-right:8px}
.unl-title{font-size:18px;font-weight:700;margin:0 0 4px}
.unl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.unl-sec{margin:12px 0}
.unl-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.unl-table{width:100%;border-collapse:collapse;font-size:13px}
.unl-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top}
.unl-table td:first-child{color:var(--fg-2,#888);font-size:12px;white-space:nowrap;width:160px}
.unl-table td:last-child{font-family:ui-monospace,monospace;word-break:break-all}
.unl-table tr:last-child td{border-bottom:none}
.unl-masked{color:var(--fg-2,#aaa);font-style:italic}
.unl-info{background:#fff8e1;border:1px solid #ffe082;border-radius:6px;padding:8px 12px;font-size:12px;color:#7a5c00;margin-top:10px}
`;

// String literal: key: 'value' / "value" / `value`
function strOpt(text, key) {
  const m = new RegExp(`\\b${key}\\s*:\\s*['"\`]([^'"\`]+)['"\`]`).exec(text);
  return m ? m[1].trim() : null;
}

// Any expression after the key (e.g. process.env.X, a number) up to the line/comma.
function exprOpt(text, key) {
  const m = new RegExp(`\\b${key}\\s*:\\s*([^,\\n}]+)`).exec(text);
  return m ? m[1].trim() : null;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const name = (intake.name || intake.filename || 'unleash.config.js').split('/').pop();

  const url = strOpt(text, 'url');
  const appName = strOpt(text, 'appName');
  const environment = strOpt(text, 'environment') || exprOpt(text, 'environment');
  const instanceId = strOpt(text, 'instanceId') || exprOpt(text, 'instanceId');
  const refreshInterval = exprOpt(text, 'refreshInterval');
  const metricsInterval = exprOpt(text, 'metricsInterval');

  // Detect auth token / Authorization header presence and redact the value.
  const hasAuth = /\bAuthorization\s*:/.test(text) || /\b(apiToken|token|clientKey)\s*:/.test(text) || /customHeaders\s*:/.test(text);

  function row(label, value) {
    if (value == null || value === '') return '';
    return `<tr><td>${esc(label)}</td><td>${esc(value)}</td></tr>`;
  }

  const rows = [
    row('appName', appName),
    row('url', url),
    row('environment', environment),
    row('instanceId', instanceId),
    row('refreshInterval', refreshInterval),
    row('metricsInterval', metricsInterval),
    hasAuth ? `<tr><td>API token</td><td><span class="unl-masked">[redacted]</span></td></tr>` : '',
  ].filter(Boolean).join('');

  const host = document.createElement('div');
  host.className = 'unl-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="unl-title"><span class="badge-unl">Unleash</span>${esc(name)}</div>
<div class="unl-sub">Unleash feature-toggle client configuration</div>
${rows ? `<div class="unl-sec"><h3>Client options</h3><table class="unl-table">${rows}</table></div>` : '<div style="color:var(--fg-2,#888);font-size:13px;">No initialize() options detected.</div>'}
${hasAuth ? '<div class="unl-info">The Unleash API token / Authorization header is redacted. Tokens are typically injected from an environment variable at runtime.</div>' : ''}`;

  return { parentNode: host };
}
