// Build input for the vendored gifuct-js bundle. NOT shipped to docs/.
// esbuild concatenates this (and its dependency tree) into a single same-origin
// ESM file: docs/vendor/gifuct/gifuct.esm.js — see build.mjs in this folder.
//
// gifuct-js exposes two pieces we need:
//   parseGIF(buffer)              -> a parsed GIF (logical screen, frames metadata)
//   decompressFrames(gif, build)  -> per-frame patches with `build:true` so each
//                                    frame's `patch` is a ready RGBA byte array.
// The page's gif-decode.js composites those patches (honouring disposal) into
// full-frame RGBA canvases.
export { parseGIF, decompressFrames } from 'gifuct-js';
