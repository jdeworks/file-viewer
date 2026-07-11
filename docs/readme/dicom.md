# DICOM Medical Image

> Medical imaging format used by CT, MRI, X-ray, and ultrasound equipment — parsed in-browser as a safety-focused metadata summary.

## Format Details
| Field | Value |
|-------|-------|
| Extensions | `.dcm`, `.dicom` (often no extension) |
| MIME type | `application/dicom` |
| Binary/Text | Binary |
| Common use | Medical imaging: CT scans, MRI, X-ray, ultrasound |

## Capabilities

### View
| Feature | Status | Details |
|---------|--------|---------|
| DICM signature check | ✅ | Requires the `DICM` marker at offset 128 |
| Explicit VR Little Endian scan | ✅ | Reads up to 200 metadata tags and stops before pixel data |
| Study / scan info | ✅ | Study date/time, descriptions, modality, SOP class, transfer syntax when present |
| Patient info warning | ✅ | Shows PHI warning when patient identifiers are detected |
| Equipment info | ✅ | Manufacturer and model when present |
| Image parameters | ✅ | Rows, columns, bit depth, spacing, and slice thickness when present |
| Metadata | ✅ | Modality, rows, columns, study date, institution |
| Image rendering | ❌ | Pixel data is not decoded or displayed |
| Full tag browser | ❌ | Only selected clinically useful tags are surfaced |
| Multi-frame (video) | ❌ | Pixel data is not decoded |
| Compressed pixel data | ❌ | Transfer syntax is labelled, but compressed pixels are not decoded |
| Diff/compare | ❌ | Not supported |

### Edit
| Feature | Status | Details |
|---------|--------|---------|
| Window/level adjust | ❌ | No rendered pixel canvas yet |
| Anonymization | ❌ | Strip patient data — not yet implemented |
| Annotation | ❌ | Draw ROI/measurements on image |

### Export
| Feature | Status | Details |
|---------|--------|---------|
| Download original | ✅ | Always available |
| Export image as PNG | ❌ | Canvas capture of rendered pixel data not yet wired |
| Export tag list as JSON | ❌ | Not yet implemented |

## Example Files
- [`sample.dcm`](../examples/sample.dcm) — deterministic 64 × 64 Explicit VR Little Endian metadata-and-pixel fixture (the current viewer intentionally shows metadata only)

## Gaps / Planned Improvements
| Feature | Priority | Notes |
|---------|----------|-------|
| Pixel renderer with window/level | High | Decode uncompressed pixel data first, then add brightness/contrast controls |
| Full tag table export | High | Show every parsed tag and export JSON |
| Patient data anonymization | High | Zero out identifying tags; download cleaned file |
| JPEG 2000 pixel data | Medium | Need j2k decoder (OpenJPEG WASM) |
| Multi-frame animation | Medium | Cine loop for multi-frame CT/MRI series |
| Annotation / measurement | Low | Length/area ROI tools |
| DICOMDIR support | Low | Directory file linking a series of DICOM files |
