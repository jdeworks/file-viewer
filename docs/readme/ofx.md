# OFX / QFX Financial

> OFX and QFX bank/investment data viewer — account info (masked), ledger balance, transaction list with type and memo.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.ofx`, `.qfx`, `.ofc` |
| MIME type | `application/x-ofx` |
| Binary / Text | Text (SGML or XML) |
| Common use | Bank/brokerage data exports for Quicken, Mint, financial aggregators |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Financial institution | ✅ | `ORG` / `FID` shown |
| Account number | ✅ | Masked — last 4 digits only (`****1234`) |
| Routing number | ✅ | `BANKID` shown in full |
| Account type | ✅ | Bank / CCard / Investment etc. |
| Statement period | ✅ | `DTSTART` → `DTEND` |
| Ledger balance | ✅ | `BALAMT` with `DTASOF` date |
| Transaction list | ✅ | Date / type / amount / memo (up to 200, newest first) |
| Amount colour coding | ✅ | Positive amounts green, negative red |
| Running balance chart | ✅ | Chart.js loads lazily when at least two transactions exist |
| SGML and XML mode | ✅ | Both OFX 1.x (SGML) and 2.x (XML) parsed |
| Source view | ✅ | Monaco editor (XML syntax) |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | Institution, account (masked), balance, transaction count |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Export as CSV | ✅ | Preview button exports Date/Type/Amount/Memo; export menu includes Name and Transaction ID |

## Known Limitations

- `.ofc` is detected as a related financial export format, but OFX/QFX coverage is better exercised
- Investment transactions (`INVSTMTTRNRS`) are parsed for accounts and statement transactions, but positions are not shown
- More than 200 transactions are truncated in preview

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Spending category chart | Low | Med | Pie chart of transaction types or categories |
| Investment positions table | Low | Med | Parse `INVPOSLIST` position records |
