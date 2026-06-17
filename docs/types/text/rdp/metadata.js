function parseRdp(text) {
  const entries = {};
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([^:]+):([sib]):(.*)$/i);
    if (m) entries[m[1].trim().toLowerCase()] = { type: m[2].toLowerCase(), value: m[3] };
  }
  return entries;
}

export async function extractMetadata(intake) {
  const entries = parseRdp(intake.text ?? '');

  const fullAddress = entries['full address']?.value ?? '';
  const lastColon = fullAddress.lastIndexOf(':');
  let host = fullAddress;
  let port = 3389;
  if (lastColon > 0) {
    const portStr = fullAddress.slice(lastColon + 1);
    const parsed = parseInt(portStr, 10);
    if (!isNaN(parsed)) { port = parsed; host = fullAddress.slice(0, lastColon); }
  }

  const username = entries['username']?.value ?? null;
  const domain = entries['domain']?.value ?? null;
  const screenMode = entries['screen mode id'] ? parseInt(entries['screen mode id'].value, 10) : null;
  const desktopWidth = entries['desktopwidth'] ? parseInt(entries['desktopwidth'].value, 10) : null;
  const desktopHeight = entries['desktopheight'] ? parseInt(entries['desktopheight'].value, 10) : null;
  const authLevel = entries['authentication level'] ? parseInt(entries['authentication level'].value, 10) : null;

  return { host: host || null, port, username, domain, screenMode, desktopWidth, desktopHeight, authLevel };
}
