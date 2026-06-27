# Project Model

## Project

```js
{
  schema: 'file-viewer.media-mixer.project',
  version: 1,
  createdAt: 'ISO-8601',
  updatedAt: 'ISO-8601',
  project: {
    id,
    name,
    durationMs,
    fps,
    sampleRate,
    channels,
    background,
  },
  assets: [],
  lanes: [],
  elements: [],
  effects: [],
  transitions: [],
  markers: [],
  selection: {},
  compare: {},
  master: {},
}
```

The model stores edit decisions. It does not store source media bytes.

## Assets

Assets describe local files or generated sources.

```js
{
  id,
  kind: 'file' | 'generated' | 'external-placeholder',
  name,
  mime,
  size,
  lastModified,
  hash: {
    algorithm: 'sha256-partial-v1',
    value,
    byteRanges,
  },
  capabilities: {
    hasAudio,
    hasVideo,
    hasImage,
    hasText,
    nativePreview,
    needsFfmpegForPreview,
    needsFfmpegForExport,
  },
  media: {
    durationMs,
    audioSampleRate,
    audioChannels,
    videoWidth,
    videoHeight,
    frameRate,
  },
  status: 'available' | 'missing' | 'needs-relink' | 'unsupported',
}
```

Hashing should balance reliability and memory:

- For small files, full SHA-256 is acceptable.
- For large files, hash stable byte windows:
  - first 1 MiB
  - middle 1 MiB
  - last 1 MiB
  - size
  - lastModified
  - name as secondary hint
- The project import flow must state that partial hashes are identity hints, not
  cryptographic proof of full-file equality.

## Lanes

```js
{
  id,
  label,
  role: 'source' | 'video' | 'audio' | 'image' | 'music' | 'sfx' |
        'room-tone' | 'compare' | 'subtitle' | 'generated',
  order,
  height,
  locked,
  collapsed,
  muted,
  solo,
  visible,
  color,
  audio: {
    gain,
    pan,
    eq,
    sends,
  },
  video: {
    opacity,
    blendMode,
  },
}
```

Lanes are layers. For visual elements, higher lanes composite above lower lanes.
For audio elements, audible lanes mix into the master bus unless muted/soloed.

Some lanes can be derived rather than directly edited. Example: a room-tone lane
can be rendered from source gaps, while still participating in playback/export.
Derived lanes need descriptors and settings, but may not store ordinary timeline
elements.

## Elements

Elements are timeline instances of assets or generated content.

```js
{
  id,
  laneId,
  assetId,
  type: 'audio' | 'video' | 'image' | 'generated' | 'subtitle',
  capabilities: {
    hasAudio,
    hasVideo,
    hasImage,
  },
  timeline: {
    startMs,
    durationMs,
    rawDurationMs,
    placementDurationMs,
    sourceInMs,
    sourceOutMs,
    speed,
    reversed,
  },
  audio: {
    gain,
    pan,
    fadeInMs,
    fadeOutMs,
    roomTone,
    eq,
  },
  visual: {
    x,
    y,
    scaleX,
    scaleY,
    rotation,
    opacity,
    crop,
    anchor,
  },
  analysis: {
    waveformId,
    thumbnailsId,
    statsId,
  },
  keyframes: [],
  effects: [],
}
```

Images are elements with `hasImage: true`, `hasVideo: false`, `hasAudio: false`,
and an editable timeline duration. Video files usually have both `hasVideo` and
`hasAudio`. WAV/MP3 files have `hasAudio` only.

`rawDurationMs` is immutable source-derived duration. `durationMs` is the
effective edited duration. `placementDurationMs` is the timeline occupancy and
can differ for looped content or generated beds.

## Generated Elements

Generated element kinds:

- pink noise
- silence
- tone
- color matte
- title/text later

Pink noise is a first-class element or lane role, not a generic hidden export
option. It supports:

- level
- duration
- fade in/out
- room-tone/gap semantics
- deterministic export

## Effects

Effects can attach to:

- element
- lane
- master

Effect shape:

```js
{
  id,
  targetType: 'element' | 'lane' | 'master',
  targetId,
  kind: 'audio-eq' | 'gain' | 'compressor' | 'video-filter' |
        'transform' | 'transition' | 'mask',
  enabled,
  params: {},
  keyframes: [],
}
```

Audio effects:

- gain
- fades
- 9-band EQ
- HPF/LPF
- compressor/limiter
- noise gate/de-noise where supported
- room-tone/pink-noise bed

Video/image effects:

- opacity
- crop
- scale
- position
- rotation
- color/brightness/contrast
- blur/mask later

## Keyframes

Keyframes animate properties over time.

```js
{
  id,
  targetId,
  path: 'visual.opacity',
  timeMs,
  value,
  interpolation: 'linear' | 'constant' | 'bezier',
}
```

Initial implementation can store keyframes before rendering every animation
type. The model should not block future animation support.

## Selection

Selection state:

```js
{
  primary: { type: 'element' | 'lane' | 'effect' | 'transition', id },
  items: [],
  range: { startMs, endMs },
}
```

Selection drives the inspector. The same object should not have different
settings in different modes.

## Compare State

```js
{
  a: { elementId, rangeStartMs, rangeEndMs, offsetMs },
  b: { elementId, rangeStartMs, rangeEndMs, offsetMs },
  view: 'stacked' | 'overlay',
  overlayOpacity,
  normalizeAudio,
  analysisRange,
}
```

Compare is a view over elements, not a separate data model.

## Master

```js
{
  audio: {
    gain,
    eq,
    limiter,
  },
  video: {
    width,
    height,
    fps,
    background,
  },
  exportPreset,
}
```

Master EQ follows the Narratu global EQ concept. Track/element EQ remains
separate.

## EQ Schema

EQ configuration should be stored once and translated into live preview nodes,
offline render steps, and ffmpeg filters.

```js
{
  enabled: true,
  bypassed: false,
  hpfHz: 20,
  lpfHz: 20000,
  bands: [
    { frequency: 60, gainDb: 0, q: 0.8, type: 'lowshelf' },
    { frequency: 120, gainDb: 0, q: 1.0, type: 'peaking' },
    { frequency: 250, gainDb: 0, q: 1.0, type: 'peaking' },
    { frequency: 500, gainDb: 0, q: 1.0, type: 'peaking' },
    { frequency: 1000, gainDb: 0, q: 1.0, type: 'peaking' },
    { frequency: 2000, gainDb: 0, q: 1.0, type: 'peaking' },
    { frequency: 4000, gainDb: 0, q: 1.0, type: 'peaking' },
    { frequency: 8000, gainDb: 0, q: 1.0, type: 'peaking' },
    { frequency: 12000, gainDb: 0, q: 0.8, type: 'highshelf' }
  ],
  presetId: null
}
```

Track EQ and master EQ use the same schema. The master bus can add compressor
and limiter settings after lane summing.

## Project Settings Export

The lightweight export should be a JSON file:

```json
{
  "schema": "file-viewer.media-mixer.project",
  "version": 1,
  "assets": [
    {
      "id": "asset-1",
      "name": "sample.wav",
      "size": 123456,
      "lastModified": 1710000000000,
      "hash": {
        "algorithm": "sha256-partial-v1",
        "value": "..."
      }
    }
  ],
  "lanes": [],
  "elements": [],
  "effects": [],
  "master": {}
}
```

No full media bytes are embedded by default. A later optional archive format
could package media, but that is not the default file-viewer path.

## Project Settings Import

Import flow:

1. Read JSON.
2. Validate schema/version.
3. Create project state.
4. Match assets against currently open file/folder files.
5. Mark missing assets.
6. Let user relink missing files by dragging or choosing files.
7. When dragged files match missing assets, offer a reapply modal:
   - Apply to all elements: replace matching placeholders and apply all stored
     timing/effect/keyframe settings automatically.
   - Ask per element: review each matched media object before applying stored
     settings.
   - Do not change media objects: keep files available in the asset bin but do
     not bind them to existing timeline elements.
8. Rebuild analysis lazily.

Import must be robust to renamed files when hashes match.

The settings file is intentionally lightweight. It should be safe to email or
store as a project recipe, but it is only useful for final preview/export after
the user supplies the referenced media files again.

## Capability Configuration

Project state should record required and optional capabilities separately from
current runtime availability:

```js
{
  requiredCapabilities: [],
  optionalCapabilities: ['ffmpeg-video-export'],
  lastKnownCapabilities: {
    webAudio: true,
    ffmpegEnabled: false
  }
}
```

This lets an imported project explain: "This project can be edited now, but
final video export requires Media Transcoding."
