import { hitTestMixer } from './mixer-hit-test.js';

export function attachMixerInteractions(root, getState, dispatch) {
  if (!root) throw new Error('attachMixerInteractions requires a root element.');
  const onClick = (event) => {
    const elementTarget = event.target?.closest?.('.mmx-element');
    if (elementTarget && root.contains(elementTarget)) {
      dispatch({ type: 'select', target: { type: 'element', id: elementTarget.dataset.elementId }, hit: null });
      return;
    }
    const laneHeader = event.target?.closest?.('.mmx-lane-header');
    if (laneHeader && root.contains(laneHeader)) {
      const lane = laneHeader.closest('.mmx-lane');
      dispatch({ type: 'select', target: { type: 'lane', id: lane?.dataset.laneId }, hit: null });
      return;
    }
    const state = getState();
    const body = root.querySelector('.mmx-body');
    const rect = body?.getBoundingClientRect();
    if (!rect) return;
    const hit = hitTestMixer({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }, state.snapshot, state.viewport);
    if (hit.type === 'ruler') {
      dispatch({ type: 'seek', cursorMs: hit.timeMs, hit });
      return;
    }
    if (hit.type === 'element') {
      dispatch({ type: 'select', target: { type: 'element', id: hit.elementId }, hit });
      return;
    }
    if (hit.type === 'lane') {
      dispatch({ type: 'select', target: { type: 'lane', id: hit.laneId }, hit });
    }
  };

  const onInput = (event) => {
    const action = event.target?.dataset?.action;
    if (action === 'zoom') dispatch({ type: 'zoom', pxPerMs: Number(event.target.value) });
    if (action === 'update-element') {
      dispatch({
        type: 'update-element',
        elementId: event.target.dataset.elementId,
        field: event.target.dataset.field,
        value: Number(event.target.value),
      });
    }
  };

  const onScroll = (event) => {
    if (event.target?.classList?.contains('mmx-body')) {
      dispatch({ type: 'pan', scrollLeft: event.target.scrollLeft });
    }
  };

  const onActionClick = (event) => {
    const action = event.target?.closest?.('[data-action]')?.dataset?.action;
    if (!action || action === 'zoom') return;
    if (action === 'zoom-in') dispatch({ type: 'zoom-relative', factor: 1.2 });
    if (action === 'zoom-out') dispatch({ type: 'zoom-relative', factor: 1 / 1.2 });
    if (action === 'fit') dispatch({ type: 'fit' });
  };

  root.addEventListener('click', onClick);
  root.addEventListener('click', onActionClick);
  root.addEventListener('input', onInput);
  root.addEventListener('scroll', onScroll, true);
  return {
    destroy() {
      root.removeEventListener('click', onClick);
      root.removeEventListener('click', onActionClick);
      root.removeEventListener('input', onInput);
      root.removeEventListener('scroll', onScroll, true);
    },
  };
}
