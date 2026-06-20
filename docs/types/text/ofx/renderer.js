import { loadGlobal, vendor } from '../../../core/script-loader.js';

const MAX_TXN = 200;

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function maskAccount(acct) {
  const s = String(acct || '').trim();
  return s.length > 4 ? '****' + s.slice(-4) : s ? '****' : '';
}

function fmtDate(raw) {
  if (!raw) return '';
  // OFX dates: YYYYMMDD or YYYYMMDDHHMMSS[.mmm][+offset]
  const m = String(raw).match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return raw;
  return m[1] + '-' + m[2] + '-' + m[3];
}

function fmtAmount(raw) {
  const n = parseFloat(raw);
  if (isNaN(n)) return raw;
  return (n >= 0 ? '+' : '') + n.toFixed(2);
}

// Parse SGML-style OFX 1.x: tags are <TAGNAME>value with no closing tags for leaf nodes.
// Aggregate tags have matching </TAGNAME> closers; leaf values are plain text after the tag.
export function parseOfx(text) {
  const result = { accounts: [], transactions: [], balance: null, fi: null, dtStart: '', dtEnd: '' };

  // Strip header block (everything before <OFX)
  const bodyStart = text.search(/<OFX[\s>]/i);
  const body = bodyStart >= 0 ? text.slice(bodyStart) : text;

  // Check if XML-style (has closing tags) or SGML (no closing leaf tags)
  const isXml = /<\/ACCTID>/i.test(body) || /<\/TRNAMT>/i.test(body);

  function tagVal(src, tag) {
    // Match <TAG>value or <TAG>value</TAG>
    const re = new RegExp('<' + tag + '>([^<]*)', 'i');
    const m = src.match(re);
    return m ? m[1].trim() : '';
  }

  function allTagVals(src, tag) {
    const re = new RegExp('<' + tag + '>([^<]*)', 'gi');
    const out = [];
    let m;
    while ((m = re.exec(src)) !== null) out.push(m[1].trim());
    return out;
  }

  function extractBlock(src, tag) {
    const re = new RegExp('<' + tag + '>([\\s\\S]*?)<\\/' + tag + '>', 'gi');
    const out = [];
    let m;
    while ((m = re.exec(src)) !== null) out.push(m[1]);
    return out;
  }

  if (isXml) {
    // XML mode: use proper block extraction
    const stmtBlocks = extractBlock(body, 'STMTTRNRS').concat(extractBlock(body, 'INVSTMTTRNRS'));
    for (const stmt of stmtBlocks) {
      result.dtStart = tagVal(stmt, 'DTSTART') || result.dtStart;
      result.dtEnd   = tagVal(stmt, 'DTEND')   || result.dtEnd;
      const acctBlock = extractBlock(stmt, 'BANKACCTFROM').concat(extractBlock(stmt, 'INVACCTFROM'));
      for (const a of acctBlock) {
        result.accounts.push({
          routing: tagVal(a, 'BANKID'),
          account: maskAccount(tagVal(a, 'ACCTID')),
          type: tagVal(a, 'ACCTTYPE'),
        });
      }
      const balBlock = extractBlock(stmt, 'LEDGERBAL');
      if (balBlock.length) {
        result.balance = { amount: tagVal(balBlock[0], 'BALAMT'), date: fmtDate(tagVal(balBlock[0], 'DTASOF')) };
      }
      for (const txnBlock of extractBlock(stmt, 'STMTTRN')) {
        result.transactions.push({
          date: fmtDate(tagVal(txnBlock, 'DTPOSTED')),
          type: tagVal(txnBlock, 'TRNTYPE'),
          amount: tagVal(txnBlock, 'TRNAMT'),
          memo: tagVal(txnBlock, 'MEMO') || tagVal(txnBlock, 'NAME'),
        });
      }
    }
    result.fi = tagVal(body, 'ORG') || tagVal(body, 'FID') || '';
  } else {
    // SGML mode: flat scan
    result.dtStart = tagVal(body, 'DTSTART');
    result.dtEnd   = tagVal(body, 'DTEND');
    result.fi = tagVal(body, 'ORG') || tagVal(body, 'FID') || '';
    const routings = allTagVals(body, 'BANKID');
    const accounts = allTagVals(body, 'ACCTID');
    const acctTypes = allTagVals(body, 'ACCTTYPE');
    for (let i = 0; i < Math.max(routings.length, accounts.length); i++) {
      result.accounts.push({ routing: routings[i] || '', account: maskAccount(accounts[i]), type: acctTypes[i] || '' });
    }
    const bals = allTagVals(body, 'BALAMT');
    const balDates = allTagVals(body, 'DTASOF');
    if (bals.length) result.balance = { amount: bals[0], date: fmtDate(balDates[0] || '') };

    const dates = allTagVals(body, 'DTPOSTED');
    const types = allTagVals(body, 'TRNTYPE');
    const amounts = allTagVals(body, 'TRNAMT');
    const memos = allTagVals(body, 'MEMO');
    const names = allTagVals(body, 'NAME');
    for (let i = 0; i < dates.length; i++) {
      result.transactions.push({
        date: fmtDate(dates[i]),
        type: types[i] || '',
        amount: amounts[i] || '',
        memo: memos[i] || names[i] || '',
      });
    }
  }

  result.transactions.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return result;
}

export async function render(intake, _ctx) {
  const ofx = parseOfx(intake.text || '');
  const { accounts, transactions, balance, fi, dtStart, dtEnd } = ofx;

  const truncated = transactions.length > MAX_TXN;
  const shown = truncated ? transactions.slice(0, MAX_TXN) : transactions;

  const acctHtml = accounts.map((a) =>
    '<div class="ofx-card ofx-acct">'
    + (fi ? '<div class="ofx-row"><span class="ofx-label">Institution</span><span class="ofx-val">' + esc(fi) + '</span></div>' : '')
    + (a.routing ? '<div class="ofx-row"><span class="ofx-label">Routing</span><span class="ofx-val ofx-mono">' + esc(a.routing) + '</span></div>' : '')
    + (a.account ? '<div class="ofx-row"><span class="ofx-label">Account</span><span class="ofx-val ofx-mono">' + esc(a.account) + '</span></div>' : '')
    + (a.type ? '<div class="ofx-row"><span class="ofx-label">Type</span><span class="ofx-val">' + esc(a.type) + '</span></div>' : '')
    + ((dtStart || dtEnd) ? '<div class="ofx-row"><span class="ofx-label">Period</span><span class="ofx-val">' + esc(fmtDate(dtStart)) + (dtEnd ? ' → ' + esc(fmtDate(dtEnd)) : '') + '</span></div>' : '')
    + '</div>'
  ).join('');

  const balHtml = balance
    ? '<div class="ofx-card ofx-bal"><div class="ofx-row"><span class="ofx-label">Balance</span><span class="ofx-val ofx-mono">' + esc(balance.amount)
      + (balance.date ? ' <span class="ofx-date">as of ' + esc(balance.date) + '</span>' : '') + '</span></div></div>'
    : '';

  const txnRows = shown.map((t) => {
    const n = parseFloat(t.amount);
    const cls = isNaN(n) ? '' : n >= 0 ? ' ofx-pos' : ' ofx-neg';
    return '<tr><td>' + esc(t.date) + '</td><td>' + esc(t.type) + '</td>'
      + '<td class="ofx-mono' + cls + '">' + esc(fmtAmount(t.amount)) + '</td>'
      + '<td>' + esc(t.memo) + '</td></tr>';
  }).join('');

  const exportBtn = transactions.length
    ? '<button class="ofx-export-csv">Export CSV</button>'
    : '';

  const chartHtml = transactions.length >= 2
    ? '<div class="ofx-chart-wrap"><canvas class="ofx-chart" height="160"></canvas></div>'
    : '';

  const txnHtml = transactions.length
    ? '<div class="ofx-txn">'
      + '<div class="ofx-txn-head"><h3 class="ofx-section">Transactions (' + transactions.length + ')</h3>' + exportBtn + '</div>'
      + chartHtml
      + '<table class="ofx-table"><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Memo</th></tr></thead>'
      + '<tbody>' + txnRows + '</tbody></table>'
      + (truncated ? '<p class="ofx-note">Showing first ' + MAX_TXN + ' of ' + transactions.length + ' transactions.</p>' : '')
      + '</div>'
    : '<p class="ofx-empty">No transactions found.</p>';

  // Render in parentNode mode so preview-chrome.css (where our CSS lives) applies,
  // and so we can wire native event listeners (CSV export, running balance chart).
  const host = document.createElement('div');
  host.className = 'ofx-preview';
  host.innerHTML = (acctHtml || '<p class="ofx-empty">No account info found.</p>') + balHtml + txnHtml;

  const csvBtn = host.querySelector('.ofx-export-csv');
  if (csvBtn) {
    csvBtn.addEventListener('click', () => {
      const csvEscape = (v) => {
        const s = String(v ?? '');
        return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s;
      };
      const header = 'Date,Type,Amount,Memo';
      const rows = transactions.map((t) => [t.date, t.type, t.amount, t.memo].map(csvEscape).join(','));
      const blob = new Blob([[header, ...rows].join('\r\n')], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (intake.filename || 'transactions').replace(/\.[^.]+$/, '') + '.csv';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
  }

  // Running balance chart — load Chart.js lazily after mount
  const chartCanvas = host.querySelector('.ofx-chart');
  if (chartCanvas && transactions.length >= 2) {
    loadGlobal(vendor('chartjs/chart.umd.js'), 'Chart').then((Chart) => {
      // Transactions are newest-first; reverse for chronological chart
      const chrono = [...transactions].reverse();
      let running = 0;
      const labels = [], data = [];
      for (const t of chrono) {
        const n = parseFloat(t.amount);
        if (!isNaN(n)) running += n;
        labels.push(t.date);
        data.push(+running.toFixed(2));
      }
      const isDark = document.documentElement.dataset.theme === 'dark';
      const lineColor = isDark ? '#60a5fa' : '#2563eb';
      new Chart(chartCanvas, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Running balance', data, borderColor: lineColor, backgroundColor: lineColor + '22', borderWidth: 1.5, pointRadius: labels.length > 60 ? 0 : 2, tension: 0.2, fill: true }] },
        options: { animation: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { maxTicksLimit: 8, maxRotation: 0 } }, y: { ticks: { maxTicksLimit: 5 } } } },
      });
    }).catch(() => { /* Chart.js optional; ignore failure */ });
  }

  return { parentNode: host };
}
