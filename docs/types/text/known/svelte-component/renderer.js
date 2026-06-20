const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.svelte-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.svelte-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#ff3e00;color:#fff;vertical-align:middle;margin-right:8px;}
.svelte-lang-badge{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#fde8e2;color:#c2410c;vertical-align:middle;margin-left:6px;}
.svelte-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.svelte-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.svelte-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.svelte-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.svelte-card strong{display:block;font-size:1.2rem;font-weight:700;}
.svelte-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.svelte-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.svelte-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);display:flex;align-items:center;gap:8px;}
.svelte-section-lang{font-size:10px;padding:1px 6px;border-radius:4px;font-weight:700;}
.svelte-section-lang.ts{background:#dbeafe;color:#1d4ed8;}
.svelte-section-lang.scss{background:#fce7f3;color:#9d174d;}
.svelte-list{margin:0;padding:0;list-style:none;}
.svelte-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;}
.svelte-list li:last-child{border-bottom:none;}
.svelte-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#fde8e2;color:#c2410c;font-weight:700;}
.svelte-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.svelte-kw{color:#7c3aed;font-weight:600;}
.svelte-dir{color:#ff3e00;font-weight:600;}
.svelte-str{color:#0a6640;}
.svelte-comment{color:#6e7781;font-style:italic;}
.svelte-reactive{color:#0369a1;font-weight:600;}
.svelte-tag-elem{color:#b45309;font-weight:600;}
`;

function extractBlock(text, tag) {
  // Extract the first occurrence of <tag ...>...</tag> or <tag .../> (self-closing)
  const openRe = new RegExp(`<${tag}(\\s[^>]*)?>`, 'i');
  const m = openRe.exec(text);
  if (!m) return { content: null, attrs: '' };
  const attrs = m[1] || '';
  const start = m.index + m[0].length;
  const closeTag = `</${tag}>`;
  const end = text.toLowerCase().indexOf(closeTag.toLowerCase(), start);
  if (end === -1) return { content: null, attrs };
  return { content: text.slice(start, end), attrs };
}

function analyzeComponent(text) {
  const scriptBlock = extractBlock(text, 'script');
  const styleBlock = extractBlock(text, 'style');

  // Script language
  const scriptLang = /lang=["'](ts|typescript)["']/i.test(scriptBlock.attrs) ? 'TypeScript' : 'JavaScript';
  // Style language
  const styleLang = /lang=["'](scss)["']/i.test(styleBlock.attrs) ? 'SCSS'
    : /lang=["'](less)["']/i.test(styleBlock.attrs) ? 'Less'
    : 'CSS';

  const scriptText = scriptBlock.content || '';

  // Exported props: export let name
  const props = [];
  const propRe = /export\s+let\s+(\w+)/g;
  let m;
  while ((m = propRe.exec(scriptText)) !== null) {
    if (!props.includes(m[1])) props.push(m[1]);
  }

  // Reactive declarations: $:
  const reactiveCount = (scriptText.match(/^\s*\$:/gm) || []).length;

  // Component imports from .svelte files
  const componentImports = [];
  const importRe = /import\s+(\w+)\s+from\s+["'][^"']*\.svelte["']/g;
  while ((m = importRe.exec(scriptText)) !== null) {
    if (!componentImports.includes(m[1])) componentImports.push(m[1]);
  }

  // Template = everything outside script and style blocks
  // We approximate by removing script/style blocks
  const templateText = text
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  // Event handlers on: in template
  const eventHandlers = new Set();
  const eventRe = /\bon:([\w:]+)/g;
  while ((m = eventRe.exec(templateText)) !== null) {
    eventHandlers.add(m[1]);
  }

  // Slot count
  const slotCount = (templateText.match(/<slot[\s/>]/g) || []).length;

  // Store subscriptions: $storeName patterns (in script and template)
  const stores = new Set();
  const storeRe = /\$([a-zA-Z_]\w+)/g;
  const fullText = scriptText + templateText;
  while ((m = storeRe.exec(fullText)) !== null) {
    // Exclude $: reactive labels
    if (m[1] !== ':') stores.add(m[1]);
  }
  // Remove prop names (they shadow stores in template) and common non-stores
  for (const p of props) stores.delete(p);

  return {
    scriptLang,
    styleLang,
    hasScript: scriptBlock.content !== null,
    hasStyle: styleBlock.content !== null,
    scriptContent: scriptText,
    styleContent: styleBlock.content || '',
    templateContent: templateText,
    props,
    reactiveCount,
    componentImports,
    eventHandlers: [...eventHandlers],
    slotCount,
    stores: [...stores].slice(0, 20),
  };
}

function highlightScript(text) {
  const JS_KW = /\b(import|export|from|default|let|const|var|function|class|return|if|else|for|while|do|switch|case|break|continue|new|this|typeof|instanceof|await|async|of|in|try|catch|finally|throw|null|undefined|true|false)\b/g;
  return esc(text)
    .replace(/(\/\/[^\n]*)/g, '<span class="svelte-comment">$1</span>')
    .replace(/\/\*([\s\S]*?)\*\//g, '<span class="svelte-comment">/*$1*/</span>')
    .replace(/(&quot;[^&]*&quot;|&#39;[^&]*&#39;|`[^`]*`)/g, '<span class="svelte-str">$1</span>')
    .replace(/(\$:)/g, '<span class="svelte-reactive">$1</span>')
    .replace(new RegExp(JS_KW.source, 'g'), '<span class="svelte-kw">$1</span>');
}

function highlightTemplate(text) {
  return esc(text)
    .replace(/(\{#\w+[^}]*\}|\{:\w+[^}]*\}|\{\/\w+\}|\{@\w+[^}]*\})/g, '<span class="svelte-dir">$1</span>')
    .replace(/(\{\$[^}]+\}|\{[^}]+\})/g, '<span class="svelte-reactive">$1</span>')
    .replace(/(on:[\w:]+)/g, '<span class="svelte-tag-elem">$1</span>');
}

function makeSection(title, items, tagFn) {
  if (!items || items.length === 0) return null;
  const sec = document.createElement('div');
  sec.className = 'svelte-section';
  const hd = document.createElement('div');
  hd.className = 'svelte-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  const ul = document.createElement('ul');
  ul.className = 'svelte-list';
  for (const item of items) {
    const li = document.createElement('li');
    if (tagFn) {
      const tag = document.createElement('span');
      tag.className = 'svelte-tag';
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

function makeCodeSection(title, code, highlightFn, langLabel, langClass) {
  const sec = document.createElement('div');
  sec.className = 'svelte-section';
  const hd = document.createElement('div');
  hd.className = 'svelte-section-hd';
  hd.textContent = title;
  if (langLabel) {
    const badge = document.createElement('span');
    badge.className = `svelte-section-lang ${langClass || ''}`;
    badge.textContent = langLabel;
    hd.appendChild(badge);
  }
  sec.appendChild(hd);
  const pre = document.createElement('pre');
  pre.className = 'svelte-pre';
  pre.innerHTML = highlightFn(code);
  sec.appendChild(pre);
  return sec;
}

export function render(intake) {
  const text = intake.text || '';
  const info = analyzeComponent(text);

  const host = document.createElement('div');
  host.className = 'svelte-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'svelte-title';
  let titleHtml = '<span class="svelte-badge">Svelte</span>';
  if (info.scriptLang === 'TypeScript') titleHtml += '<span class="svelte-lang-badge">TypeScript</span>';
  if (info.styleLang !== 'CSS') titleHtml += `<span class="svelte-lang-badge">${esc(info.styleLang)}</span>`;
  title.innerHTML = titleHtml;
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'svelte-sub';
  sub.textContent = `${info.props.length} prop${info.props.length !== 1 ? 's' : ''} · ${info.reactiveCount} reactive · ${info.eventHandlers.length} event handler${info.eventHandlers.length !== 1 ? 's' : ''} · ${info.slotCount} slot${info.slotCount !== 1 ? 's' : ''} · ${info.componentImports.length} component import${info.componentImports.length !== 1 ? 's' : ''}`;
  host.appendChild(sub);

  // Summary cards
  const cards = document.createElement('div');
  cards.className = 'svelte-cards';
  for (const { value, label } of [
    { value: info.props.length, label: 'Props' },
    { value: info.reactiveCount, label: 'Reactive ($:)' },
    { value: info.eventHandlers.length, label: 'Event handlers' },
    { value: info.slotCount, label: 'Slots' },
    { value: info.stores.length, label: 'Store refs' },
  ]) {
    const card = document.createElement('div');
    card.className = 'svelte-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  const propsEl = makeSection('Exported Props', info.props);
  if (propsEl) host.appendChild(propsEl);

  const importsEl = makeSection('Svelte Component Imports', info.componentImports);
  if (importsEl) host.appendChild(importsEl);

  const eventsEl = makeSection('Event Handlers', info.eventHandlers, (e) => `on:${e}`);
  if (eventsEl) host.appendChild(eventsEl);

  // Code sections
  if (info.hasScript && info.scriptContent.trim()) {
    host.appendChild(makeCodeSection('Script', info.scriptContent, highlightScript,
      info.scriptLang === 'TypeScript' ? 'TypeScript' : null, 'ts'));
  }
  if (info.hasStyle && info.styleContent.trim()) {
    host.appendChild(makeCodeSection('Style', info.styleContent, esc,
      info.styleLang !== 'CSS' ? info.styleLang : null, info.styleLang === 'SCSS' ? 'scss' : ''));
  }
  if (info.templateContent.trim()) {
    host.appendChild(makeCodeSection('Template', info.templateContent.trim(), highlightTemplate));
  }

  return { parentNode: host };
}
