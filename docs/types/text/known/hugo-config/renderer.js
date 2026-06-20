const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.hugo-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-hugo{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#ff4088;color:#fff;vertical-align:middle;margin-right:8px}
.hugo-title{font-size:18px;font-weight:700;margin:0 0 4px}
.hugo-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.hugo-sec{margin:12px 0}
.hugo-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.hugo-meta{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0}
.hugo-kv{display:flex;gap:6px;align-items:baseline;font-size:13px;padding:4px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa)}
.hugo-kv span:first-child{color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em}
.hugo-kv span:last-child{font-family:ui-monospace,monospace;font-weight:600;color:#ff4088}
.hugo-pills{display:flex;flex-wrap:wrap;gap:6px}
.hugo-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.hugo-flag-on{color:#1a7f37;font-weight:600}
.hugo-flag-off{color:var(--fg-2,#888)}
`;

function extract(text, pattern) {
  const m = pattern.exec(text);
  return m ? m[1].trim() : null;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const name = (intake.name || intake.filename || 'hugo.toml').split('/').pop();

  const baseURL = extract(text, /baseURL\s*[=:]\s*["']?([^"'\n,]+)/i);
  const theme = extract(text, /\btheme\s*[=:]\s*["']?([^"'\n,}\]]+)/i);
  const title = extract(text, /\btitle\s*[=:]\s*["']([^"']+)["']/i);
  const languageCode = extract(text, /languageCode\s*[=:]\s*["']?([^"'\n,]+)/i);
  const paginate = extract(text, /\bpaginate\s*[=:]\s*(\d+)/i);

  // Boolean flags
  const flagOn = (key) => new RegExp(`\\b${key}\\s*[=:]\\s*true`, 'i').test(text);
  const flagOff = (key) => new RegExp(`\\b${key}\\s*[=:]\\s*false`, 'i').test(text);
  const hasFlag = (key) => flagOn(key) || flagOff(key);

  const FLAGS = ['enableRobotsTXT', 'enableGitInfo', 'minify'];
  const flags = FLAGS.filter(hasFlag).map((k) => ({ key: k, on: flagOn(k) }));

  // Count menu entries (TOML [[menus.main]] or [[menu.main]] / YAML - name: / JSON objects)
  const menuMatches = [...text.matchAll(/\[\[menus?\.\w+\]\]/gi)];
  const menuCount = menuMatches.length || ([...text.matchAll(/- name:/gi)].length) || 0;

  // Detect taxonomy section
  const hasTaxonomy = /\[taxonomies\]/i.test(text) || /taxonomies\s*:/i.test(text) || /"taxonomies"\s*:/i.test(text);

  // Detect markup/highlight section
  const hasMarkup = /\[markup\]/i.test(text) || /markup\s*:/i.test(text) || /"markup"\s*:/i.test(text);

  // Build meta items
  const metaItems = [
    title ? `<div class="hugo-kv"><span>Title</span><span>${esc(title)}</span></div>` : '',
    baseURL ? `<div class="hugo-kv"><span>Base URL</span><span>${esc(baseURL)}</span></div>` : '',
    theme ? `<div class="hugo-kv"><span>Theme</span><span>${esc(theme)}</span></div>` : '',
    languageCode ? `<div class="hugo-kv"><span>Language</span><span>${esc(languageCode)}</span></div>` : '',
    paginate ? `<div class="hugo-kv"><span>Paginate</span><span>${esc(paginate)}</span></div>` : '',
  ].filter(Boolean).join('');

  const flagsHtml = flags.length
    ? `<div class="hugo-sec"><h3>Feature Flags</h3><div class="hugo-pills">${flags.map(
        (f) => `<span class="hugo-pill ${f.on ? 'hugo-flag-on' : 'hugo-flag-off'}">${esc(f.key)}: ${f.on ? 'true' : 'false'}</span>`
      ).join('')}</div></div>`
    : '';

  const extras = [];
  if (menuCount > 0) extras.push(`<span class="hugo-pill">${menuCount} menu item${menuCount !== 1 ? 's' : ''}</span>`);
  if (hasTaxonomy) extras.push(`<span class="hugo-pill">taxonomies</span>`);
  if (hasMarkup) extras.push(`<span class="hugo-pill">markup</span>`);
  const extrasHtml = extras.length
    ? `<div class="hugo-sec"><h3>Structure</h3><div class="hugo-pills">${extras.join('')}</div></div>`
    : '';

  const metaHtml = metaItems
    ? `<div class="hugo-sec"><h3>Settings</h3><div class="hugo-meta">${metaItems}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'hugo-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="hugo-title"><span class="badge-hugo">Hugo</span>${esc(name)}</div>
<div class="hugo-sub">Hugo static site configuration</div>
${metaHtml}${flagsHtml}${extrasHtml}`;
  return { parentNode: host };
}
