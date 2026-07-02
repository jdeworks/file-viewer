# HTTP Archive (HAR)

> Network request waterfall chart with request/response details, timing breakdown, and category filtering.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.har` |
| MIME type | `application/json` |
| Binary / Text | Text (JSON) |
| Common use | Browser DevTools network captures, API debugging, performance analysis |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Waterfall timeline | ✅ | Each request shown with relative start time and duration bar |
| Request method / URL | ✅ | Method badge and truncated URL per entry |
| HTTP status code | ✅ | Status badge with color coding (2xx green, 3xx blue, 4xx/5xx red) |
| Response size | ✅ | Transfer size shown per entry |
| Duration | ✅ | Total time per request in ms |
| Category filtering | ✅ | XHR/Fetch, JS, CSS, Image, Other categories |
| Request / response headers | ✅ | Expandable details per entry |
| Category filters | ✅ | All / XHR / JS / CSS / Image / Other filter buttons |
| Source view | ✅ | Monaco editor with JSON syntax highlighting |
| Text diff | ✅ | Standard line diff |
| Metadata | ⚠️ | Side panel reports entry count, capture date, creator, and page count; preview cards show transfer size and total duration |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Export as CSV | ❌ | Not yet implemented |

## Real-World Examples

- [`sample.har`](../examples/sample.har) — example HAR capture from a browser session

## Known Limitations

- Response/request body previews are capped and shown only when HAR text is present; base64 payloads are not decoded
- Very large HARs (>10 MB) may be slow to parse all entries

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Response body preview | Med | Med | Decode and show response content for text/JSON types |
| Export to CSV | Med | Easy | One row per entry with all columns |
| Performance scoring | Low | Med | Highlight slow requests; flag large resources |
