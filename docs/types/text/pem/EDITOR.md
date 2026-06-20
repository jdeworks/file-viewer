# Editor Roadmap — PEM / DER (Certificates, Keys, CSRs)

## Current state
Mature viewer with a custom ASN.1 parser (`asn1.js`, 12 KB). Handles PEM (multi-block, any order) and raw DER input. For certificates: subject/issuer RDN, validity dates, expired/expiring-soon/valid badges, CA badge, SANs list, key type and size, signature algorithm, serial, version, EKUs, self-signed detection. For CSRs: subject and key info. For private/public keys: type label and DER size, raw material deliberately not displayed for security. Raw PEM blocks shown for PKCS#7 and unknown types. Supports dark mode.

## Viewer enhancements (no write-back needed)
- Certificate chain validation — given a PEM file with multiple certs (leaf → intermediates → root), walk the chain: verify each cert's issuer matches the next cert's subject, check that each signing cert has `isCA=true`, and show a chain diagram with validity status per link — L — `@peculiar/x509` (pre-bundle, ~250 KB) or `node-forge` (pre-bundle, ~500 KB); `@peculiar/x509` is preferred (smaller, modern crypto API)
- Chain trust anchor check — compare the root cert against the browser's built-in trust store via `SubtleCrypto.verify()`; mark as "trusted by this browser" or "untrusted / self-signed root" — M — `SubtleCrypto` (native)
- Fingerprint display — compute SHA-1 and SHA-256 fingerprints of the DER bytes using `SubtleCrypto.digest()` and show them in the cert card (they are commonly used to verify pinning) — S — `SubtleCrypto` (native)
- Public key extraction — for RSA and EC certs, export the public key via `SubtleCrypto.importKey()` + `exportKey('spki')` and offer it as a downloadable PEM — M — `SubtleCrypto` (native)
- CRL / OCSP endpoint display — extract `id-pe-cRLDistributionPoints` and `id-pe-authorityInfoAccess` extensions from ASN.1 and display the CRL and OCSP URLs (no network calls) — M — extend `asn1.js`
- Name constraints display — parse `id-ce-nameConstraints` extension and show permitted/excluded subtrees — M — extend `asn1.js`
- CT log SCT display — parse `SignedCertificateTimestampList` extension and show each SCT's log ID and timestamp — L — extend `asn1.js`
- DER hex dump — collapsible hex dump view of the raw DER bytes with ASN.1 TLV boundaries highlighted; useful for debugging — M — pure JS

## In-browser editing (download-on-save)
Editing note: modifying certificate fields invalidates the signature — re-signing requires the private key, which the viewer does not and should not handle. Safe editing is limited to key generation and CSR creation.

- Generate self-signed certificate — form (CN, O, C, SANs, validity days, key type RSA-2048/RSA-4096/EC-P256/EC-P384); use `SubtleCrypto.generateKey()` + `sign()`; download cert as PEM and private key as PEM — L — `SubtleCrypto` (native); `@peculiar/x509` simplifies the X.509 builder
- Generate CSR — form (same fields minus validity); `SubtleCrypto.generateKey()` + `sign()`; download CSR as PEM — L — `SubtleCrypto` + `@peculiar/x509` or manual ASN.1 builder
- Convert DER ↔ PEM — upload raw DER, download as PEM with correct `-----BEGIN CERTIFICATE-----` header; or strip PEM headers and download raw DER — S — native `atob`/`btoa`
- Reorder PEM blocks — drag-and-drop reordering of multiple PEM blocks in the file (e.g. to put leaf first for nginx); download reordered PEM — M — no lib beyond Sortable.js or native drag-and-drop

## Full write-back editing (companion required)
- Save generated cert/key/CSR to a project directory via companion `/write-back`
- Integrate with ACME / Let's Encrypt — companion runs `certbot` or `acme.sh` and surfaces the resulting PEM; viewer shows updated chain

## Shared toolbar / modular note
`@peculiar/x509` is the recommended lib for chain validation and cert generation — it wraps `SubtleCrypto` with a clean X.509 API and is ~250 KB pre-bundled to `docs/vendor/x509.min.js`. `node-forge` is an alternative but ~2× larger. Do NOT add any online OCSP/CRL checking — zero off-origin at runtime. Private key material must never be logged, displayed beyond the type label, or sent anywhere.
