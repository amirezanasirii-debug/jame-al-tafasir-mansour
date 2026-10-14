import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const contentSchemaPath = new URL(
  '../android/schemas/org.jamealtafasir.mobile.data.content.ContentDatabase/1.json',
  import.meta.url,
);
const userSchemaPath = new URL(
  '../android/schemas/org.jamealtafasir.mobile.data.user.UserDatabase/1.json',
  import.meta.url,
);

const readSchema = async path => JSON.parse(await readFile(path, 'utf8'));
const entityMap = schema => new Map(schema.database.entities.map(entity => [entity.tableName, entity]));

test('content database keeps display data separate from FTS indexes', async () => {
  const schema = await readSchema(contentSchemaPath);
  const entities = entityMap(schema);

  for (const table of [
    'quran_verses', 'translation_sources', 'translation_entries',
    'tafsir_sources', 'tafsir_entries', 'hadith_sources', 'hadith_entries',
    'duas', 'dua_lines', 'ayah_relation_links', 'minbar_topics',
  ]) {
    assert.ok(entities.has(table), `missing content table: ${table}`);
  }

  for (const [ftsTable, contentTable] of [
    ['quran_search_fts', 'quran_verses'],
    ['translation_search_fts', 'translation_entries'],
    ['tafsir_search_fts', 'tafsir_entries'],
    ['hadith_search_fts', 'hadith_entries'],
    ['dua_search_fts', 'dua_lines'],
  ]) {
    const fts = entities.get(ftsTable);
    assert.equal(fts?.ftsVersion, 'FTS4');
    assert.equal(fts?.ftsOptions?.contentTable, contentTable);
    assert.deepEqual(fts?.ftsOptions?.prefixSizes, [2, 3, 4]);
    assert.ok(fts.contentSyncTriggers.some(trigger => trigger.includes('AFTER_INSERT')));
    assert.ok(fts.contentSyncTriggers.some(trigger => trigger.includes('AFTER_UPDATE')));
    assert.ok(fts.contentSyncTriggers.some(trigger => trigger.includes('BEFORE_DELETE')));
  }
});

test('user database is isolated and has non-destructive personal tables', async () => {
  const schema = await readSchema(userSchemaPath);
  const entities = entityMap(schema);

  assert.equal(schema.database.version, 1);
  for (const table of [
    'bookmarks', 'bookmark_categories', 'notes', 'reading_position', 'search_history',
  ]) {
    assert.ok(entities.has(table), `missing user table: ${table}`);
  }
  for (const forbiddenContentTable of ['quran_verses', 'tafsir_entries', 'translation_entries']) {
    assert.equal(entities.has(forbiddenContentTable), false);
  }

  const noteFts = entities.get('notes_search_fts');
  assert.equal(noteFts?.ftsVersion, 'FTS4');
  assert.equal(noteFts?.ftsOptions?.contentTable, 'notes');
  assert.ok(noteFts.contentSyncTriggers.length >= 4);
});
