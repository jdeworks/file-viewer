# PPTX — PowerPoint Presentation

> Slide-by-slide rendering to static images — text, shapes, and images; no animations or editing.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.pptx`, `.ppsx`, `.pptm` |
| MIME type | `application/vnd.openxmlformats-officedocument.presentationml.presentation` |
| Binary / Text | Binary (ZIP + XML) |
| Created by | Microsoft |
| Common use | Slide presentations, pitch decks, conference talks |
| Spec / Docs | [OOXML ECMA-376](https://www.ecma-international.org/publications-and-standards/standards/ecma-376/) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Slide rendering | ✅ | Up to 50 slides rendered to static images |
| Continuous view | ✅ | Slides shown in a vertical scroll by default |
| Single-slide mode | ✅ | Button, previous/next controls, keyboard, and touch swipe navigation |
| Slide thumbnail strip | ❌ | Not implemented |
| Speaker notes | ❌ | Notes are not extracted or displayed |
| Transitions / animations | ⚠️ | Not rendered; slides shown as static snapshots |
| Complex chart types | ⚠️ Partial | Dependent on pptxviewjs static rendering |
| Metadata | ✅ | Slides, title, author, dates, app, paragraphs, words where present |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Visual editing | ❌ | No WYSIWYG slide editor |
| Raw XML editing | ❌ | PPTX is preview-only in the PowerPoint viewer |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Screenshot individual slides | ❌ | No registered slide screenshot/export action yet |

## Known-File Enhancement

No known-file plugin — all PPTX files use the same slide renderer.

## Real-World Examples

- [`sample.pptx`](../examples/sample.pptx) — presentation demonstrating slide rendering and single-slide navigation

## Known Limitations

- Slide transitions and entrance/exit animations are not played
- Embedded video and audio are not played back
- Chart rendering accuracy depends on the static renderer and may differ from PowerPoint
- Font rendering may differ from PowerPoint due to font availability
- Rendering is capped to the first 50 slides

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| PDF export of all slides | High | Med | Render each slide to canvas then combine as PDF |
| Thumbnail strip / notes | Med | Med | Parse notes XML and add compact navigation thumbnails |
| Embedded video playback | Med | Hard | Videos stored in `ppt/media/`; need MIME-type routing |
| Accurate chart rendering | Med | Hard | OOXML chart spec is complex; partial support only |
| Slide transitions | Low | Hard | Would require CSS/JS animation for each transition type |
