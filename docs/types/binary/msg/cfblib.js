const CFB_JS = new URL('../../../vendor/cfb.min.js', import.meta.url).href;

let promise = null;

async function initializeCFB() {
  const response = await fetch(CFB_JS);
  if (!response.ok) throw new Error(`Failed to load cfb.min.js (${response.status})`);
  const source = await response.text();

  // The vendored build declares many helpers at script scope. Evaluating it inside this function
  // keeps those helpers local while returning the one public API the MSG reader needs.
  const evaluate = new Function(
    'require',
    'module',
    'exports',
    source + `\nreturn CFB;\n//# sourceURL=${CFB_JS}`,
  );
  const api = evaluate.call(window, undefined, undefined, undefined);
  if (!api || typeof api.read !== 'function' || typeof api.find !== 'function') {
    throw new Error('CFB missing after load');
  }
  return api;
}

export function loadCFB() {
  if (!promise) {
    promise = initializeCFB().catch((error) => {
      promise = null;
      throw error;
    });
  }
  return promise;
}
