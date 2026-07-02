# Certificate / Key (PEM/DER)

> X.509 certificate inspector showing subject, issuer, validity, SANs, and key info — private key blocks are summarized but not rendered in the preview.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.pem`, `.crt`, `.cer`, `.key`, `.der`, `.p7b`, `.p7c` |
| MIME type | `application/x-pem-file`, `application/x-x509-ca-cert` |
| Binary / Text | Text (PEM) or binary (DER) |
| Common use | TLS certificates, CA bundles, code-signing certs, SSH/GPG keys |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Certificate inspection | ✅ | Subject, issuer, SAN list, validity period, serial number |
| Validity badge | ✅ | VALID / EXPIRING SOON / EXPIRED colored badge |
| CA flag | ✅ | Basic constraints CA:TRUE shown |
| CSR inspection | ⚠️ Partial | CSR PEM blocks are identified; full CSR field decoding may fall back to parse errors |
| Public key info | ✅ | Certificate public-key type and size/curve where decoded |
| Private key — security block | ✅ | Raw key material is not displayed; key block type and DER byte size are shown |
| Multi-PEM bundles | ✅ | Each PEM block in the file shown as a separate card |
| Algorithm display | ✅ | Signature algorithm shown on each certificate |
| PKCS#7/CMS blocks | ⚠️ Partial | Blocks are identified and sized, not fully decoded |
| Source view | ✅ | Monaco editor for PEM text (no dedicated syntax language) |
| Diff | ❌ | `diff: false` — base64 diffs are not meaningful |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Text editor available for PEM source |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Convert DER → PEM | ❌ | Not yet implemented |

## Security Notes

- **Private key content is never displayed in the preview.** If a file contains a `-----BEGIN ... PRIVATE KEY-----` block, the preview shows the block type and DER byte size only.
- The viewer parses ASN.1 entirely in-browser using a hand-rolled decoder (`asn1.js`). No key material is sent to any server.

## Real-World Examples

PEM examples are pending; private-key and certificate behavior is covered by parser tests and synthetic fixtures.

## Known Limitations

- PKCS#12 (`.p12`/`.pfx`) is not claimed by this viewer
- PKCS#7/CMS and CSR blocks are identified but not fully decoded like X.509 certificates
- ECDSA curve parameters may not be decoded for all OIDs
- Very long certificate chains may truncate in the card view

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| PKCS#12 bundle decoding | Med | Hard | Requires password-protected container parsing |
| Certificate chain validation display | Med | Hard | Show chain trust path |
| DER → PEM conversion export | Low | Easy | Base64-encode and add PEM headers |
| Fingerprint display (SHA-256) | Low | Easy | Hash the DER bytes and show hex fingerprint |
