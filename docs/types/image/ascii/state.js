// Default converter options + the dirty-flag model. One source of truth for the
// option shape shared by the file-viewer toggle, the studio page and webcam.

export function defaultOptions() {
  return {
    // detail / output sizing
    columns: 100,       // detail — output auto-fits its container width, so more
                        // columns = more detail at the SAME on-screen size
    zoom: 1,            // display-only magnification on top of the fit-to-width size
    fontSize: 10,       // glyph px size used for PNG/canvas export only
    fontAspect: 0.55,
    spaceDensity: 1,    // display-only float: horizontal glyph spacing

    // geometric transforms (applied to the source image/video frame)
    rotate: 0,          // 0 | 90 | 180 | 270
    flipH: false,
    flipV: false,

    // colour image filters (native ctx.filter fast path)
    brightness: 1,      // 0–2
    contrast: 1,        // 0–2
    saturation: 1,      // 0–2
    hue: 0,             // 0–360 deg
    grayscale: 0,       // 0–1
    sepia: 0,           // 0–1
    invertColors: 0,    // 0–1

    // JS image passes
    thresholdEnabled: false,
    threshold: 128,     // 0–255
    sharpness: 0,       // 0–10
    edgeDetection: 0,   // 0–10

    // glyph mapping
    gradientName: 'normal',
    customRamp: '',
    invertRamp: false,
    dithering: 'none',
    // 'downscale' = fast browser box-filter; the default everywhere (also pinned for the webcam).
    // The coverage-aware tone in convert.js fixes the old sparse/transparent speckle for every
    // sampler, so 'average' (full-res, coverage-exact) is only needed for the hardest line-art.
    // Options: downscale | nearest | center | average | median.
    samplingMethod: 'downscale',
    fillGaps: false,    // fill INTERIOR transparent holes from neighbours; real background stays clear

    // colour / output styling
    fontName: 'Uniform', // 'Uniform' (vendored, uniform blocks) | 'System' | 'Courier'
    colorMode: true,
    colorSource: 'processed', // 'processed' | 'original'
    glyphColorMode: 'colored', // 'colored' | 'white' | 'grayscale'
    backgroundColor: '#000000',
    transparentBackground: false,
    transparentFrame: 0,       // px padding in PNG/canvas output
  };
}

// Performance presets tune the expensive knobs without touching the user's
// look settings. Returned as a partial to merge into options.
export const PERFORMANCE_PRESETS = {
  fast: { samplingMethod: 'downscale', dithering: 'none' },
  balanced: { samplingMethod: 'downscale' },
  quality: { samplingMethod: 'average' },
};

export function newDirty(all = true) {
  return { processedImage: all, ascii: all, render: all };
}
