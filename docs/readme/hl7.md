# HL7 v2 Health Message

> HL7 v2.x viewer — segment listing with type labels, MSH summary (message type, version, routing), and per-segment field preview.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.hl7`, `.hl7v2`, `.msh` |
| MIME type | `text/plain` |
| Binary / Text | Text (pipe-delimited) |
| Common use | Hospital information systems, lab results, patient admissions, pharmacy orders |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Segment list | ✅ | All segments with code, type label, and field preview |
| Segment count | ✅ | Total and unique segment types |
| Message type | ✅ | From MSH-9 (e.g. `ADT / A01`) |
| HL7 version | ✅ | From MSH-12 |
| Sending / receiving app | ✅ | MSH-3 and MSH-5 |
| Message control ID | ✅ | MSH-10 |
| Date/time | ✅ | MSH-7 |
| Segment labels | ✅ | Human-readable labels for 20+ well-known segment types |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | Version, message type, sending app, segment count |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- Only first 100 segments shown in preview
- PID patient data is shown without redaction (files are local; no data leaves the browser)
- HL7 FHIR (JSON/XML format) is handled separately by the JSON/XML type

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Per-segment field table | Med | Med | Expand any segment to show all field names/values |
| PID patient summary card | Low | Easy | Highlight name, DOB, ID from PID segment |
| HL7 FHIR JSON support | Low | Med | Detect `resourceType` and render FHIR resources |
