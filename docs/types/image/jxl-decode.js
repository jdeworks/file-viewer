// Lazy, heavy JPEG XL decoder (browsers can't decode JXL natively). Wraps the
// vendored @jsquash/jxl decoder. The ~829 KB wasm is fetched + compiled ONCE on
// first use and handed to the Emscripten module via instantiateWasm, so there is
// no runtime URL fetch from inside the wasm glue (offline-/CSP-friendly). This
// whole module + its wasm only load when a .jxl file is actually opened.

let ready = null;

export function decodeJxl(bytes) {
  if (!ready) {
    ready = (async () => {
      const mod = await import('../../vendor/jxl/decode.js');
      const wasmUrl = new URL('../../vendor/jxl/jxl_dec.wasm', import.meta.url);
      const buf = await (await fetch(wasmUrl)).arrayBuffer();
      const wasmModule = await WebAssembly.compile(buf);
      await mod.init(wasmModule);   // sets the singleton; default decode() won't re-fetch
      return mod.default;
    })();
  }
  return ready.then((decode) => {
    const ab = bytes instanceof Uint8Array ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) : bytes;
    return decode(ab);   // -> ImageData { data, width, height }
  });
}
