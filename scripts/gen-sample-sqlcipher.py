#!/usr/bin/env python3
"""Generate the deterministic SQLCipher-v4-default fixture used by the viewer tests."""

from __future__ import annotations

import hashlib
import hmac
import sqlite3
import struct
import tempfile
from pathlib import Path

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs/examples/sample-sqlcipher.sqlite"
PASSWORD = b"viewer"
PAGE_SIZE = 4096
RESERVE_SIZE = 80
SALT = bytes.fromhex("b535a1f410cf11ea938400155d6f0f01")


def make_plain_database(path: Path) -> bytearray:
    db = sqlite3.connect(path)
    db.execute("PRAGMA page_size=4096")
    db.execute("PRAGMA journal_mode=OFF")
    db.execute("CREATE TABLE notes(id INTEGER PRIMARY KEY, title TEXT, body TEXT)")
    db.executemany(
        "INSERT INTO notes(title, body) VALUES (?, ?)",
        [("Welcome", "SQLCipher fixture"), ("Offline", "Decrypted locally")],
    )
    db.commit()
    db.execute("VACUUM")
    db.close()
    return bytearray(path.read_bytes())


def reserve_page_trailers(data: bytearray) -> None:
    """Move compact B-tree cells away from each page's 80-byte codec trailer."""
    assert len(data) % PAGE_SIZE == 0
    for page_index in range(len(data) // PAGE_SIZE):
        page = page_index * PAGE_SIZE
        header = page + (100 if page_index == 0 else 0)
        page_type = data[header]
        if page_type not in (0x02, 0x05, 0x0A, 0x0D):
            raise RuntimeError(f"unsupported fixture page type 0x{page_type:02x}")
        header_size = 12 if page_type in (0x02, 0x05) else 8
        first_freeblock, cells, content_start = struct.unpack_from(">xHHH", data, header)
        if first_freeblock:
            raise RuntimeError("fixture database must be vacuumed without freeblocks")
        if content_start < header - page + header_size + cells * 2 + RESERVE_SIZE:
            raise RuntimeError("fixture page lacks room for SQLCipher reserve bytes")
        data[page + content_start - RESERVE_SIZE : page + PAGE_SIZE - RESERVE_SIZE] = data[
            page + content_start : page + PAGE_SIZE
        ]
        data[page + PAGE_SIZE - RESERVE_SIZE : page + PAGE_SIZE] = bytes(RESERVE_SIZE)
        struct.pack_into(">H", data, header + 5, content_start - RESERVE_SIZE)
        for cell in range(cells):
            pointer_at = header + header_size + cell * 2
            pointer = struct.unpack_from(">H", data, pointer_at)[0]
            struct.pack_into(">H", data, pointer_at, pointer - RESERVE_SIZE)
    data[20] = RESERVE_SIZE


def encrypt(data: bytearray) -> bytes:
    key = hashlib.pbkdf2_hmac("sha512", PASSWORD, SALT, 256_000, 32)
    hmac_salt = bytes(byte ^ 0x3A for byte in SALT)
    hmac_key = hashlib.pbkdf2_hmac("sha512", key, hmac_salt, 2, 32)
    output = bytearray(len(data))
    output[:16] = SALT
    for page_index in range(len(data) // PAGE_SIZE):
        page = page_index * PAGE_SIZE
        offset = 16 if page_index == 0 else 0
        payload = bytes(data[page + offset : page + PAGE_SIZE - RESERVE_SIZE])
        iv = hashlib.sha256(b"file-viewer sqlcipher iv" + struct.pack("<I", page_index + 1)).digest()[:16]
        encryptor = Cipher(algorithms.AES(key), modes.CBC(iv)).encryptor()
        ciphertext = encryptor.update(payload) + encryptor.finalize()
        trailer = hmac.new(
            hmac_key,
            ciphertext + iv + struct.pack("<I", page_index + 1),
            hashlib.sha512,
        ).digest()
        output[page + offset : page + PAGE_SIZE - RESERVE_SIZE] = ciphertext
        output[page + PAGE_SIZE - RESERVE_SIZE : page + PAGE_SIZE] = iv + trailer
    return bytes(output)


def main() -> None:
    with tempfile.TemporaryDirectory() as directory:
        plain = make_plain_database(Path(directory) / "plain.sqlite")
        reserve_page_trailers(plain)
        check = Path(directory) / "reserved.sqlite"
        check.write_bytes(plain)
        db = sqlite3.connect(check)
        assert db.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        db.close()
        OUTPUT.write_bytes(encrypt(plain))
    print(f"wrote {OUTPUT.relative_to(ROOT)} ({OUTPUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
