export function extract(intake) {
  const doc = new DOMParser().parseFromString(intake.text || '', 'application/xml');
  if (doc.querySelector('parsererror')) return [{ label: 'XML', value: 'invalid' }];
  const root = doc.documentElement;
  const elements = doc.getElementsByTagName('*').length;
  const attrs = root ? [...doc.getElementsByTagName('*')].reduce((n, el) => n + el.attributes.length, 0) : 0;
  const comments = [...doc.childNodes].reduce((n, node) => n + countComments(node), 0);
  const out = [
    { label: 'Root element', value: root ? root.tagName : '—' },
    { label: 'Elements', value: String(elements) },
    { label: 'Attributes', value: String(attrs) },
    { label: 'Comments', value: String(comments) },
    { label: 'Characters', value: String((intake.text || '').length) },
  ];
  if (root && root.namespaceURI) out.push({ label: 'Namespace', value: root.namespaceURI });
  if (/(^|\/)pom\.xml$/i.test(intake.filename || '')) {
    out.push({ label: 'Dependencies', value: String(doc.getElementsByTagName('dependency').length) });
  }
  return out;
}

function countComments(node) {
  let count = node.nodeType === 8 ? 1 : 0;
  for (const child of node.childNodes || []) count += countComments(child);
  return count;
}
