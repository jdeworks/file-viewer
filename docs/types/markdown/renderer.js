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

function wrapMarkdownTables(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  for (const table of tpl.content.querySelectorAll('table')) {
    if (table.parentElement?.classList.contains('table-wrap')) continue;
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap md-table-wrap';
    table.replaceWith(wrap);
    wrap.appendChild(table);
  }
  return tpl.innerHTML;
}

export async function render(intake, ctx) {
  const { md, DOMPurify } = await ensureLibs();
  // markdown-it parser options are user-tunable via settings (applied per render).
  const s = (ctx && ctx.settings) || {};
  md.set({ html: true, linkify: s.mdLinkify !== false, typographer: s.mdTypographer !== false, breaks: !!s.mdBreaks });
  const dirty = md.render(intake.text || '');
  DOMPurify.removed = [];
  // Sanitize. Keep our data-fv-src mapping attribute. markdown-it runs with html:true (raw HTML
  // pass-through), so arbitrary embedded HTML reaches here — FORBID_TAGS/FORBID_ATTR must cover
  // every DOMPurify-default-allowed vector that can trigger a live off-origin fetch we don't
  // control: <style>/style="" (CSS url()), background=/poster= (legacy + <video> poster),
  // <link>/<meta>/<base> (a <base href> would turn even a *relative* markdown image/link into an
  // off-origin request), and <iframe>/<video>/<audio>/<source>/<track>/<object>/<embed>/<form>
  // (all DOMPurify-allowed by default, all capable of an eager off-origin request or off-origin
  // form POST). Mirrors the vector list used by the epub/eml renderers.
  const clean = DOMPurify.sanitize(dirty, {
    ADD_ATTR: ['data-fv-src', 'target'],
    FORBID_TAGS: ['script', 'style', 'link', 'iframe', 'object', 'embed', 'video', 'audio', 'source', 'track', 'form', 'meta', 'base'],
    FORBID_ATTR: ['srcset', 'style', 'background', 'poster', 'onerror', 'onload', 'onclick'],
  });
  const hadUnsafe = DOMPurify.removed.length > 0;
  return {
    bodyHtml: '<article class="markdown-body">' + wrapMarkdownTables(clean) + '</article>',
    hadUnsafe,
    // sourceMap: data-fv-src carries "startLine:endLine" (0-based, end-exclusive).
    sourceMap: true,
  };
}
