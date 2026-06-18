export function parseSSHConfig(text) {
  const lines = text.split('\n');
  const blocks = [];
  const matchBlocks = [];
  let current = null;
  const globalSettings = {};

  function pushCurrent() {
    if (!current) return;
    if (current.kind === 'match') matchBlocks.push(current);
    else blocks.push(current);
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const hostMatch = line.match(/^Host\s+(.+)$/i);
    if (hostMatch) {
      pushCurrent();
      current = { kind: 'host', patterns: hostMatch[1].trim().split(/\s+/).filter(Boolean), settings: {} };
      continue;
    }

    const matchMatch = line.match(/^Match\s+(.+)$/i);
    if (matchMatch) {
      pushCurrent();
      current = { kind: 'match', criteria: matchMatch[1].trim(), settings: {} };
      continue;
    }

    const kv = line.match(/^(\S+)\s+(.+)$/);
    if (!kv) continue;
    addSetting(current ? current.settings : globalSettings, kv[1], kv[2].trim());
  }
  pushCurrent();

  return { blocks, matchBlocks, globalSettings };
}

export function addSetting(target, key, value) {
  const canonical = key.toLowerCase();
  if (!target[canonical]) target[canonical] = [];
  target[canonical].push(value);
}

export function valuesFrom(blocks, key) {
  const canonical = key.toLowerCase();
  return blocks.flatMap((block) => block.settings[canonical] || []);
}

export function firstValue(settings, key) {
  const values = settings[key.toLowerCase()] || [];
  return values[0] || '';
}
