const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.xsl-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.xsl-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7c3aed;color:#fff;vertical-align:middle;margin-right:8px;}
.xsl-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.xsl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.xsl-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.xsl-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.xsl-card strong{display:block;font-size:1.2rem;font-weight:700;}
.xsl-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.xsl-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.xsl-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.xsl-list{margin:0;padding:0;list-style:none;}
.xsl-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;}
.xsl-list li:last-child{border-bottom:none;}
.xsl-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#ede9fe;color:#7c3aed;font-weight:700;}
.xsl-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.xsl-elem{color:#7c3aed;font-weight:600;}
.xsl-attr{color:#0369a1;}
.xsl-str{color:#0a6640;}
.xsl-comment{color:#6e7781;font-style:italic;}
.xsl-pi{color:#b45309;}
`;

function analyzeXslt(text) {
  let version = null;
  let outputMethod = null;
  const namedTemplates = [];
  const matchTemplates = [];
  const variables = [];
  const params = [];

  // Version from xsl:stylesheet or xsl:transform
  const versionM = text.match(/<xsl:(?:stylesheet|transform)[^>]*\sversion=["']([^"']+)["']/);
  if (versionM) version = versionM[1];

  // Output method
  const outputM = text.match(/<xsl:output[^>]*\smethod=["']([^"']+)["']/);
  if (outputM) outputMethod = outputM[1];

  // Named templates
  const namedRe = /<xsl:template[^>]+\sname=["']([^"']+)["']/g;
  let m;
  while ((m = namedRe.exec(text)) !== null) {
    if (!namedTemplates.includes(m[1])) namedTemplates.push(m[1]);
  }

  // Match templates
  const matchRe = /<xsl:template[^>]+\smatch=["']([^"']+)["']/g;
  while ((m = matchRe.exec(text)) !== null) {
    if (!matchTemplates.includes(m[1])) matchTemplates.push(m[1]);
  }

  // Top-level variables (children of xsl:stylesheet/xsl:transform — approximate: single-line or first tag)
  const varRe = /<xsl:variable[^>]+\sname=["']([^"']+)["']/g;
  while ((m = varRe.exec(text)) !== null) {
    if (!variables.includes(m[1])) variables.push(m[1]);
  }

  // Top-level params
  const paramRe = /<xsl:param[^>]+\sname=["']([^"']+)["']/g;
  while ((m = paramRe.exec(text)) !== null) {
    if (!params.includes(m[1])) params.push(m[1]);
  }

  return { version, outputMethod, namedTemplates, matchTemplates, variables, params };
}

function highlightXslt(text) {
  const result = [];
  let i = 0;
  while (i < text.length) {
    // XML comment
    if (text.startsWith('<!--', i)) {
      const end = text.indexOf('-->', i + 4);
      if (end !== -1) {
        result.push('<span class="xsl-comment">' + esc(text.slice(i, end + 3)) + '</span>');
        i = end + 3;
        continue;
      }
    }
    // Processing instruction
    if (text.startsWith('<?', i)) {
      const end = text.indexOf('?>', i + 2);
      if (end !== -1) {
        result.push('<span class="xsl-pi">' + esc(text.slice(i, end + 2)) + '</span>');
        i = end + 2;
        continue;
      }
    }
    // Tag
    if (text[i] === '<') {
      const end = text.indexOf('>', i);
      if (end !== -1) {
        const tag = text.slice(i, end + 1);
        // Check if it contains xsl: prefix
        const isXsl = /xsl:/i.test(tag);
        if (isXsl) {
          // Highlight tag name, attributes, strings
          const highlighted = tag.replace(/(<\/?)([a-zA-Z][\w:.-]*)/g, (_, slash, name) => {
            if (/^xsl:/i.test(name)) {
              return esc(slash) + '<span class="xsl-elem">' + esc(name) + '</span>';
            }
            return esc(slash) + esc(name);
          }).replace(/\s([\w-]+)=/g, (_, attr) => ' <span class="xsl-attr">' + esc(attr) + '</span>=')
            .replace(/"([^"]*)"/g, (_, v) => '"<span class="xsl-str">' + esc(v) + '</span>"')
            .replace(/^&lt;/, '<').replace(/&gt;$/, '>'); // undo esc on outer <> since we built string already
          // Actually let's just escape and then un-escape selected spans
          result.push('<span class="xsl-elem-wrap">' + escTagHighlight(tag) + '</span>');
        } else {
          result.push(esc(tag));
        }
        i = end + 1;
        continue;
      }
    }
    result.push(esc(text[i]));
    i++;
  }
  return result.join('');
}

function escTagHighlight(tag) {
  // Escape everything, then colorize xsl: element names and attribute names and string values
  let s = esc(tag);
  // xsl: element names (after &lt; or &lt;/)
  s = s.replace(/(&lt;\/?)(xsl:[a-zA-Z-]+)/g, (_, p, name) =>
    p + '<span class="xsl-elem">' + name + '</span>');
  // attribute names
  s = s.replace(/\s([a-zA-Z][\w-]*)=/g, (_, attr) =>
    ' <span class="xsl-attr">' + attr + '</span>=');
  // quoted attribute values
  s = s.replace(/&quot;([^&]*)&quot;/g, (_, v) =>
    '&quot;<span class="xsl-str">' + v + '</span>&quot;');
  return s;
}

function makeSection(title, items, tagFn) {
  if (!items || items.length === 0) return null;
  const sec = document.createElement('div');
  sec.className = 'xsl-section';
  const hd = document.createElement('div');
  hd.className = 'xsl-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  const ul = document.createElement('ul');
  ul.className = 'xsl-list';
  for (const item of items) {
    const li = document.createElement('li');
    if (tagFn) {
      const tag = document.createElement('span');
      tag.className = 'xsl-tag';
      tag.textContent = tagFn(item);
      li.appendChild(tag);
    }
    const nameSpan = document.createElement('span');
    nameSpan.textContent = typeof item === 'string' ? item : item.name;
    li.appendChild(nameSpan);
    ul.appendChild(li);
  }
  sec.appendChild(ul);
  return sec;
}

export function render(intake) {
  const text = intake.text || '';
  const { version, outputMethod, namedTemplates, matchTemplates, variables, params } = analyzeXslt(text);

  const host = document.createElement('div');
  host.className = 'xsl-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'xsl-title';
  let titleHtml = '<span class="xsl-badge">XSLT</span>';
  if (version) titleHtml += `<span style="font-size:13px;font-weight:400;margin-left:4px;">v${esc(version)}</span>`;
  if (outputMethod) titleHtml += `<span style="font-size:12px;color:var(--fg-2,#888);margin-left:10px;">output: <code style="background:var(--bg-2,#f6f8fa);padding:1px 6px;border-radius:4px;">${esc(outputMethod)}</code></span>`;
  title.innerHTML = titleHtml;
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'xsl-sub';
  sub.textContent = `${matchTemplates.length} match template${matchTemplates.length !== 1 ? 's' : ''} · ${namedTemplates.length} named template${namedTemplates.length !== 1 ? 's' : ''} · ${variables.length} variable${variables.length !== 1 ? 's' : ''} · ${params.length} param${params.length !== 1 ? 's' : ''}`;
  host.appendChild(sub);

  // Summary cards
  const cards = document.createElement('div');
  cards.className = 'xsl-cards';
  for (const { value, label } of [
    { value: matchTemplates.length, label: 'Match templates' },
    { value: namedTemplates.length, label: 'Named templates' },
    { value: variables.length, label: 'Variables' },
    { value: params.length, label: 'Params' },
  ]) {
    const card = document.createElement('div');
    card.className = 'xsl-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  const matchEl = makeSection('Match Templates', matchTemplates);
  if (matchEl) host.appendChild(matchEl);

  const namedEl = makeSection('Named Templates', namedTemplates);
  if (namedEl) host.appendChild(namedEl);

  const varsEl = makeSection('Variables', variables);
  if (varsEl) host.appendChild(varsEl);

  const paramsEl = makeSection('Parameters', params);
  if (paramsEl) host.appendChild(paramsEl);

  // Source
  const srcSec = document.createElement('div');
  srcSec.className = 'xsl-section';
  const srcHd = document.createElement('div');
  srcHd.className = 'xsl-section-hd';
  srcHd.textContent = 'Source';
  srcSec.appendChild(srcHd);
  const pre = document.createElement('pre');
  pre.className = 'xsl-pre';
  pre.innerHTML = highlightXslt(text);
  srcSec.appendChild(pre);
  host.appendChild(srcSec);

  return { parentNode: host };
}
