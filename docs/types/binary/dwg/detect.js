import { hasExtension, mimeMatches } from '../../../core/detect.js';

// AutoCAD DWG files start with "AC" followed by a 4-digit version number.
// Known versions: AC1006 (R10), AC1009 (R11/12), AC1012 (R13), AC1014 (R14),
// AC1015 (2000), AC1018 (2004), AC1021 (2007), AC1024 (2010), AC1027 (2013),
// AC1032 (2018), AC1035 (2023)
const KNOWN_VERSIONS = new Set(['AC1006', 'AC1009', 'AC1012', 'AC1014', 'AC1015', 'AC1018', 'AC1021', 'AC1024', 'AC1027', 'AC1032', 'AC1035']);
const DWG_VERSION_RE = /^AC\d{4}$/;

function versionString(bytes) {
  if (!bytes || bytes.length < 6) return '';
  return new TextDecoder('ascii', { fatal: false }).decode(bytes.slice(0, 6));
}

export function detect(intake) {
  const { bytes: b } = intake;
  const isDwgExt = hasExtension(intake, 'dwg');
  const isDwgMime = mimeMatches(intake, 'vnd.dwg', 'x-dwg', 'acad');

  if (!b || b.length < 6) return isDwgExt || isDwgMime ? 0.95 : 0;

  const version = versionString(b);
  const knownVersion = KNOWN_VERSIONS.has(version);
  const plausibleVersion = DWG_VERSION_RE.test(version);

  if (knownVersion) return isDwgExt ? 0.99 : isDwgMime ? 0.98 : 0.96;
  if (plausibleVersion) return isDwgExt ? 0.94 : isDwgMime ? 0.92 : 0.88;
  if (isDwgExt || isDwgMime) return 0.55;
  return 0;
}
