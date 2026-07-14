// XML preview: parse with the platform DOMParser and render a collapsible element tree
// (reusing the JSON tree styling). Attributes and text are shown inline. No code execution —
// XML isn't script. Structural diff is provided separately via loadDiffRenderer.
// The live preview also carries an optional XPath query panel (core/query-panel.js) backed by
// the platform's native document.evaluate(); a static bodyHtml is returned alongside for
// screenshots / Print.
import { createQueryPanel } from '../../../core/query-panel.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const NORM = (s) => String(s).replace(/\s+/g, ' ').trim();
function directText(el) {
  let t = '';
  for (const n of el.childNodes) if (n.nodeType === 3) t += n.nodeValue;
  return NORM(t);
}

function attrHtml(el) {
  return [...el.attributes]
    .map((a) => ' <span class="j-key">' + esc(a.name) + '</span>=<span class="j-str">"' + esc(a.value) + '"</span>')
    .join('');
}

// `idx` is a monotonically-increasing element id assigned in document order; the live element
// nodes get matched back to the rendered rows via data-qp-el for XPath highlighting.
function elNode(el, counter) {
  const myId = counter.n++;
  const idAttr = ' data-qp-el="' + myId + '"';
  el.__qpId = myId;
  const tag = '<span class="j-key">&lt;' + esc(el.tagName) + '&gt;</span>';
  const kids = [...el.children];
  const text = directText(el);
  if (!kids.length) {
    return '<div class="j-row"' + idAttr + '>' + tag + attrHtml(el) + (text ? ' <span class="j-str">' + esc(text) + '</span>' : '') + '</div>';
  }
  const children = kids.map((k) => elNode(k, counter)).join('')
    + (text ? '<div class="j-row"><span class="j-str">' + esc(text) + '</span></div>' : '');
  return '<details class="j-node" open' + idAttr + '><summary>' + tag + attrHtml(el)
    + '<span class="j-count">' + kids.length + (kids.length === 1 ? ' child' : ' children') + '</span></summary>'
    + '<div class="j-children">' + children + '</div></details>';
}

function normalizeEncodingName(value = '') {
  const normalized = String(value).trim().toLowerCase().replace(/_/g, '-');
  if (['utf8', 'utf-8'].includes(normalized)) return 'UTF-8';
  if (['utf16', 'utf-16', 'utf-16le'].includes(normalized)) return 'UTF-16 LE';
  if (normalized === 'utf-16be') return 'UTF-16 BE';
  if (['iso-8859-1', 'latin1', 'windows-1252'].includes(normalized)) return 'Windows-1252';
  return value ? String(value) : '';
}

function tagBalanceHint(text) {
  const stack = [];
  const scrubbed = String(text || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '')
    .replace(/<\?[^>]*\?>/g, '')
    .replace(/<!DOCTYPE[\s\S]*?(?:>|\]\s*>)/gi, '');
  const tags = scrubbed.matchAll(/<\s*(\/?)\s*([A-Za-z_][\w:.-]*)\b([^>]*)>/g);
  for (const match of tags) {
    const closing = !!match[1];
    const name = match[2];
    const tail = match[3] || '';
    if (!closing && /\/\s*$/.test(tail)) continue;
    if (!closing) {
      stack.push(name);
      continue;
    }
    const open = stack.pop();
    if (open && open !== name) return `Closing </${name}> does not match the open <${open}> element.`;
    if (!open) return `Closing </${name}> has no matching open element.`;
  }
  return stack.length ? `Unclosed <${stack[stack.length - 1]}> element near the end of the file.` : '';
}

export function xmlFailureDiagnostics(intake, parserMessage = '') {
  const source = String(intake?.text || '');
  const diagnostics = [];
  const parser = String(parserMessage || '').replace(/\s+/g, ' ').trim();
  if (parser) diagnostics.push(parser.slice(0, 300));

  if (intake?.truncated) {
    diagnostics.push(`Only ${Number(intake.loadedBytes || intake.bytes?.length || 0).toLocaleString()} of ${Number(intake.size || 0).toLocaleString()} bytes were loaded, so closing markup may be outside the loaded prefix.`);
  } else if (source.trim() && !source.trimEnd().endsWith('>')) {
    diagnostics.push('The final markup is incomplete, which usually means the XML was truncated.');
  }

  const balance = tagBalanceHint(source);
  if (balance && !diagnostics.some((message) => message.includes(balance))) diagnostics.push(balance);

  const declaration = source.match(/^\s*<\?xml\b[^>]*\bencoding\s*=\s*["']([^"']+)["']/i)?.[1];
  const declared = normalizeEncodingName(declaration);
  const decoded = normalizeEncodingName(intake?.encoding);
  if (declared && decoded && declared !== decoded) {
    diagnostics.push(`The XML declaration says ${declared}, but intake decoded the bytes as ${decoded}; verify the declaration or source encoding.`);
  }
  diagnostics.push('Raw view preserves the original decoded source for repair; no XML content was executed.');
  return [...new Set(diagnostics)];
}

export async function render(intake, _ctx) {
  const doc = new DOMParser().parseFromString(intake.text || '', 'application/xml');
  const err = doc.querySelector('parsererror');
  if (err) {
    const diagnostics = xmlFailureDiagnostics(intake, err.textContent);
    return {
      bodyHtml: '<div class="json-error"><strong>Invalid XML</strong><ul>'
        + diagnostics.map((message) => '<li>' + esc(message) + '</li>').join('') + '</ul></div>',
      hadUnsafe: false,
    };
  }
  const root = doc.documentElement;
  if (!root) return { bodyHtml: '<div class="json-tree"><div class="j-row"><span class="j-null">empty document</span></div></div>', hadUnsafe: false };
  const counter = { n: 0 };
  const treeHtml = '<div class="json-tree">' + elNode(root, counter) + '</div>';

  // Live preview: tree + XPath query panel. doc.__qpId tags map evaluated nodes → rendered rows.
  const host = document.createElement('div');
  host.className = 'qp-preview xml-qp';
  host.innerHTML = treeHtml;
  const treeRoot = host.querySelector('.json-tree');
  const panel = createQueryPanel({
    placeholder: 'XPath… e.g. //book[@id]  or  //title',
    hint: 'XPath via native document.evaluate() — e.g. //tag, //*[@attr], /root/child',
    root: treeRoot,
    filterUnit: '.j-node, .j-row',
    evaluate(query) {
      let res;
      try { res = doc.evaluate(query, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null); }
      catch (e) { return { error: e.message || 'bad XPath' }; }
      const set = new Set();
      for (let i = 0; i < res.snapshotLength; i++) {
        let node = res.snapshotItem(i);
        // Map attribute/text/comment nodes up to their owning element.
        while (node && node.nodeType !== 1 && node.ownerElement) node = node.ownerElement;
        while (node && node.nodeType !== 1 && node.parentNode) node = node.parentNode;
        if (!node || node.__qpId === undefined) continue;
        const row = treeRoot.querySelector('[data-qp-el="' + node.__qpId + '"]');
        if (row) set.add(row);
      }
      return set;
    },
  });
  host.prepend(panel.el);

  return { parentNode: host, bodyHtml: treeHtml, hadUnsafe: false };
}
