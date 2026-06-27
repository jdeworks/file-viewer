export const MIXER_LAYOUT = Object.freeze({
  gutterWidth: 160,
  rulerHeight: 32,
  laneGap: 8,
  defaultLaneHeight: 88,
  minTimelineWidth: 720,
  trimHandleWidth: 10,
  fadeHandleWidth: 18,
});

export function createViewport(input = {}) {
  return {
    cursorMs: Math.max(0, finiteNumber(input.cursorMs, 0)),
    scrollLeft: Math.max(0, finiteNumber(input.scrollLeft, 0)),
    pxPerMs: Math.max(0.02, finiteNumber(input.pxPerMs, 0.08)),
    width: Math.max(1, finiteNumber(input.width, 960)),
    selected: input.selected || null,
  };
}

export function buildMixerLayout(snapshot = {}, viewportInput = {}) {
  const viewport = createViewport(viewportInput);
  const lanes = Array.isArray(snapshot.lanes) ? snapshot.lanes : [];
  const elements = Array.isArray(snapshot.elements) ? snapshot.elements : [];
  const durationMs = Math.max(
    finiteNumber(snapshot.durationMs, 0),
    ...elements.map((element) => (
      finiteNumber(element.timeline?.startMs, 0) + finiteNumber(element.timeline?.placementDurationMs, 0)
    )),
    1000,
  );
  const timelineWidth = Math.max(
    MIXER_LAYOUT.minTimelineWidth,
    Math.ceil(durationMs * viewport.pxPerMs) + 120,
    viewport.width - MIXER_LAYOUT.gutterWidth,
  );
  const laneRects = [];
  const elementRects = [];
  let y = MIXER_LAYOUT.rulerHeight;

  for (const lane of lanes) {
    const height = Math.max(40, finiteNumber(lane.height, MIXER_LAYOUT.defaultLaneHeight));
    const laneRect = {
      laneId: lane.id,
      x: 0,
      y,
      width: MIXER_LAYOUT.gutterWidth + timelineWidth,
      height,
      timelineX: MIXER_LAYOUT.gutterWidth,
      timelineWidth,
    };
    laneRects.push(laneRect);
    for (const element of elements.filter((item) => item.laneId === lane.id)) {
      const startMs = finiteNumber(element.timeline?.startMs, 0);
      const placementDurationMs = Math.max(0, finiteNumber(element.timeline?.placementDurationMs, element.timeline?.durationMs));
      const x = MIXER_LAYOUT.gutterWidth + startMs * viewport.pxPerMs - viewport.scrollLeft;
      const width = Math.max(18, placementDurationMs * viewport.pxPerMs);
      elementRects.push({
        elementId: element.id,
        laneId: lane.id,
        x,
        y: y + 10,
        width,
        height: Math.max(20, height - 20),
        startMs,
        endMs: startMs + placementDurationMs,
      });
    }
    y += height + MIXER_LAYOUT.laneGap;
  }

  return {
    viewport,
    durationMs,
    width: MIXER_LAYOUT.gutterWidth + timelineWidth,
    height: Math.max(y, MIXER_LAYOUT.rulerHeight + 1),
    timelineWidth,
    laneRects,
    elementRects,
    playheadX: MIXER_LAYOUT.gutterWidth + viewport.cursorMs * viewport.pxPerMs - viewport.scrollLeft,
  };
}

export function hitTestMixer(point = {}, snapshot = {}, viewport = {}) {
  const x = finiteNumber(point.x, 0);
  const y = finiteNumber(point.y, 0);
  const layout = buildMixerLayout(snapshot, viewport);
  const timeMs = pointToTimeMs(x, layout.viewport);

  if (y >= 0 && y < MIXER_LAYOUT.rulerHeight) {
    return x >= MIXER_LAYOUT.gutterWidth
      ? { type: 'ruler', region: 'ruler', timeMs, x, y }
      : { type: 'toolbar-gutter', region: 'gutter', timeMs: 0, x, y };
  }

  for (const elementRect of layout.elementRects) {
    if (!contains(elementRect, x, y)) continue;
    const localX = x - elementRect.x;
    if (localX <= MIXER_LAYOUT.trimHandleWidth) {
      return { type: 'element', region: 'trim-start', elementId: elementRect.elementId, laneId: elementRect.laneId, timeMs, x, y };
    }
    if (localX >= elementRect.width - MIXER_LAYOUT.trimHandleWidth) {
      return { type: 'element', region: 'trim-end', elementId: elementRect.elementId, laneId: elementRect.laneId, timeMs, x, y };
    }
    if (localX <= MIXER_LAYOUT.fadeHandleWidth && y <= elementRect.y + MIXER_LAYOUT.fadeHandleWidth) {
      return { type: 'element', region: 'fade-in', elementId: elementRect.elementId, laneId: elementRect.laneId, timeMs, x, y };
    }
    if (localX >= elementRect.width - MIXER_LAYOUT.fadeHandleWidth && y <= elementRect.y + MIXER_LAYOUT.fadeHandleWidth) {
      return { type: 'element', region: 'fade-out', elementId: elementRect.elementId, laneId: elementRect.laneId, timeMs, x, y };
    }
    return { type: 'element', region: 'body', elementId: elementRect.elementId, laneId: elementRect.laneId, timeMs, x, y };
  }

  for (const laneRect of layout.laneRects) {
    if (!contains(laneRect, x, y)) continue;
    return x < MIXER_LAYOUT.gutterWidth
      ? { type: 'lane', region: 'lane-header', laneId: laneRect.laneId, timeMs: 0, x, y }
      : { type: 'lane', region: 'empty-lane', laneId: laneRect.laneId, timeMs, x, y };
  }

  return { type: 'empty', region: 'outside', timeMs, x, y };
}

export function pointToTimeMs(x, viewportInput = {}) {
  const viewport = createViewport(viewportInput);
  return Math.max(0, (finiteNumber(x, 0) - MIXER_LAYOUT.gutterWidth + viewport.scrollLeft) / viewport.pxPerMs);
}

export function timeMsToX(timeMs, viewportInput = {}) {
  const viewport = createViewport(viewportInput);
  return MIXER_LAYOUT.gutterWidth + Math.max(0, finiteNumber(timeMs, 0)) * viewport.pxPerMs - viewport.scrollLeft;
}

function contains(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function finiteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

