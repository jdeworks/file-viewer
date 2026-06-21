import { parseOfx } from './renderer.js';

export async function extractMetadata(intake) {
  const text = intake.text || '';
  const { accounts, transactions, balance, fi, dtStart, dtEnd } = parseOfx(text);
  const fields = [];
  if (fi) fields.push({ label: 'Institution', value: fi });
  // Default currency (CURDEF) — parsed straight from the text; cheap and parser-independent.
  const curMatch = text.match(/<CURDEF>\s*([A-Za-z]{3})/i);
  if (curMatch) fields.push({ label: 'Currency', value: curMatch[1].toUpperCase() });
  if (accounts.length) {
    fields.push({ label: 'Accounts', value: String(accounts.length) });
    fields.push({ label: 'Account type', value: accounts.map((a) => a.type).filter(Boolean).join(', ') || 'unknown' });
  }
  if (dtStart) fields.push({ label: 'Statement start', value: dtStart });
  if (dtEnd)   fields.push({ label: 'Statement end',   value: dtEnd });
  fields.push({ label: 'Transactions', value: String(transactions.length) });
  if (balance) fields.push({ label: 'Balance', value: balance.amount + (balance.date ? ' as of ' + balance.date : '') });
  return { fields };
}
