export function extract(intake) {
  const doc = new DOMParser().parseFromString(intake.text || '', 'application/xml');
  if (doc.querySelector('parsererror')) return [{ label: 'XML', value: 'invalid' }];
  const root = doc.documentElement;
  const elements = doc.getElementsByTagName('*').length;
  return [
    { label: 'Root element', value: root ? root.tagName : '—' },
    { label: 'Elements', value: String(elements) },
    { label: 'Characters', value: String((intake.text || '').length) },
  ];
}
