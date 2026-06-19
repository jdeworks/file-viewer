# HDF5 Scientific Data

> HDF5 file viewer — group/dataset hierarchy, dataset shapes and types, and key attributes.

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
| Root group contents | ✅ | Datasets and sub-groups in root |
| Dataset shapes | ✅ | Dimensions per dataset |
| Dataset dtypes | ✅ | float32, int16, string, compound, etc. |
| Dataset sizes | ✅ | Total element count and byte estimate |
| Attributes | ✅ | Key-value attributes on root and datasets |
| Nested groups | ✅ | Recursive group listing (up to depth limit) |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Group/dataset counts, total datasets |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- Dataset values are not shown — structural metadata only
- HDF5 chunked / compressed datasets show declared shape, not chunk layout

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Dataset value preview | Low | Hard | Read first N elements via h5wasm |
| h5wasm integration | Low | Hard | Full HDF5 parsing via WASM library (~2 MB) |
