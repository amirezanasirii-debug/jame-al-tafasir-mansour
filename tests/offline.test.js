import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(root, 'public');

test('base Quran data is complete and has explicit source metadata', () => {
  const content = JSON.parse(fs.readFileSync(path.join(publicRoot, 'content.json'), 'utf8'));
  assert.equal(content.surahs.length, 114);
  assert.equal(content.ayahs.length, 6236);
  assert.equal(content.books.find(book => book.kind === 'translation')?.entries.length, 6236);
  assert.equal(content.books.find(book => book.kind === 'tafsir')?.entries.length, 6236);
  for (const source of content.sources) {
    assert(source.id && source.title && source.url && source.license_name && source.version);
  }
});

test('offline research packages are bundled and complete', () => {
  assert.equal(fs.readdirSync(path.join(publicRoot, 'offline', 'hadith')).filter(name => name.endsWith('.json')).length, 114);
  assert.equal(fs.readdirSync(path.join(publicRoot, 'offline', 'similarity')).filter(name => name.endsWith('.json')).length, 114);
  assert.equal(fs.readdirSync(path.join(publicRoot, 'audio', 'minshawi')).filter(name => name.endsWith('.mp3')).length, 114);
  const vocabulary = JSON.parse(fs.readFileSync(path.join(publicRoot, 'vocabulary.json'), 'utf8'));
  assert.equal(vocabulary.entries.length, 16351);
  const manifest = JSON.parse(fs.readFileSync(path.join(publicRoot, 'offline', 'manifest.json'), 'utf8'));
  assert.equal(manifest.offline, true);
  assert(manifest.sources.length >= 25);
  const source = fs.readdirSync(path.join(root, 'src')).filter(name => name.endsWith('.jsx') || name.endsWith('.js'))
    .map(name => fs.readFileSync(path.join(root, 'src', name), 'utf8')).join('\n');
  assert(!source.includes('127.0.0.1'));
  assert(source.includes('offline/tafsir/'));
  assert(source.includes('offline/hadith/'));
});
