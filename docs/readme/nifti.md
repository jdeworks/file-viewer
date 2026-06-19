# NIfTI Neuroimaging

> NIfTI-1/2 viewer — image dimensions, voxel size, data type, intent code, slice timing, and header fields.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.nii`, `.nii.gz` |
| MIME type | `application/octet-stream` |
| Binary / Text | Binary |
| Common use | Neuroimaging data from MRI, fMRI, DTI (FSL, SPM, FreeSurfer, ANTs) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| NIfTI version | ✅ | NIfTI-1 (magic `ni1`/`n+1`) or NIfTI-2 detected |
| Image dimensions | ✅ | ndim + dim[1..7] |
| Voxel size | ✅ | pixdim values with units |
| Data type | ✅ | INT16 / FLOAT32 / COMPLEX64 etc. |
| Intent code | ✅ | TTEST / FTEST / ZSCORE / LABEL etc. |
| Slice timing | ✅ | slice_start / slice_end / slice_duration |
| Space / time units | ✅ | xyzt_units (mm/s/Hz etc.) |
| TR | ✅ | Repetition time from pixdim[4] |
| gzip detection | ✅ | `.nii.gz` decompressed transparently |
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
- Affine matrix shown as raw numbers, not spatial interpretation

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Axial/coronal/sagittal slice view | Low | Hard | Render orthographic brain slices to canvas |
| Export header as JSON | Low | Easy | All header fields to JSON |
