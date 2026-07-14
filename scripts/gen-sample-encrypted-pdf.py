#!/usr/bin/env python3
"""Generate the catalog's deterministic, locally unlockable PDF fixture.

Requires pypdf (`python3 -m pip install pypdf`) and never contacts the network. The committed
output means normal development/test runs do not need that generator dependency.
"""

from pathlib import Path

from pypdf import PdfReader, PdfWriter
from pypdf.generic import ArrayObject, ByteStringObject


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "examples" / "sample.pdf"
DESTINATION = ROOT / "docs" / "examples" / "sample-password.pdf"
PASSWORD = "viewer"


reader = PdfReader(SOURCE)
writer = PdfWriter()
for page in reader.pages:
    writer.add_page(page)
writer.add_metadata({
    "/Title": "File Viewer password unlock sample",
    "/Author": "File Viewer contributors",
    "/Subject": "Local PDF password prompt regression fixture",
    "/CreationDate": "D:20000101000000Z",
    "/ModDate": "D:20000101000000Z",
})

# pypdf normally creates a unique file identifier. Pin its first identifier so the RC4-128 key
# and checked-in bytes remain stable across regeneration; the document content fixes the second.
identifier = ByteStringObject(b"file-viewer-pdf1")
writer._ID = ArrayObject((identifier, identifier))  # pypdf's documented output object model
writer.encrypt(PASSWORD, owner_password="file-viewer-owner", algorithm="RC4-128")

with DESTINATION.open("wb") as output:
    writer.write(output)

print(f"Wrote {DESTINATION} ({DESTINATION.stat().st_size} bytes; password: {PASSWORD})")
