const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.as-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-as{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#3ddc84;color:#1a1a1a;vertical-align:middle;margin-right:8px}
.as-title{font-size:18px;font-weight:700;margin:0 0 4px}
.as-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.as-meta{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px}
.as-chip{font-size:12px;padding:3px 10px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0)}
.as-sec{margin:14px 0}
.as-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;display:flex;align-items:center;gap:6px}
.as-count{font-size:11px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:0 6px;color:var(--fg-2,#888)}
.as-search{width:100%;box-sizing:border-box;padding:6px 10px;font-size:12px;border:1px solid var(--border,#e0e0e0);border-radius:6px;margin-bottom:8px;background:var(--bg,#fff);color:var(--fg,#24292f);outline:none}
.as-search:focus{border-color:#3ddc84}
.as-table{width:100%;border-collapse:collapse;font-size:12px}
.as-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px 4px 0;border-bottom:2px solid var(--border,#e0e0e0)}
.as-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);font-size:12px;word-break:break-word;vertical-align:top}
.as-table td:first-child{font-family:ui-monospace,monospace;white-space:nowrap;color:var(--fg,#24292f)}
.as-table td:last-child{color:var(--fg-2,#555)}
.as-table tr:last-child td{border-bottom:none}
.as-table tr.as-hidden{display:none}
.as-item-name{font-family:ui-monospace,monospace;font-size:11px;color:var(--fg-2,#888);margin-top:2px}
.as-arr-vals{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.as-arr-val{font-size:11px;padding:1px 7px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.as-plural-qty{font-size:10px;padding:1px 5px;border-radius:5px;background:#dbeafe;border:1px solid #93c5fd;color:#1e40af;font-weight:600;margin-right:4px}
`;

function textContent(el) {
  // Get trimmed text content of an element
  return (el.textContent || '').trim();
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const doc = new DOMParser().parseFromString(text, 'text/xml');

  if (doc.getElementsByTagName('parsererror').length) {
    const d = document.createElement('div');
    d.className = 'as-doc';
    d.innerHTML = `<style>${CSS}</style><p style="color:#b91c1c">Could not parse strings.xml as XML.</p>`;
    return { parentNode: d };
  }

  const strings = [...doc.getElementsByTagName('string')];
  const arrays = [...doc.getElementsByTagName('string-array')];
  const plurals = [...doc.getElementsByTagName('plurals')];

  const filename = (intake.name || intake.filename || 'strings.xml').split('/').pop();

  // Build strings table rows
  const strRows = strings.map((el) => {
    const name = el.getAttribute('name') || '';
    const val = textContent(el);
    return { name, val };
  });

  // Build string-array sections
  const arrSections = arrays.map((el) => {
    const name = el.getAttribute('name') || '';
    const items = [...el.getElementsByTagName('item')].map(textContent);
    return { name, items };
  });

  // Build plurals sections
  const pluralSections = plurals.map((el) => {
    const name = el.getAttribute('name') || '';
    const items = [...el.getElementsByTagName('item')].map((i) => ({
      qty: i.getAttribute('quantity') || '',
      val: textContent(i),
    }));
    return { name, items };
  });

  const totalStrings = strings.length;
  const totalArrays = arrays.length;
  const totalPlurals = plurals.length;

  // Strings table HTML (with live search)
  const strTableId = 'as-str-' + Math.random().toString(36).slice(2, 7);
  const strTableHtml = totalStrings ? `
<div class="as-sec">
  <h3>Strings <span class="as-count">${totalStrings}</span></h3>
  <input class="as-search" placeholder="Filter by name or value…" aria-label="Filter strings" data-table="${strTableId}">
  <table class="as-table" id="${strTableId}">
    <thead><tr><th>Name</th><th>Value</th></tr></thead>
    <tbody>
      ${strRows.map((r) => `<tr data-name="${esc(r.name.toLowerCase())}" data-val="${esc(r.val.toLowerCase())}">
        <td>${esc(r.name)}</td>
        <td>${esc(r.val)}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>` : '';

  // String-arrays HTML
  const arrHtml = arrSections.length ? `
<div class="as-sec">
  <h3>String arrays <span class="as-count">${arrSections.length}</span></h3>
  <table class="as-table">
    <thead><tr><th>Name</th><th>Items</th></tr></thead>
    <tbody>
      ${arrSections.map((a) => `<tr>
        <td>${esc(a.name)}</td>
        <td><div class="as-arr-vals">${a.items.map((v) => `<span class="as-arr-val">${esc(v)}</span>`).join('')}</div></td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>` : '';

  // Plurals HTML
  const pluralHtml = pluralSections.length ? `
<div class="as-sec">
  <h3>Plurals <span class="as-count">${pluralSections.length}</span></h3>
  <table class="as-table">
    <thead><tr><th>Name</th><th>Forms</th></tr></thead>
    <tbody>
      ${pluralSections.map((p) => `<tr>
        <td>${esc(p.name)}</td>
        <td>${p.items.map((i) => `<span class="as-plural-qty">${esc(i.qty)}</span>${esc(i.val)}`).join('<br>')}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>` : '';

  const metaChips = [
    `<span class="as-chip">${totalStrings} string${totalStrings !== 1 ? 's' : ''}</span>`,
    totalArrays ? `<span class="as-chip">${totalArrays} array${totalArrays !== 1 ? 's' : ''}</span>` : '',
    totalPlurals ? `<span class="as-chip">${totalPlurals} plural${totalPlurals !== 1 ? 's' : ''}</span>` : '',
  ].filter(Boolean).join('');

  const host = document.createElement('div');
  host.className = 'as-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="as-title"><span class="badge-as">Android Strings</span>${esc(filename)}</div>
<div class="as-sub">Android string resources</div>
<div class="as-meta">${metaChips}</div>
${strTableHtml}
${arrHtml}
${pluralHtml}`;

  // Wire up live search after insertion
  requestAnimationFrame(() => {
    host.querySelectorAll('.as-search').forEach((input) => {
      const tableId = input.dataset.table;
      const table = host.querySelector('#' + tableId);
      if (!table) return;
      input.addEventListener('input', () => {
        const q = input.value.toLowerCase();
        table.querySelectorAll('tbody tr').forEach((tr) => {
          const name = tr.dataset.name || '';
          const val = tr.dataset.val || '';
          tr.classList.toggle('as-hidden', !!(q && !name.includes(q) && !val.includes(q)));
        });
      });
    });
  });

  return { parentNode: host };
}
