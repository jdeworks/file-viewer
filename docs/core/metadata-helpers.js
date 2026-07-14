export const META_SECTIONS = Object.freeze({
  type: 'Type-specific details',
  security: 'Security and privacy',
  text: 'Text structure',
  advanced: 'Advanced file facts',
});

export const META_KEYS = Object.freeze({
  extension: 'extension',
  contentKind: 'content-kind',
  detectedContent: 'detected-content-signature',
  contentRisk: 'content-risk',
  contentWarnings: 'content-warnings',
  loadedBytes: 'loaded-bytes',
  bom: 'byte-order-mark',
  encoding: 'text-encoding',
  encodingWarnings: 'encoding-warnings',
  lineEndings: 'line-endings',
  lineBreakCount: 'line-break-count',
  logicalLines: 'logical-lines',
  blankLines: 'blank-lines',
  longestLine: 'longest-line',
  trailingNewline: 'trailing-newline',
  filenameRisk: 'filename-risk',
  filenameWarnings: 'filename-warnings',
  archiveRisk: 'archive-risk',
  archiveWarnings: 'archive-warnings',
  sha256: 'sha256-local',
});

export function metadataRow(label, value, { section = '', dedupeKey = '', priority } = {}) {
  return {
    label,
    value,
    ...(section ? { section } : {}),
    ...(dedupeKey ? { dedupeKey } : {}),
    ...(Number.isFinite(priority) ? { priority } : {}),
  };
}

export function advancedFact(label, value, dedupeKey, priority = 1) {
  return metadataRow(label, value, { section: META_SECTIONS.advanced, dedupeKey, priority });
}

export function textFact(label, value, dedupeKey, priority = 1) {
  return metadataRow(label, value, { section: META_SECTIONS.text, dedupeKey, priority });
}

export function typeFact(label, value, priority = 1) {
  return metadataRow(label, value, { section: META_SECTIONS.type, priority });
}

export function securityFact(label, value, dedupeKey, priority = 1) {
  return metadataRow(label, value, { section: META_SECTIONS.security, dedupeKey, priority });
}
