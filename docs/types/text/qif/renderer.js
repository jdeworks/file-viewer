function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const ACCOUNT_TYPES = {
  Bank: 'Bank / Checking',
  Cash: 'Cash',
  CCard: 'Credit Card',
  Invst: 'Investment',
  OthA: 'Other Asset',
  OthL: 'Other Liability',
  Invoice: 'Invoice',
  Memorized: 'Memorized Transaction',
};

function parseQif(text) {
  const sections = [];
  let currentType = '';
  let currentAccount = '';
  let txns = [];
  let currentTxn = {};

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('!Type:') || line.startsWith('!type:')) {
      currentType = line.slice(6).trim();
    } else if (line.startsWith('!Account') || line.startsWith('!account')) {
      // next lines are account header
    } else if (line === '^') {
      // End of record
      if (Object.keys(currentTxn).length > 0) txns.push({ ...currentTxn });
      currentTxn = {};
    } else if (currentType) {
      const code = line[0];
      const val = line.slice(1);
      switch (code) {
        case 'D': currentTxn.date = val; break;
        case 'T': currentTxn.amount = val; break;
        case 'P': currentTxn.payee = val; break;
        case 'M': currentTxn.memo = val; break;
        case 'C': currentTxn.cleared = val; break;
        case 'L': currentTxn.category = val; break;
        case 'N': currentTxn.number = val; break;
      }
    }
  }

  return { type: currentType, txns };
}

export function render(intake) {
  const { text, textSample } = intake;
  const src = text || textSample || '';

  const s = src.trimStart();
  if (!s.startsWith('!Type:') && !s.startsWith('!type:') && !s.startsWith('!Account') && !s.startsWith('!Option')) {
    return { bodyHtml: '<p class="viewer-message">Not a valid QIF file.</p>', hadUnsafe: false };
  }

  const { type, txns } = parseQif(src);
  const typeLabel = ACCOUNT_TYPES[type] || type || 'Unknown';

  // Compute stats
  let income = 0, expenses = 0;
  const catCounts = {};
  for (const t of txns) {
    if (t.amount) {
      const amt = parseFloat(t.amount.replace(/,/g, '')) || 0;
      if (amt >= 0) income += amt; else expenses += amt;
    }
    if (t.category) catCounts[t.category] = (catCounts[t.category] || 0) + 1;
  }

  const dateRange = txns.length > 0
    ? `${txns[0].date || '?'} → ${txns[txns.length - 1].date || '?'}`
    : '';

  const rows = [
    ['Format', 'QIF (Quicken Interchange)'],
    type ? ['Account type', typeLabel] : null,
    ['Transactions', txns.length.toString()],
    dateRange ? ['Date range', dateRange] : null,
    income > 0 ? ['Total income', `+${income.toFixed(2)}`] : null,
    expenses < 0 ? ['Total expenses', expenses.toFixed(2)] : null,
  ].filter(Boolean).map(([k, v]) =>
    `<div class="meta-row"><span class="meta-key">${esc(k)}</span><span class="meta-val">${esc(v)}</span></div>`
  ).join('');

  const MAX_SHOW = 20;
  const shown = txns.slice(0, MAX_SHOW);
  const txnRows = shown.map(t =>
    `<tr><td>${esc(t.date || '')}</td><td>${esc(t.payee || '')}</td><td style="text-align:right">${esc(t.amount || '')}</td><td>${esc(t.category || '')}</td></tr>`
  ).join('');
  const moreRow = txns.length > MAX_SHOW
    ? `<tr><td colspan="4" style="opacity:0.6;font-size:0.8rem">… and ${txns.length - MAX_SHOW} more transactions</td></tr>`
    : '';

  const txnTable = txns.length > 0 ? `
    <div class="meta-section">
      <h4 class="meta-section-title">Transactions</h4>
      <table class="meta-table">
        <thead><tr><th>Date</th><th>Payee</th><th>Amount</th><th>Category</th></tr></thead>
        <tbody>${txnRows}${moreRow}</tbody>
      </table>
    </div>` : '';

  return {
    bodyHtml: `
      <style>.badge-qif { background: #1b5e20; color: #fff; }</style>
      <div class="badge-row"><span class="badge badge-qif">QIF</span></div>
      <div class="meta-section">
        <h4 class="meta-section-title">Account Summary</h4>
        ${rows}
      </div>
      ${txnTable}`,
    hadUnsafe: false,
  };
}
