export function syncTextControls($, label, { multi = false, textNodeOf, tagNodeOf, rgbToHex }) {
  const t = textNodeOf(label), tag = tagNodeOf(label);
  const style = t.fontStyle?.() || '';
  const deco = t.textDecoration?.() || '';
  $('.imgv-adv-text').value = multi ? 'Multiple text selected' : t.text();
  $('.imgv-adv-size').value = Math.round(t.fontSize());
  $('.imgv-adv-font').value = t.fontFamily();
  $('.imgv-adv-fill').value = rgbToHex(t.fill());
  $('.imgv-adv-bg').value = rgbToHex(tag.fill());
  $('.imgv-adv-bgop').value = Math.round((tag.opacity() ?? 1) * 100);
  $('.imgv-adv-bold').checked = /\bbold\b/.test(style);
  $('.imgv-adv-italic').checked = /\bitalic\b/.test(style);
  $('.imgv-adv-underline').checked = /\bunderline\b/.test(deco);
  $('.imgv-adv-strike').checked = /\bline-through\b/.test(deco);
  $('.imgv-adv-talign').value = t.align?.() || 'left';
  $('.imgv-adv-valign').value = t.verticalAlign?.() || 'top';
  $('.imgv-adv-lineh').value = t.lineHeight?.() || 1;
  $('.imgv-adv-wrap').value = t.wrap?.() || 'word';
  $('.imgv-adv-tw').value = Math.round(t.width?.() || 0);
  $('.imgv-adv-th').value = Math.round(t.height?.() || 0);
  $('.imgv-adv-pad').value = Math.round(t.padding?.() || 0);
  $('.imgv-adv-tstroke').value = rgbToHex(t.stroke?.() || '#000000');
  $('.imgv-adv-tstrokew').value = Math.round(t.strokeWidth?.() || 0);
  $('.imgv-adv-tshadow').value = Math.round(t.shadowBlur?.() || 0);
  $('.imgv-adv-tshadowc').value = rgbToHex(t.shadowColor?.() || '#000000');
}

export function installTextControls({ $, selectedLabels, textNodeOf, tagNodeOf, layer, markDirty, refreshLayers }) {
  const labels = () => selectedLabels().filter(Boolean);
  const texts = () => labels().map(textNodeOf).filter(Boolean);
  const draw = (refresh = false) => { layer.draw(); if (refresh) refreshLayers(); markDirty(); };
  $('.imgv-adv-text').addEventListener('input', () => { const l = labels(); if (l.length === 1) { textNodeOf(l[0]).text($('.imgv-adv-text').value); draw(true); } });
  $('.imgv-adv-size').addEventListener('input', () => { texts().forEach((t) => t.fontSize(parseInt($('.imgv-adv-size').value, 10) || 48)); draw(); });
  $('.imgv-adv-font').addEventListener('change', () => { texts().forEach((t) => t.fontFamily($('.imgv-adv-font').value)); draw(); });
  $('.imgv-adv-bg').addEventListener('input', () => { labels().forEach((l) => tagNodeOf(l).fill($('.imgv-adv-bg').value)); draw(); });
  $('.imgv-adv-bgop').addEventListener('input', () => { labels().forEach((l) => tagNodeOf(l).opacity((parseInt($('.imgv-adv-bgop').value, 10) || 0) / 100)); draw(); });
  ['bold', 'italic'].forEach((k) => $('.imgv-adv-' + k).addEventListener('change', () => {
    const style = [$('.imgv-adv-bold').checked ? 'bold' : '', $('.imgv-adv-italic').checked ? 'italic' : ''].filter(Boolean).join(' ') || 'normal';
    texts().forEach((t) => t.fontStyle(style)); draw();
  }));
  ['underline', 'strike'].forEach((k) => $('.imgv-adv-' + k).addEventListener('change', () => {
    const deco = [$('.imgv-adv-underline').checked ? 'underline' : '', $('.imgv-adv-strike').checked ? 'line-through' : ''].filter(Boolean).join(' ');
    texts().forEach((t) => t.textDecoration(deco)); draw();
  }));
  $('.imgv-adv-talign').addEventListener('change', () => { texts().forEach((t) => t.align($('.imgv-adv-talign').value)); draw(); });
  $('.imgv-adv-valign').addEventListener('change', () => { texts().forEach((t) => t.verticalAlign($('.imgv-adv-valign').value)); draw(); });
  $('.imgv-adv-lineh').addEventListener('change', () => { texts().forEach((t) => t.lineHeight(Math.max(0.5, parseFloat($('.imgv-adv-lineh').value) || 1))); draw(); });
  $('.imgv-adv-wrap').addEventListener('change', () => { texts().forEach((t) => t.wrap($('.imgv-adv-wrap').value)); draw(); });
  $('.imgv-adv-tw').addEventListener('change', () => { texts().forEach((t) => t.width(Math.max(1, parseFloat($('.imgv-adv-tw').value) || 1))); draw(); });
  $('.imgv-adv-th').addEventListener('change', () => { texts().forEach((t) => t.height(Math.max(1, parseFloat($('.imgv-adv-th').value) || 1))); draw(); });
  $('.imgv-adv-pad').addEventListener('change', () => { texts().forEach((t) => t.padding(Math.max(0, parseFloat($('.imgv-adv-pad').value) || 0))); draw(); });
  $('.imgv-adv-tstroke').addEventListener('input', () => { texts().forEach((t) => t.stroke($('.imgv-adv-tstroke').value)); draw(); });
  $('.imgv-adv-tstrokew').addEventListener('change', () => { texts().forEach((t) => t.strokeWidth(Math.max(0, parseFloat($('.imgv-adv-tstrokew').value) || 0))); draw(); });
  $('.imgv-adv-tshadow').addEventListener('input', () => { texts().forEach((t) => { t.shadowBlur(parseInt($('.imgv-adv-tshadow').value, 10) || 0); t.shadowOpacity(t.shadowBlur() ? 0.45 : 0); t.shadowOffset({ x: 2, y: 2 }); }); draw(); });
  $('.imgv-adv-tshadowc').addEventListener('input', () => { texts().forEach((t) => t.shadowColor($('.imgv-adv-tshadowc').value)); draw(); });
}
