# Certificate / Key (PEM/DER)

> X.509 certificate inspector showing subject, issuer, validity, SANs, and key info — private key material is never displayed.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.pem`, `.crt`, `.cer`, `.key`, `.p12`, `.pfx`, `.der` |
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
| CSR inspection | ✅ | Certificate Signing Request fields shown |
| Public key info | ✅ | Key type and size displayed |
| Private key — security block | ✅ | Private key content is NEVER shown; a warning badge is displayed instead |
| Multi-PEM bundles | ✅ | Each PEM block in the file shown as a separate card |
| Algorithm display | ✅ | Signature algorithm shown on each certificate |
| Source view | ✅ | Monaco editor (but no syntax highlighting — raw base64) |
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

- **Private key content is never displayed.** If a file contains a `-----BEGIN ... PRIVATE KEY-----` block, the viewer shows a warning badge and the key type/size only — the key bytes are never rendered.
- The viewer parses ASN.1 entirely in-browser using a hand-rolled decoder (`asn1.js`). No key material is sent to any server.

## Real-World Examples

- [`sample.crt`](../examples/sample.crt) — example TLS certificate in PEM format

## Known Limitations

- PKCS#12 (`.p12`/`.pfx`) binary format is not fully decoded — shown as raw block
- ECDSA curve parameters may not be decoded for all OIDs
- Very long certificate chains may truncate in the card view

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| PKCS#12 bundle decoding | Med | Hard | Requires password-protected container parsing |
| Certificate chain validation display | Med | Hard | Show chain trust path |
| DER → PEM conversion export | Low | Easy | Base64-encode and add PEM headers |
| Fingerprint display (SHA-256) | Low | Easy | Hash the DER bytes and show hex fingerprint |
