import { hasExtension, mimeMatches } from '../../../core/detect.js';

// XML family (but NOT .svg — that's the image type, and not the Office/zip XML containers).
// Strong on explicit XML extensions; a `<?xml` / root-element sniff catches the rest.
export function detect(intake) {
  if (intake.isBinary) return 0;
  if (hasExtension(intake, 'xml', 'xsd', 'xsl', 'xslt', 'rss', 'atom', 'wsdl', 'pom', 'csproj', 'props', 'targets', 'resx')) return 0.92;
  if (mimeMatches(intake, 'xml')) return 0.85;
  const t = (intake.textSample || '').trimStart();
  if (/^<\?xml[\s>]/.test(t)) return 0.8;
  // A bare element root that isn't HTML — weak fallback for extensionless XML.
  if (/^<([A-Za-z_][\w.-]*)(\s|>)/.test(t) && !/^<(?:!doctype\s+html|html|head|body)\b/i.test(t)) return 0.3;
  return 0;
}
