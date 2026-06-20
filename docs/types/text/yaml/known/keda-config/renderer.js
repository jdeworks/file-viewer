import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<span class="kd-k">${esc(label)}</span><span class="kd-v">${esc(String(value))}</span>`;
}

export async function render(intake) {
  const text = intake.text || '';
  let doc = {};
  try { doc = (jsYaml.loadAll(text) || [])[0] || {}; } catch { /* ignore */ }

  const kind = doc.kind || 'ScaledObject';
  const meta = doc.metadata || {};
  const name = meta.name || '';
  const namespace = meta.namespace || '';
  const spec = doc.spec || {};

  // Scale target
  const scaleTargetRef = spec.scaleTargetRef || {};
  const targetName = scaleTargetRef.name || '';
  const targetKind = scaleTargetRef.kind || 'Deployment';

  const minReplicas = spec.minReplicaCount != null ? spec.minReplicaCount : null;
  const maxReplicas = spec.maxReplicaCount != null ? spec.maxReplicaCount : null;
  const pollingInterval = spec.pollingInterval != null ? spec.pollingInterval : null;
  const cooldownPeriod = spec.cooldownPeriod != null ? spec.cooldownPeriod : null;

  // Triggers
  const triggers = Array.isArray(spec.triggers) ? spec.triggers : [];
  const triggerChips = triggers.map((t) => {
    const type = t.type || 'unknown';
    const meta2 = t.metadata || {};
    // Show a brief key from metadata (queue, topic, targetQueueLength, etc.)
    const firstKey = Object.keys(meta2)[0];
    const hint = firstKey ? ` (${firstKey}: ${String(meta2[firstKey]).slice(0, 30)})` : '';
    return `<span class="kd-chip">${esc(type)}${esc(hint)}</span>`;
  }).join('');

  const kvEntries = [
    targetName ? kv('scaleTargetRef', `${targetKind}/${targetName}`) : '',
    minReplicas != null ? kv('minReplicaCount', minReplicas) : '',
    maxReplicas != null ? kv('maxReplicaCount', maxReplicas) : '',
    pollingInterval != null ? kv('pollingInterval', pollingInterval + 's') : '',
    cooldownPeriod != null ? kv('cooldownPeriod', cooldownPeriod + 's') : '',
  ].filter(Boolean);

  const host = document.createElement('div');
  host.className = 'kd-doc';
  host.innerHTML = `<style>
.kd-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-kd{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2563eb;color:#fff;vertical-align:middle;margin-right:8px;}
.kd-kind-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1d4ed8;color:#fff;margin-right:6px;vertical-align:middle;}
.kd-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.kd-meta{font-size:12px;color:var(--fg-2,#888);margin:2px 0 12px;}
.kd-sec{margin:12px 0;}
.kd-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.kd-kv{display:grid;grid-template-columns:max-content 1fr;gap:5px 16px;font-size:13px;margin:6px 0;}
.kd-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.kd-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
.kd-triggers{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;}
.kd-chip{display:inline-block;font-size:11px;padding:2px 10px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
  <span class="badge-kd">KEDA</span>
  ${kind ? `<span class="kd-kind-badge">${esc(kind)}</span>` : ''}
  ${name ? `<span class="kd-title">${esc(name)}</span>` : ''}
</div>
${namespace ? `<div class="kd-meta">namespace: ${esc(namespace)}</div>` : ''}
${kvEntries.length ? `<div class="kd-sec"><h3>Scaling config</h3><div class="kd-kv">${kvEntries.join('')}</div></div>` : ''}
${triggers.length ? `<div class="kd-sec"><h3>Triggers (${triggers.length})</h3><div class="kd-triggers">${triggerChips}</div></div>` : ''}`;

  return { parentNode: host };
}
