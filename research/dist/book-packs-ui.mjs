import {localizedNumber, msg, uiText} from './i18n.mjs';
export function createPackManager({load,fa,toast,openView}){
 const $=id=>document.getElementById(id);
 let catalog={packs:[]},downloads={packs:[]},status={packs:[],busy:false},choosing=false;
 const parse=value=>typeof value==='string'?JSON.parse(value):value;
 const importButtons=()=>document.querySelectorAll('[data-import-pack]');
 function updateButtons(){for(const button of importButtons())button.disabled=choosing||status.busy||!window.MansourBooks;}
 function link(title,url){const a=document.createElement('a');a.className='pack-download';uiText(a, title);a.href=url;a.rel='noopener noreferrer';return a;}
 async function refresh(){
  try{
   [catalog,downloads]=await Promise.all([load('full-books/packs.json'),load('library-downloads.json')]);
   if(window.MansourBooks)status=parse(await Promise.resolve(window.MansourBooks.getInstalledPacks()));
   render();return status;
  }catch(e){uiText($('packs-summary'), msg("book-packs-ui.cannot_read_pack_status_try_refresh_status"));updateButtons();throw e;}
 }
 async function importPack(){
  if(choosing||status.busy)return;
  openView('packs');
  if(!window.MansourBooks)return toast(msg("book-packs-ui.open_mansour_for_windows_or_android_to"));
  choosing=true;updateButtons();
  try{await Promise.resolve(window.MansourBooks.importBookPack());await refresh();}
  catch(e){toast((e.message || msg("book-packs-ui.could_not_select_a_file")));}
  finally{choosing=false;updateButtons();}
 }
 function render(){
  const installed=new Set(status.packs.filter(p=>p.installed).map(p=>p.id));
  uiText($('packs-summary'), (window.MansourBooks ? msg("book-packs-ui.0_of_1_packs_imported", localizedNumber(installed.size), localizedNumber(catalog.packs.length)) : msg("book-packs-ui.download_packs_in_a_browser_then_import")));
  uiText($('library-pack-status'), (window.MansourBooks ? msg("book-packs-ui.0_of_1_book_packs_available_locally", localizedNumber(installed.size), localizedNumber(catalog.packs.length)) : msg("book-packs-ui.download_book_packs_and_import_them_in")));
  $('packs-release').replaceChildren();
  if(downloads.releaseUrl)$('packs-release').append(link('صفحهٔ همهٔ فایل‌های کتابخانه در گیت‌هاب ↗',downloads.releaseUrl));
  $('pack-list').replaceChildren();
  for(const pack of catalog.packs){
   const card=document.createElement('article');card.className='source-card pack-card';
   const title=document.createElement('h3');uiText(title, (pack.title || pack.id));
   const info=document.createElement('p');uiText(info, msg("book-packs-ui.0_mb_1_book_collections", localizedNumber(Math.round(pack.bytes/1000000)), localizedNumber(pack.books?.length||0)));
   const state=document.createElement('strong');uiText(state, (installed.has(pack.id) ? msg("book-packs-ui.installed_and_ready") : msg("book-packs-ui.import_required")));
   const file=document.createElement('p');uiText(file, pack.file);file.dir='ltr';file.className='pack-filename';
   const actions=document.createElement('div');actions.className='pack-actions';
   const download=downloads.packs.find(p=>p.file===pack.file);
   if(download)actions.append(link('دانلود این بسته ↗',download.url));
   if(!installed.has(pack.id)){
    const pick=document.createElement('button');uiText(pick, msg("book-packs-ui.choose_downloaded_zip"));pick.dataset.importPack='';pick.onclick=importPack;actions.append(pick);
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
  uiText($('pack-progress'), (d.state==='verifying' ? msg("book-packs-ui.verifying_pack_integrity_keep_the_app_open") : (d.state==='extracting' ? msg("book-packs-ui.importing_files_0_of_1", localizedNumber(d.files||0), localizedNumber(d.total||0)) : (d.state==='complete' ? msg("book-packs-ui.pack_imported_choose_another_or_return_to") : (d.state==='cancelled' ? msg("book-packs-ui.file_selection_cancelled_you_can_try_again") : (d.message || msg("book-packs-ui.import_failed_check_the_download_and_available")))))));
  if(['complete','error','cancelled'].includes(d.state))setTimeout(()=>refresh().catch(e=>toast(e.message)),200);
 });
 updateButtons();
 return {refresh,hasBook:book=>(book.packs||[]).every(id=>status.packs.some(p=>p.id===id&&p.installed))};
}
