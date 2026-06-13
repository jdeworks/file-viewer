// Secure preview iframe builder. Same approach proven in make-it-look-good:
//   sandbox="allow-scripts" ONLY (no allow-same-origin) => isolated opaque origin,
//   user content can't reach window.parent. srcdoc assembled by string concat.
//
// Two modes:
//   - sanitized (default): user HTML already DOMPurify'd by the type renderer. We inject
//     our OWN trusted bridge script (magic-selector + scroll-sync via postMessage).
//   - scripts (opt-in, WP07 confirm flow): user scripts allowed to run. Bridge still ours.
//
// The bridge talks to the parent only via postMessage (works despite the cross-origin sandbox).
import { loadGlobal, vendor } from './script-loader.js';

const BRIDGE = `
(function(){
  function send(m){ parent.postMessage(Object.assign({__fv:1}, m), '*'); }
  // Magic selector: hover/click a [data-fv-src] element -> tell parent its source range.
  function srcEl(t){ while(t && t!==document.body){ if(t.dataset && t.dataset.fvSrc) return t; t=t.parentElement; } return null; }
  function openEl(t){ while(t && t!==document.body){ if(t.dataset && t.dataset.fvOpen!=null) return t; t=t.parentElement; } return null; }
  document.addEventListener('mousemove', function(e){
    var el = srcEl(e.target); if(!el) return;
    send({type:'hover', src: el.dataset.fvSrc});
  });
  document.addEventListener('click', function(e){
    // Open-an-entry click (e.g. a file inside a zip) takes precedence over source-mapping.
    var o = openEl(e.target); if(o){ send({type:'open', name: o.dataset.fvOpen}); return; }
    var el = srcEl(e.target); if(!el) return;
    send({type:'select', src: el.dataset.fvSrc});
  });
  // Scroll sync (preview -> parent), ratio based.
  var ticking=false;
  window.addEventListener('scroll', function(){
    if(ticking) return; ticking=true;
    requestAnimationFrame(function(){
      var h=document.documentElement.scrollHeight-window.innerHeight;
      send({type:'scroll', ratio: h>0 ? window.scrollY/h : 0});
      ticking=false;
    });
  }, {passive:true});
  // Parent -> preview: highlight a source range, or scroll to ratio.
  window.addEventListener('message', function(e){
    var d=e.data; if(!d||!d.__fv) return;
    if(d.type==='highlight'){
      document.querySelectorAll('.fv-hl').forEach(function(n){n.classList.remove('fv-hl');});
      if(d.src){ var n=document.querySelector('[data-fv-src="'+CSS.escape(d.src)+'"]'); if(n){ n.classList.add('fv-hl'); n.scrollIntoView({block:'center',behavior:'smooth'}); } }
    } else if(d.type==='scrollTo'){
      var h=document.documentElement.scrollHeight-window.innerHeight; window.scrollTo(0, (d.ratio||0)*h);
    }
  });
  send({type:'ready'});
})();`;

const BASE_CSS = `
  :root{color-scheme:light dark;}
  *{box-sizing:border-box;}
  html,body{margin:0;max-width:100%;overflow-x:hidden;}   /* mobile: only vertical scroll */
  body{font:var(--fv-fontsize,16px)/var(--fv-lh,1.6) system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
       padding:var(--fv-pad,20px);max-width:var(--fv-maxw,900px);margin:0 auto;
       color:#1a1a1a;background:#fff;overflow-wrap:break-word;}
  body.fv-dark{color:#e6e6e6;background:#1e1e1e;}
  .fv-hl{outline:2px solid #4c9aff;outline-offset:2px;border-radius:3px;background:rgba(76,154,255,.12);}
  img,video,canvas{max-width:100%;height:auto;}
  pre{overflow:auto;}
  .pdf-doc,.pptx-doc{display:flex;flex-direction:column;align-items:center;gap:14px;}
  .pdf-page,.pptx-slide{box-shadow:0 1px 10px rgba(0,0,0,.3);max-width:100%;}
  .pdf-note{color:#888;font-size:13px;}
  .tabular{font:13px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;}
  .sheet-title{font-family:system-ui,sans-serif;margin:18px 0 4px;}
  /* Multi-sheet tab switcher (CSS-only: radios drive panel visibility, no script). */
  .sheet-radio{position:absolute;width:0;height:0;opacity:0;pointer-events:none;}
  .sheet-tabbar{display:flex;flex-wrap:wrap;gap:4px;border-bottom:1px solid #0002;margin-bottom:8px;position:sticky;top:0;background:inherit;z-index:2;}
  .sheet-tab{font-family:system-ui,sans-serif;font-size:13px;padding:6px 12px;border:1px solid transparent;border-bottom:0;border-radius:6px 6px 0 0;cursor:pointer;color:#666;white-space:nowrap;}
  body.fv-dark .sheet-tab{color:#9aa;}
  .sheet-panel{display:none;}
  .sheet-panel .sheet-title{display:none;}   /* the tab already names the sheet */
  /* checked-radio → active tab styling: match each radio to its label via :checked + sibling order */
  .sheet-radio:checked + .sheet-tabbar { }
  .sheet-tabbed .sheet-tab{}
  .sheet-radio:nth-of-type(1):checked~.sheet-tabbar .sheet-tab:nth-of-type(1),
  .sheet-radio:nth-of-type(2):checked~.sheet-tabbar .sheet-tab:nth-of-type(2),
  .sheet-radio:nth-of-type(3):checked~.sheet-tabbar .sheet-tab:nth-of-type(3),
  .sheet-radio:nth-of-type(4):checked~.sheet-tabbar .sheet-tab:nth-of-type(4),
  .sheet-radio:nth-of-type(5):checked~.sheet-tabbar .sheet-tab:nth-of-type(5),
  .sheet-radio:nth-of-type(6):checked~.sheet-tabbar .sheet-tab:nth-of-type(6),
  .sheet-radio:nth-of-type(7):checked~.sheet-tabbar .sheet-tab:nth-of-type(7),
  .sheet-radio:nth-of-type(8):checked~.sheet-tabbar .sheet-tab:nth-of-type(8){
    color:#1a1a1a;background:#f3f4f6;border-color:#0002;}
  body.fv-dark .sheet-radio:nth-of-type(1):checked~.sheet-tabbar .sheet-tab:nth-of-type(1),
  body.fv-dark .sheet-radio:nth-of-type(2):checked~.sheet-tabbar .sheet-tab:nth-of-type(2),
  body.fv-dark .sheet-radio:nth-of-type(3):checked~.sheet-tabbar .sheet-tab:nth-of-type(3),
  body.fv-dark .sheet-radio:nth-of-type(4):checked~.sheet-tabbar .sheet-tab:nth-of-type(4),
  body.fv-dark .sheet-radio:nth-of-type(5):checked~.sheet-tabbar .sheet-tab:nth-of-type(5),
  body.fv-dark .sheet-radio:nth-of-type(6):checked~.sheet-tabbar .sheet-tab:nth-of-type(6),
  body.fv-dark .sheet-radio:nth-of-type(7):checked~.sheet-tabbar .sheet-tab:nth-of-type(7),
  body.fv-dark .sheet-radio:nth-of-type(8):checked~.sheet-tabbar .sheet-tab:nth-of-type(8){
    color:#e6e6e6;background:#2a2a2a;border-color:#fff2;}
  .tbl-meta,.tbl-note{font-family:system-ui,sans-serif;color:#888;font-size:12px;margin:2px 0;}
  .table-wrap{overflow-x:auto;border:1px solid #0002;border-radius:6px;}
  table{border-collapse:collapse;width:100%;}
  th,td{border:1px solid #0001;padding:4px 8px;text-align:left;white-space:nowrap;vertical-align:top;}
  thead th{position:sticky;top:0;background:#f3f4f6;z-index:1;}
  tbody tr:nth-child(even){background:#00000006;}
  body.fv-dark thead th{background:#2a2a2a;}
  body.fv-dark .table-wrap{border-color:#fff2;}
  body.fv-dark th,body.fv-dark td{border-color:#ffffff1a;}
  .json-tree{font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;}
  .json-tree details{margin:0;}
  .json-tree summary{cursor:pointer;list-style:none;}
  .json-tree summary::-webkit-details-marker{display:none;}
  .json-tree summary::before{content:"\\25be";display:inline-block;width:1em;color:#888;}
  .json-tree details:not([open])>summary::before{content:"\\25b8";}
  .j-row,.j-node{padding-left:1.2em;}
  .j-children{padding-left:1.2em;border-left:1px solid #8884;margin-left:.3em;}
  .j-key{color:#0b69c7;} body.fv-dark .j-key{color:#7cb7ff;}
  .j-str{color:#1a7f37;} body.fv-dark .j-str{color:#7ee787;}
  .j-num{color:#9a5400;} body.fv-dark .j-num{color:#ffab70;}
  .j-bool{color:#8250df;} body.fv-dark .j-bool{color:#d2a8ff;}
  .j-null{color:#888;} .j-punc{color:#888;} .j-count{color:#aaa;font-size:11px;margin-left:6px;}
  .json-error{font-family:system-ui,sans-serif;color:#d23b3b;padding:14px;border:1px solid #d23b3b55;border-radius:8px;}
  .yaml-doc-sep{font:600 11px system-ui,sans-serif;text-transform:uppercase;letter-spacing:.05em;color:#888;margin:14px 0 6px;border-top:1px solid #8883;padding-top:8px;}
  .yaml-doc-sep:first-child{border-top:0;margin-top:0;}
  .img-doc{display:flex;justify-content:center;align-items:flex-start;}
  .img-view,.img-doc svg{max-width:100%;height:auto;}
  .nb-notebook{max-width:100%;}
  .nb-cell{margin:0 0 16px;}
  .nb-md{}
  .nb-code{border-left:3px solid #4c9aff66;padding-left:10px;}
  .nb-in{display:flex;gap:8px;align-items:flex-start;}
  .nb-prompt{flex:0 0 auto;color:#888;font:12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;padding-top:12px;min-width:58px;}
  .nb-src{flex:1 1 auto;min-width:0;margin:0;background:#f6f8fa;border-radius:6px;padding:10px 12px;overflow:auto;}
  body.fv-dark .nb-src{background:#161b22;}
  .nb-out{margin:6px 0 0 66px;}
  .nb-stream,.nb-result,.nb-error,.nb-raw pre{margin:4px 0;padding:8px 10px;border-radius:6px;background:#f6f8fa;overflow:auto;white-space:pre-wrap;word-break:break-word;font:13px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;}
  body.fv-dark .nb-stream,body.fv-dark .nb-result,body.fv-dark .nb-raw pre{background:#161b22;}
  .nb-stderr,.nb-error{background:#fff5f5;color:#b22424;}
  body.fv-dark .nb-stderr,body.fv-dark .nb-error{background:#3a1d1d;color:#ff9b9b;}
  .nb-img{max-width:100%;height:auto;margin:6px 0;display:block;}
  .nb-rich{margin:6px 0;overflow:auto;}
  .nb-empty{color:#888;}
  @media (max-width:620px){.nb-prompt{display:none;}.nb-out{margin-left:0;}.nb-code{padding-left:8px;}}
  .eml-head{border-collapse:collapse;font:13px/1.5 system-ui,sans-serif;margin:0 0 6px;}
  .eml-head th{text-align:right;vertical-align:top;color:#888;font-weight:600;padding:2px 10px 2px 0;white-space:nowrap;}
  .eml-head td{padding:2px 0;word-break:break-word;}
  .eml-att{font:12px system-ui,sans-serif;color:#666;margin:4px 0;}
  body.fv-dark .eml-att{color:#aaa;}
  .eml-sep{border:0;border-top:1px solid #0002;margin:12px 0;}
  body.fv-dark .eml-sep{border-top-color:#fff2;}
  .eml-plain{white-space:pre-wrap;word-break:break-word;font:14px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;}
  .eml-html{overflow:auto;}
  .mbox-head{font:600 14px system-ui,sans-serif;margin:0 0 12px;}
  .mbox-msg{border:1px solid #0001;border-radius:8px;padding:10px 12px;margin:0 0 8px;}
  body.fv-dark .mbox-msg{border-color:#fff2;}
  .mbox-row1{display:flex;justify-content:space-between;gap:10px;font:13px system-ui,sans-serif;}
  .mbox-from{font-weight:600;word-break:break-word;}
  .mbox-date{color:#888;white-space:nowrap;font-size:12px;}
  .mbox-subj{font:13px system-ui,sans-serif;margin:2px 0;}
  .mbox-att{color:#888;font-size:12px;margin-left:6px;}
  .mbox-snippet{font:12px/1.5 system-ui,sans-serif;color:#666;}
  body.fv-dark .mbox-snippet{color:#9aa;}
  .mbox-empty{color:#888;font-family:system-ui,sans-serif;}
  /* FictionBook (FB2) reader — rendered as sanitized HTML with inline data: images. */
  .fb2-book{max-width:42rem;margin:0 auto;}
  .fb2-head{text-align:center;margin:0 0 28px;padding-bottom:16px;border-bottom:1px solid #8883;}
  .fb2-booktitle{font:700 26px/1.25 Georgia,"Times New Roman",serif;margin:0 0 8px;}
  .fb2-author{color:#888;font-size:15px;}
  .fb2-book{font-family:Georgia,"Times New Roman",serif;}
  .fb2-section{margin:0 0 8px;}
  .fb2-title{font-family:Georgia,serif;margin:28px 0 12px;line-height:1.3;}
  .fb2-subtitle{color:#666;font-weight:600;margin:18px 0 8px;}
  body.fv-dark .fb2-subtitle{color:#9aa;}
  .fb2-book p{margin:0 0 12px;text-align:justify;text-indent:1.4em;}
  .fb2-book p:first-of-type,.fb2-title+p,.fb2-empty+p{text-indent:0;}
  .fb2-empty{height:1em;}
  .fb2-img{display:block;max-width:100%;height:auto;margin:16px auto;}
  .fb2-epigraph,.fb2-cite{font-style:italic;color:#555;border-left:3px solid #8884;margin:14px 0;padding-left:14px;}
  body.fv-dark .fb2-epigraph,body.fv-dark .fb2-cite{color:#aab;}
  .fb2-poem{margin:16px 0;padding-left:14px;}
  .fb2-v{font-style:italic;text-indent:0;}
  /* MOBI / AZW reader — sanitized book HTML with inline data: images. */
  .mobi-book{max-width:42rem;margin:0 auto;font-family:Georgia,"Times New Roman",serif;}
  .mobi-head{text-align:center;margin:0 0 28px;padding-bottom:16px;border-bottom:1px solid #8883;}
  .mobi-booktitle{font:700 26px/1.25 Georgia,serif;margin:0;}
  .mobi-book p{margin:0 0 10px;text-align:justify;}
  .mobi-img{display:block;max-width:100%;height:auto;margin:16px auto;}
  .mobi-break{border:0;border-top:1px solid #8884;margin:20px 0;}
  /* OpenDocument (.odt/.odp) reader — sanitized body with inline data: images. */
  .odf-doc{max-width:44rem;margin:0 auto;}
  .odf-text{font-family:Georgia,"Times New Roman",serif;}
  .odf-img{max-width:100%;height:auto;margin:10px 0;}
  .odf-textbox{margin:8px 0;}
  .odf-slide{border:1px solid #8883;border-radius:8px;padding:20px 22px;margin:0 0 16px;box-shadow:0 1px 8px rgba(0,0,0,.12);}
  .odf-presentation .odf-slide h1,.odf-presentation .odf-slide h2{margin-top:0;}
  .zip-meta{font:12px system-ui,sans-serif;color:#888;margin:0 0 10px;}
  .zip-table .z-name{font:13px ui-monospace,SFMono-Regular,Menlo,monospace;white-space:normal;word-break:break-all;}
  .zip-table .z-num{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;}
  .zip-table .z-date{white-space:nowrap;color:#888;font-size:12px;}
  .zip-table .z-lock{font-size:12px;}
  .zip-table .z-open{cursor:pointer;color:#0b69c7;}
  .zip-table .z-open:hover{text-decoration:underline;background:#4c9aff14;}
  body.fv-dark .zip-table .z-open{color:#7cb7ff;}
  .zip-hint{font:12px system-ui,sans-serif;color:#888;margin:0 0 10px;}
  .zip-locked{background:#d2992222;border:1px solid #d2992255;border-radius:8px;padding:8px 12px;margin:0 0 12px;font:13px system-ui,sans-serif;color:#9a6700;}
  body.fv-dark .zip-locked{color:#e3b341;}
  .ics-head{font:600 14px system-ui,sans-serif;margin:0 0 14px;}
  .ics-event{border-left:3px solid #4c9aff;background:#4c9aff14;border-radius:0 8px 8px 0;padding:10px 12px;margin:0 0 10px;}
  .ics-title{font:600 15px system-ui,sans-serif;}
  .ics-when{font:13px system-ui,sans-serif;color:#555;margin-top:2px;}
  body.fv-dark .ics-when{color:#aab;}
  .ics-loc,.ics-rrule{font:12px system-ui,sans-serif;color:#666;margin-top:3px;}
  body.fv-dark .ics-loc,body.fv-dark .ics-rrule{color:#9aa;}
  .ics-desc{font:13px/1.5 system-ui,sans-serif;white-space:pre-wrap;word-break:break-word;margin-top:6px;}
  .ics-empty{color:#888;font-family:system-ui,sans-serif;}
  .kv-section{margin:0 0 16px;}
  .kv-section h3{font:600 13px system-ui,sans-serif;color:#4c9aff;margin:0 0 6px;border-bottom:1px solid #0001;padding-bottom:3px;}
  body.fv-dark .kv-section h3{border-bottom-color:#fff2;}
  .kv-table{border-collapse:collapse;font:13px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;width:100%;}
  .kv-table td{padding:2px 14px 2px 0;vertical-align:top;word-break:break-word;}
  .kv-key{color:#888;white-space:nowrap;}
  .kv-val{color:inherit;}
  .patch{font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;word-break:break-word;}
  .patch .pl{display:block;padding:0 6px;}
  .patch .p-add{background:#2ea04322;color:#1a7f37;}
  .patch .p-del{background:#cf222e22;color:#cf222e;}
  .patch .p-hunk{background:#4c9aff22;color:#4c9aff;}
  .patch .p-file{font-weight:600;background:#8884;}
  body.fv-dark .patch .p-add{color:#3fb950;} body.fv-dark .patch .p-del{color:#ff7b72;}
  .logv{font:12.5px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;word-break:break-word;}
  .logv .ll{display:block;padding:0 6px;border-left:3px solid transparent;}
  .logv .l-error{border-left-color:#cf222e;background:#cf222e14;}
  .logv .l-warn{border-left-color:#d29922;background:#d2992214;}
  .logv .l-info{border-left-color:#4c9aff;}
  .logv .l-debug{color:#888;}
  .logv .l-ts{color:#4c9aff;}
  .geo-meta{font:12px system-ui,sans-serif;color:#888;margin:0 0 8px;}
  .geo-svg{display:block;border:1px solid #0001;border-radius:8px;max-width:100%;}
  body.fv-dark .geo-svg{border-color:#fff2;}
  .geo-bg{fill:#f6f8fa;} body.fv-dark .geo-bg{fill:#161b22;}
  .geo-poly{fill:#4c9aff33;stroke:#4c9aff;stroke-width:1.5;stroke-linejoin:round;}
  .geo-line{fill:none;stroke:#2ea043;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
  .geo-pt{fill:#cf222e;stroke:#fff;stroke-width:1;}
  body.fv-dark .geo-pt{stroke:#161b22;}
  .sub-meta{font:12px system-ui,sans-serif;color:#888;margin:0 0 12px;}
  .sub-cue{display:grid;grid-template-columns:150px 1fr;gap:12px;padding:6px 0;border-bottom:1px solid #0001;}
  body.fv-dark .sub-cue{border-bottom-color:#fff1;}
  .sub-time{font:12px ui-monospace,SFMono-Regular,Menlo,monospace;color:#4c9aff;white-space:nowrap;}
  .sub-idx{display:inline-block;min-width:26px;color:#888;margin-right:6px;}
  .sub-text{white-space:pre-wrap;word-break:break-word;line-height:1.5;}
  .sub-empty{color:#888;font-family:system-ui,sans-serif;}
  @media (max-width:620px){.sub-cue{grid-template-columns:1fr;gap:2px;}}
  .vcf-head{font:600 14px system-ui,sans-serif;margin:0 0 14px;}
  .vcf-card{border:1px solid #0001;border-radius:10px;padding:12px 14px;margin:0 0 10px;}
  body.fv-dark .vcf-card{border-color:#fff2;}
  .vcf-name{font:600 16px system-ui,sans-serif;}
  .vcf-org{font:13px system-ui,sans-serif;color:#666;margin:2px 0 8px;}
  body.fv-dark .vcf-org{color:#9aa;}
  .vcf-row{display:flex;gap:8px;font:13px/1.6 system-ui,sans-serif;padding:1px 0;}
  .vcf-ic{width:18px;flex:0 0 18px;text-align:center;opacity:.8;}
  .vcf-val{word-break:break-word;}
  .vcf-val a{color:#3b82f6;text-decoration:none;}
  .vcf-type{font-size:11px;color:#888;}
  .vcf-note{margin-top:8px;font:13px/1.5 system-ui,sans-serif;color:#555;white-space:pre-wrap;}
  body.fv-dark .vcf-note{color:#aab;}
  .vcf-empty{color:#888;font-family:system-ui,sans-serif;}`;

function buildSrcdoc({ bodyHtml, theme, extraHead = '', style = {} }) {
  const darkClass = theme === 'dark' ? ' class="fv-dark"' : '';
  const vars = [];
  if (Number.isFinite(style.maxWidth)) vars.push(`--fv-maxw:${style.maxWidth}px;`);
  if (Number.isFinite(style.fontSize)) vars.push(`--fv-fontsize:${style.fontSize}px;`);
  if (Number.isFinite(style.lineHeight)) vars.push(`--fv-lh:${style.lineHeight};`);
  if (Number.isFinite(style.padding)) vars.push(`--fv-pad:${style.padding}px;`);
  const rootStyle = vars.length ? `<style>:root{${vars.join('')}}</style>` : '';
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
    + '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    + '<style>' + BASE_CSS + '</style>\n' + rootStyle + extraHead + '\n</head>\n'
    + '<body' + darkClass + '>\n' + bodyHtml + '\n'
    + '<script>' + BRIDGE + '</scr' + 'ipt>\n</body>\n</html>';
}

// container: element to host the iframe. Returns a controller for the parent side.
// Inject our trusted bridge script into a full user document (HTML "run scripts" mode).
function injectBridge(doc) {
  const tag = '<script>' + BRIDGE + '</scr' + 'ipt>';
  return doc.includes('</body>') ? doc.replace('</body>', tag + '</body>') : doc + tag;
}

export function mountPreview(container, { bodyHtml, fullDoc, theme, allowScripts = false, extraHead = '', style = {}, onSelect, onHover, onScroll, onOpen }) {
  container.innerHTML = '';
  const iframe = document.createElement('iframe');
  iframe.className = 'fv-preview-frame';
  iframe.title = 'Rendered preview';
  // allow-scripts only. NEVER add allow-same-origin together with allow-scripts.
  iframe.setAttribute('sandbox', 'allow-scripts');
  // fullDoc: render the user's whole document (scripts run in the sandbox). Otherwise wrap
  // the sanitized body fragment in our themed template.
  iframe.srcdoc = fullDoc != null ? injectBridge(fullDoc) : buildSrcdoc({ bodyHtml, theme, extraHead, style });
  container.appendChild(iframe);

  function onMsg(e) {
    if (e.source !== iframe.contentWindow) return;
    const d = e.data;
    if (!d || !d.__fv) return;
    if (d.type === 'select') onSelect?.(d.src);
    else if (d.type === 'hover') onHover?.(d.src);
    else if (d.type === 'scroll') onScroll?.(d.ratio);
    else if (d.type === 'open') onOpen?.(d.name);
  }
  window.addEventListener('message', onMsg);

  const post = (msg) => iframe.contentWindow?.postMessage({ __fv: 1, ...msg }, '*');
  return {
    iframe,
    highlight: (src) => post({ type: 'highlight', src }),
    scrollTo: (ratio) => post({ type: 'scrollTo', ratio }),
    destroy: () => {
      window.removeEventListener('message', onMsg);
      container.innerHTML = '';
    },
  };
}

// Screenshot (WP18): the live preview iframe is a null-origin sandbox, which html2canvas
// can't capture (its clone-iframe trick needs same-origin). So we re-render the ALREADY
// SANITIZED body into a temporary SAME-ORIGIN, off-screen iframe (safe — scripts are gone)
// and capture that. Not used for "run scripts" HTML (no sanitized body to reuse).
// Print / Save as PDF: render the sanitized body into a SAME-ORIGIN temp iframe (the sandboxed
// preview iframe can't call print() without loosening the sandbox) and print that. Forces a
// light theme + page margins for a clean PDF via the browser's "Save as PDF". Self-cleans.
export function printBodyHtml(bodyHtml, { style = {} } = {}) {
  const printCss = '<style>@media print{html,body{background:#fff!important;color:#000!important;}}@page{margin:16mm;}body{max-width:none;}</style>';
  const tmp = document.createElement('iframe');
  tmp.setAttribute('aria-hidden', 'true');
  tmp.style.cssText = 'position:fixed;left:-99999px;top:0;border:0;width:' + (Number(style.maxWidth) || 820) + 'px;height:1px;';
  tmp.srcdoc = buildSrcdoc({ bodyHtml, theme: 'light', style, extraHead: printCss });
  document.body.appendChild(tmp);
  tmp.onload = () => {
    const win = tmp.contentWindow;
    const done = () => { if (tmp.parentNode) tmp.remove(); };
    try {
      win.addEventListener('afterprint', () => setTimeout(done, 300), { once: true });
      win.focus();
      win.print();
    } catch { done(); }
    setTimeout(done, 120000);   // safety net if afterprint never fires
  };
}

export async function captureBodyHtml(bodyHtml, { theme, style = {} }) {
  const html2canvas = await loadGlobal(vendor('html2canvas/html2canvas.min.js'), 'html2canvas');
  const tmp = document.createElement('iframe');
  tmp.style.cssText = 'position:fixed;left:-99999px;top:0;border:0;width:' + (Number(style.maxWidth) || 900) + 'px;height:10px;';
  tmp.srcdoc = buildSrcdoc({ bodyHtml, theme, style });
  document.body.appendChild(tmp);
  try {
    await new Promise((r) => { tmp.onload = r; });
    const doc = tmp.contentDocument;
    tmp.style.height = Math.max(10, doc.body.scrollHeight) + 'px';
    await new Promise((r) => requestAnimationFrame(r));
    const canvas = await html2canvas(doc.body, { scale: 2, backgroundColor: null, useCORS: true });
    return canvas.toDataURL('image/png');
  } finally {
    tmp.remove();
  }
}
