export function createPackManager({load,fa,toast,openView}){
 const $=id=>document.getElementById(id);
 let catalog={packs:[]},downloads={packs:[]},status={packs:[],busy:false},choosing=false;
 const parse=value=>typeof value==='string'?JSON.parse(value):value;
 const importButtons=()=>document.querySelectorAll('[data-import-pack]');
 function updateButtons(){for(const button of importButtons())button.disabled=choosing||status.busy||!window.MansourBooks;}
 function link(title,url){const a=document.createElement('a');a.className='pack-download';a.textContent=title;a.href=url;a.rel='noopener noreferrer';return a;}
 async function refresh(){
  try{
   [catalog,downloads]=await Promise.all([load('full-books/packs.json'),load('library-downloads.json')]);
   if(window.MansourBooks)status=parse(await Promise.resolve(window.MansourBooks.getInstalledPacks()));
   render();return status;
  }catch(e){$('packs-summary').textContent='وضعیت بسته‌ها خوانده نشد؛ «تازه‌سازی وضعیت» را بزنید.';updateButtons();throw e;}
 }
 async function importPack(){
  if(choosing||status.busy)return;
  openView('packs');
  if(!window.MansourBooks)return toast('برای انتخاب فایل ZIP، برنامهٔ ویندوز یا اندروید منصور را باز کنید.');
  choosing=true;updateButtons();
  try{await Promise.resolve(window.MansourBooks.importBookPack());await refresh();}
  catch(e){toast(e.message||'انتخاب فایل انجام نشد.');}
  finally{choosing=false;updateButtons();}
 }
 function render(){
  const installed=new Set(status.packs.filter(p=>p.installed).map(p=>p.id));
  $('packs-summary').textContent=window.MansourBooks?`${fa(installed.size)} بسته از ${fa(catalog.packs.length)} بسته وارد شده است.`:'دانلود بسته‌ها در مرورگر ممکن است؛ برای وارد کردن ZIP، برنامهٔ ویندوز یا اندروید را باز کنید.';
  $('library-pack-status').textContent=window.MansourBooks?`${fa(installed.size)} از ${fa(catalog.packs.length)} بستهٔ کتاب روی این دستگاه آماده است.`:'بسته‌های کتاب را دریافت و در برنامهٔ ویندوز یا اندروید وارد کنید.';
  $('packs-release').replaceChildren();
  if(downloads.releaseUrl)$('packs-release').append(link('صفحهٔ همهٔ فایل‌های کتابخانه در گیت‌هاب ↗',downloads.releaseUrl));
  $('pack-list').replaceChildren();
  for(const pack of catalog.packs){
   const card=document.createElement('article');card.className='source-card pack-card';
   const title=document.createElement('h3');title.textContent=pack.title||pack.id;
   const info=document.createElement('p');info.textContent=`${fa(Math.round(pack.bytes/1000000))} مگابایت · ${fa(pack.books?.length||0)} مجموعهٔ کتاب`;
   const state=document.createElement('strong');state.textContent=installed.has(pack.id)?'✓ نصب‌شده و آمادهٔ مطالعه':'نیازمند ورود فایل بسته';
   const file=document.createElement('p');file.textContent=pack.file;file.dir='ltr';file.className='pack-filename';
   const actions=document.createElement('div');actions.className='pack-actions';
   const download=downloads.packs.find(p=>p.file===pack.file);
   if(download)actions.append(link('دانلود این بسته ↗',download.url));
   if(!installed.has(pack.id)){
    const pick=document.createElement('button');pick.textContent='فایل ZIP را دانلود کرده‌ام؛ انتخاب فایل';pick.dataset.importPack='';pick.onclick=importPack;actions.append(pick);
   }
   card.append(title,info,state,file,actions);$('pack-list').append(card);
  }
  updateButtons();
 }
 for(const button of importButtons())button.onclick=importPack;
 for(const button of document.querySelectorAll('[data-open-packs]'))button.onclick=()=>{openView('packs');$('pack-guide').focus();};
 $('refresh-packs').onclick=()=>refresh().catch(e=>toast(e.message));
 window.addEventListener('mansour-pack-progress',e=>{
  const d=e.detail;
  if(['verifying','extracting'].includes(d.state))status.busy=true;
  if(['complete','error','cancelled'].includes(d.state))status.busy=false;
  updateButtons();
  $('pack-progress').textContent=d.state==='verifying'?'در حال کنترل سلامت فایل بسته؛ برنامه را باز نگه دارید…':d.state==='extracting'?`در حال ورود فایل‌ها: ${fa(d.files||0)} از ${fa(d.total||0)}`:d.state==='complete'?'بسته وارد شد؛ کتاب‌ها آمادهٔ مطالعه‌اند. بستهٔ بعدی را انتخاب کنید یا به کتابخانه برگردید.':d.state==='cancelled'?'انتخاب فایل لغو شد. می‌توانید دوباره انتخاب کنید.':d.message||'ورود بسته انجام نشد؛ کامل بودن دانلود و فضای خالی دستگاه را بررسی کنید.';
  if(['complete','error','cancelled'].includes(d.state))setTimeout(()=>refresh().catch(e=>toast(e.message)),200);
 });
 updateButtons();
 return {refresh,hasBook:book=>(book.packs||[]).every(id=>status.packs.some(p=>p.id===id&&p.installed))};
}
