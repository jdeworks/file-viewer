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
  ctxValue.textContent = parsed.currentContext;

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
    nameTd.appendChild(document.createTextNode(ctx.name));

    const clusterTd = document.createElement('td');
    clusterTd.textContent = ctx.cluster ?? '';

    const userTd = document.createElement('td');
    userTd.textContent = ctx.user ?? '';

    const nsTd = document.createElement('td');
    if (ctx.namespace) {
      nsTd.textContent = ctx.namespace;
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
    nameTd.textContent = cluster.name ?? '';

    const serverTd = document.createElement('td');
    if (cluster.server) {
      const link = document.createElement('a');
      link.className = 'kc-server-link';
      link.href = cluster.server;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = cluster.server;
      serverTd.appendChild(link);

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
    nameTd.textContent = user.name ?? '';

    const authTd = document.createElement('td');
    const authSpan = document.createElement('span');
    authSpan.className = 'kc-auth-method';
    authSpan.textContent = user.authMethod;
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
