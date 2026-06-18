import { parseSSHConfig, valuesFrom } from './parse.js';

function hostAliases(blocks) {
  return blocks
    .filter((block) => !block.patterns.includes('*'))
    .flatMap((block) => block.patterns);
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

function countValue(values) {
  return String(values.length);
}

function securityNotes({ forwardAgentCount, forwardX11Count, strictHostKeyDisabledCount, proxyCommandCount }) {
  const notes = [];
  if (forwardAgentCount) notes.push(`${forwardAgentCount} host block${forwardAgentCount === 1 ? '' : 's'} enable agent forwarding`);
  if (forwardX11Count) notes.push(`${forwardX11Count} host block${forwardX11Count === 1 ? '' : 's'} enable X11 forwarding`);
  if (strictHostKeyDisabledCount) notes.push(`${strictHostKeyDisabledCount} block${strictHostKeyDisabledCount === 1 ? '' : 's'} disable strict host-key checking`);
  if (proxyCommandCount) notes.push(`${proxyCommandCount} ProxyCommand entr${proxyCommandCount === 1 ? 'y' : 'ies'} may execute local commands`);
  return notes.length ? notes.join('; ') : 'none';
}

export async function extractMetadata(intake) {
  const { blocks, matchBlocks, globalSettings } = parseSSHConfig(intake.text ?? '');
  const scopedBlocks = [...blocks, ...matchBlocks];
  const hostPatterns = distinct(blocks.flatMap((block) => block.patterns));
  const aliases = distinct(hostAliases(blocks));
  const hostBlocks = blocks.filter((block) => !block.patterns.includes('*'));
  const hostnames = distinct(valuesFrom(scopedBlocks, 'HostName'));
  const users = distinct(valuesFrom(scopedBlocks, 'User'));
  const ports = distinct(valuesFrom(scopedBlocks, 'Port'));
  const identityFiles = distinct(valuesFrom(scopedBlocks, 'IdentityFile'));
  const proxyJumpHosts = distinct(valuesFrom(scopedBlocks, 'ProxyJump').flatMap(splitProxyJump));
  const proxyCommandCount = valuesFrom(scopedBlocks, 'ProxyCommand').length;
  const proxyCommands = distinct(valuesFrom(scopedBlocks, 'ProxyCommand'));
  const forwardAgentCount = valuesFrom(scopedBlocks, 'ForwardAgent').filter(yes).length;
  const addKeysToAgent = distinct([
    ...(globalSettings.addkeystoagent || []),
    ...valuesFrom(scopedBlocks, 'AddKeysToAgent'),
  ]);
  const identityAgents = distinct(valuesFrom(scopedBlocks, 'IdentityAgent'));
  const forwardX11Count = valuesFrom(scopedBlocks, 'ForwardX11').filter(yes).length;
  const strictHostKeyDisabledCount = valuesFrom(scopedBlocks, 'StrictHostKeyChecking').filter(disabledStrictHostKeyChecking).length;
  const securityOptions = [
    ...valuesFrom(scopedBlocks, 'StrictHostKeyChecking').map((value) => `StrictHostKeyChecking ${value}`),
    ...valuesFrom(scopedBlocks, 'UserKnownHostsFile').map((value) => `UserKnownHostsFile ${value}`),
    ...valuesFrom(scopedBlocks, 'VerifyHostKeyDNS').map((value) => `VerifyHostKeyDNS ${value}`),
    ...valuesFrom(scopedBlocks, 'UpdateHostKeys').map((value) => `UpdateHostKeys ${value}`),
    ...valuesFrom(scopedBlocks, 'PasswordAuthentication').map((value) => `PasswordAuthentication ${value}`),
    ...valuesFrom(scopedBlocks, 'IdentitiesOnly').map((value) => `IdentitiesOnly ${value}`),
  ];
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
    { label: 'Host blocks', value: String(hostBlocks.length) },
    { label: 'Host aliases', value: listValue(aliases) },
    { label: 'Host patterns', value: listValue(hostPatterns) },
    { label: 'Wildcard defaults', value: blocks.some((block) => block.patterns.includes('*')) },
    { label: 'Hostnames', value: listValue(hostnames) },
    { label: 'Users', value: listValue(users) },
    { label: 'Ports', value: listValue(ports) },
    { label: 'Identity files', value: listValue(identityFiles) },
    { label: 'Distinct identity files', value: countValue(identityFiles) },
    { label: 'ProxyJump hosts', value: listValue(proxyJumpHosts) },
    { label: 'ProxyCommand entries', value: String(proxyCommandCount) },
    { label: 'ProxyCommands', value: listValue(proxyCommands) },
    { label: 'ForwardAgent enabled', value: String(forwardAgentCount) },
    { label: 'Add identities to agent', value: listValue(addKeysToAgent) },
    { label: 'IdentityAgent', value: listValue(identityAgents) },
    { label: 'ForwardX11 enabled', value: String(forwardX11Count) },
    { label: 'Strict host checking disabled', value: String(strictHostKeyDisabledCount) },
    { label: 'Security options', value: listValue(securityOptions) },
    { label: 'Forwarded ports', value: listValue(forwardedPorts) },
    { label: 'Security notes', value: securityNotes({ forwardAgentCount, forwardX11Count, strictHostKeyDisabledCount, proxyCommandCount }) },
    { label: 'Includes', value: listValue(includes) },
  ];
  if (matchBlocks.length) {
    fields.push({ label: 'Match blocks', value: listValue(matchBlocks.map((block) => block.criteria)) });
  }
  return {
    fields,
  };
}
