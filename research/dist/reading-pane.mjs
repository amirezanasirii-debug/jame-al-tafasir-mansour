// Shared offline reader for desktop and Android. Source Quran text is unchanged.
export function createReadingPane({content,preferences,selected,translation,load,plain,select,remember,onWord}) {
 const $=id=>document.getElementById(id),fa=n=>Number(n).toLocaleString('fa-IR');
 let ticket=0,renderedKey='',rows=[];
 if(!['surah','page','single'].includes(preferences.readingMode))preferences.readingMode='surah';
 if(typeof preferences.inlineTranslation!=='boolean')preferences.inlineTranslation=true;
 const mode=$('reading-mode'),show=$('stream-translation'),focus=$('focus-reading'),list=$('verse-stream');
 mode.value=preferences.readingMode;show.checked=preferences.inlineTranslation;
 function applyFocus(){document.body.classList.toggle('focus-reading',!!preferences.focusReading);focus.setAttribute('aria-pressed',String(!!preferences.focusReading));focus.textContent=preferences.focusReading?'بازگشت به پژوهش':'مطالعهٔ متمرکز';}
 applyFocus();
 mode.onchange=()=>{preferences.readingMode=mode.value;if(mode.value==='single'){preferences.focusReading=false;applyFocus();}remember();render().catch(showError)};
 show.onchange=()=>{preferences.inlineTranslation=show.checked;remember();render().catch(showError)};
 focus.onclick=()=>{preferences.focusReading=!preferences.focusReading;if(preferences.focusReading&&preferences.readingMode==='single'){preferences.readingMode='surah';mode.value='surah'}applyFocus();remember();render().catch(showError)};
 $('stream-prev').onclick=()=>move(-1);$('stream-next').onclick=()=>move(1);
 function move(delta){const a=selected();if(preferences.readingMode==='page'){const target=content.ayahs.find(v=>v.page===a.page+delta);if(target)select(target.surah_id,target.number)}else{const s=content.surahs.find(v=>v.id===a.surah_id+delta);if(s)select(s.id,1)}}
 function showError(e){list.textContent='نمایش آیات انجام نشد: '+e.message;}
 function highlight(){const a=selected();for(const row of list.querySelectorAll('[data-ayah]')){const active=Number(row.dataset.ayah)===a.id;row.classList.toggle('selected',active);row.querySelector('.verse-select').setAttribute('aria-current',active?'true':'false');}const row=list.querySelector(`[data-ayah="${a.id}"]`);if(row&&!preferences.focusReading)list.scrollTop=Math.max(0,row.offsetTop-list.offsetTop-10);}
 async function render(){const run=++ticket,a=selected(),type=preferences.readingMode;
  $('reading-pane').hidden=type==='single';if(type==='single')return;
  const choice=translation(),key=[type,type==='page'?a.page:a.surah_id,choice,preferences.inlineTranslation].join('|');
  if(key===renderedKey){highlight();return;}
  rows=content.ayahs.filter(v=>type==='page'?v.page===a.page:v.surah_id===a.surah_id);
  $('stream-heading').textContent=type==='page'?`صفحهٔ ${fa(a.page)} · ${fa(rows.length)} آیه`:`سورهٔ ${content.surahs.find(s=>s.id===a.surah_id).name_ar} · ${fa(rows.length)} آیه`;
  $('stream-prev').disabled=type==='page'?a.page===1:a.surah_id===1;$('stream-next').disabled=type==='page'?a.page===604:a.surah_id===114;
  const imports=new Map();if(preferences.inlineTranslation&&choice.startsWith('noor:'))for(const s of new Set(rows.map(v=>v.surah_id)))imports.set(s,await load(`research-data/${s}.json`));
  if(run!==ticket)return;
  const entries=new Map((content.books.find(b=>b.id===choice)?.entries||[]).map(e=>[e.ayah_id,e]));
  const fragment=document.createDocumentFragment();
  for(const verse of rows){const row=document.createElement('article');row.className='verse-row';row.dataset.ayah=verse.id;
   const button=document.createElement('button');button.className='verse-select';button.textContent=`${content.surahs.find(s=>s.id===verse.surah_id).name_ar} · ${fa(verse.number)}`;button.title='انتخاب آیه و نمایش تفسیر و ابزارهای آن';button.onclick=()=>select(verse.surah_id,verse.number);
   const text=document.createElement('p');text.className='stream-arabic';text.lang='ar';text.dir='rtl';text.textContent=verse.text_original;
   row.append(button,text);
   if(preferences.inlineTranslation){const t=document.createElement('p');t.className='stream-translation';const raw=choice.startsWith('noor:')?(imports.get(verse.surah_id)?.translations[verse.number]||[]).find(x=>String(x.bookId)===choice.slice(5))?.text:entries.get(verse.id)?.text;t.textContent=plain(raw||'ترجمهٔ این آیه در منبع انتخاب‌شده موجود نیست.');row.append(t)}
   const study=document.createElement('button');study.className='verse-study';study.textContent='تفسیر و واژه‌ها';study.onclick=()=>{preferences.focusReading=false;applyFocus();remember();select(verse.surah_id,verse.number);document.querySelector('.study-grid').scrollIntoView({block:'start'})};row.append(study);fragment.append(row);
  }
  list.replaceChildren(fragment);renderedKey=key;highlight();
 }
 return {render,reset:()=>{renderedKey=''},revealResearch:()=>{preferences.focusReading=false;applyFocus();remember();}};
}
