export async function run(ctx) {
  const { page, origin, pass, fail } = ctx;
  await page.goto(origin, { waitUntil: 'load' });
  const result = await page.evaluate(async () => {
    const mod = await import('/types/media/mixer/index.js');
    const previewProof = (() => {
      const project = mod.createFakeMixerProject();
      const snapshot = mod.createMixerSnapshot(project);
      const before = mod.buildSeekFramePreview(snapshot, 0);
      const active = mod.buildSeekFramePreview(snapshot, 3000);
      return {
        inactive: before.active.length,
        active: active.active.length,
        hasImage: active.active.some((item) => item.hasImage && item.elementId === 'element-stage2-image'),
        opacity: active.active.find((item) => item.elementId === 'element-stage2-image')?.visual.opacity,
      };
    })();
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
      waveformCanvases: root.querySelectorAll('.mmx-element-waveform').length,
      waveformPainted: canvasHasPaint(root.querySelector('.mmx-element-waveform')),
      visualBadges: root.querySelectorAll('.mmx-element-visual').length,
      framePreview: !!root.querySelector('.mmx-frame-preview'),
      framePreviewActive: Number(root.querySelector('.mmx-frame-preview')?.dataset.activeVisuals || 0),
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
    const inspectorFields = ['.mmx-inspector-start', '.mmx-inspector-source-in', '.mmx-inspector-source-out', '.mmx-inspector-gain', '.mmx-inspector-fade-in', '.mmx-inspector-fade-out']
      .every((selector) => !!root.querySelector(selector));
    const gainInput = root.querySelector('.mmx-inspector-gain');
    gainInput.value = '0.66';
    gainInput.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const selectedGain = controller.getProject().elements.find((item) => item.id === selectedAfterElement)?.audio?.gain;

    controller.dispatch({ type: 'seek', cursorMs: 3000 });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const activeVisualsAtCursor = Number(root.querySelector('.mmx-frame-preview')?.dataset.activeVisuals || 0);
    const imageElement = root.querySelector('[data-element-id="element-stage2-image"]');
    const imageRect = imageElement.getBoundingClientRect();
    imageElement.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      clientX: imageRect.left + imageRect.width / 2,
      clientY: imageRect.top + imageRect.height / 2,
    }));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const visualFields = ['.mmx-inspector-visual-x', '.mmx-inspector-visual-y', '.mmx-inspector-visual-scale-x', '.mmx-inspector-visual-opacity', '.mmx-inspector-visual-fade-in', '.mmx-inspector-visual-fade-out', '.mmx-inspector-visual-crop-x', '.mmx-inspector-visual-crop-y', '.mmx-inspector-visual-crop-width', '.mmx-inspector-visual-crop-height', '.mmx-inspector-transition-in', '.mmx-inspector-transition-kind', '.mmx-inspector-effect-brightness', '.mmx-inspector-effect-contrast', '.mmx-inspector-effect-saturation', '.mmx-inspector-effect-hue', '.mmx-inspector-effect-blur', '.mmx-inspector-effect-grayscale', '.mmx-inspector-effect-invert', '.mmx-inspector-effect-sepia']
      .every((selector) => !!root.querySelector(selector));
    const visualX = root.querySelector('.mmx-inspector-visual-x');
    visualX.value = '42';
    visualX.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const visualOpacity = root.querySelector('.mmx-inspector-visual-opacity');
    visualOpacity.value = '0.5';
    visualOpacity.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const visualFadeIn = root.querySelector('.mmx-inspector-visual-fade-in');
    visualFadeIn.value = '250';
    visualFadeIn.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const cropX = root.querySelector('.mmx-inspector-visual-crop-x');
    cropX.value = '0.15';
    cropX.dispatchEvent(new Event('input', { bubbles: true }));
    const cropWidth = root.querySelector('.mmx-inspector-visual-crop-width');
    cropWidth.value = '0.6';
    cropWidth.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const transitionIn = root.querySelector('.mmx-inspector-transition-in');
    transitionIn.value = '300';
    transitionIn.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const transitionKind = root.querySelector('.mmx-inspector-transition-kind');
    transitionKind.value = 'wipe-left';
    transitionKind.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const brightness = root.querySelector('.mmx-inspector-effect-brightness');
    brightness.value = '0.2';
    brightness.dispatchEvent(new Event('input', { bubbles: true }));
    const grayscale = root.querySelector('.mmx-inspector-effect-grayscale');
    grayscale.value = '1';
    grayscale.dispatchEvent(new Event('input', { bubbles: true }));
    const hue = root.querySelector('.mmx-inspector-effect-hue');
    hue.value = '45';
    hue.dispatchEvent(new Event('input', { bubbles: true }));
    const invert = root.querySelector('.mmx-inspector-effect-invert');
    invert.value = '1';
    invert.dispatchEvent(new Event('input', { bubbles: true }));
    const sepia = root.querySelector('.mmx-inspector-effect-sepia');
    sepia.value = '0.6';
    sepia.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const editedImage = controller.getProject().elements.find((item) => item.id === 'element-stage2-image');
    const editedFilter = editedImage?.effects?.find((effect) => effect.kind === 'video-filter');
    const editedTransition = controller.getProject().transitions.find((transition) => transition.toElementId === 'element-stage2-image');
    const activeAfterTransform = mod.buildSeekFramePreview(controller.getSnapshot(), 3000).active
      .find((item) => item.elementId === 'element-stage2-image');

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
      inspectorFields,
      selectedGain,
      activeVisualsAtCursor,
      visualFields,
      imageX: editedImage?.visual?.x,
      imageOpacity: editedImage?.visual?.opacity,
      imageFadeIn: editedImage?.visual?.fadeInMs,
      imageCropX: editedImage?.visual?.crop?.x,
      imageCropWidth: editedImage?.visual?.crop?.width,
      transitionDuration: editedTransition?.durationMs,
      transitionKind: editedTransition?.kind,
      filterBrightness: editedFilter?.params?.brightness,
      filterGrayscale: editedFilter?.params?.grayscale,
      filterHue: editedFilter?.params?.hue,
      filterInvert: editedFilter?.params?.invert,
      filterSepia: editedFilter?.params?.sepia,
      previewHue: activeAfterTransform?.filter?.hue,
      previewInvert: activeAfterTransform?.filter?.invert,
      previewSepia: activeAfterTransform?.filter?.sepia,
      previewX: activeAfterTransform?.visual?.x,
      previewOpacity: activeAfterTransform?.visual?.opacity,
      previewCropX: activeAfterTransform?.visual?.crop?.x,
      previewCropWidth: activeAfterTransform?.visual?.crop?.width,
      scrollAfterPan,
      destroyed,
      previewProof,
    };

    function canvasHasPaint(canvas) {
      if (!canvas || !canvas.width || !canvas.height) return false;
      const ctx = canvas.getContext('2d');
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] !== 0) return true;
      }
      return false;
    }
  });

  if (result.initial.toolbar && result.initial.modes.includes('Listen') && result.initial.ruler && result.initial.playhead && result.initial.inspector)
    pass('modular mixer shell: toolbar, mode area, ruler, playhead, inspector render');
  else fail('modular mixer shell missing surfaces: ' + JSON.stringify(result.initial));

  if (result.initial.lanes >= 2 && result.initial.labels >= 2 && result.initial.elements >= 2)
    pass('modular mixer shell: lane stack, lane labels, and element blocks render');
  else fail('modular mixer shell lane/element counts wrong: ' + JSON.stringify(result.initial));

  if (result.initial.waveformCanvases >= 1 && result.initial.waveformPainted)
    pass('modular mixer shell: audio-capable element paints waveform canvas');
  else fail('modular mixer shell waveform did not paint: ' + JSON.stringify(result.initial));

  if (result.previewProof.inactive === 0 && result.previewProof.active === 1 && result.previewProof.hasImage && result.previewProof.opacity === 0.85)
    pass('modular mixer shell: seek-frame preview model finds active visual elements');
  else fail('modular mixer shell preview model mismatch: ' + JSON.stringify(result.previewProof));

  if (result.initial.visualBadges >= 1 && result.initial.framePreview && result.initial.framePreviewActive === 0 && result.activeVisualsAtCursor >= 1)
    pass('modular mixer shell: visual placeholders and frame preview render from cursor');
  else fail('modular mixer shell visual preview missing: ' + JSON.stringify(result));

  if (result.zoomed > result.initial.zoom) pass('modular mixer shell: zoom changes timeline scale');
  else fail('modular mixer shell zoom did not increase: ' + JSON.stringify({ before: result.initial.zoom, after: result.zoomed }));

  if (result.cursorAfterSeek > result.initial.cursorMs) pass('modular mixer shell: click-to-seek updates cursor state');
  else fail('modular mixer shell seek did not move cursor: ' + JSON.stringify(result));

  if (result.scrollAfterPan > 0) pass('modular mixer shell: pan/scroll updates visible viewport state');
  else fail('modular mixer shell pan did not update scroll state: ' + JSON.stringify(result));

  if (result.selectedAfterElement) pass('modular mixer shell: selecting element updates inspector target');
  else fail('modular mixer shell inspector did not receive selected element: ' + JSON.stringify(result));

  if (result.inspectorFields && result.selectedGain === 0.66)
    pass('modular mixer shell: selected element inspector updates shared project state');
  else fail('modular mixer shell inspector controls did not update state: ' + JSON.stringify(result));

  if (result.visualFields && result.imageX === 42 && result.imageOpacity === 0.5 && result.imageFadeIn === 250 && result.imageCropX === 0.15 && result.imageCropWidth === 0.6 && result.transitionDuration === 300 && result.transitionKind === 'wipe-left' && result.filterBrightness === 0.2 && result.filterGrayscale === 1 && result.filterHue === 45 && result.filterInvert === 1 && result.filterSepia === 0.6 && result.previewX === 42 && result.previewOpacity === 0.5 && result.previewCropX === 0.15 && result.previewCropWidth === 0.6 && result.previewHue === 45 && result.previewInvert === 1 && result.previewSepia === 0.6)
    pass('modular mixer shell: visual transform controls update model and seek-frame preview');
  else fail('modular mixer shell visual transform controls mismatch: ' + JSON.stringify(result));

  if (result.destroyed) pass('modular mixer shell: destroy clears mounted DOM');
  else fail('modular mixer shell destroy left DOM mounted');
}
