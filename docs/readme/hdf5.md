# HDF5 Scientific Data

> HDF5 file viewer — superblock/header inspector with file-size and layout metadata.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.h5`, `.hdf5`, `.he5`, `.hdf` |
| MIME type | `application/x-hdf5` |
| Binary / Text | Binary |
| Common use | Machine learning model weights (Keras/TensorFlow), climate data, genomics |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| HDF5 signature validation | ✅ | Verifies the 8-byte HDF5 magic signature |
| Superblock version | ✅ | Reports v0/v1/v2/v3 superblock layout |
| Offset / length sizes | ✅ | Extracted from supported superblock layouts |
| Consistency flags | ✅ | Basic SWMR/write-access flags decoded |
| File size | ✅ | Original byte length shown |
| Root group contents | ❌ | Full group/dataset traversal is not implemented |
| Dataset shapes | ❌ | Requires a full HDF5 parser |
| Dataset dtypes | ❌ | Requires a full HDF5 parser |
| Attributes | ❌ | Requires a full HDF5 parser |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Format, superblock version, file size, offset/length sizes |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- Dataset/group hierarchy, attributes, shapes, dtypes, and values are not parsed
- HDF5 chunking, compression filters, and external links are not inspected

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Group/dataset tree | High | Hard | Traverse HDF5 object headers and B-trees |
| Dataset value preview | Low | Hard | Read first N elements via h5wasm |
| h5wasm integration | Low | Hard | Full HDF5 parsing via WASM library (~2 MB) |
