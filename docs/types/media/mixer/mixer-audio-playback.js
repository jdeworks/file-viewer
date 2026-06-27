import { buildDecodedAudioCacheKey } from './mixer-audio-cache.js';

export function createMixerAudioPlayback({
  getProject,
  getViewport,
  setCursorMs,
  cache,
  runtimeFiles,
  onState,
  onTick,
} = {}) {
  let ctx = null;
  let master = null;
  let nodes = [];
  let gains = [];
  let laneNodes = [];          // per-lane dynamics compressor + makeup gain nodes
  let laneChains = new Map();  // laneId -> compressor input node (only for lanes with dynamics)
  let rafId = 0;
  let endTimer = 0;
  let playing = false;
  let startedAt = 0;
  let startCursorMs = 0;
  let generation = 0;
  const state = {
    playing: false,
    scheduledCount: 0,
    skippedCount: 0,
    generatedCount: 0,
    decodedCount: 0,
    lastError: '',
  };

  return {
    isPlaying: () => playing,
    getState: () => ({ ...state }),
    async play() {
      const project = getProject?.();
      if (!project) return { ...state, lastError: 'missing-project' };
      stopInternal({ keepCursor: true });
      const currentGeneration = ++generation;
      ctx = ctx && ctx.state !== 'closed' ? ctx : createAudioContext();
      if (!ctx) return updateState({ playing: false, lastError: 'audio-context-unavailable' });
      if (ctx.state === 'suspended') ctx.resume?.();
      master = ctx.createGain();
      master.gain.value = clampGain(project.master?.audio?.gain ?? 1);
      master.connect(ctx.destination);
      startCursorMs = Math.max(0, getViewport?.().cursorMs || 0);
      startedAt = ctx.currentTime;
      playing = true;
      updateState({ playing: true, scheduledCount: 0, skippedCount: 0, generatedCount: 0, decodedCount: 0, lastError: '' });
      const plan = buildSchedulePlan(project, startCursorMs);
      plan.items.forEach((item) => { item.when = startedAt + item.delayMs / 1000; });
      await schedulePlan(plan, project, currentGeneration);
      if (!playing || currentGeneration !== generation) return state;
      if (!state.scheduledCount) {
        stopInternal({ keepCursor: true });
        return updateState({ playing: false, lastError: 'nothing-scheduled' });
      }
      const remainingMs = Math.max(0, project.project.durationMs - startCursorMs);
      endTimer = window.setTimeout(() => stopInternal({ resetCursor: false }), remainingMs + 100);
      tick();
      return state;
    },
    stop({ resetCursor = true } = {}) {
      stopInternal({ resetCursor });
      return state;
    },
    destroy() {
      stopInternal({ resetCursor: false });
      if (ctx && ctx.state !== 'closed') ctx.close?.().catch?.(() => {});
      ctx = null;
    },
  };

  async function schedulePlan(plan, project, currentGeneration) {
    for (const item of plan.items) {
      if (!playing || currentGeneration !== generation) return;
      const source = await createSource(item, project);
      if (!source) {
        updateState({ skippedCount: state.skippedCount + 1 });
        continue;
      }
      const gain = ctx.createGain();
      source.node.connect(gain);
      gain.connect(getLaneInput(item.lane));
      gains.push(gain);
      nodes.push(source.node);
      applyGainEnvelope(gain, item, source.gain);
      source.start();
      updateState({
        scheduledCount: state.scheduledCount + 1,
        generatedCount: state.generatedCount + (source.generated ? 1 : 0),
        decodedCount: state.decodedCount + (source.decoded ? 1 : 0),
      });
    }
  }

  // Per-lane Dynamics: when a lane has `audio.dynamics`, route all its elements through a shared
  // DynamicsCompressorNode (threshold/ratio) plus a makeup-gain node, then into master. Lanes
  // without dynamics connect straight to master (unchanged graph). Built lazily, once per lane/play.
  function getLaneInput(lane) {
    const dyn = lane?.audio?.dynamics;
    if (!dyn || !ctx) return master;
    const existing = laneChains.get(lane.id);
    if (existing) return existing;
    const comp = ctx.createDynamicsCompressor();
    try {
      comp.threshold.value = clampNum(dyn.thresholdDb, -100, 0, -18);
      comp.ratio.value = clampNum(dyn.ratio, 1, 20, 4);
      // Default knee/attack/release give a transparent, musical compressor.
    } catch { /* read-only AudioParam in some engines */ }
    const makeup = ctx.createGain();
    makeup.gain.value = Math.pow(10, clampNum(dyn.makeupDb, 0, 24, 0) / 20);
    comp.connect(makeup);
    makeup.connect(master);
    laneChains.set(lane.id, comp);
    laneNodes.push(comp, makeup);
    return comp;
  }

  async function createSource(item, project) {
    if (!ctx) return null;
    if (item.element.type === 'generated' || item.element.audio?.roomTone) return createGeneratedSource(item);
    const asset = project.assets.find((candidate) => candidate.id === item.element.assetId);
    const file = asset ? runtimeFiles?.get(asset.id) : null;
    if (!asset || !file) return null;
    const key = buildDecodedAudioCacheKey({
      projectId: project.project.id,
      asset,
      element: item.element,
      sampleRate: ctx.sampleRate,
      channels: project.project.channels,
    });
    let buffer = cache?.get(key);
    if (!buffer) {
      try {
        const bytes = await file.arrayBuffer();
        buffer = await ctx.decodeAudioData(bytes.slice(0));
        cache?.set(key, buffer, {
          projectId: project.project.id,
          assetId: asset.id,
          elementId: item.element.id,
          kind: 'decoded',
        });
      } catch {
        return null;
      }
    }
    const node = ctx.createBufferSource();
    node.buffer = buffer;
    return {
      node,
      gain: item.gain,
      decoded: true,
      start() {
        node.start(item.when, item.sourceOffsetMs / 1000, item.durationMs / 1000);
      },
    };
  }

  function createGeneratedSource(item) {
    const roomTone = item.element.audio?.roomTone || {};
    if (roomTone.kind === 'tone') {
      const node = ctx.createOscillator();
      node.type = 'sine';
      node.frequency.value = Number(roomTone.frequency) || 440;
      return {
        node,
        gain: item.gain,
        generated: true,
        start() {
          node.start(item.when);
          node.stop(item.when + item.durationMs / 1000);
        },
      };
    }
    const node = ctx.createBufferSource();
    node.buffer = createNoiseBufferForMixer(ctx, Math.max(2, item.durationMs / 1000), roomTone.kind || 'pink-noise');
    node.loop = true;
    return {
      node,
      gain: item.gain,
      generated: true,
      start() {
        node.start(item.when, item.sourceOffsetMs / 1000, item.durationMs / 1000);
      },
    };
  }

  function applyGainEnvelope(gainNode, item, peak) {
    const start = item.when;
    const end = start + item.durationMs / 1000;
    const fadeInSec = Math.max(0, item.element.audio?.fadeInMs || 0) / 1000;
    const fadeOutSec = Math.max(0, item.element.audio?.fadeOutMs || 0) / 1000;
    gainNode.gain.cancelScheduledValues(ctx.currentTime);
    if (fadeInSec > 0 && item.sourceOffsetMs < item.element.audio.fadeInMs) {
      const elapsed = item.sourceOffsetMs / 1000;
      gainNode.gain.setValueAtTime(Math.max(0.0001, peak * (elapsed / fadeInSec)), start);
      gainNode.gain.linearRampToValueAtTime(peak, start + Math.max(0, fadeInSec - elapsed));
    } else {
      gainNode.gain.setValueAtTime(peak, start);
    }
    if (fadeOutSec > 0 && end - fadeOutSec > start) {
      gainNode.gain.setValueAtTime(peak, end - fadeOutSec);
      gainNode.gain.linearRampToValueAtTime(0.0001, end);
    }
  }

  function tick() {
    if (!playing || !ctx) return;
    const cursor = startCursorMs + Math.max(0, ctx.currentTime - startedAt) * 1000;
    setCursorMs?.(cursor);
    onTick?.(cursor);
    rafId = requestAnimationFrame(tick);
  }

  function stopInternal({ resetCursor = false, keepCursor = false } = {}) {
    generation += 1;
    if (rafId) cancelAnimationFrame(rafId);
    if (endTimer) clearTimeout(endTimer);
    rafId = 0;
    endTimer = 0;
    for (const node of nodes) {
      try { node.stop?.(); } catch {}
      try { node.disconnect?.(); } catch {}
    }
    for (const gain of gains) {
      try { gain.disconnect?.(); } catch {}
    }
    for (const node of laneNodes) {
      try { node.disconnect?.(); } catch {}
    }
    try { master?.disconnect?.(); } catch {}
    nodes = [];
    gains = [];
    laneNodes = [];
    laneChains = new Map();
    master = null;
    playing = false;
    if (resetCursor) setCursorMs?.(0);
    if (!keepCursor) onTick?.(getViewport?.().cursorMs || 0);
    updateState({ playing: false });
  }

  function updateState(patch) {
    Object.assign(state, patch);
    onState?.({ ...state });
    return { ...state };
  }
}

export function buildSchedulePlan(project, cursorMs = 0) {
  const anySolo = project.lanes.some((lane) => lane.solo);
  const laneById = new Map(project.lanes.map((lane) => [lane.id, lane]));
  const items = [];
  for (const element of project.elements) {
    if (!element.capabilities?.hasAudio) continue;
    const lane = laneById.get(element.laneId);
    if (!lane || lane.muted || (anySolo && !lane.solo)) continue;
    const endMs = element.timeline.startMs + element.timeline.durationMs;
    if (endMs <= cursorMs) continue;
    const delayMs = Math.max(0, element.timeline.startMs - cursorMs);
    const sourceOffsetMs = Math.max(0, cursorMs - element.timeline.startMs) + element.timeline.sourceInMs;
    const remainingMs = Math.max(0, element.timeline.sourceOutMs - sourceOffsetMs);
    const durationMs = Math.min(element.timeline.durationMs - Math.max(0, cursorMs - element.timeline.startMs), remainingMs);
    if (durationMs <= 0) continue;
    items.push({
      lane,
      element,
      delayMs,
      sourceOffsetMs,
      durationMs,
      gain: clampGain((project.master?.audio?.gain ?? 1) * (lane.audio?.gain ?? 1) * (element.audio?.gain ?? 1)),
      when: 0,
    });
  }
  return { cursorMs, items };
}

function createAudioContext() {
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    return Ctor ? new Ctor() : null;
  } catch {
    return null;
  }
}

export function createNoiseBufferForMixer(ctx, seconds, kind) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const out = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    if (kind === 'white-noise') {
      out[i] = white * 0.08;
      continue;
    }
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.011;
    b6 = white * 0.115926;
  }
  return buffer;
}

function clampGain(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(4, n));
}

function clampNum(value, lo, hi, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, n));
}
