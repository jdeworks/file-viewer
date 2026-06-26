export async function run(ctx) {
  const { page, origin, pass, fail } = ctx;
  await page.goto(origin, { waitUntil: 'load' });
  const result = await page.evaluate(async () => {
    const mod = await import('/types/media/mixer/index.js');
    const host = document.querySelector('#previewHost');
    host.replaceChildren();
    const root = document.createElement('section');
    root.id = 'stage2MixerShell';
    root.style.width = '640px';
    host.append(root);
    const controller = mod.mountMediaMixerShell(root);
    window.__stage2Mixer = controller;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const shell = root.querySelector('.mmx-shell') || root;
    const initial = {
      toolbar: !!root.querySelector('.mmx-toolbar'),
      modes: Array.from(root.querySelectorAll('.mmx-mode')).map((node) => node.textContent.trim()).join(','),
      ruler: !!root.querySelector('.mmx-ruler'),
      playhead: !!root.querySelector('.mmx-playhead'),
      lanes: root.querySelectorAll('.mmx-lane').length,
      labels: root.querySelectorAll('.mmx-lane-label').length,
      elements: root.querySelectorAll('.mmx-element').length,
      inspector: !!root.querySelector('.mmx-inspector'),
      selectedId: root.querySelector('.mmx-inspector')?.dataset.selectedId || '',
      zoom: Number(shell.dataset.zoom),
      cursorMs: Number(shell.dataset.cursorMs),
    };

    root.querySelector('[data-action="zoom-in"]').click();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const zoomed = Number(shell.dataset.zoom);

    const ruler = root.querySelector('.mmx-ruler');
    const rulerRect = ruler.getBoundingClientRect();
    ruler.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      clientX: rulerRect.left + 240,
      clientY: rulerRect.top + 10,
    }));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const cursorAfterSeek = Number(shell.dataset.cursorMs);

    const element = root.querySelector('.mmx-element');
    const elementRect = element.getBoundingClientRect();
    element.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      clientX: elementRect.left + elementRect.width / 2,
      clientY: elementRect.top + elementRect.height / 2,
    }));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const selectedAfterElement = root.querySelector('.mmx-inspector')?.dataset.selectedId || '';

    controller.dispatch({ type: 'zoom', pxPerMs: 0.3 });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    controller.dispatch({ type: 'pan', scrollLeft: 120 });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const scrollAfterPan = Number(shell.dataset.scrollLeft);

    controller.destroy();
    const destroyed = root.children.length === 0;
    return {
      initial,
      zoomed,
      cursorAfterSeek,
      selectedAfterElement,
      scrollAfterPan,
      destroyed,
    };
  });

  if (result.initial.toolbar && result.initial.modes.includes('Listen') && result.initial.ruler && result.initial.playhead && result.initial.inspector)
    pass('modular mixer shell: toolbar, mode area, ruler, playhead, inspector render');
  else fail('modular mixer shell missing surfaces: ' + JSON.stringify(result.initial));

  if (result.initial.lanes >= 2 && result.initial.labels >= 2 && result.initial.elements >= 2)
    pass('modular mixer shell: lane stack, lane labels, and element blocks render');
  else fail('modular mixer shell lane/element counts wrong: ' + JSON.stringify(result.initial));

  if (result.zoomed > result.initial.zoom) pass('modular mixer shell: zoom changes timeline scale');
  else fail('modular mixer shell zoom did not increase: ' + JSON.stringify({ before: result.initial.zoom, after: result.zoomed }));

  if (result.cursorAfterSeek > result.initial.cursorMs) pass('modular mixer shell: click-to-seek updates cursor state');
  else fail('modular mixer shell seek did not move cursor: ' + JSON.stringify(result));

  if (result.scrollAfterPan > 0) pass('modular mixer shell: pan/scroll updates visible viewport state');
  else fail('modular mixer shell pan did not update scroll state: ' + JSON.stringify(result));

  if (result.selectedAfterElement) pass('modular mixer shell: selecting element updates inspector target');
  else fail('modular mixer shell inspector did not receive selected element: ' + JSON.stringify(result));

  if (result.destroyed) pass('modular mixer shell: destroy clears mounted DOM');
  else fail('modular mixer shell destroy left DOM mounted');
}
