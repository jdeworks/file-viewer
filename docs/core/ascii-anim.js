// ASCII animation framework — frame-array player with pre and canvas modes.
// Used by the ascii screensaver and available to metagame stages.

export function parseFrames(sheetText, frameSep = '---') {
  return sheetText.split('\n' + frameSep + '\n').map((f) => f.replace(/\n$/, ''));
}

// mountAsciiAnim(host, frames, opts) → { play, pause, setFrame, destroy }
// opts: { fps=8, mode='pre'|'canvas', font='13px/1.2 "Courier New",monospace', loop=true }
export function mountAsciiAnim(host, frames, opts = {}) {
  const { fps = 8, mode = 'pre', font = '13px/1.2 "Courier New",monospace', loop = true } = opts;
  const interval = 1000 / fps;

  let el, ctx2d;

  if (mode === 'canvas') {
    el = document.createElement('canvas');
    el.style.cssText = 'display:block;font-family:monospace;background:#0d0d0d;';
    ctx2d = el.getContext('2d');
    ctx2d.font = font;
    ctx2d.fillStyle = '#ccc';
    host.appendChild(el);
  } else {
    el = document.createElement('pre');
    el.style.cssText = 'margin:0;padding:0;font:' + font + ';color:#ccc;background:#0d0d0d;white-space:pre;overflow:hidden;';
    host.appendChild(el);
  }

  let frameIdx = 0, timer = null, running = false;

  function drawFrame(idx) {
    const frame = frames[idx] || '';
    if (mode === 'canvas') {
      const lines = frame.split('\n');
      const charW = ctx2d.measureText('M').width;
      const charH = parseInt(font) || 13;
      const lh = charH * 1.2;
      el.width = Math.max(1, ...lines.map((l) => l.length)) * charW;
      el.height = lines.length * lh;
      ctx2d.fillStyle = '#0d0d0d';
      ctx2d.fillRect(0, 0, el.width, el.height);
      ctx2d.font = font;
      ctx2d.fillStyle = '#ccc';
      for (let i = 0; i < lines.length; i++) {
        ctx2d.fillText(lines[i], 0, (i + 1) * lh - 2);
      }
    } else {
      el.textContent = frame;
    }
  }

  function tick() {
    drawFrame(frameIdx);
    frameIdx = (frameIdx + 1) % frames.length;
    if (!loop && frameIdx === 0) { running = false; clearInterval(timer); }
  }

  function play() {
    if (running) return;
    running = true;
    drawFrame(frameIdx);
    timer = setInterval(tick, interval);
  }

  function pause() {
    running = false;
    clearInterval(timer);
  }

  function setFrame(idx) {
    frameIdx = ((idx % frames.length) + frames.length) % frames.length;
    drawFrame(frameIdx);
  }

  function destroy() {
    pause();
    el.remove();
  }

  return { play, pause, setFrame, destroy };
}
