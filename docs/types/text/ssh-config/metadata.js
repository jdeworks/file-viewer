function parseSSHConfig(text) {
  const lines = text.split('\n');
  const blocks = [];
  let current = null;
  const globalSettings = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const hostMatch = line.match(/^Host\s+(.+)$/i);
    if (hostMatch) {
      if (current) blocks.push(current);
      current = { alias: hostMatch[1].trim(), settings: {} };
    } else if (current) {
      const kv = line.match(/^(\S+)\s+(.+)$/);
      if (kv) current.settings[kv[1]] = kv[2].trim();
    } else {
      const kv = line.match(/^(\S+)\s+(.+)$/);
      if (kv) globalSettings[kv[1]] = kv[2].trim();
    }
  }
  if (current) blocks.push(current);

  return { blocks, globalSettings };
}

export async function extractMetadata(intake) {
  const { blocks, globalSettings } = parseSSHConfig(intake.text ?? '');
  return {
    hostCount: blocks.filter((b) => b.alias !== '*').length,
    hasWildcard: blocks.some((b) => b.alias === '*'),
    hosts: blocks.filter((b) => b.alias !== '*').map((b) => ({
      alias: b.alias,
      hostname: b.settings.Hostname || b.settings.HostName || b.alias,
      user: b.settings.User || null,
      port: b.settings.Port ? parseInt(b.settings.Port) : 22,
      hasProxyJump: !!b.settings.ProxyJump,
    })),
    globalSettings: Object.keys(globalSettings),
  };
}
