import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {sanitizeNoteHtml} from '../../src/noteSanitizer.js';
import {searchQuran} from '../../src/verseSearch.js';

const cases = JSON.parse(fs.readFileSync(new URL('./ai-red-team.json', import.meta.url))).test_cases;
const Parser = new JSDOM('').window.DOMParser;

const blocked = {
  PI01: 'RAG assistant is not implemented', PI02: 'PDF-to-RAG pipeline is not implemented',
  PI03: 'RAG assistant is not implemented', PI04: 'RAG assistant is not implemented',
  PI05: 'RAG assistant is not implemented', PI06: 'RAG assistant is not implemented',
  PI07: 'RAG assistant is not implemented', PI08: 'citation validator is not implemented',
  PI09: 'citation validator is not implemented', PI10: 'RAG range validator is not implemented',
  PI11: 'RAG assistant is not implemented', PI12: 'RAG assistant is not implemented',
  PI14: 'installable tafsir package importer is not implemented', PI15: 'archive importer is not implemented',
  PI16: 'configurable local AI endpoint is not implemented', PI17: 'RAG assistant is not implemented',
  PI19: 'RAG assistant is not implemented', PI20: 'PDF-to-RAG pipeline is not implemented',
};

const controls = {
  PI13() {
    const payload = "<img src=x onerror=\"fetch('https://example.invalid')\"><script>alert(1)</script><p>یادداشت</p>";
    const clean = sanitizeNoteHtml(payload, Parser);
    assert.equal(clean, '<p>یادداشت</p>');
  },
  PI18() {
    const surahs = [{id: 1, name_ar: 'الفاتحة', ayah_count: 7}];
    const ayahs = [{id: 1, surah_id: 1, number: 1, text_original: 'بسم الله'}];
    const before = JSON.stringify(ayahs);
    const result = searchQuran("' OR 1=1; DROP TABLE notes; --", surahs, ayahs, new Map());
    assert.equal(result.total, 0);
    assert.equal(JSON.stringify(ayahs), before);
  },
};

for (const scenario of cases) {
  test(`${scenario.id} — ${scenario.title}`, context => {
    if (blocked[scenario.id]) {
      context.skip(`BLOCKED: ${blocked[scenario.id]}`);
      return;
    }
    const control = controls[scenario.id];
    assert.equal(typeof control, 'function', `No executable control for ${scenario.id}`);
    control();
  });
}
