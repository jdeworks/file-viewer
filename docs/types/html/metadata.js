export function extract(intake) {
  const html = intake.text || '';
  const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1];
  const count = (re) => (html.match(re) || []).length;
  return [
    title ? { label: 'Title', value: title.trim() } : null,
    { label: 'Elements', value: String(count(/<[a-z][\w-]*[\s>]/gi)) },
    { label: 'Scripts', value: String(count(/<script[\s>]/gi)) },
    { label: 'Links', value: String(count(/<a\s/gi)) },
    { label: 'Images', value: String(count(/<img\s/gi)) },
  ].filter(Boolean);
}
