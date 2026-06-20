import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.lfh-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-lfh{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#FF4B4B;color:#fff;vertical-align:middle;margin-right:8px;}
.lfh-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.lfh-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.lfh-sec{margin:12px 0;}
.lfh-hook-hdr{font:13px/1.4 ui-monospace,monospace;font-weight:700;padding:6px 10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;margin:8px 0 4px;}
.lfh-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.lfh-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.lfh-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.lfh-cmd-name{font:12px/1.4 ui-monospace,monospace;font-weight:600;}
.lfh-cmd{font:11px/1.4 ui-monospace,monospace;color:var(--fg-2,#888);max-width:320px;word-break:break-all;}
.lfh-chip{display:inline-block;font-size:11px;padding:1px 6px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
`;

const HOOK_NAMES = new Set([
  'pre-commit', 'commit-msg', 'post-commit', 'pre-push', 'post-push',
  'pre-rebase', 'post-rebase', 'pre-merge-commit', 'post-merge',
  'prepare-commit-msg', 'post-checkout', 'post-rewrite',
]);

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || \'\') || [])[0] || {};
  } catch {
    cfg = intake.parsed || {};
  }

  if (!cfg || typeof cfg !== 'object') {
    const host = document.createElement('div');
    host.className = 'lfh-doc';
    host.innerHTML = `<style>${CSS}</style><div class="lfh-title"><span class="badge-lfh">Lefthook</span>Could not parse YAML</div>`;
    return { parentNode: host };
  }

  const hookKeys = Object.keys(cfg).filter((k) => HOOK_NAMES.has(k) || (cfg[k] && typeof cfg[k] === 'object' && cfg[k].commands));

  let totalCommands = 0;
  const hooksHtml = hookKeys.map((hook) => {
    const hookCfg = cfg[hook] || {};
    const commands = hookCfg.commands ? Object.entries(hookCfg.commands) : [];
    const scripts = hookCfg.scripts ? Object.keys(hookCfg.scripts) : [];
    totalCommands += commands.length + scripts.length;

    const rows = [
      ...commands.map(([name, cmd]) => {
        const run = cmd && (cmd.run || cmd.command) ? (cmd.run || cmd.command) : typeof cmd === 'string' ? cmd : '';
        const glob = cmd && cmd.glob ? cmd.glob : '';
        return `<tr>
          <td><span class="lfh-cmd-name">${esc(name)}</span></td>
          <td><span class="lfh-cmd">${esc(String(run).slice(0, 60))}${String(run).length > 60 ? '…' : ''}</span></td>
          <td><span class="lfh-chip">${esc(glob || 'all')}</span></td>
        </tr>`;
      }),
      ...scripts.map((name) => `<tr>
        <td><span class="lfh-cmd-name">${esc(name)}</span></td>
        <td colspan="2" style="font-size:11px;color:var(--fg-2,#888);">script</td>
      </tr>`),
    ].join('');

    const cnt = commands.length + scripts.length;
    return `<div>
      <div class="lfh-hook-hdr">${esc(hook)}${cnt ? ` <span style="font-weight:400;font-size:11px;color:var(--fg-2,#888);">${cnt} command${cnt !== 1 ? 's' : ''}</span>` : ''}</div>
      ${rows ? `<table class="lfh-table"><thead><tr><th>Name</th><th>Command</th><th>Glob</th></tr></thead><tbody>${rows}</tbody></table>` : ''}
    </div>`;
  }).join('');

  const host = document.createElement('div');
  host.className = 'lfh-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="lfh-title"><span class="badge-lfh">Lefthook</span>Lefthook config</div>
<div class="lfh-sub">${hookKeys.length} hook stage${hookKeys.length !== 1 ? 's' : ''} · ${totalCommands} command${totalCommands !== 1 ? 's' : ''}</div>
<div class="lfh-sec">${hooksHtml || '<span style="color:var(--fg-2,#888);">No hook stages found.</span>'}</div>`;

  return { parentNode: host };
}
