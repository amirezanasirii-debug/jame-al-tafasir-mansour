import test from 'node:test';
import assert from 'node:assert/strict';
import {bookmarkRows,applyBatch,undoBatch} from '../dist/bookmark-folders.mjs';
import {mergeBackup} from '../dist/research-core.mjs';
const base={format:'mansour-research-v1',notes:[],bookmarks:[1,2]};
const old=bookmarkRows(base,{2:{name:'تحقیق',color:'#334455'}});
test('moving a batch keeps identifiers and undo restores each original folder',()=>{
 const moved=applyBatch(base,old,old.map(r=>r.id),'درس','move','move-id');
 assert.deepEqual(moved.bookmarkRows.map(r=>r.id),old.map(r=>r.id));assert.deepEqual(moved.bookmarkRows.map(r=>r.folder),['درس','درس']);
 assert.deepEqual(undoBatch(JSON.parse(JSON.stringify(moved))).bookmarkRows,old);
 assert.throws(()=>undoBatch({...moved,bookmarkRows:[{...moved.bookmarkRows[0],folder:'بعدی'},moved.bookmarkRows[1]]}));
});
test('copy can be retried, restored and undone without altering unrelated marks',()=>{
 const copied=applyBatch(base,old,[old[0].id],'درس','copy','batch');
 assert.equal(copied.bookmarkRows[2].id,'batch-0');assert.deepEqual(applyBatch(copied,copied.bookmarkRows,[old[0].id],'درس','copy','batch'),copied);
 const merged=mergeBackup(base,JSON.parse(JSON.stringify(copied)));assert.deepEqual(merged.bookmarkRows,copied.bookmarkRows);
 assert.deepEqual(undoBatch(copied).bookmarkRows,old);
});
