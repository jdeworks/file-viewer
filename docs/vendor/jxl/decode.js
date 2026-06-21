/**
 * Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 * Vendored from @jsquash/jxl@1.3.0 (MIT wrapper around the Apache-2.0 libjxl
 * Emscripten build). Only the import paths are flattened for the no-bundler
 * vendor layout (./codec/dec/jxl_dec.js -> ./jxl_dec.js). Decoder only.
 */
import jxlDecoder from './jxl_dec.js';
import { initEmscriptenModule } from './utils.js';
let emscriptenModule;
export async function init(module, moduleOptionOverrides) {
    let actualModule = module;
    let actualOptions = moduleOptionOverrides;
    if (arguments.length === 1 && !(module instanceof WebAssembly.Module)) {
        actualModule = undefined;
        actualOptions = module;
    }
    emscriptenModule = initEmscriptenModule(jxlDecoder, actualModule, actualOptions);
    return emscriptenModule;
}
export default async function decode(buffer) {
    if (!emscriptenModule)
        emscriptenModule = init();
    const module = await emscriptenModule;
    const result = module.decode(buffer);
    if (!result)
        throw new Error('Decoding error');
    return result;
}
