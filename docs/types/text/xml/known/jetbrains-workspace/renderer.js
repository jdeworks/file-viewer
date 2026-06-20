// JetBrains workspace.xml renderer. Parses XML with DOMParser (data only, never executed).
// Shows: run configurations, changed files list, VCS mappings.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function tag(text, color) {
  return color
    ? '<span class="kf-tag" style="background:' + color + ';color:#fff">' + esc(text) + '</span>'
    : '<span class="kf-tag">' + esc(text) + '</span>';
}

function childrenNamed(el, name) {
  return [...el.children].filter((c) => c.tagName === name || c.tagName.endsWith(':' + name));
}

function attr(el, name) {
  return (el.getAttribute(name) || '').trim();
}

export async function render(intake, _ctx) {
  const host = document.createElement('div');
  host.className = 'pj-doc';

  const xmlDoc = new DOMParser().parseFromString(intake.text || '', 'application/xml');
  if (xmlDoc.getElementsByTagName('parsererror').length) {
    host.innerHTML = '<p class="pj-err">Could not parse workspace.xml as XML.</p>';
    return { parentNode: host };
  }

  // Collect all <component> elements under <project>
  const components = [...xmlDoc.getElementsByTagName('component')];

  // ── Run Configurations ──
  const runMgr = components.find((c) => attr(c, 'name') === 'RunManager');
  let runHtml = '';
  if (runMgr) {
    const configs = childrenNamed(runMgr, 'configuration').filter((c) => attr(c, 'name'));
    if (configs.length) {
      const rows = configs.map((c) => {
        const name = attr(c, 'name');
        const type = attr(c, 'type') || attr(c, 'factoryName') || 'unknown';
        return '<li class="kf-pat"><code>' + esc(name) + '</code>' + tag(type) + '</li>';
      }).join('');
      runHtml = '<section class="kf-svc"><h3>Run Configurations <span class="pj-count">' + configs.length + '</span></h3>'
        + '<ul class="kf-list">' + rows + '</ul></section>';
    }
  }

  // ── Changed Files (ChangeListManager) ──
  const clMgr = components.find((c) => attr(c, 'name') === 'ChangeListManager');
  let changesHtml = '';
  if (clMgr) {
    const lists = [...clMgr.getElementsByTagName('list')];
    if (lists.length) {
      const sections = lists.map((lst) => {
        const listName = attr(lst, 'name') || 'Default';
        const changes = [...lst.getElementsByTagName('change')];
        if (!changes.length) return '';
        const rows = changes.slice(0, 20).map((ch) => {
          const afterPath = attr(ch, 'afterPath') || attr(ch, 'path') || '';
          const short = afterPath.replace(/^.*[\\/]/, '') || afterPath;
          return '<li class="kf-pat"><code>' + esc(short) + '</code>'
            + (afterPath !== short ? '<span class="ts-doc"> ' + esc(afterPath) + '</span>' : '') + '</li>';
        }).join('');
        const more = changes.length > 20 ? '<li class="kf-pat kf-note">…and ' + (changes.length - 20) + ' more</li>' : '';
        return '<div><h4 style="margin:0.5em 0 0.25em">' + esc(listName) + ' <span class="pj-count">' + changes.length + '</span></h4>'
          + '<ul class="kf-list">' + rows + more + '</ul></div>';
      }).join('');
      if (sections.trim()) {
        changesHtml = '<section class="kf-svc"><h3>Changed Files</h3>' + sections + '</section>';
      }
    }
  }

  // ── VCS Mappings ──
  const vcsMgr = components.find((c) => attr(c, 'name') === 'VcsDirectoryMappings');
  let vcsHtml = '';
  if (vcsMgr) {
    const mappings = [...vcsMgr.getElementsByTagName('mapping')];
    if (mappings.length) {
      const rows = mappings.map((m) => {
        const dir = attr(m, 'directory') || '$PROJECT_DIR$';
        const vcs = attr(m, 'vcs') || '';
        return '<li class="kf-pat"><code>' + esc(dir) + '</code>' + (vcs ? tag(vcs) : '') + '</li>';
      }).join('');
      vcsHtml = '<section class="kf-svc"><h3>VCS Mappings</h3><ul class="kf-list">' + rows + '</ul></section>';
    }
  }

  // ── Detected component names for the summary ──
  const knownComponents = components.map((c) => attr(c, 'name')).filter(Boolean);

  const badge = '<span class="kf-tag" style="background:#8B5CF6;color:#fff">JetBrains Workspace</span>';
  host.innerHTML =
    '<header class="pj-head"><div class="pj-title">' + badge + ' workspace.xml</div>'
    + '<div class="pj-meta"><span class="pj-tag">' + knownComponents.length + ' component(s)</span></div></header>'
    + (runHtml || changesHtml || vcsHtml || '<p class="kf-note">No run configurations, change lists, or VCS mappings found.</p>')
    + runHtml + changesHtml + vcsHtml;

  // Fix: avoid double-printing (header already included the count, body sections below)
  host.innerHTML =
    '<header class="pj-head"><div class="pj-title">' + badge + ' workspace.xml</div>'
    + '<div class="pj-meta"><span class="pj-tag">' + knownComponents.length + ' component(s)</span></div></header>'
    + (runHtml + changesHtml + vcsHtml || '<p class="kf-note">No run configurations, change lists, or VCS mappings found.</p>');

  return { parentNode: host };
}
