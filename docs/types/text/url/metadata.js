// URL type metadata extractor — surfaces scheme, host, TLD, path depth, param count, etc.

const JWT_RE = /^ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const OAUTH_PARAMS = new Set(['code', 'state', 'error', 'access_token', 'refresh_token', 'token_type', 'id_token']);

function extractTld(host) {
  const parts = (host || '').split('.');
  return parts.length >= 2 ? parts.slice(-2).join('.') : host;
}

export async function extractMetadata(intake) {
  const text = (intake.text || '').trim();
  if (!text) return { fields: [] };

  const fields = [];

  // bare query string?
  const raw = text.startsWith('?') ? 'https://x' + text : text;
  let parsed;
  try { parsed = new URL(raw); } catch { return []; }

  const scheme = parsed.protocol.replace(/:$/, '');
  fields.push({ label: 'Scheme', value: scheme });

  if (parsed.hostname && parsed.hostname !== 'x') {
    fields.push({ label: 'Host', value: parsed.hostname });
    fields.push({ label: 'TLD', value: extractTld(parsed.hostname) });
  }

  const pathParts = parsed.pathname.split('/').filter(Boolean);
  fields.push({ label: 'Path depth', value: String(pathParts.length) });

  const paramCount = [...parsed.searchParams.entries()].length;
  fields.push({ label: 'Query param count', value: String(paramCount) });

  fields.push({ label: 'Has fragment', value: parsed.hash ? 'yes' : 'no' });

  const hasJwt = [...parsed.searchParams.values()].some((v) => JWT_RE.test(v));
  fields.push({ label: 'Detected JWT', value: hasJwt ? 'yes' : 'no' });

  const hasOAuth = [...parsed.searchParams.keys()].some((k) => OAUTH_PARAMS.has(k));
  fields.push({ label: 'Detected OAuth', value: hasOAuth ? 'yes' : 'no' });

  if (scheme === 'data') {
    const rest = text.slice(5);
    const comma = rest.indexOf(',');
    const mime = comma > 0 ? rest.slice(0, comma).replace(/;base64$/, '') : 'text/plain';
    fields.push({ label: 'data: type', value: mime });
  }

  fields.push({ label: 'URL length', value: String(text.length) + ' chars' });

  return { fields };
}

export async function extract(intake) {
  return (await extractMetadata(intake)).fields;
}
