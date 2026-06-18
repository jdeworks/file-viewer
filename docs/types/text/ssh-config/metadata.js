function parseSSHConfig(text) {
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

  function addSetting(target, key, value) {
    const canonical = key.toLowerCase();
    if (!target[canonical]) target[canonical] = [];
    target[canonical].push(value);
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

    const includeMatch = line.match(/^Include\s+(.+)$/i);
    if (includeMatch) {
      addSetting(current ? current.settings : globalSettings, 'Include', includeMatch[1].trim());
    } else if (current) {
      const kv = line.match(/^(\S+)\s+(.+)$/);
      if (kv) addSetting(current.settings, kv[1], kv[2].trim());
    } else {
      const kv = line.match(/^(\S+)\s+(.+)$/);
      if (kv) addSetting(globalSettings, kv[1], kv[2].trim());
    }
  }
  pushCurrent();

  return { blocks, matchBlocks, globalSettings };
}

function valuesFrom(blocks, key) {
  const canonical = key.toLowerCase();
  return blocks.flatMap((block) => block.settings[canonical] || []);
}

function distinct(values) {
  return [...new Set(values.filter(Boolean))];
}

function yes(value) {
  return /^(yes|true|on)$/i.test(value);
}

function disabledStrictHostKeyChecking(value) {
  return /^(no|false|off)$/i.test(value);
}

function splitProxyJump(value) {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/^ssh:\/\//i, '').replace(/^\[([^\]]+)\](?::\d+)?$/, '$1').replace(/:\d+$/, ''));
}

function listValue(values) {
  return values.length ? values.join(', ') : 'none';
}

export async function extractMetadata(intake) {
  const { blocks, matchBlocks, globalSettings } = parseSSHConfig(intake.text ?? '');
  const scopedBlocks = [...blocks, ...matchBlocks];
  const hostPatterns = distinct(blocks.flatMap((block) => block.patterns));
  const hostBlocks = blocks.filter((block) => !block.patterns.includes('*'));
  const users = distinct(valuesFrom(scopedBlocks, 'User'));
  const ports = distinct(valuesFrom(scopedBlocks, 'Port'));
  const identityFiles = distinct(valuesFrom(scopedBlocks, 'IdentityFile'));
  const proxyJumpHosts = distinct(valuesFrom(scopedBlocks, 'ProxyJump').flatMap(splitProxyJump));
  const proxyCommandCount = valuesFrom(scopedBlocks, 'ProxyCommand').length;
  const forwardAgentCount = valuesFrom(scopedBlocks, 'ForwardAgent').filter(yes).length;
  const strictHostKeyDisabledCount = valuesFrom(scopedBlocks, 'StrictHostKeyChecking').filter(disabledStrictHostKeyChecking).length;
  const forwardedPorts = [
    ...valuesFrom(scopedBlocks, 'LocalForward').map((value) => `local ${value}`),
    ...valuesFrom(scopedBlocks, 'RemoteForward').map((value) => `remote ${value}`),
    ...valuesFrom(scopedBlocks, 'DynamicForward').map((value) => `dynamic ${value}`),
  ];
  const includes = distinct([
    ...(globalSettings.include || []),
    ...valuesFrom(scopedBlocks, 'Include'),
  ]);
  const fields = [
    { label: 'Host Count', value: String(hostBlocks.length) },
    { label: 'Has Wildcard', value: blocks.some((block) => block.patterns.includes('*')) },
    { label: 'Host Patterns', value: listValue(hostPatterns) },
    { label: 'Distinct Users', value: listValue(users) },
    { label: 'Ports', value: listValue(ports) },
    { label: 'Identity Files', value: listValue(identityFiles) },
    { label: 'ProxyJump Hosts', value: listValue(proxyJumpHosts) },
    { label: 'ProxyCommand Count', value: String(proxyCommandCount) },
    { label: 'ForwardAgent Enabled Count', value: String(forwardAgentCount) },
    { label: 'StrictHostKeyChecking Disabled Count', value: String(strictHostKeyDisabledCount) },
    { label: 'Forwarded Ports', value: listValue(forwardedPorts) },
    { label: 'Includes', value: listValue(includes) },
  ];
  if (matchBlocks.length) {
    fields.push({ label: 'Match Blocks', value: listValue(matchBlocks.map((block) => block.criteria)) });
  }
  return {
    fields,
  };
}
