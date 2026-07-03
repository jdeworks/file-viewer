function safeHref(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url.trim()) ? url : null;
}

export function appendKubeconfigTables(body, parsed) {
  appendCurrentContext(body, parsed);
  appendContextsTable(body, parsed);
  appendClustersTable(body, parsed);
  appendUsersTable(body, parsed);
  appendEmptyState(body, parsed);
}

function appendCurrentContext(body, parsed) {
  if (!parsed.currentContext) return;

  const ctxBox = document.createElement('div');
  ctxBox.className = 'kc-current-ctx';

  const ctxLabel = document.createElement('span');
  ctxLabel.className = 'kc-current-ctx-label';
  ctxLabel.textContent = 'Current context';

  const ctxValue = document.createElement('span');
  ctxValue.className = 'kc-current-ctx-value';
  ctxValue.appendChild(sourceLink(parsed.currentContext, parsed.currentContextLine, 'Open current-context in source'));

  ctxBox.appendChild(ctxLabel);
  ctxBox.appendChild(ctxValue);
  body.appendChild(ctxBox);
}

function appendContextsTable(body, parsed) {
  if (parsed.contexts.length === 0) return;

  const section = document.createElement('div');
  section.className = 'kc-section';

  const sectionTitle = document.createElement('div');
  sectionTitle.className = 'kc-section-title';
  sectionTitle.textContent = 'Contexts';
  section.appendChild(sectionTitle);

  const table = document.createElement('table');
  table.className = 'kc-table';

  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>Context</th><th>Cluster</th><th>User</th><th>Namespace</th></tr>';
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const ctx of parsed.contexts) {
    const isCurrent = ctx.name === parsed.currentContext;
    const tr = document.createElement('tr');
    if (isCurrent) tr.className = 'kc-active-row';

    const nameTd = document.createElement('td');
    if (isCurrent) {
      const star = document.createElement('span');
      star.className = 'kc-star';
      star.textContent = '★';
      nameTd.appendChild(star);
    }
    nameTd.appendChild(sourceLink(ctx.name, ctx.line, 'Open context in source'));

    const clusterTd = document.createElement('td');
    clusterTd.appendChild(sourceLink(ctx.cluster ?? '', ctx.clusterLine || ctx.line, 'Open referenced cluster in source'));

    const userTd = document.createElement('td');
    userTd.appendChild(sourceLink(ctx.user ?? '', ctx.userLine || ctx.line, 'Open referenced user in source'));

    const nsTd = document.createElement('td');
    if (ctx.namespace) {
      nsTd.appendChild(sourceLink(ctx.namespace, ctx.namespaceLine || ctx.line, 'Open namespace in source'));
    } else {
      const nullSpan = document.createElement('span');
      nullSpan.className = 'kc-null';
      nullSpan.textContent = 'default';
      nsTd.appendChild(nullSpan);
    }

    tr.appendChild(nameTd);
    tr.appendChild(clusterTd);
    tr.appendChild(userTd);
    tr.appendChild(nsTd);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  section.appendChild(table);
  body.appendChild(section);
}

function appendClustersTable(body, parsed) {
  if (parsed.clusters.length === 0) return;

  const section = document.createElement('div');
  section.className = 'kc-section';

  const sectionTitle = document.createElement('div');
  sectionTitle.className = 'kc-section-title';
  sectionTitle.textContent = 'Clusters';
  section.appendChild(sectionTitle);

  const table = document.createElement('table');
  table.className = 'kc-table';

  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>Cluster</th><th>API Server</th></tr>';
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const cluster of parsed.clusters) {
    const tr = document.createElement('tr');

    const nameTd = document.createElement('td');
    nameTd.appendChild(sourceLink(cluster.name ?? '', cluster.line, 'Open cluster in source'));

    const serverTd = document.createElement('td');
    if (cluster.server) {
      const href = safeHref(cluster.server);
      if (href) {
        const link = document.createElement('a');
        link.className = 'kc-server-link';
        link.href = href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = cluster.server;
        serverTd.appendChild(link);
      } else {
        const span = document.createElement('span');
        span.className = 'kc-server-link';
        span.textContent = cluster.server;
        serverTd.appendChild(span);
      }

      if (cluster.insecure) {
        const insecureBadge = document.createElement('span');
        insecureBadge.className = 'kc-insecure';
        insecureBadge.textContent = 'TLS skip';
        serverTd.appendChild(insecureBadge);
      }
    } else {
      const nullSpan = document.createElement('span');
      nullSpan.className = 'kc-null';
      nullSpan.textContent = 'not specified';
      serverTd.appendChild(nullSpan);
    }

    tr.appendChild(nameTd);
    tr.appendChild(serverTd);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  section.appendChild(table);
  body.appendChild(section);
}

function appendUsersTable(body, parsed) {
  if (parsed.users.length === 0) return;

  const section = document.createElement('div');
  section.className = 'kc-section';

  const sectionTitle = document.createElement('div');
  sectionTitle.className = 'kc-section-title';
  sectionTitle.textContent = 'Users';
  section.appendChild(sectionTitle);

  const table = document.createElement('table');
  table.className = 'kc-table';

  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>User</th><th>Auth Method</th></tr>';
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const user of parsed.users) {
    const tr = document.createElement('tr');

    const nameTd = document.createElement('td');
    nameTd.appendChild(sourceLink(user.name ?? '', user.line, 'Open user in source'));

    const authTd = document.createElement('td');
    const authSpan = document.createElement('span');
    authSpan.className = 'kc-auth-method';
    authSpan.appendChild(sourceLink(user.authMethod, user.authLine || user.line, 'Open auth method in source'));
    authTd.appendChild(authSpan);

    tr.appendChild(nameTd);
    tr.appendChild(authTd);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  section.appendChild(table);
  body.appendChild(section);
}

function appendEmptyState(body, parsed) {
  if (parsed.clusters.length !== 0 || parsed.contexts.length !== 0 || parsed.users.length !== 0) return;
  const empty = document.createElement('div');
  empty.className = 'kc-empty-state';
  empty.textContent = 'No clusters, contexts, or users found.';
  body.appendChild(empty);
}

function sourceLink(text, line, title) {
  const value = String(text ?? '');
  if (!value) return document.createTextNode('');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'kf-source-link';
  btn.dataset.sourceLine = String(line || 1);
  btn.title = title;
  btn.textContent = value;
  return btn;
}
