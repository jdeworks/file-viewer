function tagText(src, tag) {
  const m = src.match(new RegExp('<(?:[^:>/]+:)?' + tag + '\\b[^>]*>([\\s\\S]*?)</(?:[^:>/]+:)?' + tag + '>', 'i'));
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : '';
}

function dependencyBlocks(src) {
  return [...src.matchAll(/<dependency\b[^>]*>([\s\S]*?)<\/dependency>/gi)].map((m) => m[1]);
}

export function extract(intake) {
  const src = intake.text || '';
  const deps = dependencyBlocks(src).map((block) => ({
    groupId: tagText(block, 'groupId'),
    artifactId: tagText(block, 'artifactId'),
    scope: tagText(block, 'scope') || 'compile',
  })).filter((d) => d.groupId && d.artifactId);
  const scopes = new Set(deps.map((d) => d.scope));
  return [
    ...(tagText(src, 'groupId') ? [{ label: 'Group ID', value: tagText(src, 'groupId') }] : []),
    ...(tagText(src, 'artifactId') ? [{ label: 'Artifact ID', value: tagText(src, 'artifactId') }] : []),
    ...(tagText(src, 'version') ? [{ label: 'Version', value: tagText(src, 'version') }] : []),
    { label: 'Packaging', value: tagText(src, 'packaging') || 'jar' },
    { label: 'Dependencies', value: String(deps.length) },
    { label: 'Dependency scopes', value: String(scopes.size) },
    { label: 'Plugins', value: String((src.match(/<plugin\b/gi) || []).length) },
    { label: 'Modules', value: String((src.match(/<module\b/gi) || []).length) },
  ];
}
