import { render } from './renderer.js';

export async function extractMetadata(intake) {
  const result = render(intake, null);
  const fields = [];
  const text = intake.text || '';
  const head = text.slice(0, 200);
  const kindMatch = head.match(/^\((\w+)/);
  if (kindMatch) fields.push({ label: 'Format', value: kindMatch[1].replace(/_/g, ' ') });
  const verMatch = text.match(/\(version\s+"?(\d[\d.]*)"?\)/);
  if (verMatch) fields.push({ label: 'KiCad version', value: verMatch[1] });
  const titleMatch = text.match(/\(title\s+"([^"]+)"\)/);
  if (titleMatch) fields.push({ label: 'Title', value: titleMatch[1] });
  const companyMatch = text.match(/\(company\s+"([^"]+)"\)/);
  if (companyMatch) fields.push({ label: 'Company', value: companyMatch[1] });
  return { fields };
}
