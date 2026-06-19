# QIF Financial (Quicken Interchange Format)

> QIF bank/investment export viewer — account type, transaction list with date/payee/amount/category, income and expense totals.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.qif` |
| MIME type | `text/plain` |
| Binary / Text | Text |
| Common use | Quicken, Microsoft Money, and GnuCash account exports |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Account type | ✅ | Bank / Cash / CCard / Invst / OthA / OthL decoded |
| Transaction list | ✅ | Date, payee, amount, category (first 20) |
| Transaction count | ✅ | Total QIF transactions |
| Date range | ✅ | First and last transaction dates |
| Income total | ✅ | Sum of positive amounts |
| Expense total | ✅ | Sum of negative amounts |
| Cleared status | ✅ | `C` field parsed (X = cleared) |
| Memo / note | ✅ | `M` field included |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Diff | ❌ | Disabled |
| Metadata | ✅ | Account type, transaction count, date range |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Export as CSV | ❌ | Not yet implemented |

## Known Limitations

- Split transactions (multiple `S` lines) not rendered
- Investment transactions (buy/sell) not specifically parsed
- Only first 20 transactions shown in preview table

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Export transactions as CSV | Med | Easy | Download date/payee/amount/category |
| Category spending chart | Low | Med | Pie chart of spending by category |
| Split transaction support | Low | Med | Render `E`/`S`/`$` split lines |
