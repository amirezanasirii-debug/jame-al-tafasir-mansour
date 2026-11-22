import {authoredLabel, joinText, msg, uiAttr, uiMarkup, uiText} from './i18n.mjs';
import {matches} from './research-core.mjs';
export const NOTEBOOK_KEY='mansour-notebook-v1';
function citationRecord(value) {
 if(!value||typeof value!=='object'||!Number.isInteger(value.surah)||value.surah<1||value.surah>114||!Number.isInteger(value.verse)||value.verse<1||value.verse>286||typeof value.source!=='string'||!/^([0-9]{1,8}|moyassar)$/.test(value.source)||typeof value.title!=='string')return;
 const out={surah:value.surah,verse:value.verse,source:value.source,title:value.title.slice(0,400)};
 for(const k of ['volume','page','edition'])if(typeof value[k]==='string'||Number.isFinite(value[k]))out[k]=String(value[k]).slice(0,160);
 if(Number.isInteger(value.position)&&value.position>=0)out.position=value.position;
 return out;
}
export function validateNotebook(value){
 if(value?.format!==NOTEBOOK_KEY||!Array.isArray(value.notes)||value.notes.length>10000)throw Error('پشتیبان دفتر معتبر نیست.');
 const ids=new Set();
 return {format:NOTEBOOK_KEY,notes:value.notes.map(n=>{
  if(typeof n.id!=='string'||!n.id||n.id.length>180||ids.has(n.id)||typeof n.title!=='string'||n.title.length>200||typeof n.text!=='string'||n.text.length>100000||typeof n.tags!=='string'||n.tags.length>500||!Number.isFinite(Date.parse(n.updatedAt)))throw Error('یک یادداشت نامعتبر در فایل وجود دارد.');
  ids.add(n.id);const citation=citationRecord(n.citation);return {...(citation?{citation}:{}),id:n.id,title:n.title,text:n.text,tags:n.tags,updatedAt:n.updatedAt,starred:n.starred===true,archived:n.archived===true,trashed:n.trashed===true};
 })};
}
export function mergeNotebook(current,incoming){
 const map=new Map(validateNotebook(current).notes.map(n=>[n.id,n]));
 for(const n of validateNotebook(incoming).notes){const old=map.get(n.id);if(!old||Date.parse(n.updatedAt)>Date.parse(old.updatedAt))map.set(n.id,n);}
 return validateNotebook({format:NOTEBOOK_KEY,notes:[...map.values()]});
}
export function createNotebook({host,toast,download,legacyNotes}){
 let model={format:NOTEBOOK_KEY,notes:[]},selected=null,filter='all',timer,dirty=false,committed=null;
 uiMarkup(host, `<div class="nb-heading"><div><span class="eyebrow">جایی برای اندیشه‌های شما</span><h2>دفتر منصور</h2><p>بنویس، پیوند بده، دوباره کشف کن.</p></div><button id="nb-new" class="primary">＋ یادداشت تازه</button></div>
 <div class="nb-tools"><button id="nb-backup">پشتیبان دفتر</button><button id="nb-import">ورود پشتیبان</button><button id="nb-markdown">خروجی Markdown</button><button id="nb-legacy">کپی یادداشت‌های آیات به دفتر</button><input id="nb-file" type="file" accept=".json,application/json" hidden></div>
 <div class="nb-layout"><aside class="nb-sidebar"><label for="nb-search">جست‌وجو در دفتر</label><input id="nb-search" type="search" placeholder="عنوان، متن یا برچسب…"><div class="nb-filters" role="group" aria-label="نمایش یادداشت‌ها"><button data-filter="all">همه</button><button data-filter="starred">نشان‌شده</button><button data-filter="archived">بایگانی</button><button data-filter="trash">سطل زباله</button></div><p id="nb-count" class="footnote"></p><div id="nb-list"></div></aside>
 <div class="nb-paper"><div id="nb-empty"><h3>هر پژوهش، از یک یادداشت شروع می‌شود.</h3><p>یک یادداشت تازه بساز یا یادداشت‌های آیات را به دفتر بیاور.</p></div><div id="nb-editor" hidden><label for="nb-title">عنوان یادداشت</label><input id="nb-title" maxlength="200" placeholder="عنوانی برای این اندیشه…"><label for="nb-tags">برچسب‌ها</label><input id="nb-tags" maxlength="500" placeholder="تفسیر، پژوهش، مطالعه"><div class="nb-format"><button data-wrap="**">پررنگ</button><button data-wrap="*">تأکید</button><button data-prefix="## ">عنوان</button><button data-prefix="- ">فهرست</button><button id="nb-preview-toggle" aria-pressed="false">نمای مطالعه</button></div><label for="nb-text" class="visually-hidden">متن یادداشت</label><textarea id="nb-text" maxlength="100000" placeholder="از اینجا بنویس…" spellcheck="false"></textarea><div id="nb-preview" hidden></div><div class="nb-meta"><span id="nb-save" role="status"></span><span id="nb-words"></span></div><div class="nb-tools"><button id="nb-star">نشان کردن</button><button id="nb-archive">بایگانی</button><button id="nb-trash">انتقال به سطل زباله</button><button id="nb-restore" hidden>بازیابی</button><button id="nb-delete" hidden>حذف همیشگی</button></div></div></div></div>`);
 const $=id=>host.querySelector('#'+id),current=()=>model.notes.find(n=>n.id===selected);
 try{const saved=localStorage.getItem(NOTEBOOK_KEY);if(saved)model=validateNotebook(JSON.parse(saved));committed=saved;}catch{host.replaceChildren(Object.assign(document.createElement('p'),{textContent:'دفتر ذخیره‌شده خوانده نشد. برای جلوگیری از بازنویسی، ویرایش غیرفعال است؛ نسخهٔ ذخیره‌شده را پشتیبان بگیرید.'}));return;}
 function save(){clearTimeout(timer);try{if(localStorage.getItem(NOTEBOOK_KEY)!==committed){dirty=true;uiText($('nb-save'), msg("notebook.concurrent_change_back_up_the_notebook_to"));return false}const payload=JSON.stringify(model);localStorage.setItem(NOTEBOOK_KEY,payload);committed=payload;dirty=false;uiText($('nb-save'), msg("notebook.saved_on_this_device"));return true;}catch{dirty=true;uiText($('nb-save'), msg("notebook.save_failed_back_up_your_notebook"));toast(msg("notebook.storage_is_full_export_a_notebook_backup"));return false;}}
 function list(){
  const query=$('nb-search').value,rows=model.notes.filter(n=>(filter==='trash'?n.trashed:!n.trashed&&(filter==='archived'?n.archived:!n.archived&&(filter!=='starred'||n.starred)))&&matches(n.title+' '+n.text+' '+n.tags,query)).sort((a,b)=>Number(b.starred)-Number(a.starred)||Date.parse(b.updatedAt)-Date.parse(a.updatedAt));
  uiText($('nb-count'), joinText(rows.length.toLocaleString('fa-IR'), " ", msg("notebook.notes")));$('nb-list').replaceChildren();
  host.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));
  for(const n of rows){const b=document.createElement('button');b.className='nb-note';b.setAttribute('aria-current',String(n.id===selected));const t=document.createElement('strong');uiText(t, joinText(n.starred ? '★ ' : '', n.title || msg("notebook.untitled")));const p=document.createElement('span');uiText(p, (n.text.slice(0,95) || msg("notebook.nothing_written_yet")));const meta=document.createElement('small');uiText(meta, (n.tags || new Date(n.updatedAt).toLocaleDateString('fa-IR')));b.append(t,p,meta);b.onclick=()=>open(n.id);$('nb-list').append(b);}
  if(!rows.length)uiText($('nb-list'), msg("notebook.no_notes_found_here"));
 }
 const templateBar=document.createElement('div');templateBar.className='nb-tools';$('nb-new').after(templateBar);
 for(const [title,sections] of [['فیش تفسیری',['آیه و منبع','متن تفسیر','برداشت']],['طرح درس / منبر',['هدف','آیه و شواهد','ساختار بحث','نتیجه']],['طرح مقاله',['مسئله','شواهد','استدلال','منابع']]]){
   const b=document.createElement('button');uiText(b, authoredLabel(title));b.onclick=()=>{$('nb-new').click();$('nb-title').value=title;$('nb-text').value=sections.map(s=>'## '+s+'\n').join('\n');edit()};templateBar.append(b);
 }
 const links=document.createElement('nav');links.className='nb-tools';uiAttr(links, 'aria-label', msg("notebook.outline_and_note_links"));$('nb-preview').after(links);
 function noteLinks(text){
   links.replaceChildren();const add=(title,action)=>{const btn=document.createElement('button');uiText(btn, title);btn.onclick=action;links.append(btn)};
   for(const h of text.matchAll(/^#{1,3}\s+(.+)$/gm)){add(h[1],()=>{if($('nb-text').hidden){[...$('nb-preview').children].find(n=>n.tagName.startsWith('H')&&n.textContent===h[1])?.scrollIntoView({block:'center'})}else{$('nb-text').focus();$('nb-text').setSelectionRange(h.index,h.index+h[0].length)}})}
   const source=current()?.citation;if(source)add('بازکردن منبع فیش',()=>document.dispatchEvent(new CustomEvent('mansour-open-evidence',{detail:source})));
   const title=current()?.title.trim();
   if(title)for(const n of model.notes.filter(n=>!n.trashed&&n.id!==selected&&n.text.includes('[['+title+']]')))add('ارجاع از '+(n.title||'یادداشت'),()=>open(n.id));
   for(const token of new Set(Array.from(text.matchAll(/\[\[([^\]\n]+)\]\]/g),m=>m[1]))){
     const ref=/^(\d{1,3}):(\d{1,3})$/.exec(token);
     if(ref)add('آیهٔ '+token,()=>document.dispatchEvent(new CustomEvent('mansour-open-verse',{detail:[+ref[1],+ref[2]]})));
     else {const n=model.notes.find(n=>!n.trashed&&n.title===token);if(n)add(token,()=>open(n.id))}
   }
 }
 function preview(){const text=$('nb-text').value;noteLinks(text);uiText($('nb-words'), joinText((text.trim()?text.trim().split(/\s+/).length:0).toLocaleString('fa-IR'), " ", msg("notebook.words")));$('nb-preview').replaceChildren();for(const line of text.split('\n')){const heading=/^(#{1,3})\s+(.*)$/.exec(line),p=document.createElement(heading?'h'+(heading[1].length+1):'p');const body=heading?heading[2]:line.replace(/^- /,'• ')||'\u00a0';for(const part of body.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)){if(part.startsWith('**')&&part.endsWith('**')){const b=document.createElement('strong');uiText(b, part.slice(2,-2));p.append(b);}else if(part.startsWith('*')&&part.endsWith('*')){const e=document.createElement('em');uiText(e, part.slice(1,-1));p.append(e);}else p.append(document.createTextNode(part));}$('nb-preview').append(p);}}
 function open(id){if(dirty&&!save())return;selected=id;if(id){try{localStorage.setItem('mansour-active-note',id)}catch{}}const n=current();$('nb-empty').hidden=!!n;$('nb-editor').hidden=!n;if(!n){list();return;}$('nb-title').value=n.title;$('nb-text').value=n.text;$('nb-tags').value=n.tags;for(const f of ['nb-title','nb-text','nb-tags'])$(f).readOnly=n.trashed;uiText($('nb-star'), (n.starred ? msg("notebook.remove_star") : msg("notebook.star")));uiText($('nb-archive'), (n.archived ? msg("notebook.unarchive") : msg("notebook.archive")));for(const f of ['nb-star','nb-archive','nb-trash'])$(f).hidden=n.trashed;for(const f of ['nb-restore','nb-delete'])$(f).hidden=!n.trashed;host.querySelectorAll('[data-wrap],[data-prefix]').forEach(b=>b.disabled=n.trashed);uiText($('nb-save'), (dirty ? msg("notebook.unsaved_make_a_backup") : msg("notebook.saved_on_this_device_alt")));preview();list();}
 function edit(){const n=current();if(!n||n.trashed)return;Object.assign(n,{title:$('nb-title').value,text:$('nb-text').value,tags:$('nb-tags').value,updatedAt:new Date().toISOString()});dirty=true;uiText($('nb-save'), msg("notebook.saving"));clearTimeout(timer);timer=setTimeout(save,350);preview();list();}
 $('nb-new').onclick=()=>{if(dirty&&!save())return;const n={id:crypto.randomUUID(),title:'',text:'',tags:'',updatedAt:new Date().toISOString(),starred:false,archived:false,trashed:false};model.notes.push(n);filter='all';$('nb-search').value='';save();open(n.id);$('nb-preview').hidden=true;$('nb-text').hidden=false;$('nb-preview-toggle').setAttribute('aria-pressed','false');$('nb-title').focus();};
 for(const id of ['nb-title','nb-text','nb-tags'])$(id).addEventListener('input',edit);
 $('nb-search').oninput=list;host.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;list();});
 for(const [id,field] of [['nb-star','starred'],['nb-archive','archived'],['nb-trash','trashed'],['nb-restore','trashed']])$(id).onclick=()=>{const n=current();if(!n)return;n[field]=!n[field];n.updatedAt=new Date().toISOString();save();open(n.id);};
 $('nb-delete').onclick=()=>{const n=current();if(!n?.trashed||!confirm(msg("notebook.permanently_delete_this_note")))return;model.notes=model.notes.filter(x=>x.id!==n.id);save();open(null);};
 host.querySelectorAll('[data-wrap],[data-prefix]').forEach(b=>b.onclick=()=>{const t=$('nb-text'),start=t.selectionStart,end=t.selectionEnd,chosen=t.value.slice(start,end),mark=b.dataset.wrap;t.setRangeText(mark?mark+chosen+mark:b.dataset.prefix+chosen,start,end,'select');edit();t.focus();});
 $('nb-preview-toggle').onclick=()=>{const show=$('nb-preview').hidden;$('nb-preview').hidden=!show;$('nb-text').hidden=show;$('nb-preview-toggle').setAttribute('aria-pressed',String(show));preview();};
 $('nb-backup').onclick=()=>download('mansour-notebook.json',JSON.stringify(model,null,2),'application/json');
 $('nb-markdown').onclick=()=>download('mansour-notebook.md',model.notes.filter(n=>!n.trashed).map(n=>'# '+(n.title||'بدون عنوان')+'\n\n'+n.text+'\n\nبرچسب‌ها: '+n.tags).join('\n\n---\n\n'),'text/markdown;charset=utf-8');
 $('nb-import').onclick=()=>$('nb-file').click();$('nb-file').onchange=async()=>{try{const file=$('nb-file').files[0];if(!file)return;if(file.size>20e6)throw Error('فایل پشتیبان بیش از ۲۰ مگابایت است.');model=mergeNotebook(model,JSON.parse(await file.text()));save();open(selected||model.notes[0]?.id);toast(msg("notebook.backup_merged_with_notebook"));}catch(e){toast(e.message);}finally{$('nb-file').value='';}};
 $('nb-legacy').onclick=()=>{let count=0;for(const n of legacyNotes()){const id='verse-'+n.id;if(model.notes.some(x=>x.id===id))continue;model.notes.push({id,title:n.label||'یادداشت آیهٔ '+n.ayahId,text:n.text,tags:'یادداشت آیه',updatedAt:new Date().toISOString(),starred:false,archived:false,trashed:false});count++;}save();open(selected||model.notes[0]?.id);toast(joinText(count.toLocaleString('fa-IR'), " ", msg("notebook.verse_notes_copied_originals_retained")));};
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&dirty)save();});window.addEventListener('beforeunload',e=>{if(dirty&&!save()){e.preventDefault();e.returnValue='';}});
 const last=model.notes.find(n=>!n.trashed&&n.id===localStorage.getItem('mansour-active-note'));
 open(last?.id||model.notes.find(n=>!n.trashed)?.id);
 return {
   cited:(s,v)=>model.notes.filter(n=>!n.trashed&&n.citation?.surah===s&&n.citation.verse===v),
   recent:()=>model.notes.filter(n=>!n.trashed&&!n.archived).sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt)).slice(0,4),
   open:id=>{if(model.notes.some(n=>n.id===id&&!n.trashed))open(id)},
   capture({title,body,ref}) {
     if(dirty&&!save())return;
     const citation=citationRecord(ref);const n={...(citation?{citation}:{}),id:crypto.randomUUID(),title:title.slice(0,200),text:body,tags:'فیش منبع',updatedAt:new Date().toISOString(),starred:false,archived:false,trashed:false};
     if(body.length>100000){toast(msg("notebook.excerpt_too_long_select_a_shorter_passage"));return}
     model.notes.push(n);
     if(!save()){model.notes.pop();return}
     filter='all';$('nb-search').value='';open(n.id);return n.id;
   }
 };
}
