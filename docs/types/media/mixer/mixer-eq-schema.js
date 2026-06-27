const DEFAULT_EQ_BANDS = Object.freeze([
  { frequency: 60, gainDb: 0, q: 0.8, type: 'lowshelf' },
  { frequency: 120, gainDb: 0, q: 1.0, type: 'peaking' },
  { frequency: 250, gainDb: 0, q: 1.0, type: 'peaking' },
  { frequency: 500, gainDb: 0, q: 1.0, type: 'peaking' },
  { frequency: 1000, gainDb: 0, q: 1.0, type: 'peaking' },
  { frequency: 2000, gainDb: 0, q: 1.0, type: 'peaking' },
  { frequency: 4000, gainDb: 0, q: 1.0, type: 'peaking' },
  { frequency: 8000, gainDb: 0, q: 1.0, type: 'peaking' },
  { frequency: 12000, gainDb: 0, q: 0.8, type: 'highshelf' },
]);

export function createDefaultEq(overrides = {}) {
  return {
    enabled: overrides.enabled ?? true,
    bypassed: overrides.bypassed ?? false,
    hpfHz: Number.isFinite(Number(overrides.hpfHz)) ? Number(overrides.hpfHz) : 20,
    lpfHz: Number.isFinite(Number(overrides.lpfHz)) ? Number(overrides.lpfHz) : 20000,
    presetId: overrides.presetId ?? null,
    bands: normalizeEqBands(overrides.bands || DEFAULT_EQ_BANDS),
  };
}

export function normalizeEqBands(bands = []) {
  const source = Array.isArray(bands) && bands.length ? bands : DEFAULT_EQ_BANDS;
  return source.map((band, index) => {
    const fallback = DEFAULT_EQ_BANDS[index] || DEFAULT_EQ_BANDS[DEFAULT_EQ_BANDS.length - 1];
    return {
      frequency: finitePositive(band?.frequency, fallback.frequency),
      gainDb: finiteNumber(band?.gainDb, fallback.gainDb),
      q: finitePositive(band?.q, fallback.q),
      type: typeof band?.type === 'string' ? band.type : fallback.type,
    };
  });
}

export function normalizeEq(eq = {}) {
  return createDefaultEq(eq);
}

export function createDefaultMaster(overrides = {}) {
  return {
    audio: {
      gain: finiteNumber(overrides.audio?.gain, 1),
      eq: normalizeEq(overrides.audio?.eq),
      limiter: {
        enabled: overrides.audio?.limiter?.enabled ?? false,
        thresholdDb: finiteNumber(overrides.audio?.limiter?.thresholdDb, -1),
        releaseMs: finitePositive(overrides.audio?.limiter?.releaseMs, 80),
      },
    },
    video: {
      width: finitePositive(overrides.video?.width, 1920),
      height: finitePositive(overrides.video?.height, 1080),
      fps: finitePositive(overrides.video?.fps, 30),
      background: overrides.video?.background || '#000000',
    },
    exportPreset: overrides.exportPreset ?? null,
  };
}

function finiteNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function finitePositive(value, fallback) {
  const n = finiteNumber(value, fallback);
  return n > 0 ? n : fallback;
}

