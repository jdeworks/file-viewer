import assert from 'node:assert/strict';
import { esc, issueList, maskedValue, secretReason, severityChip, symbolRow } from '../docs/core/known-ui.js';

class MiniElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.attributes = {};
    this.className = '';
    this.title = '';
    this.type = '';
    this._text = '';
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  set textContent(value) {
    this._text = String(value);
    this.children = [];
  }

  get textContent() {
    return this._text + this.children.map((child) => child.textContent || '').join('');
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const out = [];
    const match = (el) => {
      if (selector.startsWith('.')) return String(el.className || '').split(/\s+/).includes(selector.slice(1));
      if (selector.startsWith('[')) return selector === '[data-source-line]' && el.dataset?.sourceLine;
      return el.tagName?.toLowerCase() === selector.toLowerCase();
    };
    const visit = (el) => {
      if (match(el)) out.push(el);
      for (const child of el.children || []) visit(child);
    };
    visit(this);
    return out;
  }
}

globalThis.document = {
  createElement(tagName) {
    return new MiniElement(tagName);
  },
};

assert.equal(esc('<tag attr="x">&'), '&lt;tag attr=&quot;x&quot;&gt;&amp;');

assert.equal(secretReason('POSTGRES_PASSWORD', 'secret').includes('POSTGRES_PASSWORD'), true);
assert.deepEqual(maskedValue('POSTGRES_PASSWORD', 'secret'), {
  text: '********',
  masked: true,
  reason: 'masked because "POSTGRES_PASSWORD" looks sensitive',
});

assert.deepEqual(maskedValue('NODE_ENV', 'production'), {
  text: 'production',
  masked: false,
  reason: '',
});

const sev = severityChip('critical');
assert.equal(sev.className.includes('kf-chip-danger'), true);
assert.equal(sev.textContent, 'critical');

const custom = severityChip('skip', {
  skip: { label: 'ignored', tone: 'muted', title: 'Not evaluated' },
});
assert.equal(custom.className.includes('kf-chip-muted'), true);
assert.equal(custom.textContent, 'ignored');
assert.equal(custom.title, 'Not evaluated');

const row = symbolRow({
  kind: 'function',
  name: 'Invoke-Thing',
  signature: 'function Invoke-Thing($Name)',
  docs: 'Runs the thing.',
  line: 12,
  tags: [{ label: 'param:Name', title: 'Required string' }, 'public'],
  title: 'Function symbol',
});
assert.equal(row.className, 'kf-symbol');
assert.equal(row.querySelector('[data-source-line]').dataset.sourceLine, '12');
assert.equal(row.textContent.includes('function Invoke-Thing($Name)'), true);
assert.equal(row.textContent.includes('Runs the thing.'), true);
assert.equal(row.textContent.includes('param:Name'), true);

const issues = issueList([{ severity: 'warning', message: 'Check this', line: 3 }], { title: 'Review' });
assert.equal(issues.textContent.includes('Review (1)'), true);
assert.equal(issues.querySelector('.kf-chip-warn').textContent, 'warning');
assert.equal(issues.querySelector('[data-source-line]').dataset.sourceLine, '3');

console.log('known-ui tests passed');
