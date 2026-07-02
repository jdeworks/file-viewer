function u16(b, off) {
  return b[off] | (b[off + 1] << 8);
}

function u32(b, off) {
  return (b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24)) >>> 0;
}

function parseXmlPlist(xml) {
  const out = {};
  const valueRe = /<key>([^<]+)<\/key>\s*<(string|integer|array)\b[^>]*>([\s\S]*?)<\/\2>|<key>([^<]+)<\/key>\s*<(true|false)\s*\/?>/g;
  for (const m of xml.matchAll(valueRe)) {
    const key = (m[1] || m[4] || '').trim();
    const tag = m[2] || m[5];
    const body = m[3] || '';
    if (tag === 'true') out[key] = true;
    else if (tag === 'false') out[key] = false;
    else if (tag === 'integer') out[key] = Number.parseInt(body.trim(), 10);
    else if (tag === 'array') out[key] = [...body.matchAll(/<string>([^<]+)<\/string>|<integer>([^<]+)<\/integer>/g)].map((x) => (x[1] || x[2] || '').trim()).filter(Boolean);
    else out[key] = body.trim();
  }
  return out;
}

function readLocalZipEntries(bytes) {
  const entries = [];
  const td = new TextDecoder();
  let off = 0;
  while (off + 30 <= bytes.length && u32(bytes, off) === 0x04034b50) {
    const method = u16(bytes, off + 8);
    const compressedSize = u32(bytes, off + 18);
    const uncompressedSize = u32(bytes, off + 22);
    const nameLen = u16(bytes, off + 26);
    const extraLen = u16(bytes, off + 28);
    const nameStart = off + 30;
    const dataStart = nameStart + nameLen + extraLen;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > bytes.length) break;
    const name = td.decode(bytes.slice(nameStart, nameStart + nameLen));
    entries.push({
      name,
      method,
      uncompressedSize,
      data: method === 0 ? bytes.slice(dataStart, dataEnd) : null,
    });
    off = dataEnd;
  }
  return entries;
}

export function metadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 4 || u32(b, 0) !== 0x04034b50) return {};

  const entries = readLocalZipEntries(b);
  const infoEntry = entries.find((entry) => /^Payload\/[^/]+\.app\/Info\.plist$/.test(entry.name));
  const out = {
    Format: 'iOS App Package (IPA)',
    Files: String(entries.length),
  };
  const totalSize = entries.reduce((sum, entry) => sum + (entry.uncompressedSize || 0), 0);
  if (totalSize) out['Uncompressed size'] = `${totalSize.toLocaleString()} bytes`;
  if (!infoEntry) return out;
  out['Info.plist'] = infoEntry.method === 0 ? 'present' : 'compressed';
  if (!infoEntry.data) return out;

  const info = parseXmlPlist(new TextDecoder().decode(infoEntry.data));
  const appName = info.CFBundleDisplayName || info.CFBundleName || info.CFBundleExecutable;
  if (appName) out['App name'] = appName;
  if (info.CFBundleIdentifier) out['Bundle ID'] = info.CFBundleIdentifier;
  if (info.CFBundleShortVersionString) out.Version = info.CFBundleShortVersionString;
  if (info.CFBundleVersion) out.Build = String(info.CFBundleVersion);
  if (info.MinimumOSVersion || info.LSMinimumSystemVersion) out['Minimum OS'] = info.MinimumOSVersion || info.LSMinimumSystemVersion;
  if (Array.isArray(info.CFBundleSupportedPlatforms) && info.CFBundleSupportedPlatforms.length) out.Platforms = info.CFBundleSupportedPlatforms.join(', ');
  return out;
}
