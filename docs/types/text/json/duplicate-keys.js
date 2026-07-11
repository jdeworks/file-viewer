const DEFAULT_MAX_DIAGNOSTICS = 50;
const DEFAULT_MAX_KEY_CHARS = 240;
const DEFAULT_MAX_POINTER_CHARS = 600;

const esc = (value) => String(value).replace(/[&<>"]/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
}[character]));

export function jsonPointer(segments) {
  if (!segments.length) return '';
  return '/' + segments.map((segment) => String(segment).replace(/~/g, '~0').replace(/\//g, '~1')).join('/');
}

function boundedText(value, limit) {
  const text = String(value);
  if (text.length <= limit) return { text, chars: text.length, truncated: false };
  return { text: text.slice(0, Math.max(0, limit - 1)) + '…', chars: text.length, truncated: true };
}

const appendPath = (parent, segment) => ({ parent, segment: String(segment) });

function diagnosticPointer(path, key, limit) {
  const segments = [key];
  for (let node = path; node; node = node.parent) segments.push(node.segment);
  segments.reverse();
  return boundedText(jsonPointer(segments), limit);
}

function createTokenReader(text) {
  const source = String(text || '');
  let index = 0;
  let line = 1;
  let column = 1;

  const location = () => ({ index, line, column });
  const advance = () => {
    const character = source[index];
    if (character === '\r') {
      index++;
      if (source[index] === '\n') index++;
      line++;
      column = 1;
    } else if (character === '\n') {
      index++;
      line++;
      column = 1;
    } else {
      index++;
      column++;
    }
    return character;
  };
  const invalid = (message, at = location()) => ({ type: 'invalid', message, ...at });

  function skipIgnored() {
    while (index < source.length) {
      const character = source[index];
      if (index === 0 && character === '\ufeff') {
        // A leading BOM is invisible, so it does not consume a displayed source column.
        index++;
        continue;
      }
      if (character === ' ' || character === '\t' || character === '\r' || character === '\n') {
        advance();
        continue;
      }
      if (character === '/' && source[index + 1] === '/') {
        advance();
        advance();
        while (index < source.length && source[index] !== '\r' && source[index] !== '\n') advance();
        continue;
      }
      if (character === '/' && source[index + 1] === '*') {
        const start = location();
        advance();
        advance();
        while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) advance();
        if (index >= source.length) return invalid('Unterminated block comment', start);
        advance();
        advance();
        continue;
      }
      break;
    }
    return null;
  }

  function readString() {
    const start = location();
    advance();
    let value = '';
    while (index < source.length) {
      const character = source[index];
      if (character === '"') {
        advance();
        return { type: 'string', value, ...start };
      }
      if (character === '\r' || character === '\n' || character.charCodeAt(0) < 0x20) {
        return invalid('Unescaped control character in string', location());
      }
      if (character !== '\\') {
        value += character;
        advance();
        continue;
      }
      const escapeStart = location();
      advance();
      if (index >= source.length) return invalid('Unterminated string escape', escapeStart);
      const escaped = source[index];
      const simple = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };
      if (Object.prototype.hasOwnProperty.call(simple, escaped)) {
        value += simple[escaped];
        advance();
        continue;
      }
      if (escaped !== 'u') return invalid('Invalid string escape', escapeStart);
      advance();
      let hex = '';
      for (let offset = 0; offset < 4; offset++) {
        if (!/[0-9a-f]/i.test(source[index] || '')) return invalid('Invalid Unicode escape', escapeStart);
        hex += source[index];
        advance();
      }
      value += String.fromCharCode(Number.parseInt(hex, 16));
    }
    return invalid('Unterminated string', start);
  }

  const numberPattern = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
  return function nextToken() {
    const ignoredError = skipIgnored();
    if (ignoredError) return ignoredError;
    if (index >= source.length) return { type: 'eof', ...location() };
    const start = location();
    const character = source[index];
    if (character === '"') return readString();
    if ('{}[]:,'.includes(character)) {
      advance();
      return { type: character, ...start };
    }
    for (const literal of ['true', 'false', 'null']) {
      if (source.startsWith(literal, index)) {
        for (let offset = 0; offset < literal.length; offset++) advance();
        return { type: 'scalar', ...start };
      }
    }
    numberPattern.lastIndex = index;
    const number = numberPattern.exec(source);
    if (number) {
      for (let offset = 0; offset < number[0].length; offset++) advance();
      return { type: 'scalar', ...start };
    }
    return invalid('Unexpected token', start);
  };
}

export function diagnoseDuplicateJsonKeys(text, {
  maxDiagnostics = DEFAULT_MAX_DIAGNOSTICS,
  maxKeyChars = DEFAULT_MAX_KEY_CHARS,
  maxPointerChars = DEFAULT_MAX_POINTER_CHARS,
} = {}) {
  const limit = Number.isFinite(Number(maxDiagnostics))
    ? Math.max(0, Math.floor(Number(maxDiagnostics)))
    : DEFAULT_MAX_DIAGNOSTICS;
  const keyLimit = Number.isFinite(Number(maxKeyChars)) ? Math.max(1, Math.floor(Number(maxKeyChars))) : DEFAULT_MAX_KEY_CHARS;
  const pointerLimit = Number.isFinite(Number(maxPointerChars)) ? Math.max(1, Math.floor(Number(maxPointerChars))) : DEFAULT_MAX_POINTER_CHARS;
  const nextToken = createTokenReader(text);
  const stack = [];
  const diagnostics = [];
  let totalDuplicates = 0;
  let rootState = 'value';
  let complete = false;
  let stoppedAt = null;

  const stop = (token, message = token.message || 'Malformed JSON structure') => {
    stoppedAt = { index: token.index, line: token.line, column: token.column, message };
  };
  const recordKey = (frame, key) => {
    const first = frame.keys.get(key.value);
    if (!first) {
      frame.keys.set(key.value, { index: key.index, line: key.line, column: key.column });
      return;
    }
    totalDuplicates++;
    if (diagnostics.length >= limit) return;
    const storedKey = boundedText(key.value, keyLimit);
    const storedPointer = diagnosticPointer(frame.path, key.value, pointerLimit);
    diagnostics.push({
      key: storedKey.text,
      keyChars: storedKey.chars,
      keyTruncated: storedKey.truncated,
      pointer: storedPointer.text,
      pointerChars: storedPointer.chars,
      pointerTruncated: storedPointer.truncated,
      first: { ...first },
      duplicate: { index: key.index, line: key.line, column: key.column },
    });
  };
  const consumeValue = (token, path) => {
    if (token.type === '{') {
      stack.push({ kind: 'object', path, state: 'keyOrEnd', keys: new Map(), key: null });
      return true;
    }
    if (token.type === '[') {
      stack.push({ kind: 'array', path, state: 'valueOrEnd', index: 0 });
      return true;
    }
    return token.type === 'string' || token.type === 'scalar';
  };

  scan: while (!stoppedAt) {
    const token = nextToken();
    if (token.type === 'invalid') {
      stop(token);
      break;
    }
    if (!stack.length) {
      if (rootState === 'value') {
        if (token.type === 'eof') {
          stop(token, 'Expected a JSON value');
          break;
        }
        if (!consumeValue(token, null)) {
          stop(token, 'Expected a JSON value');
          break;
        }
        rootState = 'done';
        continue;
      }
      if (token.type === 'eof') {
        complete = true;
        break;
      }
      stop(token, 'Unexpected content after the root value');
      break;
    }

    const frame = stack[stack.length - 1];
    if (token.type === 'eof') {
      stop(token, `Unterminated ${frame.kind}`);
      break;
    }
    if (frame.kind === 'object') {
      if (frame.state === 'keyOrEnd') {
        if (token.type === '}') {
          stack.pop();
          continue;
        }
        if (token.type !== 'string') {
          stop(token, 'Expected an object key');
          break;
        }
        frame.key = token;
        frame.state = 'colon';
        continue;
      }
      if (frame.state === 'colon') {
        if (token.type !== ':') {
          stop(token, 'Expected a colon after the object key');
          break;
        }
        recordKey(frame, frame.key);
        frame.state = 'value';
        continue;
      }
      if (frame.state === 'value') {
        const path = appendPath(frame.path, frame.key.value);
        frame.state = 'commaOrEnd';
        if (!consumeValue(token, path)) {
          stop(token, 'Expected an object value');
          break;
        }
        continue;
      }
      if (token.type === ',') {
        frame.state = 'keyOrEnd';
        frame.key = null;
        continue;
      }
      if (token.type === '}') {
        stack.pop();
        continue;
      }
      stop(token, 'Expected a comma or object end');
      break scan;
    }

    if (frame.state === 'valueOrEnd') {
      if (token.type === ']') {
        stack.pop();
        continue;
      }
      const path = appendPath(frame.path, frame.index++);
      frame.state = 'commaOrEnd';
      if (!consumeValue(token, path)) {
        stop(token, 'Expected an array value');
        break;
      }
      continue;
    }
    if (token.type === ',') {
      frame.state = 'valueOrEnd';
      continue;
    }
    if (token.type === ']') {
      stack.pop();
      continue;
    }
    stop(token, 'Expected a comma or array end');
  }

  return {
    diagnostics,
    totalDuplicates,
    omittedDiagnostics: Math.max(0, totalDuplicates - diagnostics.length),
    complete,
    stoppedAt,
  };
}

export function duplicateJsonWarningHtml(report, { malformed = false } = {}) {
  if (!report?.totalDuplicates) return '';
  const intro = malformed
    ? 'The parse error above is primary. These duplicate declarations were confirmed before parsing stopped; a parser would keep the last value.'
    : 'A parser keeps only the last value for each duplicate key, so earlier values are hidden by the tree or summary.';
  const rows = report.diagnostics.map((diagnostic) => {
    const key = JSON.stringify(diagnostic.key);
    const location = `line ${diagnostic.duplicate.line}, column ${diagnostic.duplicate.column}`;
    const first = `line ${diagnostic.first.line}, column ${diagnostic.first.column}`;
    const shortened = [
      diagnostic.keyTruncated ? `key shortened from ${diagnostic.keyChars} characters` : '',
      diagnostic.pointerTruncated ? `path shortened from ${diagnostic.pointerChars} characters` : '',
    ].filter(Boolean);
    const note = shortened.length ? ` Display ${shortened.join(' and ')}.` : '';
    return `<li data-json-pointer="${esc(diagnostic.pointer)}"><code>${esc(diagnostic.pointer || '(root)')}</code>: key <code>${esc(key)}</code> repeats at ${location}; first declared at ${first}.${esc(note)}</li>`;
  }).join('');
  const omitted = report.omittedDiagnostics
    ? `<p class="json-duplicate-omitted">Showing ${report.diagnostics.length} of ${report.totalDuplicates} duplicate occurrences; ${report.omittedDiagnostics} more omitted.</p>`
    : '';
  return `<section class="json-warning json-duplicate-warning" role="alert" data-duplicate-total="${report.totalDuplicates}"><strong>Duplicate JSON keys (${report.totalDuplicates})</strong><p>${esc(intro)}</p><ul>${rows}</ul>${omitted}</section>`;
}

export function createDuplicateJsonWarning(report, options = {}) {
  const html = duplicateJsonWarningHtml(report, options);
  if (!html) return null;
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content.firstElementChild;
}
