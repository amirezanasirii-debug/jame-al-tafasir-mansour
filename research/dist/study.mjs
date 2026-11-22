import {authoredLabel, joinText, localizedNumber, msg, uiAttr, uiMarkup, uiOption, uiText} from './i18n.mjs';
import {normalize} from './research-core.mjs';
import {makeWord,saveBinary} from './export-study.mjs';
const $=id=>document.getElementById(id);
const fa=n=>Number(n).toLocaleString('fa-IR');
function button(parent,label,action) {
  const b=document.createElement('button'); b.type='button';uiText(b, label);b.onclick=action;parent.append(b);return b;
}
export function setupStudy({content,preferences:p,remember,selected,go,view,load,toast,applyAppearance}) {

  const header=document.querySelector('.topbar'),bar=document.createElement('div');
  bar.className='study-nav';header.append(bar);
  const originalBack=window.jameBack;
  const dialog=document.createElement('dialog');dialog.className='verse-dialog';dialog.setAttribute('aria-labelledby','jump-title');
  uiMarkup(dialog, '<form><h2 id="jump-title">انتخاب سوره و آیه</h2><label>نام سوره<input name="query" type="search"></label><label>ترتیب<select name="sort"><option value="id">مصحف</option><option value="name">الفبا</option><option value="count">تعداد آیات</option><option value="place">محل نزول</option></select></label><label>سوره<select name="surah"></select></label><label>از آیه<input name="start" type="number" min="1" required></label><label>تا آیه<input name="end" type="number" min="1" required></label><label>جزء<select name="juz"></select></label><label>حزب<select name="hizb"></select></label><label>صفحه<select name="page"></select></label><p role="alert"></p><button class="primary">رفتن به آیه</button><button type="button" name="cancel">انصراف</button></form>');
  document.body.append(dialog);
  const form=dialog.querySelector('form'),f=form.elements,err=form.querySelector('[role=alert]');
  const byAddress=new Map(content.ayahs.map(a=>[a.surah_id+':'+a.number,a]));
  document.addEventListener('mansour-open-verse',e=>{const a=byAddress.get(e.detail.join(':'));if(a){view('reader');go(a.surah_id,a.number)}else toast(msg("study.invalid_verse_address"))});
  const lookupNotes=button($('reader').querySelector('.reader-actions'),msg("study.notes_on_this_verse"),()=>{view('notebook');if($('nb-search')){$('nb-search').value='[['+selected().surah_id+':'+selected().number+']]';$('nb-search').dispatchEvent(new Event('input'))}});
  function populate(id) {
    const q=normalize(f.query.value);
    const rows=content.surahs.filter(s=>normalize(s.name_ar).includes(q));
    rows.sort((a,b)=>f.sort.value==='name'?a.name_ar.localeCompare(b.name_ar,'fa'):f.sort.value==='count'?b.ayah_count-a.ayah_count:f.sort.value==='place'?a.revelation.localeCompare(b.revelation):a.id-b.id);
    f.surah.replaceChildren(...rows.map(s=>uiOption(joinText(localizedNumber(s.id), ' · ', s.name_ar, ' · ', localizedNumber(s.ayah_count), " ", msg("research.verse")), s.id)));
    if(rows.some(s=>s.id===id)) f.surah.value=id;
    form.querySelector('.primary').disabled=!rows.length;
  }
  function sync(a,end=a?.number) {
    if(!a)return;
    f.surah.value=a.surah_id;f.start.max=f.end.max=content.surahs[a.surah_id-1].ayah_count;
    f.start.value=a.number;f.end.value=end;
    for(const key of ['juz','hizb','page'])f[key].value=a[key];
    uiText(err, '');
  }
  for(const key of ['juz','hizb','page']){
    const first=new Map();
    for(const a of content.ayahs)if(!first.has(a[key]))first.set(a[key],a);
    f[key].replaceChildren(...Array.from(first.keys(),n=>uiOption(localizedNumber(n), n)));
    f[key].onchange=()=>{const a=first.get(+f[key].value);f.query.value='';populate(a.surah_id);sync(a)};
  }
  f.surah.onchange=()=>sync(byAddress.get(f.surah.value+':1'));
  f.query.oninput=f.sort.onchange=()=>{populate(+f.surah.value);f.surah.onchange()};
  f.start.onchange=()=>{const a=byAddress.get(f.surah.value+':'+f.start.value);if(a)sync(a,Math.max(a.number,+f.end.value))};
  f.cancel.onclick=()=>dialog.close();
  const openJump=()=>{if(document.querySelector('dialog[open]'))return;f.query.value='';populate(selected().surah_id);sync(selected());dialog.showModal();f.query.focus()};
  form.onsubmit=e=>{e.preventDefault();if(+f.end.value<+f.start.value){uiText(err, msg("study.end_verse_must_be_at_or_after"));return}
    dialog.close();view('reader');
    if(p.readingMode!=='surah'){$('reading-mode').value='surah';$('reading-mode').onchange()}
    p.studyRange=[+f.surah.value,+f.start.value,+f.end.value];go(+f.surah.value,+f.start.value);requestAnimationFrame(()=>$('reading-pane').scrollIntoView({block:'start'}));
  };
  const back=()=>{const opened=document.querySelector('dialog[open]');if(opened){opened.close();return true}
    if($('tools-drawer').open||!$('search-results').hidden)return originalBack();
    if(window.mansourFolioBack)return window.mansourFolioBack();if(!$('home').hidden)return false;view('home');return true};
  window.jameBack=back;
  button(bar,msg("research.home"),()=>view('home'));button(bar,msg("study.back"),back);button(bar,msg("study.choose_surah_and_verse"),openJump);const appearance=document.createElement('dialog');appearance.className='verse-dialog';uiAttr(appearance, 'aria-label', msg("study.quick_reading_settings"));document.body.append(appearance);
  const openAppearance=()=>{appearance.replaceChildren();const h=document.createElement('h2');uiText(h, msg("study.quick_reading_settings"));appearance.append(h);
    const themes=document.createElement('div');themes.className='quick-themes';appearance.append(themes);
    for(const id of ['ivory','sepia','midnight','amoled','high-contrast']){const source=document.querySelector('[data-choice="'+id+'"]');button(themes,source.textContent,()=>source.click())}
    for(const [key,label] of [['qSize','قرآن'],['tSize','ترجمه'],['bSize','تفسیر']]){const wrap=document.createElement('label'),slider=document.createElement('input');slider.type='range';slider.min=12;slider.max=50;slider.value=$(key).value;uiText(wrap,authoredLabel(label));wrap.append(slider);appearance.append(wrap);slider.oninput=()=>{$(key).value=slider.value;$(key).onchange()}}
    const sample=document.createElement('p');sample.className='stream-arabic';sample.lang='ar';uiText(sample, selected().text_original);appearance.append(sample);
    button(appearance,msg("study.large_text"),()=>{for(const [i,key] of ['qSize','tSize','bSize'].entries()){const slider=appearance.querySelectorAll('input')[i];slider.value=i===0?40:26;slider.oninput()}});
    button(appearance,msg("study.done"),()=>appearance.close());appearance.showModal()};
  button(bar,'Aa',openAppearance);
  const old=$('surah').closest('.reader-toolbar');for(const field of old.querySelectorAll('label,#go-page'))field.hidden=true;
  const updateRange=()=>{const r=p.studyRange;for(const row of $('verse-stream').children){const a=content.ayahs[+row.dataset.ayah-1];row.classList.toggle('study-range',!!a&&a.surah_id===r?.[0]&&a.number>=r[1]&&a.number<=r[2])}};
  new MutationObserver(updateRange).observe($('verse-stream'),{childList:true});dialog.addEventListener('close',updateRange);
  const settings=$('settings').querySelector('.settings-fields');
  function selectSetting(parent,label,key,options,fallback,onchange){
    const wrap=document.createElement('label'),input=document.createElement('select');uiText(wrap,authoredLabel(label));wrap.append(input);parent.append(wrap);
    input.replaceChildren(...options.map(([v,n])=>uiOption(authoredLabel(n), v)));input.value=p[key]??fallback;
    input.onchange=()=>{p[key]=input.value;remember();onchange(input.value)};onchange(input.value);return input;
  }
  for(const [key,label,def] of [['qSize','اندازهٔ قرآن',p.font+13],['tSize','اندازهٔ ترجمه',p.font],['bSize','اندازهٔ تفسیر',p.font]]){
    selectSetting(settings,label,key,Array.from({length:39},(_,i)=>[i+12,fa(i+12)]),def,v=>document.body.style.setProperty('--'+key,v+'px')).id=key;
  }
  button(settings,msg("study.large_text"),()=>{for(const [key,n] of [['qSize',40],['tSize',26],['bSize',26]]){$(key).value=n;$(key).onchange()}});
  selectSetting(document.querySelector('.reading-controls'),'چیدمان ترجمه','translationStyle',[['below','زیر آیه'],['parallel','روبه‌رو'],['selected','فقط آیهٔ انتخابی']],'below',v=>document.body.dataset.translation=v);
  const tools=document.querySelector('.reading-controls');
  let timer;
  const stop=()=>{clearInterval(timer);timer=null;scroll.dataset.autoscroll='stopped';uiText(scroll, msg("study.start_scrolling"))};
  const scroll=button(tools,msg("study.start_scrolling"),()=>{if(timer)return stop();scroll.dataset.autoscroll='running';uiText(scroll, msg("folio.stop_scrolling"));timer=setInterval(()=>{const s=p.focusReading?document.scrollingElement:$('verse-stream');if($('reader').hidden||document.hidden||s.scrollTop+s.clientHeight>=s.scrollHeight-1)return stop();s.scrollTop+=Number(p.scrollSpeed)||2},60)});
  selectSetting(tools,'سرعت','scrollSpeed',[[1,'آهسته'],[2,'معمولی'],[4,'سریع']],2,()=>{});
  if(window.MansourAndroid?.keepAwake){
    const awake=()=>window.MansourAndroid.keepAwake(p.awake==='on'&&!$('reader').hidden&&!document.hidden);
    selectSetting(settings,'صفحه هنگام تلاوت','awake',[['off','عادی'],['on','روشن بماند']],'off',awake);
    new MutationObserver(awake).observe($('reader'),{attributes:true,attributeFilter:['hidden']});document.addEventListener('visibilitychange',awake);
  }
  const plan=document.createElement('section');plan.className='source-card';uiMarkup(plan, '<h3>برنامهٔ ختم</h3><p role="status"></p>');
  $('home').querySelector('.welcome-copy').append(plan);
  const status=plan.querySelector('p');
  function progress(){const done=p.khatmahPage||0;uiText(status, joinText(msg("study.pages_read"), " ", localizedNumber(done), " ", msg("study.of_604_daily_target"), " ", localizedNumber(Math.ceil(604/(Number(p.planDays)||30))), " ", msg("research.page")))}
  selectSetting(plan,'مدت ختم','planDays',[[30,'۳۰ روز'],[60,'۶۰ روز']],30,progress);
  button(plan,msg("study.resume_plan"),()=>{const a=content.ayahs.find(a=>a.page===Math.min(604,(p.khatmahPage||0)+1));if(a){view('reader');go(a.surah_id,a.number)}});
  button(tools,msg("study.mark_this_page_as_read"),()=>{p.khatmahPage=selected().page;remember();progress();toast(msg("study.reading_progress_saved"))});
  for(const [key,title] of [['researchPin','پژوهش'],['readingPin','تلاوت']]){
    button(tools,joinText(msg("study.pin"), " ", authoredLabel(title)),()=>{p[key]=selected().id;remember();pin.hidden=false;toast(msg("study.pin_saved"))});
    const pin=button(plan,joinText(msg("study.open_pin"), " ", authoredLabel(title)),()=>{const a=content.ayahs[p[key]-1];if(a){view('reader');go(a.surah_id,a.number)}});pin.hidden=!p[key];
  }
  const word=$('nb-editor')&&button($('nb-editor'),msg("study.export_word"),async()=>{try{
    const text=$('nb-text').value,refs=text.split('\n').filter(line=>line.startsWith('منبع:')).map(s=>s.slice(5).trim()).filter(Boolean);
    await saveBinary('mansour-note.docx',await makeWord($('nb-title').value,text,refs));
  }catch(e){toast(joinText(msg("study.word_export_failed"), " ", e.message))}});
  if($('nb-editor'))button($('nb-editor'),msg("study.insert_verse_and_citation"),()=>{const t=$('nb-text');if(t.readOnly)return;const a=selected();t.setRangeText('\n'+a.text_original+'\n[['+a.surah_id+':'+a.number+']]\nمنبع: قرآن کریم، '+content.surahs[a.surah_id-1].name_ar+'، آیهٔ '+fa(a.number)+'\n',t.selectionStart,t.selectionEnd,'end');t.dispatchEvent(new Event('input'))});
  button($('reader').querySelector('.reader-actions'),msg("study.verse_image_card"),async()=>{try{const a=selected();await document.fonts.ready;const canvas=document.createElement('canvas');canvas.width=1080;const c=canvas.getContext('2d');c.font='44px Amiri,serif';let lines=[],line='';
    for(const token of a.text_original.split(' ')){if(line&&c.measureText(line+' '+token).width>900){lines.push(line);line=''}line+=(line?' ':'')+token}lines.push(line);canvas.height=260+lines.length*100;c.fillStyle=getComputedStyle(document.body).getPropertyValue('--panel');c.fillRect(0,0,canvas.width,canvas.height);c.fillStyle=getComputedStyle(document.body).color;c.direction='rtl';c.textAlign='center';c.font='44px Amiri,serif';lines.forEach((l,i)=>c.fillText(l,540,120+100*i));c.font='30px Vazirmatn,sans-serif';c.fillText(content.surahs[a.surah_id-1].name_ar+' · '+fa(a.number)+' | منصور',540,canvas.height-60);await saveBinary('mansour-ayah.png',await new Promise(ok=>canvas.toBlob(ok)))}catch(e){toast(e.message)}});
  document.addEventListener('keydown',e=>{if(e.defaultPrevented||document.querySelector('dialog[open]'))return;
    const k=e.key.toLowerCase();const actions=e.ctrlKey?{g:openJump,h:()=>view('home'),n:()=>{view('notebook');$('nb-new').click()},b:()=>$('bookmark').click(),...(e.shiftKey&&!$('notebook').hidden&&!$('nb-editor').hidden?{e:()=>word.click()}:{})}:e.altKey?{arrowright:()=>$('prev').click(),arrowleft:()=>$('next').click()}:{f4:openJump};
    if(actions[k]){e.preventDefault();actions[k]()}});
  const openSearch=()=>{view('library');$('fts-panel').open=true;$('fts-panel').querySelector('input').focus()};
  button($('home').querySelector('.welcome-actions'),msg("study.search_source_texts"),openSearch).dataset.command='source-search';
  document.addEventListener('keydown',e=>{if(!e.ctrlKey||document.querySelector('dialog[open]'))return;
    if(e.key.toLowerCase()==='k'||(e.shiftKey&&e.key.toLowerCase()==='f')){e.preventDefault();openSearch()}
    if(e.key.toLowerCase()==='f'&&!e.shiftKey&&!$('book').hidden){e.preventDefault();$('book-search').focus()}});
  const addClip=(text,citation)=>{if(!$('nb-new'))return toast(msg("study.notebook_unavailable"));view('notebook');$('nb-new').click();$('nb-title').value=citation.slice(0,200);$('nb-text').value=text.slice(0,98500)+'\nمنبع: '+citation;$('nb-text').dispatchEvent(new Event('input'))};
  for(const [id,cite] of [['book-page-text',()=>$('book-citation').textContent],['mizan-text',()=>'المیزان، جلد '+$('mizan-volume').value+'، صفحهٔ '+$('mizan-page').value]]){
    const area=$(id);const clip=button(area.parentNode,msg("study.take_a_note_from_this_page"),()=>{const selection=getSelection();addClip(selection.rangeCount&&area.contains(selection.anchorNode)&&selection.toString()?selection.toString():area.innerText,cite())});area.after(clip);
  }
  setupCompare();
  async function setupCompare(){
    const block=document.createElement('details');uiMarkup(block, '<summary>مقایسهٔ واژه‌ها و ریشه‌ها</summary><form><label>واژه یا ریشهٔ اول<input required></label><label>واژه یا ریشهٔ دوم<input required></label><button>مقایسه</button></form><div></div>');
    block.className='lexical-observatory';$('words-search').before(block);const out=block.lastElementChild;let request=0;
    block.querySelector('form').onsubmit=async e=>{e.preventDefault();const ticket=++request;uiText(out, msg("study.comparing"));
      try{const [roots,lexicon]=await Promise.all([load('kalemat/roots.json'),load('kalemat/lexicon.json')]);const inputs=Array.from(block.querySelectorAll('input'),i=>normalize(i.value).replace(/\s/g,''));
        const cols=await Promise.all(inputs.map(async q=>{const root=roots.find(r=>normalize(r.root).replace(/\s/g,'')===q);if(root)return load('kalemat/roots/'+root.id+'.json');
          const forms=lexicon.filter(w=>normalize(w.arabic).replace(/\s/g,'')===q);
          if(!forms.length)throw Error('واژه یا ریشه پیدا نشد: '+q);
          const ids=[...new Set(forms.map(w=>w.rootId).filter(Boolean))];const data=await Promise.all(ids.map(id=>load('kalemat/roots/'+id+'.json')));
          return {display:forms[0].arabic,occurrences:data.flatMap(r=>r.occurrences.filter(o=>normalize(o.arabic).replace(/\s/g,'')===q))}}));
        if(ticket!==request)return;out.replaceChildren();let report='';
        for(const col of cols){const panel=document.createElement('article'),head=document.createElement('h3');const meccan=col.occurrences.filter(o=>content.surahs[o.surah-1].revelation==='meccan').length;
          uiText(head, joinText(col.display, " ", msg("study.meccan"), " ", localizedNumber(meccan), " ", msg("study.medinan"), " ", localizedNumber(col.occurrences.length-meccan)));report+=head.textContent+'\n';panel.append(head);const distribution=document.createElement('progress');distribution.max=col.occurrences.length||1;distribution.value=meccan;uiAttr(distribution, 'aria-label', head.textContent);panel.append(distribution);
          for(const o of col.occurrences.slice(0,12)){const a=byAddress.get(o.surah+':'+o.ayah);if(!a)continue;const words=a.text_original.split(' '),i=o.position-1;
            const label=words.slice(Math.max(0,i-3),i+4).join(' ')+' · '+content.surahs[o.surah-1].name_ar+' '+fa(o.ayah);report+=label+'\n';button(panel,label,()=>{view('reader');go(o.surah,o.ayah)})}out.append(panel)}
        button(out,msg("study.send_comparison_to_notebook"),()=>{view('notebook');$('nb-new').click();$('nb-title').value='مقایسهٔ '+cols.map(r=>r.display).join(' و ');$('nb-text').value=report;$('nb-text').dispatchEvent(new Event('input'))});
      }catch(error){if(ticket===request)uiText(out, error.message)}};
  }
}
