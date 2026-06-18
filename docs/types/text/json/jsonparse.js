export function parseJsonLike(text, fallback = 'null') {
  const source = text == null || text === '' ? fallback : String(text);
  try {
    return { data: JSON.parse(source), mode: 'strict', warnings: [] };
  } catch (strictError) {
    const cleaned = stripJsonCommentsAndTrailingCommas(source);
    if (cleaned === source) throw strictError;
    try {
      return {
        data: JSON.parse(cleaned),
        mode: 'jsonc',
        warnings: ['Parsed as JSONC: comments or trailing commas were ignored.'],
      };
    } catch {
      throw strictError;
    }
  }
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
