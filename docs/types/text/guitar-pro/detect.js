import { hasExtension } from '../../../core/detect.js';
export function detect(intake) {
  if (hasExtension(intake, 'gpx')) {
    // GPX is a ZIP — check for PK magic
    if (intake.bytes && intake.bytes[0] === 0x50 && intake.bytes[1] === 0x4b) return 0.9;
    return 0.7;
  }
  if (!intake.isBinary) return 0;
  if (!intake.bytes || intake.bytes.length < 4) return 0;
  // GP5 magic: "FICHIER GUITAR PRO v5"
  // GP4: "FICHIER GUITAR PRO v4"
  // GP3: "FICHIER GUITAR PRO v3"
  const head = String.fromCharCode(...intake.bytes.slice(0, 32));
  if (/FICHIER GUITAR PRO v[3-5]/.test(head)) return 0.98;
  if (hasExtension(intake, 'gp3', 'gp4', 'gp5', 'gp')) return 0.7;
  return 0;
}
