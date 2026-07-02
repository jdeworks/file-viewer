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
| First features table | ❌ | Parsed internally for future use, but no per-feature table is rendered yet |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Diff | ❌ | Disabled — large annotation files |
| Metadata | ⚠️ | Metadata side panel currently reports format and sampled feature-type count |

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
- Feature histogram counts all parsed rows, but the side-panel metadata samples the text preview
- Per-feature table is not rendered yet

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Attribute parsing | Med | Med | Parse key=value pairs from column 9 |
| First features table | Med | Easy | Render seqname/source/type/start/end/strand for the first rows |
| Gene model diagram | Low | Hard | SVG track view of exon/intron structure |
| Export feature stats as CSV | Low | Easy | Type/count table to CSV |
