# QIF Financial (Quicken Interchange Format)

> QIF bank/investment export viewer — account type, transaction list with date/payee/amount/category, income and expense totals.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.qif`, `.qfx` |
| MIME type | `text/plain`, `application/x-qif` |
| Binary / Text | Text |
| Common use | Quicken, Microsoft Money, and GnuCash account exports |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Account type | ✅ | Bank / Cash / CCard / Invst / OthA / OthL decoded |
| Transaction list | ✅ | Date, payee, amount, category |
| Transaction count | ✅ | Total QIF transactions |
| Date range | ✅ | First and last transaction dates |
| Income total | ✅ | Sum of positive amounts |
| Expense total | ✅ | Sum of negative amounts |
| Cleared status | ⚠️ Partial | `C` field is parsed into each transaction but not shown in the preview table or account summary |
| Memo / note | ⚠️ Partial | Parsed and included in CSV export, not shown in the preview table |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Diff | ❌ | Disabled |
| Metadata | ⚠️ Partial | Format and account type only in the side panel; preview shows transaction totals |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Export as CSV | ✅ | Preview table includes an `Export CSV` action when transactions are present; the global export menu also offers a CSV export (`exports.js`, wired via `loadExports`) |

## Real-World Examples

- [`sample.qif`](../examples/sample.qif) — Quicken-style financial export with transaction rows and totals

## Known Limitations

- Split transactions (multiple `S` lines) not rendered
- Investment transactions (buy/sell) not specifically parsed
- The preview's inline CSV export (date/payee/amount/category/memo) and the global export menu's CSV export (date/amount/payee/memo/number) use slightly different column sets — neither includes both category and number

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Category spending chart | Low | Med | Pie chart of spending by category |
| Split transaction support | Low | Med | Render `E`/`S`/`$` split lines |
