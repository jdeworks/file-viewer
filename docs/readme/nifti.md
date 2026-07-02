# NIfTI Neuroimaging

> NIfTI-1 header viewer — image dimensions, voxel size, data type, intent code, units, and core header fields.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.nii`, `.hdr`, `.img` |
| MIME type | `application/octet-stream` |
| Binary / Text | Binary |
| Common use | Neuroimaging data from MRI, fMRI, DTI (FSL, SPM, FreeSurfer, ANTs) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| NIfTI version | ✅ | NIfTI-1 (magic `ni1`/`n+1`) rendered; NIfTI-2 may be detected but is not rendered |
| Image dimensions | ✅ | ndim + dim[1..7] |
| Voxel size | ✅ | pixdim values with units |
| Data type | ✅ | INT16 / FLOAT32 / COMPLEX64 etc. |
| Intent code | ✅ | TTEST / FTEST / ZSCORE / LABEL etc. |
| Slice timing | ⚠️ Partial | Header fields exist but are not shown in the current preview |
| Space / time units | ✅ | xyzt_units (mm/s/Hz etc.) |
| TR | ⚠️ Partial | Time unit is shown; repetition time from pixdim[4] is not surfaced separately |
| gzip detection | ❌ | `.nii.gz` is not decompressed by this viewer yet |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Dimensions, voxel size, dtype, intent |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- 3D/4D volume data is not rendered — header inspection only
- NIfTI-2 headers and gzip-compressed `.nii.gz` files are not rendered yet
- qform/sform affine matrices and slice timing details are not shown

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Axial/coronal/sagittal slice view | Low | Hard | Render orthographic brain slices to canvas |
| Export header as JSON | Low | Easy | All header fields to JSON |
| NIfTI-2 / `.nii.gz` support | Med | Med | Parse 540-byte NIfTI-2 headers and add gzip decompression |
