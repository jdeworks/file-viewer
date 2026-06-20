# PPTX — PowerPoint Presentation

> Slide-by-slide rendering with thumbnail strip and speaker notes — shapes, images, and text; no animations.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.pptx`, `.potx` |
| MIME type | `application/vnd.openxmlformats-officedocument.presentationml.presentation` |
| Binary / Text | Binary (ZIP + XML) |
| Created by | Microsoft |
| Common use | Slide presentations, pitch decks, conference talks |
| Spec / Docs | [OOXML ECMA-376](https://www.ecma-international.org/publications-and-standards/standards/ecma-376/) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Slide rendering | ✅ | Text, shapes, and images per slide |
| Slide thumbnail strip | ✅ | All slides shown as clickable thumbnails |
| Speaker notes | ✅ | Notes pane displayed below slide |
| Transitions / animations | ⚠️ | Not rendered; slides shown as static snapshots |
| Complex chart types | ⚠️ Partial | Simple charts attempted; complex types shown as placeholders |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Visual editing | ❌ | No WYSIWYG slide editor |
| Raw XML editing | ✅ | Internal XML parts editable via archive tree |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Screenshot individual slides | ✅ | Canvas capture of current slide |

## Known-File Enhancement

No known-file plugin — all PPTX files use the same slide renderer.

## Real-World Examples

- [`sample.pptx`](../examples/sample.pptx) — presentation demonstrating slide navigation, thumbnails, and speaker notes

## Known Limitations

- Slide transitions and entrance/exit animations are not played
- Embedded video and audio are not played back
- Chart rendering accuracy varies; complex charts (waterfall, funnel) show placeholders
- Font rendering may differ from PowerPoint due to font availability

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| PDF export of all slides | High | Med | Render each slide to canvas then combine as PDF |
| Embedded video playback | Med | Hard | Videos stored in `ppt/media/`; need MIME-type routing |
| Accurate chart rendering | Med | Hard | OOXML chart spec is complex; partial support only |
| Slide transitions | Low | Hard | Would require CSS/JS animation for each transition type |
