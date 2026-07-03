function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Mask account/IBAN numbers to the last 4 characters, matching the convention used by the
// sibling OFX viewer (docs/types/text/ofx/renderer.js) for bank account identifiers.
function maskAccount(acct) {
  const s = String(acct || '').trim();
  return s.length > 4 ? '****' + s.slice(-4) : s ? '****' : '';
}

function parseDate(d) {
  // YYMMDD or YYYYMMDD
  if (!d) return '';
  if (d.length === 6) {
    const yy = parseInt(d.slice(0, 2), 10);
    const year = yy < 50 ? 2000 + yy : 1900 + yy;
    return `${year}-${d.slice(2, 4)}-${d.slice(4, 6)}`;
  }
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  return d;
}

function parseMt940(text) {
  const statements = [];
  // Strip FIN envelope if present
  const cleaned = text.replace(/^\{[^{]*\}\{[^{]*\}\{4:\s*/s, '').replace(/\s*-\}[\s\S]*$/, '');

  // Split into individual statements on :20:
  const stmtBlocks = cleaned.split(/(?=^:20:)/m).filter(b => b.trim());

  for (const block of stmtBlocks) {
    const fields = {};
    const txns = [];
    let cur62 = null;
    let curTxnRef = '';

    // Parse fields — each starts with :XXX:
    const fieldRegex = /^:(\d{2}[A-Z]?):([\s\S]*?)(?=^:\d{2}[A-Z]?:|\Z)/mg;
    let match;
    while ((match = fieldRegex.exec(block)) !== null) {
      const code = match[1];
      const val = match[2].replace(/\r?\n/g, ' ').trim();
      if (code === '61') {
        // Statement line: YYMMDD[MMDD]DC amount[N refcode][//bankref][\n86 text]
        const m = val.match(/^(\d{6})(\d{4})?(C|D|RD|RC)(\d+,\d{0,2})(.*)/);
        if (m) {
          const sign = m[3].startsWith('D') ? -1 : 1;
          const amt = parseFloat(m[4].replace(',', '.')) * sign;
          txns.push({ date: parseDate(m[1]), amount: amt, ref: m[5].trim().slice(0, 30) });
        }
      } else {
        fields[code] = val;
      }
    }

    // :60F: or :60M: — opening balance: D/C + YYMMDD + currency + amount
    const openBal = fields['60F'] || fields['60M'] || '';
    const closeBal = fields['62F'] || fields['62M'] || '';

    const balMatch = (s) => s.match(/^(C|D)(\d{6})([A-Z]{3})([0-9,]+)/);
    const ob = balMatch(openBal);
    const cb = balMatch(closeBal);

    statements.push({
      ref: fields['20'] || '',
      account: fields['25'] || '',
      stmtNo: fields['28C'] || '',
      currency: ob ? ob[3] : (cb ? cb[3] : ''),
      openBalance: ob ? parseFloat(ob[4].replace(',', '.')) * (ob[1] === 'D' ? -1 : 1) : null,
      openDate: ob ? parseDate(ob[2]) : '',
      closeBalance: cb ? parseFloat(cb[4].replace(',', '.')) * (cb[1] === 'D' ? -1 : 1) : null,
      closeDate: cb ? parseDate(cb[2]) : '',
      txns,
    });
  }

  return statements;
}

export function render(intake) {
  const { text, textSample } = intake;
  const src = text || textSample || '';

  const s = src.trimStart();
  if (!/:20:/.test(s)) {
    return { bodyHtml: '<p class="viewer-message">Not a valid MT940 file.</p>', hadUnsafe: false };
  }

  const statements = parseMt940(src);
  if (!statements.length) {
    return { bodyHtml: '<p class="viewer-message">No MT940 statements found.</p>', hadUnsafe: false };
  }

  const allTxns = statements.flatMap(s => s.txns);
  const st = statements[0];
  const cur = st.currency;

  const rows = [
    ['Format', 'MT940 Bank Statement'],
    st.account ? ['Account', maskAccount(st.account)] : null,
    st.ref ? ['Reference', st.ref] : null,
    st.stmtNo ? ['Statement no.', st.stmtNo] : null,
    st.openBalance != null ? ['Opening balance', `${cur} ${st.openBalance >= 0 ? '+' : ''}${st.openBalance.toFixed(2)} (${st.openDate})`] : null,
    st.closeBalance != null ? ['Closing balance', `${cur} ${st.closeBalance >= 0 ? '+' : ''}${st.closeBalance.toFixed(2)} (${st.closeDate})`] : null,
    ['Transactions', allTxns.length.toString()],
    statements.length > 1 ? ['Statements', statements.length.toString()] : null,
  ].filter(Boolean).map(([k, v]) =>
    `<div class="meta-row"><span class="meta-key">${esc(k)}</span><span class="meta-val">${esc(v)}</span></div>`
  ).join('');

  const MAX_SHOW = 20;
  const shown = allTxns.slice(0, MAX_SHOW);
  const txnRows = shown.map(t => {
    const sign = t.amount >= 0 ? '+' : '';
    return `<tr><td>${esc(t.date)}</td><td style="text-align:right;font-family:monospace">${sign}${t.amount.toFixed(2)}</td><td>${esc(t.ref)}</td></tr>`;
  }).join('');
  const more = allTxns.length > MAX_SHOW
    ? `<tr><td colspan="3" style="opacity:0.6;font-size:0.8rem">… and ${allTxns.length - MAX_SHOW} more</td></tr>` : '';

  const txnTable = allTxns.length > 0 ? `
    <div class="meta-section">
      <h4 class="meta-section-title">Transactions${cur ? ` (${cur})` : ''}</h4>
      <table class="meta-table">
        <thead><tr><th>Date</th><th>Amount</th><th>Reference</th></tr></thead>
        <tbody>${txnRows}${more}</tbody>
      </table>
    </div>` : '';

  return {
    bodyHtml: `
      <style>.badge-mt940 { background: #37474f; color: #fff; }</style>
      <div class="badge-row"><span class="badge badge-mt940">MT940</span></div>
      <div class="meta-section">
        <h4 class="meta-section-title">Statement Info</h4>
        ${rows}
      </div>
      ${txnTable}`,
    hadUnsafe: false,
  };
}
