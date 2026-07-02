# NumPy Array (.npy / .npz)

> NumPy array viewer — dtype, shape, array order (C/Fortran), total element count, and .npz member list.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.npy`, `.npz` |
| MIME type | `application/octet-stream` |
| Binary / Text | Binary |
| Common use | NumPy numerical array persistence, machine learning model weights |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Format version | ✅ | NumPy format v1.0 / v2.0 |
| dtype | ✅ | Data type string (e.g. `float32`, `int64`, `<u4`) |
| Shape | ✅ | Array dimensions |
| C / Fortran order | ✅ | Row-major vs. column-major layout |
| Total elements | ✅ | Product of all dimensions |
| Memory size | ✅ | Estimated uncompressed bytes |
| .npz member list | ✅ | Array names inside ZIP archive |
| First few values | ✅ | Plain `.npy` previews up to 100 values; uncompressed `.npz` members show a short inline preview |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | dtype, shape, order, element count |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- Plain `.npy` data preview is capped at 100 values
- `.npz` members are listed, but compressed members are not decompressed for dtype/shape/value preview
- Structured/object dtypes (record arrays) are not fully decoded

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Array heatmap | Low | Med | Render 2D arrays as colour-mapped canvas |
| Statistical summary | Low | Easy | min/max/mean/std from first N elements |
| Compressed `.npz` member preview | Med | Med | Inflate member data before parsing embedded `.npy` headers |
