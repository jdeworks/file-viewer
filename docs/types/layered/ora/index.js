import { detect } from './detect.js';

// ORA (OpenRaster) — dedicated sub-module of the layered type.
// https://www.openraster.org/
export const id = 'ora';
export const name = 'OpenRaster';
export const extensions = ['ora'];
export const mimeTypes = ['image/openraster'];
export { detect };
export const render = (...args) => import('./renderer.js').then((m) => m.render(...args));
