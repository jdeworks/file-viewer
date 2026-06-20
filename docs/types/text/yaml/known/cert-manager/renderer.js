import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function row(label, value) {
  if (value == null || value === '') return '';
  return `<tr><td class="certmgr-label">${esc(label)}</td><td class="certmgr-val">${esc(value)}</td></tr>`;
}

export async function render(intake) {
  const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
  const text = intake.text || '';
  let allDocs = [];
  try { allDocs = jsyaml.loadAll(text) || []; } catch { /* ignore parse errors */ }
  allDocs = allDocs.filter(Boolean);

  const host = document.createElement('div');
  host.className = 'certmgr-doc';

  const docsHtml = allDocs.map((doc) => {
    const kind = doc.kind || 'Resource';
    const meta = doc.metadata || {};
    const name = meta.name || '';
    const namespace = meta.namespace || '';
    const spec = doc.spec || {};

    let fieldsHtml = '';

    if (kind === 'Certificate') {
      const secretName = spec.secretName || '';
      const commonName = spec.commonName || '';
      const dnsNames = (spec.dnsNames || []).join(', ');
      const duration = spec.duration || '';
      const renewBefore = spec.renewBefore || '';
      const issuerRef = spec.issuerRef || {};
      const issuerName = issuerRef.name || '';
      const issuerKind = issuerRef.kind || '';
      fieldsHtml = `<table class="certmgr-table">
${row('Secret name', secretName)}
${commonName ? row('Common name', commonName) : ''}
${dnsNames ? row('DNS names', dnsNames) : ''}
${duration ? row('Duration', duration) : ''}
${renewBefore ? row('Renew before', renewBefore) : ''}
${issuerName ? row('Issuer', issuerKind ? `${issuerName} (${issuerKind})` : issuerName) : ''}
</table>`;
    } else if (kind === 'ClusterIssuer' || kind === 'Issuer') {
      const acme = spec.acme;
      const ca = spec.ca;
      const vault = spec.vault;
      if (acme) {
        const server = acme.server || '';
        const email = acme.email || '';
        const privateKeyRef = (acme.privateKeySecretRef || {}).name || '';
        fieldsHtml = `<table class="certmgr-table">
${row('Type', 'ACME')}
${row('Server', server)}
${email ? row('Email', email) : ''}
${privateKeyRef ? row('Private key ref', privateKeyRef) : ''}
</table>`;
      } else if (ca) {
        const secretName = ca.secretName || '';
        fieldsHtml = `<table class="certmgr-table">
${row('Type', 'CA')}
${row('Secret name', secretName)}
</table>`;
      } else if (vault) {
        const vaultServer = vault.server || '';
        const path = vault.path || '';
        fieldsHtml = `<table class="certmgr-table">
${row('Type', 'Vault')}
${row('Server', vaultServer)}
${path ? row('Path', path) : ''}
</table>`;
      } else {
        fieldsHtml = `<table class="certmgr-table">${row('Kind', kind)}</table>`;
      }
    } else {
      const apiVersion = doc.apiVersion || '';
      fieldsHtml = `<table class="certmgr-table">${row('API version', apiVersion)}</table>`;
    }

    return `<div class="certmgr-resource">
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
  <span class="badge-certmgr">cert-manager</span>
  <span class="certmgr-kind-badge">${esc(kind)}</span>
  ${name ? `<span class="certmgr-name">${esc(name)}</span>` : ''}
</div>
${namespace ? `<div class="certmgr-meta">namespace: ${esc(namespace)}</div>` : ''}
${fieldsHtml}
</div>`;
  }).join('<hr class="certmgr-sep">');

  host.innerHTML = `<style>
.certmgr-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-certmgr{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00ADD8;color:#fff;margin-right:6px;vertical-align:middle;}
.certmgr-kind-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0089ab;color:#fff;margin-right:6px;vertical-align:middle;}
.certmgr-name{font-size:18px;font-weight:700;}
.certmgr-meta{font-size:12px;color:var(--fg-2,#888);margin:2px 0 10px;}
.certmgr-resource{margin:0 0 12px;}
.certmgr-table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;}
.certmgr-label{color:var(--fg-2,#888);font-size:12px;padding:4px 16px 4px 0;white-space:nowrap;vertical-align:top;min-width:120px;}
.certmgr-val{font:13px ui-monospace,monospace;padding:4px 0;word-break:break-all;}
.certmgr-table tr{border-bottom:1px solid var(--border,#e0e0e0);}
.certmgr-table tr:last-child{border-bottom:none;}
.certmgr-sep{border:none;border-top:1px solid var(--border,#e0e0e0);margin:16px 0;}
</style>
${docsHtml || '<div style="color:var(--fg-2,#888);font-size:13px;">No cert-manager documents found.</div>'}`;

  return { parentNode: host };
}
