// Meta-game dialog box. Plays a sequence of { speaker, text } lines in a card; Next advances,
// the last line's button runs onDone. Reused for stage intros, boss taunts, hints, and victories.
// Lightweight (no typewriter dependency) — a CSS fade re-triggers per line so it feels alive.
export function playDialog(host, lines, { onDone, cta = 'Next' } = {}) {
  let i = 0;
  const box = document.createElement('div');
  box.className = 'mg-dialog';
  box.innerHTML =
    '<div class="mg-dlg-card">'
    + '<div class="mg-dlg-speaker"></div>'
    + '<div class="mg-dlg-text"></div>'
    + '<button class="mg-dlg-next" type="button"></button>'
    + '</div>';
  host.appendChild(box);
  const speakerEl = box.querySelector('.mg-dlg-speaker');
  const textEl = box.querySelector('.mg-dlg-text');
  const nextBtn = box.querySelector('.mg-dlg-next');

  function show() {
    const l = lines[i] || {};
    speakerEl.textContent = l.speaker || '';
    speakerEl.hidden = !l.speaker;
    textEl.textContent = l.text || '';
    textEl.classList.remove('mg-dlg-anim'); void textEl.offsetWidth; textEl.classList.add('mg-dlg-anim');
    nextBtn.textContent = (i >= lines.length - 1 ? cta : 'Next') + ' ▸';
  }
  nextBtn.addEventListener('click', () => {
    if (++i >= lines.length) { box.remove(); onDone && onDone(); }
    else show();
  });
  show();
  return { destroy: () => box.remove() };
}
