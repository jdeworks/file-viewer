const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.rc-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0969da;color:#fff;vertical-align:middle;margin-right:8px;}
.rc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.rc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.rc-section{margin:0 0 6px;font-size:13px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em;}
.rc-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:12px;}
.rc-ns-list{list-style:none;margin:4px 0 0;padding:0;}
.rc-ns-list li{display:flex;align-items:center;gap:8px;padding:3px 0;font-family:ui-monospace,monospace;font-size:13px;}
.rc-ns-ip{font-weight:600;color:var(--fg,#24292f);}
.rc-ns-note{font-size:11px;color:var(--fg-2,#888);}
.rc-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;}
.rc-chip{display:inline-block;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:10px;padding:2px 9px;font-size:12px;font-family:ui-monospace,monospace;}
.rc-opts-table{width:100%;border-collapse:collapse;font-size:13px;}
.rc-opts-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12px;vertical-align:top;}
.rc-opts-table td:first-child{color:var(--fg-2,#888);width:40%;}
.rc-domain-val{font-family:ui-monospace,monospace;font-size:13px;font-weight:600;}
`;

function parseResolvConf(text) {
  const nameservers = [];
  const search = [];
  let domain = null;
  const options = {};

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const parts = line.split(/\s+/);
    const directive = parts[0].toLowerCase();
    if (directive === 'nameserver' && parts[1]) {
      nameservers.push(parts[1]);
    } else if (directive === 'search') {
      search.push(...parts.slice(1));
    } else if (directive === 'domain' && parts[1]) {
      domain = parts[1];
    } else if (directive === 'options') {
      for (const opt of parts.slice(1)) {
        const [k, v] = opt.split(':');
        options[k] = v !== undefined ? v : true;
      }
    }
  }

  return { nameservers, search, domain, options };
}

function isPublicDns(ip) {
  const PUBLIC = ['8.8.8.8', '8.8.4.4', '1.1.1.1', '1.0.0.1', '9.9.9.9', '208.67.222.222', '208.67.220.220'];
  return PUBLIC.includes(ip);
}

export function render(intake) {
  const { nameservers, search, domain, options } = parseResolvConf(intake.text || '');

  const nsItems = nameservers.map((ip) => {
    const note = isPublicDns(ip) ? '<span class="rc-ns-note">(public DNS — pingable from internet)</span>' : '';
    return `<li><span class="rc-ns-ip">${esc(ip)}</span>${note}</li>`;
  }).join('');

  const nsSection = nameservers.length ? `
<div class="rc-section">Nameservers</div>
<div class="rc-card">
  <ul class="rc-ns-list">${nsItems}</ul>
</div>` : '';

  const searchSection = search.length ? `
<div class="rc-section">Search domains</div>
<div class="rc-card">
  <div class="rc-chips">${search.map((s) => `<span class="rc-chip">${esc(s)}</span>`).join('')}</div>
</div>` : '';

  const domainSection = domain ? `
<div class="rc-section">Domain</div>
<div class="rc-card">
  <span class="rc-domain-val">${esc(domain)}</span>
</div>` : '';

  const optKeys = Object.keys(options);
  const optsSection = optKeys.length ? `
<div class="rc-section">Options</div>
<div class="rc-card">
  <table class="rc-opts-table"><tbody>
    ${optKeys.map((k) => `<tr><td>${esc(k)}</td><td>${options[k] === true ? '(set)' : esc(options[k])}</td></tr>`).join('')}
  </tbody></table>
</div>` : '';

  const totalDirectives = nameservers.length + (search.length ? 1 : 0) + (domain ? 1 : 0) + optKeys.length;

  const host = document.createElement('div');
  host.className = 'rc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="rc-title"><span class="rc-badge">resolv.conf</span>resolv.conf</div>
<div class="rc-sub">DNS resolver configuration · ${nameservers.length} nameserver${nameservers.length !== 1 ? 's' : ''} · ${totalDirectives} directive${totalDirectives !== 1 ? 's' : ''}</div>
${nsSection}${searchSection}${domainSection}${optsSection}
${!nameservers.length && !search.length && !domain && !optKeys.length ? '<p style="color:var(--fg-2,#888);font-size:13px;">No directives found.</p>' : ''}`;
  return { parentNode: host };
}
