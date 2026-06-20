const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

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
  let txns = [];
  let currentTxn = {};

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('!Type:') || line.startsWith('!type:')) {
      currentType = line.slice(6).trim();
    } else if (line === '^') {
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

  const host = document.createElement('div');
  host.className = 'qif-preview';

  const s = src.trimStart();
  if (!s.startsWith('!Type:') && !s.startsWith('!type:') && !s.startsWith('!Account') && !s.startsWith('!Option')) {
    host.innerHTML = '<p class="qif-empty">Not a valid QIF file.</p>';
    return { parentNode: host };
  }

  const { type, txns } = parseQif(src);
  const typeLabel = ACCOUNT_TYPES[type] || type || 'Unknown';

  let income = 0, expenses = 0;
  for (const t of txns) {
    if (t.amount) {
      const amt = parseFloat(t.amount.replace(/,/g, '')) || 0;
      if (amt >= 0) income += amt; else expenses += amt;
    }
  }

  const dateRange = txns.length > 0
    ? (txns[0].date || '?') + ' → ' + (txns[txns.length - 1].date || '?')
    : '';

  const metaRows = [
    ['Format', 'QIF (Quicken Interchange)'],
    type ? ['Account type', typeLabel] : null,
    ['Transactions', String(txns.length)],
    dateRange ? ['Date range', dateRange] : null,
    income > 0 ? ['Total income', '+' + income.toFixed(2)] : null,
    expenses < 0 ? ['Total expenses', expenses.toFixed(2)] : null,
  ].filter(Boolean).map(([k, v]) =>
    '<div class="qif-row"><span class="qif-label">' + esc(k) + '</span><span class="qif-val">' + esc(v) + '</span></div>'
  ).join('');

  const txnRows = txns.map((t) =>
    '<tr><td>' + esc(t.date || '') + '</td><td>' + esc(t.payee || '') + '</td>'
    + '<td class="qif-mono">' + esc(t.amount || '') + '</td><td>' + esc(t.category || '') + '</td></tr>'
  ).join('');

  const exportBtn = txns.length ? '<button class="qif-export-csv">Export CSV</button>' : '';

  const txnSection = txns.length
    ? '<div class="qif-section">'
      + '<div class="qif-section-head"><h4 class="qif-section-title">Transactions (' + txns.length + ')</h4>' + exportBtn + '</div>'
      + '<table class="qif-table"><thead><tr><th>Date</th><th>Payee</th><th>Amount</th><th>Category</th></tr></thead>'
      + '<tbody>' + txnRows + '</tbody></table>'
      + '</div>'
    : '';

  host.innerHTML =
    '<div class="qif-card">'
    + '<div class="qif-badge">QIF</div>'
    + '<h4 class="qif-section-title">Account Summary</h4>'
    + metaRows
    + '</div>'
    + txnSection;

  const csvBtn = host.querySelector('.qif-export-csv');
  if (csvBtn) {
    csvBtn.addEventListener('click', () => {
      const csvEsc = (v) => {
        const s = String(v ?? '');
        return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s;
      };
      const header = 'Date,Payee,Amount,Category,Memo';
      const rows = txns.map((t) => [t.date, t.payee, t.amount, t.category, t.memo].map(csvEsc).join(','));
      const blob = new Blob([[header, ...rows].join('\r\n')], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (intake.filename || 'transactions').replace(/\.[^.]+$/, '') + '.csv';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
  }

  return { parentNode: host };
}
