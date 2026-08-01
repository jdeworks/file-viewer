import Bunzip from 'seek-bzip';

// seek-bzip only needs allocation, byte copying, and hexadecimal conversion from Node's Buffer.
// Keeping this compatibility shim local avoids shipping a full Buffer polyfill to the browser.
class BrowserBuffer extends Uint8Array {
  copy(target, targetStart = 0, sourceStart = 0, sourceEnd = this.length) {
    target.set(this.subarray(sourceStart, sourceEnd), targetStart);
  }

  toString(encoding = 'utf8') {
    if (encoding === 'hex') {
      return Array.from(this, (byte) => byte.toString(16).padStart(2, '0')).join('');
    }
    return new TextDecoder().decode(this);
  }
}

globalThis.Buffer ||= BrowserBuffer;

export default Bunzip;
