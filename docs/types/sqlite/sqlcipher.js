// Minimal SQLCipher v4 reader for the default compatibility profile. Decryption stays
// in-browser and yields an ordinary SQLite image for the existing sql.js renderer.
// Custom page sizes, KDF iterations, HMAC algorithms, and legacy compatibility modes
// intentionally fail closed rather than silently producing corrupt database pages.

const SQLITE_MAGIC = new TextEncoder().encode('SQLite format 3\0');
const PAGE_SIZE = 4096;
const RESERVE_SIZE = 80;
const SALT_SIZE = 16;
const IV_SIZE = 16;
const HMAC_SIZE = 64;
const KEY_SIZE_BITS = 256;
const KDF_ITERATIONS = 256000;
const HMAC_KDF_ITERATIONS = 2;
const HMAC_SALT_MASK = 0x3a;
const MAX_BYTES = 512 * 1024 * 1024;

export class SqlCipherPasswordError extends Error {
  constructor(message = 'Wrong password or unsupported SQLCipher v4 settings.') {
    super(message);
    this.name = 'SqlCipherPasswordError';
  }
}

function aborted(signal) {
  if (!signal?.aborted) return;
  throw signal.reason || new DOMException('The operation was aborted.', 'AbortError');
}

function startsWith(bytes, prefix) {
  if (!bytes || bytes.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) if (bytes[i] !== prefix[i]) return false;
  return true;
}

export function isPlainSqlite(bytes) {
  return startsWith(bytes, SQLITE_MAGIC);
}

export function isSqlCipherV4Candidate(bytes) {
  return !!bytes
    && !isPlainSqlite(bytes)
    && bytes.length >= PAGE_SIZE
    && bytes.length <= MAX_BYTES
    && bytes.length % PAGE_SIZE === 0;
}

async function deriveKey(passwordBytes, salt, iterations) {
  const material = await crypto.subtle.importKey('raw', passwordBytes, 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    hash: 'SHA-512',
    salt,
    iterations,
  }, material, KEY_SIZE_BITS);
  return new Uint8Array(bits);
}

async function decryptCbcWithoutPadding(ciphertext, iv, key) {
  // WebCrypto always applies PKCS#7 padding. Append one crafted encrypted block whose
  // plaintext is a full padding block; WebCrypto removes only that block and returns the
  // SQLCipher page payload unchanged.
  const last = ciphertext.subarray(ciphertext.length - IV_SIZE);
  const paddingInput = new Uint8Array(IV_SIZE);
  for (let i = 0; i < IV_SIZE; i++) paddingInput[i] = 0x10 ^ last[i];
  const encryptedPadding = new Uint8Array(await crypto.subtle.encrypt({
    name: 'AES-CBC',
    iv: new Uint8Array(IV_SIZE),
  }, key, paddingInput));
  const extended = new Uint8Array(ciphertext.length + IV_SIZE);
  extended.set(ciphertext);
  extended.set(encryptedPadding.subarray(0, IV_SIZE), ciphertext.length);
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, extended));
}

function pageHmacInput(ciphertext, iv, pageNumber) {
  const input = new Uint8Array(ciphertext.length + IV_SIZE + 4);
  input.set(ciphertext);
  input.set(iv, ciphertext.length);
  new DataView(input.buffer).setUint32(ciphertext.length + IV_SIZE, pageNumber, true);
  return input;
}

function validateHeader(bytes) {
  if (!isPlainSqlite(bytes)) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const rawPageSize = view.getUint16(16, false);
  const pageSize = rawPageSize === 1 ? 65536 : rawPageSize;
  return pageSize === PAGE_SIZE && bytes[20] === RESERVE_SIZE;
}

export async function decryptSqlCipherV4(bytes, password, { signal = null } = {}) {
  if (!isSqlCipherV4Candidate(bytes)) throw new Error('Not a supported SQLCipher v4 database image.');
  if (!password) throw new SqlCipherPasswordError();
  aborted(signal);

  const passwordBytes = new TextEncoder().encode(password);
  const salt = bytes.slice(0, SALT_SIZE);
  const encryptionKeyBytes = await deriveKey(passwordBytes, salt, KDF_ITERATIONS);
  aborted(signal);

  const hmacSalt = salt.slice();
  for (let i = 0; i < hmacSalt.length; i++) hmacSalt[i] ^= HMAC_SALT_MASK;
  const hmacKeyBytes = await deriveKey(encryptionKeyBytes, hmacSalt, HMAC_KDF_ITERATIONS);
  const aesKey = await crypto.subtle.importKey('raw', encryptionKeyBytes, 'AES-CBC', false, ['encrypt', 'decrypt']);
  const hmacKey = await crypto.subtle.importKey('raw', hmacKeyBytes, { name: 'HMAC', hash: 'SHA-512' }, false, ['verify']);

  const output = new Uint8Array(bytes.length);
  output.set(SQLITE_MAGIC);
  const pages = bytes.length / PAGE_SIZE;

  for (let pageIndex = 0; pageIndex < pages; pageIndex++) {
    aborted(signal);
    const pageStart = pageIndex * PAGE_SIZE;
    const payloadOffset = pageIndex === 0 ? SALT_SIZE : 0;
    const payloadLength = PAGE_SIZE - RESERVE_SIZE - payloadOffset;
    const cipherStart = pageStart + payloadOffset;
    const cipherEnd = cipherStart + payloadLength;
    const iv = bytes.subarray(cipherEnd, cipherEnd + IV_SIZE);
    const expectedHmac = bytes.subarray(cipherEnd + IV_SIZE, cipherEnd + IV_SIZE + HMAC_SIZE);
    const ciphertext = bytes.subarray(cipherStart, cipherEnd);
    const authentic = await crypto.subtle.verify(
      'HMAC',
      hmacKey,
      expectedHmac,
      pageHmacInput(ciphertext, iv, pageIndex + 1),
    );
    if (!authentic) throw new SqlCipherPasswordError();

    let plaintext;
    try { plaintext = await decryptCbcWithoutPadding(ciphertext, iv, aesKey); }
    catch { throw new SqlCipherPasswordError(); }
    output.set(plaintext, pageStart + payloadOffset);
    if (pageIndex % 16 === 15) await new Promise((resolve) => setTimeout(resolve, 0));
  }

  if (!validateHeader(output)) throw new SqlCipherPasswordError();
  return output;
}
