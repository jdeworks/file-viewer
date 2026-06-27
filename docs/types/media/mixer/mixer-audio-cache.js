export const DEFAULT_AUDIO_CACHE_BUDGET_BYTES = 200 * 1024 * 1024;

export function estimateAudioBufferBytes(buffer) {
  const length = Math.max(0, Number(buffer?.length) || 0);
  const channels = Math.max(1, Number(buffer?.numberOfChannels) || 1);
  return length * channels * 4;
}

export function createAudioBufferCache(options = {}) {
  let budgetBytes = Math.max(0, Number(options.budgetBytes) || DEFAULT_AUDIO_CACHE_BUDGET_BYTES);
  let totalBytes = 0;
  const entries = new Map();

  const touch = (key) => {
    const entry = entries.get(key);
    if (!entry) return;
    entries.delete(key);
    entries.set(key, entry);
  };

  const evict = () => {
    while (totalBytes > budgetBytes && entries.size) {
      const key = entries.keys().next().value;
      const entry = entries.get(key);
      entries.delete(key);
      totalBytes -= entry.bytes;
      options.onEvict?.(key, entry);
    }
  };

  return {
    get budgetBytes() {
      return budgetBytes;
    },
    setBudget(bytes) {
      budgetBytes = Math.max(0, Number(bytes) || 0);
      evict();
    },
    set(key, buffer, metadata = {}) {
      if (!key || !buffer) return null;
      const existing = entries.get(key);
      if (existing) {
        totalBytes -= existing.bytes;
        entries.delete(key);
      }
      const bytes = Math.max(0, Number(metadata.bytes) || estimateAudioBufferBytes(buffer));
      const entry = {
        key,
        buffer,
        bytes,
        projectId: metadata.projectId || null,
        assetId: metadata.assetId || null,
        elementId: metadata.elementId || null,
        kind: metadata.kind || 'decoded',
        createdAt: Date.now(),
      };
      entries.set(key, entry);
      totalBytes += bytes;
      evict();
      return entries.get(key) || null;
    },
    get(key) {
      if (!entries.has(key)) return null;
      touch(key);
      return entries.get(key).buffer;
    },
    has(key) {
      return entries.has(key);
    },
    delete(key) {
      const entry = entries.get(key);
      if (!entry) return false;
      entries.delete(key);
      totalBytes -= entry.bytes;
      return true;
    },
    releaseProject(projectId) {
      let released = 0;
      for (const [key, entry] of [...entries]) {
        if (entry.projectId !== projectId) continue;
        entries.delete(key);
        totalBytes -= entry.bytes;
        released += 1;
      }
      return released;
    },
    clear() {
      entries.clear();
      totalBytes = 0;
    },
    stats() {
      return {
        entryCount: entries.size,
        totalBytes: Math.max(0, totalBytes),
        budgetBytes,
        usagePercent: budgetBytes > 0 ? Math.round((totalBytes / budgetBytes) * 100) : 0,
        keys: [...entries.keys()],
      };
    },
  };
}

export function buildDecodedAudioCacheKey({ projectId, asset, element, range, sampleRate, channels, decodeMode } = {}) {
  const sourceIn = range?.sourceInMs ?? element?.timeline?.sourceInMs ?? 0;
  const sourceOut = range?.sourceOutMs ?? element?.timeline?.sourceOutMs ?? element?.timeline?.rawDurationMs ?? 0;
  return stableCacheKey('decoded', {
    projectId,
    assetId: asset?.id || element?.assetId || null,
    hash: asset?.hash?.value || asset?.hash || null,
    name: asset?.name || null,
    size: asset?.size || 0,
    lastModified: asset?.lastModified || null,
    sourceInMs: Math.round(sourceIn),
    sourceOutMs: Math.round(sourceOut),
    sampleRate: Math.round(Number(sampleRate) || asset?.media?.audioSampleRate || 0),
    channels: Math.round(Number(channels) || asset?.media?.audioChannels || 0),
    decodeMode: decodeMode || 'native',
  });
}

export function buildProcessedAudioCacheKey({ project, lane, element, asset, render = {} } = {}) {
  return stableCacheKey('processed', {
    projectId: project?.project?.id || null,
    assetId: asset?.id || element?.assetId || null,
    elementId: element?.id || null,
    sourceInMs: Math.round(element?.timeline?.sourceInMs || 0),
    sourceOutMs: Math.round(element?.timeline?.sourceOutMs || 0),
    startMs: Math.round(element?.timeline?.startMs || 0),
    speed: rounded(element?.timeline?.speed, 4),
    elementGain: rounded(element?.audio?.gain, 4),
    elementPan: rounded(element?.audio?.pan, 4),
    fadeInMs: Math.round(element?.audio?.fadeInMs || 0),
    fadeOutMs: Math.round(element?.audio?.fadeOutMs || 0),
    roomTone: element?.audio?.roomTone || null,
    elementEq: element?.audio?.eq || null,
    laneId: lane?.id || element?.laneId || null,
    laneMuted: !!lane?.muted,
    laneSolo: !!lane?.solo,
    laneGain: rounded(lane?.audio?.gain, 4),
    lanePan: rounded(lane?.audio?.pan, 4),
    laneEq: lane?.audio?.eq || null,
    masterGain: rounded(project?.master?.audio?.gain, 4),
    masterEq: project?.master?.audio?.eq || null,
    sampleRate: Math.round(render.sampleRate || project?.project?.sampleRate || 0),
    channels: Math.round(render.channels || project?.project?.channels || 0),
  });
}

export function stableAudioSettingsSignature(value) {
  return hashString(stableStringify(value));
}

function stableCacheKey(prefix, value) {
  return `${prefix}:${stableAudioSettingsSignature(value)}`;
}

function rounded(value, precision) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  const scale = 10 ** precision;
  return Math.round(number * scale) / scale;
}

function stableStringify(value) {
  if (value == null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function hashString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
