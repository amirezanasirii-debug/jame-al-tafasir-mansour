import {joinText, msg, uiAttr, uiOption, uiText} from './i18n.mjs';
export function bookmarkRows(model,folders={}){
 const active=new Set(model.bookmarks),rows=(model.bookmarkRows||[]).filter(r=>active.has(r.ayah));
 const covered=new Set(rows.map(r=>r.ayah));
 return [...rows,...[...active].filter(id=>!covered.has(id)).map(id=>({id:'verse-'+id,ayah:id,folder:folders[id]?.name||'عمومی',color:folders[id]?.color||'#93732b'}))];
}
export function applyBatch(model,rows,ids,folder,kind,batchId){
 if(!['copy','move'].includes(kind)||!folder.trim()||!ids.length)throw Error('نشان و پوشه را انتخاب کنید.');
 if(model.lastBatch?.id===batchId)return model;
 const selected=new Set(ids),records=rows.filter(r=>selected.has(r.id));
 const moved=kind==='move'?records.map(r=>({...r,folder})):records.map((r,i)=>({...r,id:batchId+'-'+i,folder}));
 const changes=new Map(moved.map(r=>[r.id,r]));
 return {...model,bookmarkRows:kind==='copy'?[...rows,...moved]:rows.map(r=>changes.get(r.id)||r),lastBatch:{id:batchId,kind,folder,old:records,affected:moved.map(r=>r.id)}};
}
export function undoBatch(model){
 const batch=model.lastBatch;if(!batch)return model;
 const affected=new Set(batch.affected),old=new Map(batch.old.map(r=>[r.id,r]));
 const rows=model.bookmarkRows||[];
 if(rows.some(r=>affected.has(r.id)&&r.folder!==batch.folder))throw Error('پوشه پس از این عملیات تغییر کرده است.');
 const restored=batch.kind==='copy'?rows.filter(r=>!affected.has(r.id)):rows.map(r=>affected.has(r.id)?{...r,folder:old.get(r.id).folder}:r);
 return {...model,bookmarkRows:restored,lastBatch:null};
}
export function validateRows(rows){
 if(!Array.isArray(rows)||rows.length>50000)throw Error('فهرست نشان‌ها معتبر نیست.');
 const ids=new Set();
 for(const r of rows){
  if(!r||typeof r.id!=='string'||!r.id||r.id.length>160||ids.has(r.id)||!Number.isInteger(r.ayah)||r.ayah<1||r.ayah>6236||typeof r.folder!=='string'||!r.folder||r.folder.length>60||!/^#[0-9a-f]{6}$/i.test(r.color))throw Error('نشان یا پوشهٔ واردشده معتبر نیست.');
  ids.add(r.id);
 }
 return rows;
}
export function renderBookmarkPanel({model,folders,commit,content,go,label,toast,refresh}){
 const chooser=document.getElementById('bookmark-filter'),list=document.getElementById('bookmarks-list');
 const rows=bookmarkRows(model,folders),before=chooser.value;
 chooser.replaceChildren(uiOption(msg("bookmark-folders.all_bookmarks"), ''),...Array.from(new Set(rows.map(r=>r.folder)),n=>uiOption(n, n)));
 chooser.value=before;chooser.onchange=refresh;list.replaceChildren();
 if(!rows.length){uiText(list, msg("bookmark-folders.no_verses_bookmarked_yet"));return}
 const selected=new Set(),controls=document.createElement('form');controls.className='batch-marks';
 const dest=document.createElement('input');uiAttr(dest, "placeholder", msg("bookmark-folders.destination_folder"));uiAttr(dest, 'aria-label', msg("bookmark-folders.destination_folder"));dest.maxLength=60;controls.append(dest);
 const button=(title,fn)=>{const b=document.createElement('button');b.type='button';uiText(b, title);b.onclick=fn;controls.append(b);return b};
 const commitBatch=kind=>{try{const next=applyBatch(model,rows,[...selected],dest.value.trim(),kind,crypto.randomUUID());validateRows(next.bookmarkRows);if(commit(next))refresh()}catch(e){toast(e.message)}};
 const move=button(msg("bookmark-folders.move"),()=>commitBatch('move')),copy=button(msg("bookmark-folders.copy"),()=>commitBatch('copy'));
 button(msg("bookmark-folders.undo_last_operation"),()=>{try{if(commit(undoBatch(model)))refresh()}catch(e){toast(e.message)}}).disabled=!model.lastBatch;
 move.disabled=copy.disabled=true;controls.onsubmit=e=>e.preventDefault();list.append(controls);
 for(const row of rows.filter(r=>!chooser.value||r.folder===chooser.value)){
   const wrap=document.createElement('div'),check=document.createElement('input'),open=document.createElement('button');
   check.type='checkbox';const a=content.ayahs[row.ayah-1];uiAttr(check, 'aria-label', joinText(msg("bookmark-folders.select"), " ", label(a), " ", msg("bookmark-folders.in"), " ", row.folder));
   check.onchange=()=>{if(check.checked)selected.add(row.id);else selected.delete(row.id);move.disabled=copy.disabled=!selected.size};
   open.type='button';uiText(open, label(a)+' · '+row.folder);open.style.borderInlineStart='4px solid '+row.color;open.onclick=()=>go(a);
   wrap.append(check,open);list.append(wrap);
 }
}
