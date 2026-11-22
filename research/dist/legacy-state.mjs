import {mergeBackup,validateBackup} from './research-core.mjs';
import {validateNotebook,NOTEBOOK_KEY} from './notebook.mjs';
const research='mansour-research-v1';
const migration='mansour-legacy-24-import-v1';
const json=(storage,key,defaultValue)=>JSON.parse(storage.getItem(key)||JSON.stringify(defaultValue));
export function migrateLegacy(storage,toText){
  if(storage.getItem(migration)||!['jm-notes','jm-marks','jm-last','jm-dark'].some(key=>storage.getItem(key)!==null))return;
  const notes=json(storage,'jm-notes',[]),marks=json(storage,'jm-marks',[]),last=json(storage,'jm-last',null);
  if(!Array.isArray(notes)||!Array.isArray(marks))throw Error('دادهٔ قدیمی قالب پشتیبانی‌شده ندارد.');
  const current=validateBackup(json(storage,research,{format:research,notes:[],bookmarks:[]}));
  const book=validateNotebook(json(storage,NOTEBOOK_KEY,{format:NOTEBOOK_KEY,notes:[]}));
  const known=new Set(book.notes.map(n=>n.id));
  for(const [index,n] of notes.entries()){
    if(!n||typeof n!=='object')throw Error('یک یادداشت قدیمی قابل خواندن نیست.');
    const text=[n.body||n.text||toText(n.bodyHtml||''),n.reference?'منبع: '+n.reference:''].filter(Boolean).join('\n');
    const parts=text.match(/[\s\S]{1,99500}/gu)||[''];
    for(const [part,body] of parts.entries()){
      const id='legacy-24-'+String(n.id??index).slice(0,140)+'-'+index+'-'+part;
      if(known.has(id))continue;
      const title=(String(n.title||'یادداشت قدیمی')+(parts.length>1?' · '+(part+1):'')).slice(0,200);
      book.notes.push({id,title,text:body,tags:String(n.tags||'دفتر قدیمی').slice(0,500),updatedAt:Number.isFinite(Date.parse(n.updatedAt))?n.updatedAt:'2000-01-01T00:00:00Z',archived:false,starred:false,trashed:false});
    }
  }
  validateNotebook(book);
  const merged=mergeBackup(current,{format:research,notes:[],bookmarks:marks});
  const prefKey=research+'-prefs', saved=json(storage,prefKey,{}), categories=json(storage,'jm-mark-categories',{});
  const prefs={};
  if(last&&Number.isInteger(last.surah)&&last.surah>=1&&last.surah<=114&&Number.isInteger(last.verse)&&last.verse>=1&&last.verse<=286){prefs.surah=last.surah;prefs.verse=last.verse}
  if(storage.getItem('jm-dark')!==null)prefs.dark=json(storage,'jm-dark',false)===true;
  const size=json(storage,'jm-font',null);if(Number.isFinite(size))prefs.qSize=Math.max(12,Math.min(50,size));
  const trans=json(storage,'jm-translation',null);if(typeof trans==='boolean')prefs.inlineTranslation=trans;
  const folders={};for(const id of marks)if(typeof categories?.[id]==='string')folders[id]={name:categories[id].slice(0,60),color:'#93732b'};
  const combined={...prefs,...saved,bookmarkFolders:{...folders,...saved.bookmarkFolders}};
  storage.setItem(NOTEBOOK_KEY,JSON.stringify(book));storage.setItem(research,JSON.stringify(merged));
  storage.setItem(prefKey,JSON.stringify(combined));storage.setItem(migration,'1');
}
