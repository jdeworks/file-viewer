const MAX_MATCH_TEXT = 16 * 1024 * 1024;

function finite(value) { return typeof value === 'number' && Number.isFinite(value); }

export function isLottieAnimation(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (typeof value.v !== 'string' || !/^\d+(?:\.\d+){1,3}/.test(value.v)) return false;
  if (!finite(value.fr) || value.fr <= 0 || value.fr > 1000) return false;
  if (!finite(value.ip) || !finite(value.op) || value.op <= value.ip || value.op - value.ip > 1e8) return false;
  if (!finite(value.w) || !finite(value.h) || value.w <= 0 || value.h <= 0 || value.w > 1e6 || value.h > 1e6) return false;
  if (!Array.isArray(value.layers) || value.layers.length === 0 || value.layers.length > 100000) return false;
  if (value.assets != null && !Array.isArray(value.assets)) return false;
  return value.layers.some((layer) => layer && typeof layer === 'object' && finite(layer.ty)
    && (layer.ks || Array.isArray(layer.shapes) || typeof layer.refId === 'string' || layer.t));
}

export function parseLottie(intake) {
  const text = intake?.sourceText ?? intake?.text ?? '';
  if (intake?.truncated) throw new Error('The animation is incomplete because only part of the file was loaded.');
  if (!text || text.length > MAX_MATCH_TEXT) throw new Error('The Lottie JSON exceeds the 16 MiB preview limit.');
  let data;
  try { data = JSON.parse(text); }
  catch (error) { throw new Error('Invalid JSON: ' + error.message); }
  if (!isLottieAnimation(data)) throw new Error('The JSON does not contain a credible Lottie animation structure.');
  return data;
}

export function matchesLottie(intake, baseType) {
  if (baseType?.id !== 'json' || intake?.truncated) return false;
  const text = intake?.sourceText ?? intake?.text ?? '';
  if (!text || text.length > MAX_MATCH_TEXT) return false;
  try { return isLottieAnimation(JSON.parse(text)); }
  catch { return false; }
}

export function lottieSummary(data) {
  const frames = data.op - data.ip;
  return {
    name: typeof data.nm === 'string' && data.nm.trim() ? data.nm.trim() : 'Untitled animation',
    version: data.v,
    width: data.w,
    height: data.h,
    fps: data.fr,
    inFrame: data.ip,
    outFrame: data.op,
    frames,
    duration: frames / data.fr,
    layers: data.layers.length,
    assets: Array.isArray(data.assets) ? data.assets.length : 0,
  };
}

export function hasExpressions(value) {
  const stack = [value];
  let visited = 0;
  while (stack.length) {
    const item = stack.pop();
    if (!item || typeof item !== 'object' || ++visited > 200000) continue;
    if (!Array.isArray(item) && typeof item.x === 'string' && item.x.trim()) return true;
    for (const child of Object.values(item)) if (child && typeof child === 'object') stack.push(child);
  }
  return false;
}
