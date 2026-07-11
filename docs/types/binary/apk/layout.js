const APK_SIGNING_MAGIC = new TextEncoder().encode('APK Sig Block 42');

function u32le(bytes, offset) {
  return (bytes[offset] | bytes[offset + 1] << 8 | bytes[offset + 2] << 16 | bytes[offset + 3] << 24) >>> 0;
}

function u64le(bytes, offset) {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 8).getBigUint64(0, true);
}

function matchesAt(bytes, offset, expected) {
  if (offset < 0 || offset + expected.length > bytes.length) return false;
  return expected.every((value, index) => bytes[offset + index] === value);
}

export function hasApkSigningBlock(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 46) return false;
  const minimum = Math.max(0, bytes.length - 65557);
  let eocd = -1;
  for (let offset = bytes.length - 22; offset >= minimum; offset--) {
    if (bytes[offset] === 0x50 && bytes[offset + 1] === 0x4b && bytes[offset + 2] === 0x05 && bytes[offset + 3] === 0x06) {
      const commentLength = bytes[offset + 20] | bytes[offset + 21] << 8;
      if (offset + 22 + commentLength === bytes.length) { eocd = offset; break; }
    }
  }
  if (eocd < 0) return false;
  const centralDirectory = u32le(bytes, eocd + 16);
  if (centralDirectory < 32 || centralDirectory > eocd || !matchesAt(bytes, centralDirectory - 16, APK_SIGNING_MAGIC)) return false;
  try {
    const trailingSize = u64le(bytes, centralDirectory - 24);
    if (trailingSize > BigInt(Number.MAX_SAFE_INTEGER)) return false;
    const start = centralDirectory - Number(trailingSize) - 8;
    return start >= 0 && u64le(bytes, start) === trailingSize;
  } catch {
    return false;
  }
}

function v1SignatureEvidence(files) {
  const upperToOriginal = new Map(files.map((name) => [name.toUpperCase(), name]));
  const manifest = upperToOriginal.get('META-INF/MANIFEST.MF') || null;
  const sfBases = new Set();
  const blockBases = new Set();
  for (const upper of upperToOriginal.keys()) {
    let match = upper.match(/^META-INF\/(.+)\.SF$/);
    if (match) sfBases.add(match[1]);
    match = upper.match(/^META-INF\/(.+)\.(RSA|DSA|EC)$/);
    if (match) blockBases.add(match[1]);
  }
  const coordinated = [...sfBases].some((base) => blockBases.has(base));
  return { present: !!manifest && coordinated, manifest };
}

export function analyzeAndroidPackage(files, bytes, extension = 'apk') {
  const entries = [...new Set(files.filter((name) => typeof name === 'string' && name && !name.endsWith('/')))].sort();
  const ext = String(extension || 'apk').replace(/^\./, '').toLowerCase();
  const kind = ext === 'aab' ? 'aab' : ext === 'xapk' ? 'xapk' : 'apk';
  const manifestFiles = kind === 'aab'
    ? entries.filter((name) => /^[^/]+\/manifest\/AndroidManifest\.xml$/i.test(name))
    : kind === 'apk' ? entries.filter((name) => /^AndroidManifest\.xml$/i.test(name)) : [];
  const dexFiles = kind === 'aab'
    ? entries.filter((name) => /^[^/]+\/dex\/classes\d*\.dex$/i.test(name))
    : kind === 'apk' ? entries.filter((name) => /^classes\d*\.dex$/i.test(name)) : [];
  const libMatches = kind === 'aab'
    ? entries.map((name) => name.match(/^[^/]+\/lib\/([^/]+)\/[^/]+\.so$/i)).filter(Boolean)
    : kind === 'apk' ? entries.map((name) => name.match(/^lib\/([^/]+)\/[^/]+\.so$/i)).filter(Boolean) : [];
  const abiDirs = [...new Set(libMatches.map((match) => match[1]))].sort();
  const resources = kind === 'aab'
    ? entries.filter((name) => /^[^/]+\/resources\.pb$/i.test(name))
    : kind === 'apk' ? entries.filter((name) => /^resources\.arsc$/i.test(name)) : [];
  const assetCount = kind === 'aab'
    ? entries.filter((name) => /^[^/]+\/assets\//i.test(name)).length
    : kind === 'apk' ? entries.filter((name) => /^assets\//i.test(name)).length : 0;
  const embeddedApks = kind === 'xapk' ? entries.filter((name) => /\.apk$/i.test(name)) : [];
  const descriptor = kind === 'xapk' ? entries.find((name) => /(^|\/)manifest\.json$/i.test(name)) || null : null;

  const v1 = v1SignatureEvidence(entries);
  const signingBlock = kind === 'apk' && hasApkSigningBlock(bytes);
  let signatureEvidence;
  if (kind === 'xapk') {
    signatureEvidence = 'Outer container not assessed; embedded APK signatures not inspected';
  } else {
    const evidence = [];
    if (v1.present) evidence.push('v1/JAR signature files present (not cryptographically verified)');
    if (signingBlock) evidence.push('APK Signing Block present (not cryptographically verified)');
    signatureEvidence = evidence.join('; ') || 'No recognized signature material (package may be unsigned)';
  }

  return {
    kind,
    entries,
    manifestFiles,
    dexFiles,
    abiDirs,
    resources,
    assetCount,
    embeddedApks,
    descriptor,
    signatureEvidence,
    jarManifestPath: v1.manifest,
  };
}
