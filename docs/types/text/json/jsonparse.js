export function parseJsonLike(text, fallback = 'null') {
  const source = text == null || text === '' ? fallback : String(text);
  const hadBom = source.startsWith('\ufeff');
  const parseSource = hadBom ? source.slice(1) : source;
  const bomWarning = 'A leading UTF-8 BOM was ignored while parsing; the source is unchanged.';
  try {
    return {
      data: JSON.parse(parseSource),
      mode: hadBom ? 'bom' : 'strict',
      hadBom,
      warnings: hadBom ? [bomWarning] : [],
    };
  } catch (strictError) {
    const cleaned = stripJsonCommentsAndTrailingCommas(parseSource);
    if (cleaned === parseSource) {
      strictError.jsonDiagnostics = diagnoseJsonFailure(parseSource);
      throw strictError;
    }
    try {
      return {
        data: JSON.parse(cleaned),
        mode: 'jsonc',
        hadBom,
        warnings: [
          ...(hadBom ? [bomWarning] : []),
          'Parsed as JSONC: comments or trailing commas were ignored.',
        ],
      };
    } catch (recoveryError) {
      strictError.jsonDiagnostics = diagnoseJsonFailure(parseSource, {
        jsoncAttempted: true,
        recoveryError,
        cleaned,
      });
      throw strictError;
    }
  }
}

function unclosedContainerCount(text) {
  let depth = 0;
  let inString = false;
  let quote = '';
  let escaped = false;
  for (const ch of String(text || '')) {
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) inString = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = true;
      quote = ch;
    } else if (ch === '{' || ch === '[') depth += 1;
    else if (ch === '}' || ch === ']') depth -= 1;
  }
  return { depth, inString };
}

export function diagnoseJsonFailure(text, { jsoncAttempted = false, recoveryError = null, cleaned = '' } = {}) {
  const source = String(text || '');
  const diagnostics = [];
  if (jsoncAttempted) {
    const detail = recoveryError?.message ? ` (${recoveryError.message})` : '';
    diagnostics.push(`JSONC comments/trailing commas were safely ignored, but the remaining document is still invalid${detail}.`);
  }

  const json5Features = [];
  if (/(?:^|[\{\[,]\s*)[A-Za-z_$][\w$-]*\s*:/m.test(source)) json5Features.push('unquoted keys');
  if (/'(?:\\.|[^'\\])*'\s*(?=[:,}\]])/.test(source)) json5Features.push('single-quoted strings');
  if (/\b(?:NaN|Infinity|undefined)\b/.test(source)) json5Features.push('non-JSON values');
  if (/\b[+-]?0x[\da-f]+\b/i.test(source)) json5Features.push('hexadecimal numbers');
  if (json5Features.length) {
    diagnostics.push(`JSON5-like syntax detected (${[...new Set(json5Features)].join(', ')}). It was not executed; convert or edit those constructs in Raw view.`);
  }

  const shape = unclosedContainerCount(cleaned || source);
  if (shape.depth > 0 || shape.inString || /[,:[{]\s*$/.test((cleaned || source).trim())) {
    diagnostics.push('The source appears truncated or incomplete; Raw view preserves it for repair.');
  }
  return diagnostics;
}

export function stripJsonCommentsAndTrailingCommas(text) {
  const src = String(text || '');
  let out = '';
  let inString = false;
  let quote = '';
  let escaped = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const next = src[i + 1];
    if (inString) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) inString = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = true;
      quote = ch;
      out += ch;
      continue;
    }
    if (ch === '/' && next === '/') {
      while (i < src.length && src[i] !== '\n' && src[i] !== '\r') i++;
      if (i < src.length) out += src[i];
      continue;
    }
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i++;
      continue;
    }
    out += ch;
  }
  return removeTrailingCommas(out);
}

function removeTrailingCommas(text) {
  const src = String(text || '');
  let out = '';
  let inString = false;
  let quote = '';
  let escaped = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inString) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) inString = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = true;
      quote = ch;
      out += ch;
      continue;
    }
    if (ch === ',') {
      let j = i + 1;
      while (/\s/.test(src[j] || '')) j++;
      if (src[j] === '}' || src[j] === ']') continue;
    }
    out += ch;
  }
  return out;
}
