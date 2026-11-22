import {joinText, localizedNumber, msg, uiAttr, uiText} from './i18n.mjs';
// Shared offline reader for desktop and Android. Source Quran text is unchanged.
export function createReadingPane({content,preferences,selected,translation,load,plain,select,remember,onWord}) {
 const $=id=>document.getElementById(id),fa=n=>Number(n).toLocaleString('fa-IR');
 let ticket=0,renderedKey='',rows=[];
 if(!['surah','page','single'].includes(preferences.readingMode))preferences.readingMode='surah';
 if(typeof preferences.inlineTranslation!=='boolean')preferences.inlineTranslation=true;
 const mode=$('reading-mode'),show=$('stream-translation'),focus=$('focus-reading'),list=$('verse-stream');
 mode.value=preferences.readingMode;show.checked=preferences.inlineTranslation;
 function applyFocus(){document.body.classList.toggle('focus-reading',!!preferences.focusReading);focus.setAttribute('aria-pressed',String(!!preferences.focusReading));uiText(focus, (preferences.focusReading ? msg("reading-pane.return_to_research") : msg("research.focused_reading")));}
 applyFocus();
 mode.onchange=()=>{delete preferences.studyRange;preferences.readingMode=mode.value;if(mode.value==='single'){preferences.focusReading=false;applyFocus();}remember();render().catch(showError)};
 show.onchange=()=>{preferences.inlineTranslation=show.checked;remember();render().catch(showError)};
 focus.onclick=()=>{preferences.focusReading=!preferences.focusReading;if(preferences.focusReading&&preferences.readingMode==='single'){preferences.readingMode='surah';mode.value='surah'}applyFocus();remember();render().catch(showError)};
 $('stream-prev').onclick=()=>move(-1);$('stream-next').onclick=()=>move(1);
 function move(delta){const a=selected();if(preferences.readingMode==='page'){const target=content.ayahs.find(v=>v.page===a.page+delta);if(target)select(target.surah_id,target.number)}else{const s=content.surahs.find(v=>v.id===a.surah_id+delta);if(s)select(s.id,1)}}
 function showError(e){uiText(list, joinText(msg("reading-pane.could_not_display_verses"), " ", e.message));}
 function highlight(){const a=selected();for(const row of list.querySelectorAll('[data-ayah]')){const active=Number(row.dataset.ayah)===a.id;row.classList.toggle('selected',active);for(const b of row.querySelectorAll('.verse-select,.verse-number'))b.setAttribute('aria-current',active?'true':'false');}const row=list.querySelector(`[data-ayah="${a.id}"]`);if(row&&!preferences.focusReading){const anchor=getComputedStyle(row).display==='contents'?row.querySelector('.stream-arabic'):row;list.scrollTop=Math.max(0,list.scrollTop+anchor.getBoundingClientRect().top-list.getBoundingClientRect().top-10);}}
 async function render(){const run=++ticket,a=selected(),type=preferences.readingMode;
  $('reading-pane').hidden=type==='single';if(type==='single')return;
  const range=preferences.studyRange, scoped=type==='surah'&&range?.[0]===a.surah_id&&range[2]>range[1]&&a.number>=range[1]&&a.number<=range[2];
  const choice=translation(),key=[type,type==='page'?a.page:a.surah_id,choice,preferences.inlineTranslation,scoped&&range.join('-')].join('|');
  if(key===renderedKey){highlight();return;}
  rows=content.ayahs.filter(v=>type==='page'?v.page===a.page:v.surah_id===a.surah_id&&(!scoped||(v.number>=range[1]&&v.number<=range[2])));
  uiText($('stream-heading'), (type==='page' ? msg("reading-pane.page_0_1_verses", localizedNumber(a.page), localizedNumber(rows.length)) : msg("reading-pane.surah_0_1_verses", content.surahs.find(s=>s.id===a.surah_id).name_ar, localizedNumber(rows.length))));
  $('stream-prev').disabled=type==='page'?a.page===1:a.surah_id===1;$('stream-next').disabled=type==='page'?a.page===604:a.surah_id===114;
  const imports=new Map();if(preferences.inlineTranslation&&choice.startsWith('noor:'))for(const s of new Set(rows.map(v=>v.surah_id)))imports.set(s,await load(`research-data/${s}.json`));
  if(run!==ticket)return;
  const entries=new Map((content.books.find(b=>b.id===choice)?.entries||[]).map(e=>[e.ayah_id,e]));
  const fragment=document.createDocumentFragment();
  for(const verse of rows){const row=document.createElement('article');row.className='verse-row';row.dataset.ayah=verse.id;
   const button=document.createElement('button');button.className='verse-select';uiText(button, `${content.surahs.find(s=>s.id===verse.surah_id).name_ar} · ${fa(verse.number)}`);uiAttr(button, "title", msg("reading-pane.select_verse_and_show_its_commentary_and"));button.onclick=()=>select(verse.surah_id,verse.number);
   const text=document.createElement('p');text.className='stream-arabic';text.lang='ar';text.dir='rtl';uiText(text, verse.text_original);
   const numberButton=document.createElement('button');numberButton.type='button';numberButton.className='verse-number';uiText(numberButton, localizedNumber(verse.number));uiAttr(numberButton, 'aria-label', button.textContent);numberButton.onclick=button.onclick;
   row.append(button,text,numberButton);
   if(preferences.inlineTranslation){const t=document.createElement('p');t.className='stream-translation';t.dir='auto';const raw=choice.startsWith('noor:')?(imports.get(verse.surah_id)?.translations[verse.number]||[]).find(x=>String(x.bookId)===choice.slice(5))?.text:entries.get(verse.id)?.text;uiText(t, raw?plain(raw):msg('reading-pane.no_translation_for_this_verse_in_the'));row.append(t)}
   const study=document.createElement('button');study.className='verse-study';uiText(study, msg("reading-pane.commentary_and_words"));study.onclick=()=>{preferences.focusReading=false;applyFocus();remember();select(verse.surah_id,verse.number);document.querySelector('.study-grid').scrollIntoView({block:'start'})};row.append(study);fragment.append(row);
  }
  list.replaceChildren(fragment);renderedKey=key;highlight();
 }
 return {render,reset:()=>{renderedKey=''},revealResearch:()=>{preferences.focusReading=false;applyFocus();remember();}};
}
