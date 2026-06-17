const CHEAT_LINE_RE = /^\s*CHEAT\s*=\s*(.*?)\s*$/i;
const QUOTED_RE = /^(['"])(.*)\1$/;
const TRUTHY = new Set(['true', '1', 'yes', 'on']);
const FALSY = new Set(['', 'false', '0', 'no', 'off']);

export function normalizeCheatValue(value) {
  let raw = String(value == null ? '' : value).trim();
  const quoted = raw.match(QUOTED_RE);
  if (quoted) raw = quoted[2].trim();
  return raw;
}

export function parseCheatLine(line) {
  const match = String(line == null ? '' : line).match(CHEAT_LINE_RE);
  if (!match) return null;
  const value = normalizeCheatValue(match[1]);
  const canonical = value.toLowerCase();
  const truthy = TRUTHY.has(canonical);
  const falsy = FALSY.has(canonical);
  return {
    found: true,
    value,
    canonical,
    truthy,
    falsy,
    cheatActive: truthy,
    disabled: !truthy,
    recognized: truthy || falsy,
  };
}

export function parseCheatConfig(source) {
  const lines = String(source == null ? '' : source).split(/\r?\n/);
  for (const line of lines) {
    const parsed = parseCheatLine(line);
    if (parsed) return parsed;
  }
  return {
    found: false,
    value: '',
    canonical: '',
    truthy: false,
    falsy: true,
    cheatActive: false,
    disabled: true,
    recognized: true,
  };
}

export function shouldDisableCheat(source) {
  return parseCheatConfig(source).disabled;
}

export function maybeSetCheatDisabledAction(source, actions, detail = {}) {
  const parsed = parseCheatConfig(source);
  if (!parsed.disabled || !actions || typeof actions.setAction !== 'function') return false;
  actions.setAction(1, 'cheat_disabled', {
    source: 'raw-editor',
    file: 'Overwriter.frag',
    value: parsed.value,
    ...detail,
  });
  return true;
}
