# DICOM Medical Image

> Medical imaging format used by CT, MRI, X-ray, and ultrasound equipment — parsed in-browser with tag inspection.

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
| Image rendering | ✅ | Pixel data decoded with window/level adjustments |
| Tag browser | ✅ | All DICOM tags with VR, group/element, and value |
| Patient/study info | ✅ | Patient name, ID, study date, modality, series |
| Metadata | ✅ | Modality, institution, manufacturer, image size |
| Multi-frame (video) | ⚠️ Partial | Multi-frame detection; animation not implemented |
| Compressed pixel data | ⚠️ Partial | JPEG-in-DICOM works; JPEG 2000 not supported |
| Diff/compare | ❌ | Not supported |

### Edit
| Feature | Status | Details |
|---------|--------|---------|
| Window/level adjust | ✅ | Brightness/contrast slider for diagnostic viewing |
| Anonymization | ❌ | Strip patient data — not yet implemented |
| Annotation | ❌ | Draw ROI/measurements on image |

### Export
| Feature | Status | Details |
|---------|--------|---------|
| Download original | ✅ | Always available |
| Export image as PNG | ❌ | Canvas capture of rendered pixel data not yet wired |
| Export tag list as JSON | ❌ | Not yet implemented |

## Example Files
- [`sample.dcm`](../examples/sample.dcm) — DICOM medical image sample

## Gaps / Planned Improvements
| Feature | Priority | Notes |
|---------|----------|-------|
| Export rendered image as PNG | High | Canvas.toBlob on the rendered pixel data |
| Patient data anonymization | High | Zero out identifying tags; download cleaned file |
| JPEG 2000 pixel data | Medium | Need j2k decoder (OpenJPEG WASM) |
| Multi-frame animation | Medium | Cine loop for multi-frame CT/MRI series |
| Annotation / measurement | Low | Length/area ROI tools |
| DICOMDIR support | Low | Directory file linking a series of DICOM files |
