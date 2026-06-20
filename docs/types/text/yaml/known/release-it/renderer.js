import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.releaseit-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.releaseit-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#16a34a;color:#fff;vertical-align:middle;margin-right:8px;}
.releaseit-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.releaseit-sec{margin:14px 0;}
.releaseit-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.releaseit-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px;}
.releaseit-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0;}
.releaseit-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.releaseit-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
.releaseit-dim{font-size:11px;color:var(--fg-2,#888);}
.releaseit-mono{font-family:ui-monospace,monospace;font-size:12px;}
.releaseit-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
.releaseit-hook{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:6px 10px;font:12px/1.5 ui-monospace,monospace;margin:3px 0;word-break:break-all;}
.releaseit-on{color:#16a34a;font-weight:700;}
.releaseit-off{color:var(--fg-2,#888);}
`;

function yesNo(val, dflt) {
  if (val == null) return dflt != null ? (dflt ? '<span class="releaseit-on">yes</span>' : '<span class="releaseit-off">no</span>') : '<span class="releaseit-dim">—</span>';
  return val ? '<span class="releaseit-on">yes</span>' : '<span class="releaseit-off">no</span>';
}

function kvRow(k, v) {
  if (v == null || v === '') return '';
  return `<span class="releaseit-k">${esc(k)}</span><span class="releaseit-v">${esc(String(v))}</span>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const git = cfg.git || {};
  const version = cfg.version || {};
  const github = cfg.github || {};
  const gitlab = cfg.gitlab || {};
  const changelog = cfg.changelog || {};
  const npm = cfg.npm || {};
  const plugins = cfg.plugins || {};
  const hooks = cfg.hooks || {};

  // Git section
  const gitRows = [
    kvRow('tagName', git.tagName),
    kvRow('tagAnnotation', git.tagAnnotation),
    kvRow('commitMessage', git.commitMessage),
    kvRow('pushRepo', git.pushRepo),
    kvRow('requireBranch', git.requireBranch),
    kvRow('requireCleanWorkingDir', git.requireCleanWorkingDir != null ? String(git.requireCleanWorkingDir) : null),
  ].filter(Boolean).join('');

  const gitHtml = gitRows
    ? `<div class="releaseit-sec"><h3>Git</h3><div class="releaseit-kv">${gitRows}</div></div>`
    : '';

  // Version section
  const versionRows = [
    kvRow('current', version.current),
    kvRow('increment', version.increment),
    kvRow('file', version.path || (Array.isArray(version.files) ? version.files.join(', ') : null)),
    kvRow('preset', version.preset),
  ].filter(Boolean).join('');

  const versionHtml = versionRows
    ? `<div class="releaseit-sec"><h3>Version</h3><div class="releaseit-kv">${versionRows}</div></div>`
    : '';

  // GitHub section
  const githubEnabled = github.release != null ? github.release : (Object.keys(github).length > 0 ? true : null);
  const githubRows = [
    `<span class="releaseit-k">release</span><span class="releaseit-v">${yesNo(githubEnabled)}</span>`,
    github.draft != null ? `<span class="releaseit-k">draft</span><span class="releaseit-v">${yesNo(github.draft)}</span>` : '',
    github.preRelease != null ? `<span class="releaseit-k">preRelease</span><span class="releaseit-v">${yesNo(github.preRelease)}</span>` : '',
    github.releaseName ? kvRow('releaseName', github.releaseName) : '',
    github.tokenRef ? `<span class="releaseit-k">tokenRef</span><span class="releaseit-masked">${esc(github.tokenRef)}</span>` : '',
    github.assets ? kvRow('assets', Array.isArray(github.assets) ? github.assets.join(', ') : String(github.assets)) : '',
  ].filter(Boolean).join('');

  const githubHtml = Object.keys(github).length
    ? `<div class="releaseit-sec"><h3>GitHub</h3><div class="releaseit-kv">${githubRows}</div></div>`
    : '';

  // GitLab section
  const gitlabEnabled = gitlab.release != null ? gitlab.release : (Object.keys(gitlab).length > 0 ? true : null);
  const gitlabRows = [
    `<span class="releaseit-k">release</span><span class="releaseit-v">${yesNo(gitlabEnabled)}</span>`,
    gitlab.draft != null ? `<span class="releaseit-k">draft</span><span class="releaseit-v">${yesNo(gitlab.draft)}</span>` : '',
    gitlab.tokenRef ? `<span class="releaseit-k">tokenRef</span><span class="releaseit-masked">${esc(gitlab.tokenRef)}</span>` : '',
  ].filter(Boolean).join('');

  const gitlabHtml = Object.keys(gitlab).length
    ? `<div class="releaseit-sec"><h3>GitLab</h3><div class="releaseit-kv">${gitlabRows}</div></div>`
    : '';

  // Changelog section
  const changelogRows = [
    kvRow('generator', changelog.generator),
    kvRow('preset', changelog.preset),
    kvRow('infile', changelog.infile),
    kvRow('header', changelog.header),
    changelog.context ? kvRow('context', JSON.stringify(changelog.context)) : '',
  ].filter(Boolean).join('');

  const changelogHtml = Object.keys(changelog).length
    ? `<div class="releaseit-sec"><h3>Changelog</h3><div class="releaseit-kv">${changelogRows}</div></div>`
    : '';

  // NPM section
  const npmEnabled = npm.publish != null ? npm.publish : (Object.keys(npm).length > 0 ? true : null);
  const npmRows = [
    `<span class="releaseit-k">publish</span><span class="releaseit-v">${yesNo(npmEnabled)}</span>`,
    npm.access ? kvRow('access', npm.access) : '',
    npm.tag ? kvRow('tag', npm.tag) : '',
    npm.skipChecks != null ? `<span class="releaseit-k">skipChecks</span><span class="releaseit-v">${yesNo(npm.skipChecks)}</span>` : '',
  ].filter(Boolean).join('');

  const npmHtml = Object.keys(npm).length
    ? `<div class="releaseit-sec"><h3>NPM</h3><div class="releaseit-kv">${npmRows}</div></div>`
    : '';

  // Plugins section
  const pluginKeys = Object.keys(plugins);
  const pluginsHtml = pluginKeys.length
    ? `<div class="releaseit-sec"><h3>Plugins (${pluginKeys.length})</h3>
<div style="display:flex;flex-wrap:wrap;gap:4px;">${pluginKeys.map((k) => `<span class="releaseit-pill">${esc(k)}</span>`).join('')}</div></div>`
    : '';

  // Hooks section
  const hookEntries = Object.entries(hooks);
  const hooksHtml = hookEntries.length
    ? `<div class="releaseit-sec"><h3>Hooks</h3>${hookEntries.map(([evt, cmd]) => {
  const cmds = Array.isArray(cmd) ? cmd : [cmd];
  return `<div style="margin-bottom:6px;"><span class="releaseit-dim">${esc(evt)}</span>${cmds.map((c) => `<div class="releaseit-hook">${esc(String(c))}</div>`).join('')}</div>`;
}).join('')}</div>`
    : '';

  const host = document.createElement('div');
  host.className = 'releaseit-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="releaseit-badge">release-it</span>
  <span class="releaseit-title">release-it config</span>
  ${Object.keys(github).length ? '<span class="releaseit-pill">GitHub</span>' : ''}
  ${Object.keys(gitlab).length ? '<span class="releaseit-pill">GitLab</span>' : ''}
  ${Object.keys(npm).length ? '<span class="releaseit-pill">npm</span>' : ''}
  ${pluginKeys.length ? `<span class="releaseit-pill">${pluginKeys.length} plugin${pluginKeys.length !== 1 ? 's' : ''}</span>` : ''}
</div>
${gitHtml}${versionHtml}${githubHtml}${gitlabHtml}${changelogHtml}${npmHtml}${pluginsHtml}${hooksHtml}`;

  return { parentNode: host };
}
