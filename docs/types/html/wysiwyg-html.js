// HTML WYSIWYG editing via contenteditable div.
// The preview iframe uses sandbox="allow-scripts" only (no allow-same-origin), so
// iframe.contentDocument is inaccessible. We extract the <body> content, put it in a
// contenteditable div, then reconstruct the full document on flush.
//
// document.execCommand is deprecated but has no standardised replacement for rich-text
// editing; it works in all current browsers (Chrome, Firefox, Safari, Edge).

export class HtmlWysiwygEditor {
  constructor(container, text, onChange) {
    this._container = container;
    this._onChange = onChange;
    this._text = text;
    this._editHost = null;
    this._debounceTimer = null;
  }

  mount() {
    const body = this._extractBody(this._text);
    this._editHost = document.createElement('div');
    this._editHost.id = 'htmlWysiwygHost';
    this._editHost.className = 'html-wysiwyg-host editor-host';
    this._editHost.contentEditable = 'true';
    this._editHost.innerHTML = body;
    this._container.append(this._editHost);
    this._editHost.addEventListener('input', () => this._onEdit());
    this._editHost.addEventListener('keydown', (e) => this._onKeyDown(e));
  }

  _extractBody(html) {
    const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    return m ? m[1] : html;
  }

  _onEdit() {
    clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      this._onChange?.(this.getValue());
    }, 300);
  }

  _onKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
      if (e.key === 'b') { e.preventDefault(); this.exec('bold'); }
      else if (e.key === 'i') { e.preventDefault(); this.exec('italic'); }
      else if (e.key === 'u') { e.preventDefault(); this.exec('underline'); }
      else if (e.key === 'z') { e.preventDefault(); this.exec('undo'); }
    } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
      e.preventDefault(); this.exec('redo');
    }
  }

  exec(cmd, value) {
    // eslint-disable-next-line no-restricted-syntax
    try { document.execCommand(cmd, false, value ?? null); } catch {}
    this._editHost?.focus();
    this._onEdit();
  }

  execLink() {
    const url = window.prompt('Enter URL:');
    if (url) this.exec('createLink', url);
  }

  getValue() {
    if (!this._editHost) return this._text;
    const bodyContent = this._editHost.innerHTML;
    const replaced = this._text.replace(
      /(<body[^>]*>)([\s\S]*?)(<\/body>)/i,
      (_, open, _old, close) => `${open}${bodyContent}${close}`
    );
    if (replaced !== this._text) return replaced;
    // No <body> tag found — wrap
    return `<!DOCTYPE html><html><body>${bodyContent}</body></html>`;
  }

  unmount() {
    clearTimeout(this._debounceTimer);
    if (this._editHost) { this._editHost.remove(); this._editHost = null; }
  }
}
