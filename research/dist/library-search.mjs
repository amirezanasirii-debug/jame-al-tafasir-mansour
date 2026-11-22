import {normalize} from './research-core.mjs';
export function setupSearch({content, manifest, openBook, openMizan, go, view, load, toast, notebook}) {
  const panel=document.createElement('details');
  panel.className='source-card';panel.id='fts-panel';
  panel.innerHTML='<summary>جست‌وجو در متن منابع</summary><form><label>عبارت جست‌وجو<input name="term" required maxlength="180" type="search"></label><label>تطبیق<select name="match"><option value="all">همهٔ واژه‌ها</option><option value="any">یکی از واژه‌ها</option><option value="phrase">عبارت دقیق</option><option value="near">نزدیک هم (حداکثر ۵ واژه)</option><option value="exclude">واژهٔ اول بدون بقیه</option><option value="prefix">ابتدای واژه‌ها</option></select></label><label>دامنه<select name="scope"><option value="all">همهٔ منابع موجود</option><option value="quran">قرآن و منابع آیه‌محور</option><option value="mizan">المیزان</option><option value="book">بسته‌های نصب‌شده</option></select></label><label>کتاب یا پدیدآورنده<input name="author" type="search"></label><label>زبان<select name="lang"><option value="">همه</option><option value="ar">عربی</option><option value="fa">فارسی</option></select></label><label>شمارهٔ جلد<input name="volume" type="number" min="1"></label><button type="submit">جست‌وجوی متن</button><button type="button" name="stop" disabled>توقف</button></form><p role="status"></p><div class="fts-results"></div>';
  document.getElementById('library-search').before(panel);
  const form=panel.querySelector('form'), f=form.elements, status=panel.querySelector('[role=status]'), out=panel.lastElementChild;
  let worker, ticket=0;
  function stop() { ticket++;worker?.terminate();worker=null;f.stop.disabled=true; }
  f.stop.onclick=()=>{stop();status.textContent='جست‌وجو متوقف شد.'};
  form.onsubmit=async event=>{
    event.preventDefault();stop();const run=ticket;out.replaceChildren();
    const terms=normalize(f.term.value).match(/[\p{L}\p{N}]+/gu);
    if(!terms){status.textContent='یک واژه وارد کنید.';return}
    const mode=f.match.value, expression=mode==='near'?'NEAR('+terms.map(t=>'"'+t+'"').join(' ')+', 5)':mode==='exclude'?terms.map(t=>'"'+t+'"').join(' NOT '):mode==='phrase'?'"'+terms.join(' ')+'"':terms.map(t=>'"'+t+'"'+(mode==='prefix'?'*':'')).join(mode==='any'?' OR ':' AND ');
    try {
      f.stop.disabled=false;status.textContent='آماده‌سازی منابع…';
      const vols=await load('almizan/catalog.json');
      const raw=await window.MansourBooks?.getInstalledPacks(), installed=new Set((typeof raw==='string'?JSON.parse(raw):raw)?.packs?.filter(p=>p.installed).map(p=>p.id));
      const parts=[
        {type:'quran',key:'quran-v1',title:'قرآن کریم',lang:'ar'},
        ...content.books.map(b=>({type:'quran',key:'verse-'+b.id,source:b.id,title:b.title,lang:b.language})),
        ...vols.volumes.map(v=>({type:'mizan',key:'mizan-'+v.volume,volume:v.volume,title:vols.title+' · جلد '+v.volume,author:vols.author,lang:v.language,volumeNumber:v.volume})),
        ...(manifest?.books||[]).filter(b=>b.packs?.some(id=>installed.has(id))).flatMap(b=>b.volumes.map(v=>({type:'book',book:b.id,volume:v.id,manifest:v.manifest,key:b.packs.join('-')+'-'+v.id,title:b.title+' · جلد '+v.volume,author:b.author,lang:b.language,volumeNumber:Number(v.volume)})))
      ].filter(p=>(!f.lang.value||p.lang===f.lang.value)&&(!f.volume.value||Number(f.volume.value)===p.volumeNumber)&&(f.scope.value==='all'||p.type===f.scope.value)&&normalize(p.title+' '+(p.author||'')).includes(normalize(f.author.value)));
      if(run!==ticket)return;
      if(!parts.length){stop();status.textContent='منبعی در این دامنه پیدا نشد. بسته‌های کتاب را از بخش دانلود کتاب‌ها وارد کنید.';return}
      worker=new Worker(new URL('./search-worker.mjs',import.meta.url),{type:'module'});
      let warning='';
      worker.onmessage=({data:d})=>{
        if(d.warning)warning=d.warning;
        if(d.progress)status.textContent=d.title+' · '+d.progress+' / '+d.total;
        for(const {ref,excerpt,original,part} of d.hits||[]){
          const b=document.createElement('button'),label=document.createElement('strong'),snippet=document.createElement('p');
          label.textContent=part.title+' · '+(part.type==='quran'?ref.join('، '):'صفحهٔ '+(part.type==='book'?ref[1]:ref[0]));
          snippet.textContent=excerpt;b.className='search-item';b.append(label,snippet);out.append(b);
          const preview=document.createElement('details'),summary=document.createElement('summary'),body=document.createElement('p');summary.textContent='پیش‌نمایش و فیش‌برداری';body.textContent=original;preview.className='search-preview';preview.append(summary,body);out.append(preview);
          if(notebook){const clip=document.createElement('button');clip.type='button';clip.textContent='ارسال گزیده به دفتر';clip.onclick=()=>{const text=window.getSelection();const val=body.contains(text?.anchorNode)&&body.contains(text?.focusNode)&&text.toString()?text.toString():original;const source=label.textContent;const id=notebook.capture({title:source,body:(part.type==='quran'?'[['+ref.join(':')+']]\n\n':'')+val+'\nمنبع: '+source});if(id)view('notebook')};preview.append(clip)}
          b.onclick=async()=>{try{if(part.type==='book')await openBook(part.book,{volumeId:part.volume,pageId:ref[0],section:ref[2]});else if(part.type==='mizan')await openMizan(part.volume,ref[0]);else{view('reader');go(...ref)}}catch(e){toast(e.message)}};
        }
        if(d.done||d.error){stop();status.textContent=d.error||('نتیجه: '+d.count.toLocaleString('fa-IR')+(d.count===100?' (۱۰۰ نتیجهٔ اول)':'')+(d.skipped?' · منابع خوانده‌نشده: '+d.skipped+' · '+warning:''))}
      };
      worker.onerror=e=>{stop();status.textContent='خطا در موتور جست‌وجو: '+e.message};
      worker.postMessage({parts,expression});
    }catch(e){if(run===ticket){stop();status.textContent=e.message}}
  };
}
