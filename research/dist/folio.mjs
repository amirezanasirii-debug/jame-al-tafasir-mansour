const byId=id=>document.getElementById(id);
const number=n=>Number(n).toLocaleString('fa-IR');
function node(tag,text,className){
  const element=document.createElement(tag);
  if(text!==undefined)element.textContent=text;
  if(className)element.className=className;
  return element;
}
function action(parent,text,fn){
  const b=node('button',text);b.type='button';b.onclick=fn;parent.append(b);return b;
}
export function evidenceButton({a,id,title,quote,edition,volume,page,position}){
  const ref={surah:a.surah_id,verse:a.number,source:id,title,edition,volume,page,position};
  const button=node('button','افزودن شاهد به فیش','capture-source');
  button.type='button';button.dataset.source=id;button.dataset.position=position??'';
  button.onclick=()=>{
    const selection=window.getSelection();
    const container=button.parentElement.querySelector('.source-text');
    const selectionText=selection?.toString().trim();
    const selected=selectionText&&container?.contains(selection.anchorNode)&&container.contains(selection.focusNode);
    document.dispatchEvent(new CustomEvent('mansour-capture',{detail:{ref,quote:selected?selectionText:quote}}));
  };
  return button;
}

export function setupFolio({content,selected,go,view,notebook,preferences:p,remember,toast}){
  const reader=byId('reader'),home=byId('home'),grid=reader.querySelector('.study-grid');
  const canvas=node('section',undefined,'folio-canvas'),spine=node('aside',undefined,'folio-spine');
  const dock=grid.querySelector('.research-card'),single=grid.querySelector('.quran-card');
  const pane=byId('reading-pane'),stream=byId('verse-stream');
  const rail=node('nav',undefined,'folio-modes');
  rail.setAttribute('aria-label','حالت میزکار');document.body.append(rail);
  const toolbar=reader.querySelector('.reading-controls'),toolbarWrap=node('details',undefined,'folio-controls');
  toolbarWrap.append(node('summary','تنظیمات تلاوت'));toolbar.before(toolbarWrap);toolbarWrap.append(toolbar);
  canvas.append(pane,single);grid.prepend(spine,canvas);
  const notebookDraft=node('details',undefined,'folio-draft');
  notebookDraft.append(node('summary','یادداشت همین آیه'));
  for(const item of [single.querySelector('label[for=note-text]'),byId('note-text'),byId('save-note')])notebookDraft.append(item);
  dock.append(notebookDraft);
  const width=node('input');width.type='range';width.min=26;width.max=44;width.value=p.dockWidth||34;width.setAttribute('aria-label','عرض ستون شواهد');
  const sizing=node('details',undefined,'dock-size');sizing.append(node('summary','عرض پنل شواهد'),width);dock.prepend(sizing);
  const sheetGrip=node('button','بزرگ‌کردن پنل شواهد','sheet-grip');sheetGrip.type='button';dock.prepend(sheetGrip);
  let expanded=false,touchY=0;
  const snap=large=>{expanded=large;dock.style.setProperty('--sheet-size',large?'71dvh':'46dvh');sheetGrip.textContent=large?'کوچک‌کردن پنل شواهد':'بزرگ‌کردن پنل شواهد';sheetGrip.setAttribute('aria-expanded',String(large))};
  sheetGrip.onclick=()=>snap(!expanded);sheetGrip.addEventListener('pointerdown',e=>{touchY=e.clientY;sheetGrip.setPointerCapture(e.pointerId)});sheetGrip.addEventListener('pointerup',e=>{const dy=e.clientY-touchY;if(Math.abs(dy)>30){snap(dy<0);sheetGrip.onclick=()=>{};setTimeout(()=>sheetGrip.onclick=()=>snap(!expanded),250)}});
  function size(){grid.style.setProperty('--dock-width',width.value+'%')}
  width.oninput=size;width.onchange=()=>{p.dockWidth=+width.value;remember()};size();
  action(sizing,'بازنشانی',()=>{width.value=34;size();width.onchange()});
  const dossier=node('header',undefined,'surah-dossier'),surahNumber=node('span',undefined,'surah-no'),surahTitle=node('h2'),surahMeta=node('p');
  const summary=node('div');summary.append(surahTitle,surahMeta);dossier.append(surahNumber,summary);canvas.prepend(dossier);
  const ribbon=single.querySelector('.audio-box');ribbon.classList.add('sound-ribbon');canvas.append(ribbon);
  const audio=byId('audio'),audioTools=node('details');audioTools.append(node('summary','تنظیمات صوت سوره'));ribbon.append(audioTools);
  const rate=node('select'),speed=node('label','سرعت پخش');for(const v of [.75,1,1.25,1.5,2])rate.append(new Option(v.toLocaleString('fa-IR')+'×',v));
  speed.append(rate);audioTools.append(speed);rate.value=p.audioRate||1;audio.playbackRate=Number(rate.value)||1;
  rate.onchange=()=>{audio.playbackRate=+rate.value;p.audioRate=+rate.value;remember()};audio.addEventListener('loadedmetadata',()=>{audio.playbackRate=Number(rate.value)||1});
  for(const [caption,delta] of [['۱۰ ثانیه عقب',-10],['۱۰ ثانیه جلو',10]]){const b=action(audioTools,caption,()=>{if(Number.isFinite(audio.duration))audio.currentTime=Math.min(audio.duration,Math.max(0,audio.currentTime+delta))});b.disabled=!audio.readyState;audio.addEventListener('loadedmetadata',()=>b.disabled=false);audio.addEventListener('emptied',()=>b.disabled=true)}
  const sleep=node('select'),sleepLabel=node('label','توقف خودکار');for(const m of [0,10,20,30])sleep.append(new Option(m?number(m)+' دقیقه':'خاموش',m));sleepLabel.append(sleep);audioTools.append(sleepLabel);
  let sleepTimer;sleep.onchange=()=>{clearTimeout(sleepTimer);if(+sleep.value)sleepTimer=setTimeout(()=>{audio.pause();sleep.value='0'},Number(sleep.value)*60000)};
  audio.addEventListener('error',()=>{toast('فایل تلاوت این سوره خوانده نشد. متن آیات در دسترس است.')});
  const spineTitle=node('h3','مسیر شواهد');const current=node('p'),trail=node('div'),historyList=node('div');
  spine.append(spineTitle,current,trail,node('h4','آیات اخیر'),historyList);
  const homeCopy=home.querySelector('.welcome-copy'),homeTitle=homeCopy.querySelector('h2'),homeVerse=homeTitle.nextElementSibling;
  homeCopy.querySelector('.eyebrow').textContent='امروز در مطالعهٔ من';homeVerse.classList.add('home-verse');homeVerse.lang='ar';
  const homeActions=homeCopy.querySelector('.welcome-actions'),homeRead=homeActions.querySelector('[data-go=reader]');
  homeRead.textContent='ادامهٔ تلاوت';homeRead.onclick=()=>mode('read');
  const investigate=action(homeActions,'ادامهٔ کاوش',()=>mode('investigate'));homeRead.after(investigate);
  const recent=node('aside',undefined,'folio-recent');const notes=node('div');
  recent.append(node('h3','فیش‌های اخیر'),notes);home.append(recent);
  const atlas=home.querySelector('.home-shortcuts');atlas.classList.add('folio-atlas');
  const atlasDetails=node('details',undefined,'folio-atlas-wrap');atlas.before(atlasDetails);
  atlasDetails.append(node('summary','فهرست ابزارهای پژوهش'),atlas);
  for(const [title,dest] of [['تفسیر و حدیث','reader'],['کتاب‌خوان المیزان','mizan'],['دفتر پژوهش','notebook'],['نشان‌های من','notes'],['تنظیمات مطالعه','settings']])
    action(atlas,title,()=>dest==='reader'?mode('investigate'):view(dest));
  const history=[], seen=[];
  let activeView='home', activeMode='read',restoring=false;
  const contact=node('button',undefined,'folio-location');contact.type='button';contact.onclick=()=>byId('jump-title')&&document.querySelector('.study-nav button:nth-child(3)').click();
  document.querySelector('.topbar').append(contact);
  const modeButtons=new Map();
  for(const [id,title] of [['read','تلاوت'],['investigate','کاوش'],['compose','تدوین']])modeButtons.set(id,action(rail,title,()=>mode(id)));

  function label(a){return content.surahs[a.surah_id-1].name_ar+' · آیهٔ '+number(a.number)}
  function currentState(){const a=selected();return {view:activeView,mode:activeMode,s:a.surah_id,v:a.number,offset:stream.scrollTop}}
  function push(){if(restoring)return;const last=history.at(-1),state=currentState();if(!last||['view','mode','s','v'].some(k=>last[k]!==state[k]))history.push(state);if(history.length>40)history.shift()}
  function mode(id){
    const target=id==='compose'?'notebook':'reader';if(id!==activeMode||target!==activeView)push();
    restoring=true;try{activeMode=id;view(target)}finally{restoring=false}
    document.body.dataset.mode=id;
    for(const [key,button] of modeButtons)button.setAttribute('aria-pressed',String(key===id));
    if(id==='investigate'&&p.focusReading)byId('focus-reading').click();
  }
  const offsets=new Map();let pendingScroll=0;
  document.addEventListener('mansour-leave',({detail})=>{offsets.set(detail,window.scrollY)});
  document.addEventListener('mansour-view',({detail})=>{
    if(activeView!==detail){push();cancelAnimationFrame(pendingScroll);pendingScroll=requestAnimationFrame(()=>window.scrollTo(0,detail==='home'?0:offsets.get(detail)||0))}activeView=detail;
    document.body.dataset.mode=detail==='notebook'?'compose':activeMode==='compose'?'read':activeMode;
    if(detail==='reader')activeMode=document.body.dataset.mode;
    for(const [key,b] of modeButtons)b.setAttribute('aria-pressed',String(key===document.body.dataset.mode&&(detail==='reader'||detail==='notebook')));
    if(detail==='home')render();
  });
  function back(){
    const last=history.pop();
    if(!last){if(activeView==='home')return false;view('home');history.length=0;return true}
    restoring=true;
    try{activeMode=last.mode;if(selected().surah_id!==last.s||selected().number!==last.v)go(last.s,last.v);view(last.view);requestAnimationFrame(()=>{stream.scrollTop=last.offset})}finally{restoring=false}
    return true;
  }
  window.mansourFolioBack=back;
  reader.addEventListener('click',e=>{
    if(e.target.closest('.verse-study')||e.target.closest('#word-search'))mode('investigate');
  },true);
  const mobileTrail=action(rail,'مسیر شواهد',()=>{if(activeView!=='reader')mode('read');spine.classList.toggle('spine-open');mobileTrail.setAttribute('aria-expanded',String(spine.classList.contains('spine-open')))});
  mobileTrail.className='mobile-trail';mobileTrail.setAttribute('aria-expanded','false');
  let lastVerse=null;
  function render(){
    const a=selected(),s=content.surahs[a.surah_id-1];
    surahNumber.textContent=number(s.id);surahTitle.textContent=s.name_ar;
    surahMeta.textContent=(s.revelation==='meccan'?'مکی':'مدنی')+' · '+number(s.ayah_count)+' آیه · جزء '+number(a.juz)+' · صفحهٔ '+number(a.page);
    contact.textContent=label(a);contact.setAttribute('aria-label','انتخاب سوره و آیه، '+label(a));current.textContent=label(a);
    homeTitle.textContent=label(a);homeVerse.textContent=a.text_original;
    if(lastVerse&&lastVerse.id!==a.id){if(!restoring&&activeView==='reader'){history.push({...currentState(),s:lastVerse.surah_id,v:lastVerse.number});if(history.length>40)history.shift()}seen.unshift(lastVerse);if(seen.length>8)seen.pop()}
    lastVerse=a;historyList.replaceChildren();
    for(const v of [...new Map(seen.map(v=>[v.id,v])).values()].slice(0,4))action(historyList,label(v),()=>{go(v.surah_id,v.number);mode('read')});
    notes.replaceChildren();const saved=notebook?.recent()||[];
    if(!saved.length)notes.append(node('p','فیشی ثبت نشده است. هنگام مطالعهٔ تفسیر، یک شاهد را به دفتر اضافه کنید.'));
    for(const n of saved)action(notes,n.title||'یادداشت بدون عنوان',()=>{mode('compose');notebook.open(n.id)});
    trail.replaceChildren();
    for(const note of (notebook?.cited(a.surah_id,a.number)||[]).slice(-4))
      action(trail,note.citation.title,()=>{mode('compose');notebook.open(note.id)});
  }
  document.addEventListener('mansour-open-evidence',({detail:r})=>{
    const a=content.ayahs.find(v=>v.surah_id===r.surah&&v.number===r.verse);
    if(!a)return toast('نشانی آیه در این مجموعه موجود نیست.');
    mode('investigate');go(r.surah,r.verse);
    byId('tafsir-one').value=r.source;
    const panel=byId('research-body'),observer=new MutationObserver(()=>{
      const found=Array.from(panel.querySelectorAll('.capture-source')).find(b=>b.dataset.source===r.source&&String(r.position??'')===b.dataset.position);
      if(found){observer.disconnect();found.scrollIntoView({block:'nearest'});found.focus({preventScroll:true})}
    });observer.observe(panel,{childList:true});setTimeout(()=>observer.disconnect(),4500);
    document.querySelector('#tabs [data-tab=tafsir]').click();
  });
  const audioResume=()=>{const mark=p.audioPosition;if(mark&&mark.surah===selected().surah_id&&Number.isFinite(audio.duration)&&mark.time<audio.duration)audio.currentTime=mark.time};
  const saveAudio=()=>{if(audio.readyState&&Number.isFinite(audio.currentTime)){p.audioPosition={surah:selected().surah_id,time:audio.currentTime};remember()}};
  audio.addEventListener('loadedmetadata',audioResume);audio.addEventListener('pause',saveAudio);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)saveAudio()});window.addEventListener('pagehide',saveAudio);
  for(const event of ['pointerdown','wheel'])stream.addEventListener(event,()=>{const b=[...toolbar.querySelectorAll('button')].find(b=>b.textContent==='توقف اسکرول');if(b)b.click()},{passive:true});
  document.addEventListener('mansour-verse',render);
  document.addEventListener('mansour-capture',({detail:{ref,quote}})=>{
    const address=content.surahs[ref.surah-1].name_ar+'، آیهٔ '+number(ref.verse);
    const citation=[ref.title,ref.volume!=null?'جلد '+ref.volume:'',ref.page!=null?'صفحهٔ '+ref.page:'',ref.edition?'ویرایش '+ref.edition:'',address].filter(Boolean).join('، ');
    const id=notebook?.capture({ref,title:ref.title+' — '+address,body:'[['+ref.surah+':'+ref.verse+']]\n\n'+quote+'\n\nمنبع: '+citation});
    if(!id){if(!notebook)toast('دفتر پژوهش قابل دسترسی نیست. پوشهٔ پشتیبان را بررسی کنید.');return;}

    mode('compose');render();
  });
  document.addEventListener('keydown',e=>{if(e.key==='F11'&&activeView==='reader'&&!document.querySelector('dialog[open]')){e.preventDefault();byId('focus-reading').click()}});
  let previousScroll=0;
  window.addEventListener('scroll',()=>{const top=window.scrollY;document.body.classList.toggle('compact-folio',top>100&&top>=previousScroll);previousScroll=top},{passive:true});
  document.body.classList.add('living-folio');document.body.dataset.mode='read';render();
}
