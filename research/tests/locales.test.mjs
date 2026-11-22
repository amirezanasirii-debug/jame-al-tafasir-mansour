import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogs, msg} from '../dist/i18n.mjs';
const placeholders = s => (s.match(/\{\d+\}/g)||[]).sort();
test('every offline locale contains the same keys and format arguments',()=>{
  const fa=catalogs['fa-IR'];
  for (const [locale,table] of Object.entries(catalogs)){
    assert.deepEqual(Object.keys(table).sort(),Object.keys(fa).sort());
    for (const [key,value] of Object.entries(table)){
      assert.ok(value.trim(),locale+' '+key);
      assert.deepEqual(placeholders(value),placeholders(fa[key]),key);
    }
  }
});
test('formatting preserves source strings and numeric zero',()=>{
  const text='سُبْحَانَ ٱلَّذِي';
  assert.equal(String(msg('research.surah_0',text)),'سورهٔ '+text);
  assert.equal(String(msg('research.surah_0',0)),'سورهٔ ۰');
});
