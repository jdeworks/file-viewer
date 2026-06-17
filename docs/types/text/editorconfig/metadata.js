export function extractMetadata(intake) {
  const text = intake.text || '';
  const sectionMatches = text.match(/^\[[\w.*{}?,!\-/\\]+\]/gm) || [];
  const isRoot = /^root\s*=\s*true/im.test(text);
  const hasSpaces = /indent_style\s*=\s*space/i.test(text);
  const hasTabs = /indent_style\s*=\s*tab/i.test(text);
  return {
    sectionCount: sectionMatches.length,
    isRoot,
    indentStyle: hasSpaces && hasTabs ? 'mixed' : hasSpaces ? 'spaces' : hasTabs ? 'tabs' : null,
  };
}
