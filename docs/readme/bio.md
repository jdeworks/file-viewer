# Bioinformatics (FASTA / FASTQ / VCF / GFF / BED)

> Multi-format bioinformatics viewer — sequence records, GC content, quality scores, variant tables, and feature type histograms.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.fasta`, `.fa`, `.fna`, `.fq`, `.fastq`, `.vcf`, `.bcf`, `.gff`, `.gff3`, `.gtf`, `.bed` |
| MIME type | `text/plain` |
| Binary / Text | Text |
| Common use | Genomics, bioinformatics pipelines, sequence databases |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| FASTA sequences | ✅ | Header + truncated sequence per record (up to 2000) |
| GC content | ✅ | Calculated from nucleotide composition |
| Nucleotide bar chart | ✅ | A/T/G/C/N counts as SVG bar chart |
| FASTQ reads | ✅ | Per-read sequence + quality stats |
| Avg quality score | ✅ | Mean Phred Q score (Q = char - 33) |
| Quality distribution | ✅ | Quality bucket bar chart |
| VCF variants | ✅ | CHROM/POS/REF/ALT/FILTER table |
| VCF contigs | ✅ | Unique chromosome/contig list |
| Variant type breakdown | ✅ | SNP / INDEL / OTHER bar chart |
| GFF/GTF features | ✅ | Feature type table with counts |
| BED intervals | ✅ | Chrom/start/end/name table |
| Format auto-detect | ✅ | Sniffs FASTA/FASTQ/VCF/GFF/BED from content |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Diff | ❌ | Disabled — too noisy for large sequence files |
| Metadata | ✅ | FASTA/FASTQ/VCF metadata; GFF/BED preview works but metadata is lighter |

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

- Truncated to first 2000 records/variants for performance
- No alignment viewer (BAM/SAM not supported)
- VCF genotype columns not parsed
- GFF/GTF and BED previews do not yet add format-specific metadata drawer fields
- Well-formed `.gff`/`.gff3`/`.gtf` files (with a `##gff-version` directive) are detected with
  higher confidence by the dedicated [GFF/GTF Genomic](/) viewer, which has richer feature-type
  colouring; this module's own GFF rendering is a fallback for atypical/low-confidence content
  only and rarely wins detection in practice

## Real-World Examples

- [`sample.fasta`](../examples/sample.fasta) — sample FASTA sequence file
- [`sample.vcf`](../examples/sample.vcf) — compact VCF sample
- [`sample-variants.vcf`](../examples/sample-variants.vcf) — variant table sample
- [`sample.gff3`](../examples/sample.gff3) — GFF3 genome annotation sample

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Export variants as TSV | Med | Easy | Download filtered variant table |
| Sequence logo | Low | Med | Render position weight matrix |
| BAM/CRAM support | Low | Hard | Requires htslib WASM port |
