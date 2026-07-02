# Flash / SWF via Ruffle

> Legacy Flash content runs in the browser via Ruffle's WASM emulator — no Flash Player required.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.swf` |
| MIME type | `application/x-shockwave-flash` |
| Binary / Text | Binary |
| Created by | Macromedia / Adobe (Flash Player); Ruffle emulator by the Ruffle community |
| Common use | Legacy browser animations, interactive games, educational content |
| Spec / Docs | [Ruffle](https://ruffle.rs/) · [SWF spec (Adobe)](https://www.adobe.com/content/dam/acom/en/devnet/pdf/swf-file-format-spec.pdf) |

## Capabilities Matrix

### View / Play
| Capability | Status | Notes |
|------------|--------|-------|
| Flash emulation | ✅ | Local vendored Ruffle JavaScript/WASM loads after user confirmation |
| Trust prompt | ✅ | User must confirm before SWF content is loaded; cancel leaves a reload option |
| Interactive content | ✅ | Mouse, keyboard, buttons, and timelines are handled by Ruffle when supported |
| ActionScript 1 / 2 | ✅ | Well-supported |
| ActionScript 3 | ⚠️ Partial | Partial support; complex AS3 SWFs may not run correctly |
| Complex SWFs | ⚠️ | Some SWFs with advanced features may not run |
| Metadata | ✅ | SWF version, compression type, and declared file size |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Any editing | ❌ | No editing capabilities |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known-File Enhancement

No known-file plugin — all SWF files use the Ruffle emulator.

## Real-World Examples

- [`sample.swf`](../examples/sample.swf) — compact SWF fixture for detection and Ruffle load flow

## Known Limitations

- ActionScript 3 support is partial; many modern SWFs will not run correctly
- SWFs that stream video from external servers will not function (no network emulation)
- Loading time includes the on-demand Ruffle runtime/WASM chunks and then scales with SWF size
- Ruffle is updated independently; compatibility improves over time
- SWF execution is intentionally gated because Flash content can run active code inside the emulator

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| AS3 full compatibility | High | Hard | Tracked by the Ruffle project; depends on upstream |
| Screenshot / frame capture | Med | Med | Canvas capture of current Ruffle frame |
| Network-dependent SWF stub | Low | Hard | Mock XMLSocket/URLLoader for offline testing |
