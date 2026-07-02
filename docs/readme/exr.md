# OpenEXR Image

> OpenEXR viewer — header inspection for version flags, compression, display/data windows, pixel aspect, and selected attributes.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.exr` |
| MIME type | `image/x-exr` |
| Binary / Text | Binary |
| Common use | VFX and film production, HDR photography, compositing pipelines |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Format version | ✅ | EXR v1/v2, multipart/tiled flags |
| Compression | ✅ | none, RLE, ZIPS, ZIP, PIZ, PXR24, B44, B44A, DWAA, DWAB |
| Display window | ✅ | box2i decoded (xMin,yMin → xMax,yMax) |
| Data window | ✅ | Actual pixel data bounds |
| Pixel aspect ratio | ✅ | v2f from `pixelAspectRatio` attribute |
| Line order | ✅ | INCREASING_Y / DECREASING_Y / RANDOM_Y |
| Environment map | ✅ | LATLONG / CUBE |
| Attribute table | ⚠️ | Up to 50 attributes are parsed and up to 20 non-summary attributes are displayed |
| Channel list | ⚠️ | `channels` is shown as an attribute-size summary; individual channel names are not decoded |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Format, file version, layout, multipart flag, file size |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- Pixel data is not decoded — header attributes only (requires imath/openexr-js)
- Individual channel list entries are not decoded from the `chlist` attribute yet
- Deep EXR (per-sample data) attributes are not specially parsed

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Decode `chlist` channels | Med | Med | Parse channel names, pixel types, sampling, and pLinear flag |
| Tonemapped preview | Low | Hard | Requires pixel decode + tone mapping; large library |
| Export metadata as JSON | Low | Easy | Dump attribute table to JSON |
