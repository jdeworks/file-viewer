import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.tetragon-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.tetragon-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#643DC2;color:#fff;vertical-align:middle;margin-right:8px;}
.tetragon-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.tetragon-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.tetragon-sec{margin:12px 0;}
.tetragon-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.tetragon-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:0 0 8px;}
.tetragon-pill{display:inline-flex;align-items:center;font-size:11px;padding:2px 9px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px;}
.tetragon-pill.action-signal{background:#fef2f2;border-color:#fca5a5;color:#991b1b;}
.tetragon-pill.action-override{background:#fff7ed;border-color:#fdba74;color:#c2410c;}
.tetragon-pill.action-follow{background:#f0fdf4;border-color:#86efac;color:#166534;}
.tetragon-pill.action-notif{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8;}
.tetragon-pill.action-other{background:#faf5ff;border-color:#c4b5fd;color:#6d28d9;}
.tetragon-pill.syscall-yes{background:#f0fdf4;border-color:#86efac;color:#166534;}
.tetragon-pill.syscall-no{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.tetragon-pill.scope{background:#faf5ff;border-color:#c4b5fd;color:#6d28d9;}
.tetragon-fn{font:12px/1.4 ui-monospace,monospace;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:2px 6px;}
.tetragon-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:4px 0;}
.tetragon-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.tetragon-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
.tetragon-entry-title{font-size:13px;font-weight:600;margin:0 0 6px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
`;

const ACTION_CLASS = {
  signal: 'action-signal', sigkill: 'action-signal', sigterm: 'action-signal',
  override: 'action-override',
  followfd: 'action-follow', unfollowfd: 'action-follow',
  post: 'action-notif', notifyenforcer: 'action-notif',
  tracelrootfs: 'action-other', geturl: 'action-other',
};

function actionClass(a) {
  const key = (typeof a === 'string' ? a : (a.action || '')).toLowerCase();
  return ACTION_CLASS[key] || 'action-other';
}

function actionLabel(a) {
  return typeof a === 'string' ? a : (a.action || JSON.stringify(a));
}

function selTypes(selectors) {
  if (!Array.isArray(selectors)) return [];
  const types = new Set();
  for (const sel of selectors) {
    if (sel.matchPIDs || sel.matchPids) types.add('pid');
    if (sel.matchBinaries) types.add('binary');
    if (sel.matchNamespaces) types.add('namespace');
    if (sel.matchCapabilities) types.add('capability');
    if (sel.matchArgs) types.add('args');
    if (sel.matchActions) types.add('actions');
  }
  return [...types];
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const kind = cfg.kind || 'TracingPolicy';
  const isNamespaced = kind === 'TracingPolicyNamespaced';
  const meta = cfg.metadata || {};
  const spec = cfg.spec || {};
  const name = meta.name || '';
  const namespace = meta.namespace || '';

  // Metadata section
  const metaRows = [
    name && `<span class="tetragon-k">name</span><span class="tetragon-v">${esc(name)}</span>`,
    namespace && `<span class="tetragon-k">namespace</span><span class="tetragon-v">${esc(namespace)}</span>`,
    `<span class="tetragon-k">kind</span><span class="tetragon-v">${esc(kind)}</span>`,
  ].filter(Boolean);
  const metaHtml = metaRows.length
    ? `<div class="tetragon-sec"><h3>Metadata</h3>
        <div class="tetragon-card"><div class="tetragon-kv">${metaRows.join('')}</div>
        ${isNamespaced ? '<div style="margin-top:6px;"><span class="tetragon-pill scope">namespace-scoped policy</span></div>' : ''}
        </div>
      </div>`
    : '';

  // Kprobes
  const kprobes = Array.isArray(spec.kprobes) ? spec.kprobes : [];
  let kprobesHtml = '';
  if (kprobes.length) {
    const cards = kprobes.map((kp) => {
      const call = kp.call || '';
      const isSyscall = kp.syscall === true;
      const args = Array.isArray(kp.args) ? kp.args : [];
      const selectors = Array.isArray(kp.selectors) ? kp.selectors : [];
      const actions = selectors.flatMap((s) => Array.isArray(s.matchActions) ? s.matchActions : []);
      const selTypeList = selTypes(selectors);
      const actionChips = actions.map((a) => `<span class="tetragon-pill ${actionClass(a)}">${esc(actionLabel(a))}</span>`).join('');
      return `<div class="tetragon-card">
        <div class="tetragon-entry-title">
          <code class="tetragon-fn">${esc(call)}</code>
          <span class="tetragon-pill ${isSyscall ? 'syscall-yes' : 'syscall-no'}">syscall: ${isSyscall ? 'yes' : 'no'}</span>
        </div>
        <div class="tetragon-kv">
          ${args.length ? `<span class="tetragon-k">args</span><span class="tetragon-v">${args.length}</span>` : ''}
          ${selectors.length ? `<span class="tetragon-k">selectors</span><span class="tetragon-v">${selectors.length}${selTypeList.length ? ' (' + selTypeList.join(', ') + ')' : ''}</span>` : ''}
        </div>
        ${actionChips ? `<div style="margin-top:6px;">${actionChips}</div>` : ''}
      </div>`;
    }).join('');
    kprobesHtml = `<div class="tetragon-sec"><h3>kprobes (${kprobes.length})</h3>${cards}</div>`;
  }

  // Tracepoints
  const tracepoints = Array.isArray(spec.tracepoints) ? spec.tracepoints : [];
  let tracepointsHtml = '';
  if (tracepoints.length) {
    const cards = tracepoints.map((tp) => {
      const subsys = tp.subsystem || tp.subsys || '';
      const event = tp.event || '';
      const args = Array.isArray(tp.args) ? tp.args : [];
      const selectors = Array.isArray(tp.selectors) ? tp.selectors : [];
      const actions = selectors.flatMap((s) => Array.isArray(s.matchActions) ? s.matchActions : []);
      const actionChips = actions.map((a) => `<span class="tetragon-pill ${actionClass(a)}">${esc(actionLabel(a))}</span>`).join('');
      return `<div class="tetragon-card">
        <div class="tetragon-entry-title">
          <code class="tetragon-fn">${esc(subsys)}${event ? ':' + esc(event) : ''}</code>
        </div>
        <div class="tetragon-kv">
          ${args.length ? `<span class="tetragon-k">args</span><span class="tetragon-v">${args.length}</span>` : ''}
          ${selectors.length ? `<span class="tetragon-k">selectors</span><span class="tetragon-v">${selectors.length}</span>` : ''}
        </div>
        ${actionChips ? `<div style="margin-top:6px;">${actionChips}</div>` : ''}
      </div>`;
    }).join('');
    tracepointsHtml = `<div class="tetragon-sec"><h3>tracepoints (${tracepoints.length})</h3>${cards}</div>`;
  }

  // Uprobes
  const uprobes = Array.isArray(spec.uprobes) ? spec.uprobes : [];
  let uprobesHtml = '';
  if (uprobes.length) {
    const cards = uprobes.map((up) => {
      const path = up.path || up.binary || '';
      const symbols = Array.isArray(up.symbols) ? up.symbols : (up.symbol ? [up.symbol] : []);
      return `<div class="tetragon-card">
        <div class="tetragon-entry-title"><code class="tetragon-fn">${esc(path)}</code></div>
        ${symbols.length ? `<div class="tetragon-kv"><span class="tetragon-k">symbols</span><span class="tetragon-v">${esc(symbols.join(', '))}</span></div>` : ''}
      </div>`;
    }).join('');
    uprobesHtml = `<div class="tetragon-sec"><h3>uprobes (${uprobes.length})</h3>${cards}</div>`;
  }

  const subParts = [
    name ? name : '',
    kprobes.length ? `${kprobes.length} kprobe${kprobes.length !== 1 ? 's' : ''}` : '',
    tracepoints.length ? `${tracepoints.length} tracepoint${tracepoints.length !== 1 ? 's' : ''}` : '',
    uprobes.length ? `${uprobes.length} uprobe${uprobes.length !== 1 ? 's' : ''}` : '',
    isNamespaced ? 'namespace-scoped' : '',
  ].filter(Boolean);

  const host = document.createElement('div');
  host.className = 'tetragon-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="tetragon-title"><span class="tetragon-badge">Tetragon</span>Tetragon TracingPolicy</div>
<div class="tetragon-sub">${esc(subParts.join(' · ') || 'Cilium Tetragon eBPF runtime security policy')}</div>
${metaHtml}${kprobesHtml}${tracepointsHtml}${uprobesHtml}`;

  return { parentNode: host };
}
