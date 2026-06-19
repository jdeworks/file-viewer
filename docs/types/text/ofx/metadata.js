import { parseOfx } from './renderer.js';

export async function extractMetadata(intake) {
  const { accounts, transactions, balance, fi, dtStart, dtEnd } = parseOfx(intake.text || '');
  const fields = [];
  if (fi) fields.push({ label: 'Institution', value: fi });
  if (accounts.length) {
    fields.push({ label: 'Account type', value: accounts.map((a) => a.type).filter(Boolean).join(', ') || 'unknown' });
  }
  if (dtStart) fields.push({ label: 'Statement start', value: dtStart });
  if (dtEnd)   fields.push({ label: 'Statement end',   value: dtEnd });
  fields.push({ label: 'Transactions', value: String(transactions.length) });
  if (balance) fields.push({ label: 'Balance', value: balance.amount + (balance.date ? ' as of ' + balance.date : '') });
  return { fields };
}
