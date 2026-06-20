const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rbots-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.rbots-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0f6fba;color:#fff;vertical-align:middle;margin-right:8px;}
.rbots-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.rbots-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.rbots-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.rbots-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.rbots-card strong{display:block;font-size:1.2rem;font-weight:700;}
.rbots-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.rbots-group{margin:16px 0;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.rbots-group-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.rbots-table{width:100%;border-collapse:collapse;font-size:13px;}
.rbots-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.rbots-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.rbots-table tr:last-child td{border-bottom:none;}
.rbots-rule-allow{color:#1a7f37;font-weight:700;}
.rbots-rule-disallow{color:#b91c1c;font-weight:700;}
.rbots-rule-delay{color:#7c3aed;font-weight:700;}
.rbots-sitemaps{margin:16px 0;}
.rbots-sitemaps h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.rbots-sitemap-link{display:block;font-family:ui-monospace,monospace;font-size:12px;padding:4px 0;border-bottom:1px solid var(--border,#eaecf0);color:var(--fg,#24292f);word-break:break-all;}
.rbots-sitemap-link:last-child{border-bottom:none;}
`;

function parseRobots(text) {
  const groups = [];
  const sitemaps = [];
  let currentAgents = [];
  let currentRules = [];

  const flushGroup = () => {
    if (currentAgents.length > 0 && currentRules.length > 0) {
      groups.push({ agents: currentAgents, rules: currentRules });
    } else if (currentAgents.length > 0 || currentRules.length > 0) {
      // agents with no rules, or rules with no agent header — still emit
      groups.push({ agents: currentAgents.length ? currentAgents : ['*'], rules: currentRules });
    }
    currentAgents = [];
    currentRules = [];
  };

  for (const rawLine of (text || '').split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) {
      // Empty line separates groups — but only flush if we have something
      if (currentAgents.length > 0 || currentRules.length > 0) {
        flushGroup();
      }
      continue;
    }
    const colonIdx = line.indexOf(':');
    if (colonIdx < 0) continue;
    const key = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();

    if (key === 'user-agent') {
      // If we already have rules for the previous group, flush before starting new
      if (currentRules.length > 0) flushGroup();
      currentAgents.push(value);
    } else if (key === 'disallow') {
      currentRules.push({ type: 'Disallow', value });
    } else if (key === 'allow') {
      currentRules.push({ type: 'Allow', value });
    } else if (key === 'crawl-delay') {
      currentRules.push({ type: 'Crawl-delay', value });
    } else if (key === 'sitemap') {
      sitemaps.push(value);
    }
  }
  // Flush any remaining group
  if (currentAgents.length > 0 || currentRules.length > 0) flushGroup();

  const totalDisallow = groups.reduce((n, g) => n + g.rules.filter((r) => r.type === 'Disallow').length, 0);
  const totalAllow = groups.reduce((n, g) => n + g.rules.filter((r) => r.type === 'Allow').length, 0);

  return { groups, sitemaps, totalDisallow, totalAllow };
}

function ruleClass(type) {
  if (type === 'Allow') return 'rbots-rule-allow';
  if (type === 'Disallow') return 'rbots-rule-disallow';
  return 'rbots-rule-delay';
}

export function render(intake) {
  const parsed = parseRobots(intake.text || '');
  const { groups, sitemaps, totalDisallow, totalAllow } = parsed;

  const host = document.createElement('div');
  host.className = 'rbots-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'rbots-title';
  title.innerHTML = '<span class="rbots-badge">robots.txt</span>';
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'rbots-sub';
  sub.textContent = `${groups.length} user-agent group${groups.length !== 1 ? 's' : ''} · ${totalDisallow} disallow · ${totalAllow} allow${sitemaps.length ? ` · ${sitemaps.length} sitemap${sitemaps.length !== 1 ? 's' : ''}` : ''}`;
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'rbots-summary';
  const cards = [
    { value: groups.length, label: 'User-agent groups' },
    { value: totalDisallow, label: 'Disallow rules' },
    { value: totalAllow, label: 'Allow rules' },
    { value: sitemaps.length, label: 'Sitemaps' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'rbots-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Groups
  for (const group of groups) {
    const agentLabel = group.agents.map((a) => `User-agent: ${a}`).join(', ');
    const groupEl = document.createElement('div');
    groupEl.className = 'rbots-group';

    const hd = document.createElement('div');
    hd.className = 'rbots-group-hd';
    hd.textContent = agentLabel;
    groupEl.appendChild(hd);

    const table = document.createElement('table');
    table.className = 'rbots-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Directive</th><th>Path / Value</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const rule of group.rules) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><span class="${ruleClass(rule.type)}">${esc(rule.type)}</span></td><td>${esc(rule.value || '(empty)')}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    groupEl.appendChild(table);
    host.appendChild(groupEl);
  }

  // Sitemaps
  if (sitemaps.length) {
    const sitemapSec = document.createElement('div');
    sitemapSec.className = 'rbots-sitemaps';
    const h3 = document.createElement('h3');
    h3.textContent = 'Sitemaps';
    sitemapSec.appendChild(h3);
    for (const url of sitemaps) {
      const a = document.createElement('a');
      a.className = 'rbots-sitemap-link';
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = url;
      sitemapSec.appendChild(a);
    }
    host.appendChild(sitemapSec);
  }

  return { parentNode: host };
}
