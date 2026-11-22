import test from 'node:test';
import assert from 'node:assert/strict';
import {migrateLegacy} from '../dist/legacy-state.mjs';
import {validateNotebook,NOTEBOOK_KEY} from '../dist/notebook.mjs';

test('legacy preferences, numbered pages, notes and bookmark folders survive retry without replacing newer notes',()=>{
 const input={
   'jm-notes':[{id:17,title:'قدیمی',body:'آیه',reference:'کتاب، ص ۲'}],
   'jm-last':{surah:48,verse:8},'jm-marks':[1,48],'jm-mark-categories':{'48':'پژوهش'},'jm-font':36,
   'mansour-research-v1':{format:'mansour-research-v1',notes:[],bookmarks:[2]}
 };
 const items=new Map(Object.entries(input).map(([k,v])=>[k,JSON.stringify(v)]));
 let fail=true;
 const storage={getItem:k=>items.get(k)??null,setItem:(k,v)=>{if(fail&&k.endsWith('-prefs'))throw Error('interrupted');items.set(k,v)}};
 assert.throws(()=>migrateLegacy(storage,x=>x));
 fail=false;migrateLegacy(storage,x=>x);migrateLegacy(storage,x=>x);
 assert.deepEqual(JSON.parse(items.get('jm-notes')),input['jm-notes']);
 assert.deepEqual(JSON.parse(items.get('mansour-research-v1')).bookmarks,[2,1,48]);
 const notebook=validateNotebook(JSON.parse(items.get(NOTEBOOK_KEY)));assert.equal(notebook.notes.length,1);
 assert.match(notebook.notes[0].text,/ص ۲/);
 const prefs=JSON.parse(items.get('mansour-research-v1-prefs'));assert.equal(prefs.surah,48);assert.equal(prefs.verse,8);assert.equal(prefs.qSize,36);assert.equal(prefs.bookmarkFolders[48].name,'پژوهش');
});
test('notebook backup roundtrip keeps the source identity and printed page and drops unsupported link formats',()=>{
 const n={id:'source',title:'فیش',text:'شاهد',tags:'',updatedAt:'2026-11-21T10:00:00Z',citation:{surah:48,verse:8,source:'317',title:'تفسیر',volume:'۱۸',page:'۴۰۸',position:3}};
 const model=validateNotebook({format:NOTEBOOK_KEY,notes:[n]});assert.deepEqual(model.notes[0].citation,n.citation);
 assert.equal(validateNotebook({format:NOTEBOOK_KEY,notes:[{...n,citation:{...n.citation,source:'bad-source'}}]}).notes[0].citation,undefined);
});
