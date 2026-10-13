import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {migrateNote, sanitizeNoteHtml} from '../src/noteSanitizer.js';
import {parseUserBackup, USER_BACKUP_MAX_CHARS} from '../src/userBackup.js';

const Parser = new JSDOM('').window.DOMParser;

test('imported rich text removes scripts, event handlers, remote images and unsafe CSS', () => {
  const html = '<p onclick="alert(1)" style="color:#123456;background-image:url(https://bad.invalid/x)">متن</p>'
    + '<script>alert(2)</script><img src="https://bad.invalid/pixel" onerror="alert(3)">';
  const clean = sanitizeNoteHtml(html, Parser);
  assert.match(clean, /متن/);
  assert.doesNotMatch(clean, /script|onclick|onerror|img|bad\.invalid|background-image/i);
  assert.match(clean, /color:\s*(?:#123456|rgb\(18,\s*52,\s*86\))/i);
});

test('migrating an imported note sanitizes bodyHtml before it reaches the editor', () => {
  const note = migrateNote({id: 'note-1', bodyHtml: '<svg onload="alert(1)"></svg><b>ایمن</b>'}, Parser);
  assert.equal(note.bodyHtml, '<b>ایمن</b>');
});

test('backup parser rejects oversized and structurally unsafe payloads', () => {
  assert.throws(() => parseUserBackup('x'.repeat(USER_BACKUP_MAX_CHARS + 1)), /حجم/);
  const payload = {schema: 'jame-mansour-user-data', version: 1, notes: [{id: 'n', bodyHtml: 'x'.repeat(500001)}], bookmarks: []};
  assert.throws(() => parseUserBackup(JSON.stringify(payload)), /bodyHtml/);
});

test('backup parser strips unknown fields and invalid Quran references', () => {
  const payload = {
    schema: 'jame-mansour-user-data', version: 1,
    notes: [{id: 'n1', title: 'یادداشت', ayahId: 999999, executable: 'never'}],
    bookmarks: [1, 6236, 6237, -1],
  };
  const restored = parseUserBackup(JSON.stringify(payload));
  assert.deepEqual(restored.marks, [1, 6236]);
  assert.equal(restored.notes[0].ayahId, null);
  assert.equal('executable' in restored.notes[0], false);
});
