// A Map that shards across N sub-maps to dodge V8's hard ~16.77M (2^24) entries-per-Map cap. The deep
// beam search for the hardest levels (e.g. Microban #154 needs ~330 push-layers) visits tens of millions
// of states; a single Map throws "maximum size exceeded" around 16.7M. Sharding by a cheap string hash
// gives effectively unbounded capacity (memory permitting) while preserving has/get/set/size semantics.
export class ShardedMap {
  constructor(shards = 16) {
    this.maps = Array.from({ length: shards }, () => new Map());
    this.mask = shards - 1;                                  // shards must be a power of two
  }
  _shard(key) {
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
    return this.maps[(h >>> 0) & this.mask];
  }
  has(key) { return this._shard(key).has(key); }
  get(key) { return this._shard(key).get(key); }
  set(key, val) { this._shard(key).set(key, val); return this; }
  get size() { let n = 0; for (const m of this.maps) n += m.size; return n; }
}
