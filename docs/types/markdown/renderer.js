// Markdown preview renderer: markdown-it -> source-mapped HTML -> DOMPurify -> body HTML.
// The shell wraps the returned bodyHtml in the secure sandboxed iframe (core/iframe.js).
import { loadGlobal, vendor } from '../../core/script-loader.js';

let mdInstance = null;
// DOMPurify's default URI policy plus blob:, which the viewer uses for local in-memory files.
const MARKDOWN_ALLOWED_URI = /^(?:(?:(?:f|ht)tps?|blob|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;

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

function isLocalResourceUrl(value) {
  const raw = String(value || '').trim();
  if (/^(?:data|blob):/i.test(raw)) return true;
  try {
    const appUrl = new URL(window.location.href);
    const resourceUrl = new URL(raw, appUrl);
    if (appUrl.protocol === 'file:' && resourceUrl.protocol === 'file:') return true;
    return /^(?:https?):$/.test(resourceUrl.protocol) && resourceUrl.origin === appUrl.origin;
  } catch {
    return false;
  }
}

function blockedImageNotice(img, src) {
  const notice = document.createElement('span');
  notice.className = 'md-remote-image-blocked';
  notice.setAttribute('role', 'note');
  notice.append('Remote image blocked: ');

  const label = img.getAttribute('alt')?.trim() || src;
  if (img.closest('a[href]')) {
    notice.append(label, ' (the surrounding link remains user-initiated; the image itself made no request)');
  } else {
    notice.append(label, ' — ');
    const link = document.createElement('a');
    link.href = src;
    link.textContent = 'open remote source';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.title = `Opens a new tab and requests ${src}`;
    notice.appendChild(link);
    notice.append(' (requests this exact URL only after you click)');
  }
  return notice;
}

// Work on an inert template so no resource can load before every fetch-capable URL is checked.
// Links remain links because navigation is user-initiated; only eager resource references are
// neutralized. Relative URLs resolve against the trusted app URL, not user-provided markup.
function neutralizeRemoteResources(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  let hadBlocked = false;

  for (const el of tpl.content.querySelectorAll('[src]')) {
    const src = el.getAttribute('src');
    if (isLocalResourceUrl(src)) continue;
    hadBlocked = true;
    if (el.localName.toLowerCase() === 'img'
      || (el.localName.toLowerCase() === 'input' && el.type.toLowerCase() === 'image')) {
      el.replaceWith(blockedImageNotice(el, src));
    } else {
      el.removeAttribute('src');
    }
  }

  for (const el of tpl.content.querySelectorAll('svg [href], svg [xlink\\:href]')) {
    if (!['image', 'use', 'feimage'].includes(el.localName.toLowerCase())) continue;
    for (const attr of ['href', 'xlink:href']) {
      const value = el.getAttribute(attr);
      if (value == null || isLocalResourceUrl(value)) continue;
      el.removeAttribute(attr);
      hadBlocked = true;
    }
  }

  return { html: tpl.innerHTML, hadBlocked };
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
    ALLOWED_URI_REGEXP: MARKDOWN_ALLOWED_URI,
    FORBID_TAGS: ['script', 'style', 'link', 'iframe', 'object', 'embed', 'video', 'audio', 'source', 'track', 'form', 'meta', 'base'],
    FORBID_ATTR: ['srcset', 'style', 'background', 'poster', 'onerror', 'onload', 'onclick'],
  });
  const hadSanitizerRemoval = DOMPurify.removed.length > 0;
  const resources = neutralizeRemoteResources(clean);
  return {
    bodyHtml: '<article class="markdown-body">' + wrapMarkdownTables(resources.html) + '</article>',
    hadUnsafe: hadSanitizerRemoval || resources.hadBlocked,
    // sourceMap: data-fv-src carries "startLine:endLine" (0-based, end-exclusive).
    sourceMap: true,
  };
}
