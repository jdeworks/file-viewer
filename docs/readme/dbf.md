# dBase / DBF Database

> DBF viewer — version, record count, last-update date, and schema table with field names and types.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.dbf` |
| MIME type | `application/dbase` |
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
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Version, record count, field count, file size |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- Record data rows are not decoded — schema and statistics only (up to 100 fields shown)
- Memo files (`.dbt`, `.fpt`) linked by Memo fields are not read

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| First N rows preview | Med | Med | Decode record bytes per field type |
| Export schema as CSV | Low | Easy | Field names/types to CSV |
