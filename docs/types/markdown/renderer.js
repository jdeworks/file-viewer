// Markdown preview renderer: markdown-it -> source-mapped HTML -> DOMPurify -> body HTML.
// The shell wraps the returned bodyHtml in the secure sandboxed iframe (core/iframe.js).
import { loadGlobal, vendor } from '../../core/script-loader.js';

let mdInstance = null;

async function ensureLibs() {
  const [markdownit, DOMPurify] = await Promise.all([
    loadGlobal(vendor('markdown-it/markdown-it.min.js'), 'markdownit'),
    loadGlobal(vendor('dompurify/purify.min.js'), 'DOMPurify'),
  ]);
  if (!mdInstance) {
    mdInstance = markdownit({ html: true, linkify: true, typographer: true });
    // Tag every block-level element with its source line range for the magic selector.
    const inject = (tokens, idx, options, env, self) => {
      const tok = tokens[idx];
      if (tok.map) tok.attrSet('data-fv-src', tok.map[0] + ':' + tok.map[1]);
      return self.renderToken(tokens, idx, options);
    };
    for (const rule of ['paragraph_open', 'heading_open', 'blockquote_open',
      'bullet_list_open', 'ordered_list_open', 'table_open', 'fence', 'code_block', 'hr']) {
      const prev = mdInstance.renderer.rules[rule];
      mdInstance.renderer.rules[rule] = prev
        ? (t, i, o, e, s) => { if (t[i].map) t[i].attrSet('data-fv-src', t[i].map[0] + ':' + t[i].map[1]); return prev(t, i, o, e, s); }
        : inject;
    }
  }
  return { md: mdInstance, DOMPurify };
}

export async function render(intake, ctx) {
  const { md, DOMPurify } = await ensureLibs();
  // markdown-it parser options are user-tunable via settings (applied per render).
  const s = (ctx && ctx.settings) || {};
  md.set({ html: true, linkify: s.mdLinkify !== false, typographer: s.mdTypographer !== false, breaks: !!s.mdBreaks });
  const dirty = md.render(intake.text || '');
  DOMPurify.removed = [];
  // Sanitize. Keep our data-fv-src mapping attribute; forbid event handlers + scripts.
  const clean = DOMPurify.sanitize(dirty, {
    ADD_ATTR: ['data-fv-src', 'target'],
    FORBID_TAGS: ['script', 'style'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  });
  const hadUnsafe = DOMPurify.removed.length > 0;
  return {
    bodyHtml: '<article class="markdown-body">' + clean + '</article>',
    hadUnsafe,
    // sourceMap: data-fv-src carries "startLine:endLine" (0-based, end-exclusive).
    sourceMap: true,
  };
}
