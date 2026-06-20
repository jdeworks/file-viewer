import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function renderScaleBar(min, max) {
  const minV = Number(min) || 1;
  const maxV = Number(max) || 10;
  const pct = Math.round((minV / maxV) * 100);
  return `<div style="margin:12px 0">
    <div style="display:flex;align-items:center;gap:10px;font-size:13px;margin-bottom:6px">
      <span style="min-width:40px;text-align:right;color:var(--fg-2,#888);font-size:12px">min</span>
      <span style="font-weight:700;font-size:15px;color:var(--fg-1,#333)">${esc(minV)}</span>
      <div style="flex:1;height:10px;background:var(--bg-3,#e0e0e0);border-radius:5px;overflow:hidden;position:relative">
        <div style="position:absolute;left:0;top:0;height:100%;width:${pct}%;background:#326CE5;border-radius:5px;"></div>
      </div>
      <span style="font-weight:700;font-size:15px;color:var(--fg-1,#333)">${esc(maxV)}</span>
      <span style="min-width:40px;color:var(--fg-2,#888);font-size:12px">max</span>
    </div>
  </div>`;
}

function renderMetricRow(metric, i) {
  const type = metric.type || 'Unknown';
  let target = '';
  let resource = '';
  let desc = '';

  if (type === 'Resource') {
    const r = metric.resource || {};
    resource = r.name || '';
    const tgt = r.target || {};
    if (tgt.type === 'Utilization') {
      target = `${tgt.averageUtilization ?? '?'}%`;
      desc = `Average utilization`;
    } else if (tgt.type === 'AverageValue') {
      target = tgt.averageValue || '?';
      desc = `Average value`;
    } else {
      target = tgt.value || '?';
      desc = tgt.type || '';
    }
  } else if (type === 'Pods') {
    const p = metric.pods || {};
    resource = p.metric?.name || '';
    const tgt = p.target || {};
    target = tgt.averageValue || tgt.value || '?';
    desc = 'Per-pod average';
  } else if (type === 'External') {
    const e = metric.external || {};
    resource = e.metric?.name || '';
    const tgt = e.target || {};
    target = tgt.value || tgt.averageValue || '?';
    desc = 'External metric';
  } else if (type === 'Object') {
    const o = metric.object || {};
    resource = o.metric?.name || '';
    const tgt = o.target || {};
    target = tgt.value || tgt.averageValue || '?';
    desc = `Object: ${o.describedObject?.name || '?'}`;
  }

  // Utilization bar for Resource/CPU/Memory
  let bar = '';
  const utilPct = (type === 'Resource' && (metric.resource?.target?.type === 'Utilization'))
    ? Number(metric.resource?.target?.averageUtilization) : null;
  if (utilPct !== null && !isNaN(utilPct)) {
    const col = utilPct >= 80 ? '#d73a49' : utilPct >= 60 ? '#b08000' : '#22863a';
    bar = `<div style="margin-top:4px;height:6px;width:160px;background:var(--bg-3,#e0e0e0);border-radius:3px;overflow:hidden">
      <div style="height:100%;width:${Math.min(utilPct, 100)}%;background:${col};border-radius:3px"></div>
    </div>`;
  }

  const chipColor = type === 'Resource' ? '#326CE5' : '#6a1b9a';
  return `<tr>
    <td style="padding:8px 10px 8px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top">
      <span style="display:inline-block;padding:1px 7px;border-radius:4px;background:${chipColor}20;color:${chipColor};font-size:11px;font-weight:600;border:1px solid ${chipColor}40">${esc(type)}</span>
    </td>
    <td style="padding:8px 10px 8px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12.5px">${esc(resource || '—')}</td>
    <td style="padding:8px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top">
      <span style="font-weight:600;font-size:13px">${esc(target)}</span>
      ${desc ? `<span style="font-size:11px;color:var(--fg-2,#888);margin-left:4px">${esc(desc)}</span>` : ''}
      ${bar}
    </td>
  </tr>`;
}

export async function render(intake) {
  const jsYaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
  const text = intake.text || '';
  let doc = {};
  try { doc = jsYaml.load(text) || {}; } catch { /* fall through */ }

  const meta = doc.metadata || {};
  const spec = doc.spec || {};
  const name = meta.name || '';
  const namespace = meta.namespace || '';
  const scaleTargetRef = spec.scaleTargetRef || {};
  const minReplicas = spec.minReplicas ?? 1;
  const maxReplicas = spec.maxReplicas ?? '?';
  const metrics = spec.metrics || [];

  const host = document.createElement('div');
  host.className = 'hpa-doc';

  host.innerHTML = `<style>
.hpa-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;}
.hpa-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#326CE5;color:#fff;margin-right:8px;vertical-align:middle;}
.hpa-kind{font-size:19px;font-weight:700;margin:0;}
.hpa-api{font-size:12px;color:var(--fg-2,#888);margin:2px 0 10px;}
.hpa-sec{margin:16px 0;}
.hpa-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.hpa-tag{display:inline-block;padding:1px 7px;border-radius:4px;background:var(--bg-3,#eee);font-size:12px;margin:2px 2px 0 0;}
</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="hpa-badge">HPA</span>
  <span class="hpa-kind">HorizontalPodAutoscaler</span>
</div>
<div class="hpa-api">${esc(doc.apiVersion || '')}</div>
<div class="hpa-sec">
  <table style="border-collapse:collapse;font-size:13px">
    <tbody>
      ${name ? `<tr><td style="padding:4px 12px 4px 0;color:var(--fg-2,#888);font-size:12.5px">Name</td><td style="font-family:ui-monospace,monospace">${esc(name)}</td></tr>` : ''}
      ${namespace ? `<tr><td style="padding:4px 12px 4px 0;color:var(--fg-2,#888);font-size:12.5px">Namespace</td><td><span class="hpa-tag">${esc(namespace)}</span></td></tr>` : ''}
      ${scaleTargetRef.kind ? `<tr><td style="padding:4px 12px 4px 0;color:var(--fg-2,#888);font-size:12.5px">Target</td><td><span class="hpa-tag">${esc(scaleTargetRef.kind)}</span> <span style="font-family:ui-monospace,monospace;font-size:13px">${esc(scaleTargetRef.name || '')}</span></td></tr>` : ''}
    </tbody>
  </table>
</div>
<div class="hpa-sec">
  <h3>Replica Scale</h3>
  ${renderScaleBar(minReplicas, maxReplicas)}
  <div style="font-size:12px;color:var(--fg-2,#888)">Scales between <strong>${esc(minReplicas)}</strong> and <strong>${esc(maxReplicas)}</strong> replicas</div>
</div>
${metrics.length ? `<div class="hpa-sec">
  <h3>Metrics (${metrics.length})</h3>
  <table style="width:100%;border-collapse:collapse;font-size:13px">
    <thead><tr>
      <th style="text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.03em;border-bottom:2px solid var(--border,#e0e0e0);padding:4px 10px 4px 0">Type</th>
      <th style="text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.03em;border-bottom:2px solid var(--border,#e0e0e0);padding:4px 10px 4px 0">Metric</th>
      <th style="text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.03em;border-bottom:2px solid var(--border,#e0e0e0);padding:4px 0 4px 0">Target</th>
    </tr></thead>
    <tbody>${metrics.map(renderMetricRow).join('')}</tbody>
  </table>
</div>` : ''}`;

  return { parentNode: host };
}
