import test from 'node:test';
import assert from 'node:assert/strict';
import {validateNotebook,mergeNotebook,NOTEBOOK_KEY} from '../dist/notebook.mjs';
const note=(id,text,updatedAt='2026-10-30T10:00:00Z')=>({id,title:'Test',text,tags:'research',updatedAt});
const book=notes=>({format:NOTEBOOK_KEY,notes});
test('Notebook import rejects duplicate ids, oversized text and invalid timestamps',()=>{
 assert.throws(()=>validateNotebook(book([note('a','one'),note('a','two')])));
 assert.throws(()=>validateNotebook(book([note('a','x'.repeat(100001))])));
 assert.throws(()=>validateNotebook(book([note('a','text','invalid')])));
});
test('Notebook restore preserves unrelated notes and newer local edits',()=>{
 const merged=mergeNotebook(book([note('a','local','2026-10-30T12:00:00Z'),note('b','keep')]),book([note('a','old'),note('c','restored')]));
 assert.equal(merged.notes.length,3);assert.equal(merged.notes.find(n=>n.id==='a').text,'local');
});
test('Notebook import keeps text literal and strips unexpected fields',()=>{
 const n=validateNotebook(book([{...note('a','<script>alert(1)</script>'),html:'unsafe',trashed:true}])).notes[0];
 assert.equal(n.text,'<script>alert(1)</script>');assert.equal(n.html,undefined);assert.equal(n.trashed,true);
});
