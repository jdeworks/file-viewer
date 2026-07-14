import { inspectProtectedData } from './parser.js';

export function extractMetadata(intake) {
  const info = inspectProtectedData(intake.bytes);
  if (!info) return {};
  return {
    Format: info.format,
    Identification: 'Probable — protected-data metadata matched',
    'Protection scope': info.protectionScope,
    'Key encryption': info.keyEncryption,
    'Content encryption': info.contentEncryption,
    'Protected envelope': `${info.envelopeSize} bytes`,
    'Appended payload': `${info.appendedPayloadSize} bytes`,
  };
}
