function parseKubeconfig(text) {
  const ccMatch = text.match(/^current-context:\s*(.+)$/m);
  const currentContext = ccMatch ? ccMatch[1].trim() : null;

  function parseSection(sectionName) {
    const sectionRe = new RegExp(`^${sectionName}:\\s*$`, 'm');
    const match = sectionRe.exec(text);
    if (!match) return [];

    const afterSection = text.slice(match.index + match[0].length);
    const lines = afterSection.split('\n');
    const items = [];
    let current = null;

    for (const line of lines) {
      if (!line.trim()) continue;
      const indent = line.match(/^(\s*)/)[1].length;
      if (indent === 0 && line.trim() && !line.trim().startsWith('-')) break;

      if (line.trim().startsWith('- ') || line.trim() === '-') {
        if (current) items.push(current);
        current = {};
        const inlineKey = line.match(/^-\s+(\S+):\s*(.*)$/);
        if (inlineKey) current[inlineKey[1]] = inlineKey[2].trim();
      } else if (current !== null) {
        const kv = line.match(/^\s+(\S+):\s*(.*)$/);
        if (kv) current[kv[1]] = kv[2].trim();
      }
    }
    if (current) items.push(current);
    return items;
  }

  function extractContextDetails() {
    const sectionMatch = text.match(/^contexts:\s*$([\s\S]*?)^(?:clusters:|users:|current-context:|preferences:|$)/m);
    if (!sectionMatch) return {};
    const sectionText = sectionMatch[1];
    const detailMap = {};
    const blocks = sectionText.split(/(?=^\s*-\s)/m).filter(Boolean);
    for (const block of blocks) {
      const nameMatch = block.match(/^-\s+name:\s*(.+)$/m);
      if (nameMatch) {
        const name = nameMatch[1].trim();
        const clusterMatch = block.match(/^\s+cluster:\s*(.+)$/m);
        const userMatch = block.match(/^\s+user:\s*(.+)$/m);
        detailMap[name] = {
          cluster: clusterMatch ? clusterMatch[1].trim() : null,
          user: userMatch ? userMatch[1].trim() : null,
        };
      }
    }
    return detailMap;
  }

  const clusters = parseSection('clusters');
  const contexts = parseSection('contexts');
  const users = parseSection('users');
  const contextDetails = extractContextDetails();

  return {
    currentContext,
    clusterCount: clusters.length,
    contextCount: contexts.length,
    userCount: users.length,
    clusters: clusters.map((c) => ({ name: c.name })),
    contexts: contexts.map((c) => {
      const det = contextDetails[c.name] || {};
      return { name: c.name, cluster: det.cluster || c.cluster || null, user: det.user || c.user || null };
    }),
  };
}

export async function extractMetadata(intake) {
  try {
    const { currentContext, clusters, contexts, users, clusterCount, contextCount, userCount } = parseKubeconfig(intake.text ?? '');
    return {
      currentContext,
      clusterCount,
      contextCount,
      userCount,
      clusters,
      contexts,
    };
  } catch (e) {
    return { error: e.message };
  }
}
