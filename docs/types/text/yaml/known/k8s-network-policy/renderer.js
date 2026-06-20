import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function chips(items) {
  if (!items || !items.length) return '';
  return items.map(v => `<span class="np-tag">${esc(v)}</span>`).join('');
}

function renderSelector(sel) {
  if (!sel) return '<span style="color:var(--fg-2,#888);font-size:13px">— (all pods)</span>';
  const labels = sel.matchLabels || {};
  const exprs = sel.matchExpressions || [];
  const parts = Object.entries(labels).map(([k, v]) => `${k}=${v}`);
  exprs.forEach(e => parts.push(`${e.key} ${e.operator} [${(e.values || []).join(',')}]`));
  if (!parts.length) return '<span class="np-tag">all pods</span>';
  return chips(parts);
}

function renderPeer(peer, idx) {
  const parts = [];
  if (peer.podSelector != null) {
    const labels = peer.podSelector?.matchLabels || {};
    const ls = Object.entries(labels).map(([k, v]) => `pod:${k}=${v}`);
    parts.push(ls.length ? chips(ls) : '<span class="np-tag" style="background:#e3f2fd;color:#1565c0">pods: all</span>');
  }
  if (peer.namespaceSelector != null) {
    const labels = peer.namespaceSelector?.matchLabels || {};
    const ls = Object.entries(labels).map(([k, v]) => `ns:${k}=${v}`);
    parts.push(ls.length ? chips(ls) : '<span class="np-tag" style="background:#e8f5e9;color:#2e7d32">ns: all</span>');
  }
  if (peer.ipBlock) {
    const except = (peer.ipBlock.except || []).map(e => esc(e)).join(', ');
    parts.push(`<span class="np-tag" style="background:#fff3e0;color:#e65100">${esc(peer.ipBlock.cidr)}${except ? ' (except: ' + except + ')' : ''}</span>`);
  }
  return parts.join(' ') || '<span class="np-tag">any</span>';
}

function renderPorts(ports) {
  if (!ports || !ports.length) return '';
  return ports.map(p => {
    const proto = p.protocol || 'TCP';
    return `<span class="np-tag" style="background:#f3e5f5;color:#6a1b9a">${esc(proto)}/${esc(p.port ?? '*')}</span>`;
  }).join('');
}

function renderIngressRules(rules) {
  if (!rules) return `<div class="np-alert np-alert-block">Blocks all ingress (no ingress rules defined)</div>`;
  if (!rules.length) return `<div class="np-alert np-alert-block">Blocks all ingress (empty ingress array)</div>`;
  return rules.map((rule, i) => {
    const froms = rule.from || [];
    const ports = renderPorts(rule.ports);
    return `<div class="np-rule">
      <div class="np-rule-hdr">Rule ${i + 1}${ports ? ' &nbsp;' + ports : ''}</div>
      ${froms.length ? froms.map(f => `<div class="np-rule-peer">From: ${renderPeer(f)}</div>`).join('') : '<div class="np-rule-peer" style="color:var(--fg-2,#888)">From: all sources</div>'}
    </div>`;
  }).join('');
}

function renderEgressRules(rules) {
  if (!rules) return `<div class="np-alert np-alert-block">Blocks all egress (no egress rules defined)</div>`;
  if (!rules.length) return `<div class="np-alert np-alert-block">Blocks all egress (empty egress array)</div>`;
  return rules.map((rule, i) => {
    const tos = rule.to || [];
    const ports = renderPorts(rule.ports);
    return `<div class="np-rule">
      <div class="np-rule-hdr">Rule ${i + 1}${ports ? ' &nbsp;' + ports : ''}</div>
      ${tos.length ? tos.map(t => `<div class="np-rule-peer">To: ${renderPeer(t)}</div>`).join('') : '<div class="np-rule-peer" style="color:var(--fg-2,#888)">To: all destinations</div>'}
    </div>`;
  }).join('');
}

export async function render(intake) {
  const jsYaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
  const text = intake.text || '';
  let doc = {};
  try { doc = (jsYaml.loadAll(text) || [])[0] || {}; } catch { /* fall through */ }

  const meta = doc.metadata || {};
  const spec = doc.spec || {};
  const name = meta.name || '';
  const namespace = meta.namespace || '';
  const policyTypes = spec.policyTypes || [];

  // Determine if ingress/egress are managed
  const managesIngress = policyTypes.includes('Ingress') || (spec.ingress !== undefined && !policyTypes.length);
  const managesEgress = policyTypes.includes('Egress');

  const host = document.createElement('div');
  host.className = 'np-doc';

  host.innerHTML = `<style>
.np-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;}
.np-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#326CE5;color:#fff;margin-right:8px;vertical-align:middle;}
.np-kind{font-size:19px;font-weight:700;margin:0;}
.np-api{font-size:12px;color:var(--fg-2,#888);margin:2px 0 10px;}
.np-sec{margin:16px 0;}
.np-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.np-tag{display:inline-block;padding:1px 7px;border-radius:4px;background:var(--bg-3,#eee);font-size:12px;margin:2px 2px 0 0;}
.np-alert{padding:8px 12px;border-radius:6px;font-size:13px;margin:4px 0;}
.np-alert-block{background:#fff3cd;color:#856404;border:1px solid #ffc10740;}
.np-rule{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin:6px 0;}
.np-rule-hdr{font-size:12px;font-weight:600;color:var(--fg-1,#333);margin-bottom:4px;}
.np-rule-peer{font-size:12.5px;color:var(--fg-1,#333);margin:2px 0;}
.np-selector{display:flex;flex-wrap:wrap;gap:4px;}
</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="np-badge">NetworkPolicy</span>
  <span class="np-kind">NetworkPolicy</span>
</div>
<div class="np-api">${esc(doc.apiVersion || '')}</div>
<div class="np-sec">
  <table style="border-collapse:collapse;font-size:13px">
    <tbody>
      ${name ? `<tr><td style="padding:4px 12px 4px 0;color:var(--fg-2,#888);font-size:12.5px">Name</td><td style="font-family:ui-monospace,monospace">${esc(name)}</td></tr>` : ''}
      ${namespace ? `<tr><td style="padding:4px 12px 4px 0;color:var(--fg-2,#888);font-size:12.5px">Namespace</td><td><span class="np-tag">${esc(namespace)}</span></td></tr>` : ''}
      ${policyTypes.length ? `<tr><td style="padding:4px 12px 4px 0;color:var(--fg-2,#888);font-size:12.5px">Policy Types</td><td>${chips(policyTypes)}</td></tr>` : ''}
    </tbody>
  </table>
</div>
<div class="np-sec">
  <h3>Pod Selector (applies to)</h3>
  <div class="np-selector">${renderSelector(spec.podSelector)}</div>
</div>
${managesIngress || spec.ingress !== undefined ? `<div class="np-sec">
  <h3>Ingress Rules</h3>
  ${renderIngressRules(spec.ingress)}
</div>` : '<div class="np-sec"><h3>Ingress Rules</h3><div class="np-alert" style="background:var(--bg-2,#f6f8fa);color:var(--fg-2,#888);border:1px solid var(--border,#e0e0e0)">Ingress not managed by this policy</div></div>'}
${managesEgress || spec.egress !== undefined ? `<div class="np-sec">
  <h3>Egress Rules</h3>
  ${renderEgressRules(spec.egress)}
</div>` : ''}`;

  return { parentNode: host };
}
