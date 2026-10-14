import {test} from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

test('selected tafsir packs are complete, attributed, hashed and fully offline', () => {
  const root = path.resolve('public/data/tafsir');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'index.json'), 'utf8'));
  assert.equal(manifest.schema, 1);
  assert.equal(manifest.offline, true);
  assert.deepEqual(manifest.sources.map(source => source.id), [
    'al-mizan-fa',
    'nemuneh-selected-fa',
    'majma-al-bayan-fa',
    'nur-al-thaqalayn-ar',
  ]);

  for (const source of manifest.sources) {
    assert(source.title && source.author && source.publisher);
    assert.equal(source.storage, 'bundled-gzip-shards');
    assert.equal(source.offline, true);
    assert.equal(Object.keys(source.shards).length, 114);
    let coverage = 0;
    for (let surah = 1; surah <= 114; surah += 1) {
      const number = String(surah).padStart(3, '0');
      const file = path.join(root, source.id, `${number}.json.gz`);
      const compressed = fs.readFileSync(file);
      assert.equal(crypto.createHash('sha256').update(compressed).digest('hex'), source.shards[number]);
      const shard = JSON.parse(zlib.gunzipSync(compressed));
      assert.equal(shard.source, source.id);
      assert.equal(shard.surah, surah);
      for (const entry of shard.entries) {
        assert(Number.isInteger(entry.ayah_id) && entry.ayah_id >= 1 && entry.ayah_id <= 6236);
        assert.equal(entry.surah, surah);
        assert(entry.text.trim().length > 0);
      }
      coverage += shard.entries.length;
    }
    assert.equal(coverage, source.coverage);
  }
});
