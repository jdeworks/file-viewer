// INI / .env / .properties preview: parse into [section] -> key/value pairs and render grouped
// key-value tables with secret masking, source jumps, and a collapsed redacted source preview.
import { esc } from '../../../core/template.js';
import { ensureKnownUiStyle, issueList, maskedValue, sourceButton, sourcePreview, wireSourceLinks } from '../../../core/known-ui.js';

const CSS = `
.ini-preview{padding:12px 14px;font:13px/1.5 system-ui,sans-serif;color:var(--fg,#24292f)}
.ini-preview .kv-section{margin:0 0 16px}
.ini-preview .kv-section h3{font:600 13px system-ui,sans-serif;color:#4c9aff;margin:0 0 6px;border-bottom:1px solid var(--border,#e0e0e0);padding-bottom:3px}
.ini-preview .kv-table{border-collapse:collapse;font:13px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;width:100%}
.ini-preview .kv-table td{padding:2px 14px 2px 0;vertical-align:top;word-break:break-word}
.ini-preview .kv-key{color:#6b7280;white-space:nowrap}
.ini-preview .kv-val{color:inherit}
.ini-preview .kv-val.masked{color:#6b7280;font-style:italic}
.ini-src-key{color:#0550ae;font-weight:700}
.ini-src-string{color:#0a7f38}
`;

export function parseIni(text) {
  const sections = [{ name: null, pairs: [], line: 1 }];
  let cur = sections[0];
  for (const [idx, raw] of (text || '').split(/\r?\n/).entries()) {
    const lineNo = idx + 1;
    const line = raw.trim();
    if (!line || line[0] === '#' || line[0] === ';') continue;
    const sec = line.match(/^\[(.+?)\]$/);
    if (sec) {
      cur = { name: sec[1].trim(), pairs: [], line: lineNo };
      sections.push(cur);
      continue;
    }
    const m = line.match(/^([^=:]+?)\s*[=:]\s*(.*)$/);
    if (m) {
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      cur.pairs.push({ key: m[1].trim(), value: val, line: lineNo, section: cur.name });
    }
  }
  return sections.filter((s) => s.pairs.length || s.name);
}

function collectIssues(sections) {
  const issues = [];
  const seen = new Map();
  for (const section of sections) {
    const scope = section.name || '<root>';
    for (const pair of section.pairs) {
      const id = `${scope}.${pair.key}`;
      if (seen.has(id)) {
        issues.push({ severity: 'warning', label: 'duplicate key', line: pair.line, message: `${id} repeats a key from line ${seen.get(id)}.` });
      } else {
        seen.set(id, pair.line);
      }
      const masked = maskedValue(pair.key, pair.value);
      if (masked.masked) {
        issues.push({ severity: 'warning', label: 'secret', line: pair.line, message: `${id} looks sensitive and is redacted in the preview.` });
      }
    }
  }
  return issues;
}

function renderValue(pair) {
  const masked = maskedValue(pair.key, pair.value);
  if (masked.masked) return `<span class="kv-val masked" title="${esc(masked.reason)}">[configured]</span>`;
  return `<span class="kv-val">${esc(pair.value)}</span>`;
}

function renderSections(sections) {
  return sections.map((section) => {
    const head = section.name ? `<h3>${esc(`[${section.name}]`)}</h3>` : '';
    const rows = section.pairs.map((pair) => `<tr>
      <td class="kv-key">${sourceButton(pair.key, pair.line, 'Open key in source').outerHTML}</td>
      <td>${renderValue(pair)}</td>
    </tr>`).join('');
    return `<div class="kv-section">${head}<table class="kv-table"><tbody>${rows}</tbody></table></div>`;
  }).join('');
}

function redactedSource(text, sections) {
  const secretLines = new Map();
  for (const section of sections) {
    for (const pair of section.pairs) {
      if (maskedValue(pair.key, pair.value).masked) secretLines.set(pair.line, pair.key);
    }
  }
  if (!secretLines.size) return text || '';
  return String(text || '').split(/\r?\n/).map((line, idx) => {
    const key = secretLines.get(idx + 1);
    if (!key) return line;
    return line.replace(new RegExp(`(^\\s*${escapeRegExp(key)}\\s*[=:]\\s*).*$`), '$1[configured]');
  }).join('\n');
}

function highlightIniLine(line) {
  const raw = esc(line);
  if (/^\s*[#;]/.test(line)) return raw;
  if (/^\s*\[.+\]\s*$/.test(line)) return `<span class="ini-src-key">${raw}</span>`;
  return raw
    .replace(/^(\s*[^=:]+?)(\s*[=:])/, '<span class="ini-src-key">$1</span>$2')
    .replace(/([=:]\s*)("[^"]*"|'[^']*')/, '$1<span class="ini-src-string">$2</span>');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function render(intake, _ctx) {
  const sections = parseIni(intake.text || '');
  if (!sections.length) return { bodyHtml: '<p class="ics-empty">No key-value pairs found.</p>', hadUnsafe: false };
  ensureKnownUiStyle(document);

  const bodyHtml = renderSections(sections);
  const host = document.createElement('div');
  host.className = 'ini-preview';
  host.innerHTML = `<style>${CSS}</style>${bodyHtml}`;
  const review = issueList(collectIssues(sections), { title: 'INI Structure Review' });
  if (review) host.appendChild(review);
  host.appendChild(sourcePreview(redactedSource(intake.text || '', sections), {
    title: 'Redacted source',
    collapsed: true,
    idPrefix: 'ini-line',
    highlighter: highlightIniLine,
  }));
  wireSourceLinks(host, { idPrefix: 'ini-line' });
  return { parentNode: host, bodyHtml, hadUnsafe: false };
}
