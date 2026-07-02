# dBase / DBF Database

> DBF viewer — version, record count, last-update date, schema table, and a first-records preview.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.dbf` |
| MIME type | `application/dbf`, `application/dbase` |
| Binary / Text | Binary |
| Common use | Legacy database exports, GIS shapefiles, FoxPro/Clipper applications |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Version | ✅ | dBASE III+, IV, V, Visual FoxPro, etc. |
| Record count | ✅ | From header (LE int32) |
| Last update | ✅ | Year/month/day decoded |
| Field schema | ✅ | Name, type, length, decimals for each field |
| Field types | ✅ | Character, Numeric, Float, Date, Logical, Memo, Currency, DateTime, etc. |
| Header / record sizes | ✅ | Header bytes and record size shown |
| First records preview | ✅ | First 20 non-deleted records decoded from fixed-width fields |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Version, record count, field count, last update |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- Only the first 20 records are previewed, and only the first 100 fields are read
- Text decoding is ASCII-oriented and not codepage-aware
- Memo files (`.dbt`, `.fpt`) linked by Memo fields are not read

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Codepage-aware decoding | Med | Med | Honor DBF language driver / external codepage context |
| Memo field support | Med | Med | Load paired `.dbt` / `.fpt` files when available |
| Export schema as CSV | Low | Easy | Field names/types to CSV |
