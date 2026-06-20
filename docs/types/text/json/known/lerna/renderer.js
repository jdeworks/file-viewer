const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.lernajson-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-lernajson{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#9333ea;color:#fff;vertical-align:middle;margin-right:8px;}
.lernajson-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.lernajson-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.lernajson-sec{margin:12px 0;}
.lernajson-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.lernajson-pills{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0;}
.lernajson-pill{display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.lernajson-badge{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:2px 4px 2px 0;}
.lernajson-badge.on{background:#dcfce7;border-color:#86efac;color:#166534;}
.lernajson-badge.off{background:#fee2e2;border-color:#fca5a5;color:#991b1b;}
.lernajson-kv{font-size:12px;color:var(--fg-2,#888);}
`;

export function render(intake) {
  let cfg;
  try {
    cfg = intake.parsed ?? JSON.parse(intake.text || '{}');
  } catch {
    return { parentNode: Object.assign(document.createElement('div'), { textContent: 'Invalid Lerna JSON.' }) };
  }

  const version = cfg.version || null;
  const npmClient = cfg.npmClient || 'npm';
  const packages = Array.isArray(cfg.packages) ? cfg.packages : [];
  const useWorkspaces = cfg.useWorkspaces === true;
  const independentVersions = cfg.version === 'independent';
  const stream = cfg.stream === true;
  const ci = cfg.ci === true;
  const useNx = cfg.useNx === true;

  // command.publish settings
  const publishCfg = cfg.command?.publish || {};
  const conventionalCommitsPublish = publishCfg.conventionalCommits === true;
  const publishRegistry = publishCfg.registry || null;
  const publishMessage = publishCfg.message || null;

  // command.version settings
  const versionCfg = cfg.command?.version || {};
  const conventionalCommitsVersion = versionCfg.conventionalCommits === true || cfg.conventionalCommits === true;
  const versionMessage = versionCfg.message || null;

  // ignoreChanges
  const ignoreChanges = Array.isArray(cfg.ignoreChanges) ? cfg.ignoreChanges
    : Array.isArray(cfg.command?.version?.ignoreChanges) ? cfg.command.version.ignoreChanges
    : [];

  const host = document.createElement('div');
  host.className = 'lernajson-doc';

  const versionLabel = independentVersions ? 'independent' : version ? `v${esc(version)}` : null;

  const pkgHtml = packages.length
    ? `<div class="lernajson-sec"><h3>Packages (${packages.length})</h3><div class="lernajson-pills">${packages.map((p) => `<span class="lernajson-pill">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const settingsBadges = [
    `<span class="lernajson-badge">npm client: ${esc(npmClient)}</span>`,
    useWorkspaces ? '<span class="lernajson-badge on">workspaces</span>' : '',
    independentVersions ? '<span class="lernajson-badge on">independent versions</span>' : '',
    stream ? '<span class="lernajson-badge on">stream</span>' : '',
    ci ? '<span class="lernajson-badge on">CI mode</span>' : '',
    useNx ? '<span class="lernajson-badge on">useNx</span>' : '',
  ].filter(Boolean).join('');

  const settingsHtml = `<div class="lernajson-sec"><h3>Settings</h3><div class="lernajson-pills">${settingsBadges}</div></div>`;

  const publishRows = [
    conventionalCommitsPublish ? '<span class="lernajson-badge on">conventional commits</span>' : '',
    publishRegistry ? `<span class="lernajson-badge">registry: ${esc(publishRegistry)}</span>` : '',
    publishMessage ? `<span class="lernajson-badge">message: ${esc(publishMessage)}</span>` : '',
  ].filter(Boolean);

  const publishHtml = publishRows.length
    ? `<div class="lernajson-sec"><h3>Publish</h3><div class="lernajson-pills">${publishRows.join('')}</div></div>`
    : '';

  const versionRows = [
    conventionalCommitsVersion ? '<span class="lernajson-badge on">conventional commits</span>' : '',
    versionMessage ? `<span class="lernajson-badge">message: ${esc(versionMessage)}</span>` : '',
  ].filter(Boolean);

  const versionHtml = versionRows.length
    ? `<div class="lernajson-sec"><h3>Version</h3><div class="lernajson-pills">${versionRows.join('')}</div></div>`
    : '';

  const ignoreHtml = ignoreChanges.length
    ? `<div class="lernajson-sec"><h3>Ignore changes (${ignoreChanges.length})</h3><div class="lernajson-pills">${ignoreChanges.map((p) => `<span class="lernajson-pill">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="lernajson-title"><span class="badge-lernajson">Lerna</span>lerna.json</div>
<div class="lernajson-sub">${versionLabel ? `version: ${versionLabel}` : 'monorepo config'}${packages.length ? ` · ${packages.length} package glob${packages.length !== 1 ? 's' : ''}` : ''}</div>
${pkgHtml}
${settingsHtml}
${publishHtml}
${versionHtml}
${ignoreHtml}`;

  return { parentNode: host };
}
