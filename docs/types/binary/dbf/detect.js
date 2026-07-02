import { hasExtension, mimeMatches } from '../../../core/detect.js';

// dBASE/DBF version byte values:
// 0x02 = dBASE II, 0x03 = dBASE III+, 0x04 = dBASE IV, 0x05 = dBASE V,
// 0x7b = Visual Objects, 0x83 = dBASE III+ with memo, 0x8b = dBASE IV with memo,
// 0xf5 = FoxPro with memo, 0x30 = Visual FoxPro, 0x31 = VFP with autoincrement,
// 0x32 = VFP with varchar
const KNOWN_VERSIONS = new Set([0x02, 0x03, 0x04, 0x05, 0x07, 0x30, 0x31, 0x32, 0x7b, 0x82, 0x83, 0x8b, 0x8e, 0xcb, 0xf5]);

export function detect(intake) {
  const { bytes: b } = intake;
  const isDbfExt = hasExtension(intake, 'dbf');
  const isDbfMime = mimeMatches(intake, 'dbf', 'dbase');

  if (!b || b.length < 32) return isDbfExt || isDbfMime ? 0.6 : 0;

  const version = b[0];
  const knownVersion = KNOWN_VERSIONS.has(version);
  // header size and record size must be reasonable
  const headerSize = b[8] | (b[9] << 8);
  const recordSize = b[10] | (b[11] << 8);
  const structural = knownVersion && headerSize >= 32 && headerSize <= 65535 && recordSize >= 1 && recordSize <= 65535;

  if (isDbfExt) return structural ? 0.97 : knownVersion ? 0.80 : 0.65;
  if (isDbfMime) return structural ? 0.90 : knownVersion ? 0.70 : 0.55;
  return structural ? 0.70 : 0;
}
