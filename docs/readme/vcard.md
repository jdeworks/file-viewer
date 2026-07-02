# Contacts (vCard)

> Contact card viewer with emails, phones, addresses, URLs, birthday, note, QR import codes, and CSV/JSON export.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.vcf`, `.vcard` |
| MIME type | `text/vcard` |
| Binary / Text | Text |
| Common use | Contact exports from phone/email apps, address book sharing |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Contact cards | ✅ | One card per `BEGIN:VCARD` block |
| Email addresses | ✅ | Shown with type label (HOME/WORK/etc.), mailto: linked |
| Phone numbers | ✅ | Shown with type label, tel: linked |
| Physical addresses | ✅ | Shown with type label |
| URLs | ✅ | Clickable links (http/https) |
| Organization / title | ✅ | Shown under the name |
| Birthday | ✅ | Shown with birthday icon |
| Note | ✅ | Full note field shown |
| Multi-contact file | ✅ | Multiple vCards in one file all shown |
| QR code | ✅ | Per-card QR button lazily loads vendored qrcodejs and encodes a minimal vCard 3.0 block |
| Quoted-printable decode | ✅ | Basic vCard 2.1 quoted-printable values are decoded |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | Contacts, emails, phones, addresses, URLs, organizations, photo count |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Download as CSV | ✅ | One row per contact; Name/Org/Title/Email/Phone/URL/Address/Birthday/Note |
| Download as JSON | ✅ | Array of contact objects |

## Real-World Examples

- [`sample.vcf`](../examples/sample.vcf) — example vCard file with multiple contacts

## Known Limitations

- vCard 2.1 quoted-printable support is basic; charset-specific edge cases may not decode correctly
- `PHOTO` fields (base64 contact photos) are not rendered
- QR export uses a normalized minimal vCard, not the original source bytes

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Contact photo display | Med | Easy | Decode base64 PHOTO field and show avatar |
| vCard 2.1 charset coverage | Low | Med | Improve quoted-printable decoding for charset-specific older vCard files |
| Export as vCard 3.0 | Low | Med | Serialize edited/normalized cards back to vCard |
| Merge / deduplicate contacts | Low | Hard | Detect and merge duplicate vCard entries |
