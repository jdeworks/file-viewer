export function extract(intake) {
  const html = intake.text || '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const title = doc.querySelector('title')?.textContent || '';
  const scripts = doc.querySelectorAll('script').length;
  const inlineHandlers = [...doc.querySelectorAll('*')].reduce((n, el) =>
    n + [...el.attributes].filter((a) => /^on/i.test(a.name)).length, 0);
  return [
    title ? { label: 'Title', value: title.trim() } : null,
    { label: 'Elements', value: String(doc.querySelectorAll('*').length) },
    { label: 'Scripts', value: String(scripts) },
    { label: 'Inline handlers', value: String(inlineHandlers) },
    { label: 'Links', value: String(doc.querySelectorAll('a[href]').length) },
    { label: 'Images', value: String(doc.querySelectorAll('img').length) },
    { label: 'Forms', value: String(doc.querySelectorAll('form').length) },
    { label: 'Stylesheets', value: String(doc.querySelectorAll('link[rel~="stylesheet"], style').length) },
  ].filter(Boolean);
}
