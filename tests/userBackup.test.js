import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createUserBackup, parseUserBackup} from '../src/userBackup.js';

test('user backup round-trips notes, unique bookmarks, categories and reading position', () => {
  const backup = createUserBackup({
    notes: [{id: 'note-1', text: 'پژوهش'}],
    marks: [255, 255, 256],
    markCategories: {'255': 'حفظ'},
    last: {surah: 2, verse: 255},
  });
  const restored = parseUserBackup(JSON.stringify(backup));
  assert.deepEqual(restored.marks, [255, 256]);
  assert.equal(restored.markCategories['255'], 'حفظ');
  assert.equal(restored.notes[0].id, 'note-1');
  assert.deepEqual(restored.last, {surah: 2, verse: 255});
});

test('user backup rejects unknown schemas and malformed JSON', () => {
  assert.throws(() => parseUserBackup('{'), /JSON/);
  assert.throws(() => parseUserBackup('{"schema":"other","version":1}'), /پشتیبان/);
});
