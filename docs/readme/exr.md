# OpenEXR Image

> OpenEXR viewer — version flags, compression method, display/data window, pixel aspect, and full attribute table.

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
| Full attribute table | ✅ | All header attributes with name, type, and value |
| Channel list | ✅ | R, G, B, A and custom channels shown |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Dimensions, compression, channel list |

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
- Deep EXR (per-sample data) attributes are not specially parsed

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Tonemapped preview | Low | Hard | Requires pixel decode + tone mapping; large library |
| Export metadata as JSON | Low | Easy | Dump attribute table to JSON |
