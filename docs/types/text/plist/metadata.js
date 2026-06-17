export function extractMetadata(intake) {
  // Parse XML, return { rootType, keyCount, depth }
  // rootType: 'dict' / 'array' / 'string' / etc.
  // keyCount: for dict root, number of top-level keys
  try {
    const doc = new DOMParser().parseFromString(intake.text, 'application/xml');
    const root = doc.querySelector('plist > *');
    if (!root) return { format: 'plist' };
    return {
      format: root.tagName === 'dict' ? 'Property list (dict)' : `Property list (${root.tagName})`,
      rootType: root.tagName,
      keyCount: root.tagName === 'dict' ? root.querySelectorAll(':scope > key').length : undefined,
    };
  } catch { return { format: 'plist' }; }
}
