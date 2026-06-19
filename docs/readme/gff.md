# GFF / GTF Genomic Feature Format

> GFF/GTF viewer — feature type histogram, sequence/chromosome list, and per-feature table.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.gff`, `.gff3`, `.gtf` |
| MIME type | `text/plain` |
| Binary / Text | Text (tab-separated) |
| Common use | Gene annotation, genome browser tracks, RNA-seq analysis |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Format version | ✅ | `##gff-version` directive shown |
| Feature count | ✅ | Total features (rows) counted |
| Feature type table | ✅ | Count and % per type (gene, mRNA, exon, CDS…) |
| Sequence list | ✅ | Unique chromosome / scaffold names |
| Sequence region count | ✅ | `##sequence-region` directives counted |
| Colour coding | ✅ | Known feature types (gene, exon, CDS) colour-coded |
| First features table | ✅ | seqname/feature/start/end/strand (first 8 rows) |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Diff | ❌ | Disabled — large annotation files |
| Metadata | ✅ | Version, feature count, unique sequences |

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

- Attributes column (column 9) is not parsed — feature names not shown
- Only first 1000 features are processed for the histogram

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Attribute parsing | Med | Med | Parse key=value pairs from column 9 |
| Gene model diagram | Low | Hard | SVG track view of exon/intron structure |
| Export feature stats as CSV | Low | Easy | Type/count table to CSV |
