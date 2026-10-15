import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('every declared tafsir pack has 114 readable verse shards', () => {
  const root = path.resolve('public/offline');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  assert(manifest.sources.length >= 25);
  for (const source of manifest.sources) {
    const directory = path.join(root, 'tafsir', String(source.id));
    const files = fs.readdirSync(directory).filter(name => name.endsWith('.json'));
    assert.equal(files.length, 114, `${source.title}: shard count`);
    for (let surah = 1; surah <= 114; surah += 1) {
      const file = path.join(directory, `${surah}.json`);
      const shard = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (shard.schemaVersion === 2) {
        assert.equal(Number(shard.surah), surah);
        for (const entries of Object.values(shard.verses || {})) {
          for (const entry of entries) {
            for (const [hash] of entry.refs || []) assert(shard.chunks[hash], `${source.id}/${surah}: missing ${hash}`);
          }
        }
      } else {
        assert.equal(typeof shard, 'object');
      }
    }
  }
});

test('all offline hadith and similarity shards are readable', () => {
  for (const kind of ['hadith', 'similarity']) {
    const directory = path.resolve('public/offline', kind);
    for (let surah = 1; surah <= 114; surah += 1) {
      const shard = JSON.parse(fs.readFileSync(path.join(directory, `${surah}.json`), 'utf8'));
      assert.equal(typeof shard, 'object', `${kind}/${surah}`);
    }
  }
});
