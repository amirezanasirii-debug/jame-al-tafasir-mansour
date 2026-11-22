import {authoredLabel, joinText, localizedNumber, msg, uiAttr, uiText} from './i18n.mjs';
const $=id=>document.getElementById(id);
const fa=value=>Number(value).toLocaleString('fa-IR');
function element(tag,cls,text){
 const el=document.createElement(tag);if(cls)el.className=cls;if(text)uiText(el, text);return el;
}
function command(parent,title,fn){
 const b=element('button',null,title);b.type='button';b.onclick=fn;parent.append(b);return b;
}
export function createWorkspaceLayout({home,canvas,dossier,single,dock,spine,mode,view,openJump,prefs,remember,toast}){
 const copy=home.querySelector('.welcome-copy'),actions=copy.querySelector('.welcome-actions');
 const art=home.querySelector('.welcome-art'),recent=home.querySelector('.folio-recent'),atlas=home.querySelector('.folio-atlas-wrap');
 const plan=copy.querySelector('.source-card'),author=copy.querySelector('.creator-line');
 const notebook=actions.querySelector('[data-go=notebook]');recent.append(notebook);
 const advanced=actions.querySelector('[data-command=source-search]');
 const mast=element('header','observatory-head'),brand=element('div','observatory-brand');
 const mark=art.querySelector('img');mark.width=52;mark.height=52;brand.append(mark,element('h2',null,msg("workspace-layout.mansour_reading_desk")));
 const form=element('form','command-line'),query=element('input');
 query.type='search';uiAttr(query, 'aria-label', msg("workspace-layout.search_offline_sources"));uiAttr(query, "placeholder", msg("workspace-layout.search_quran_and_books"));
 const submit=element('button',null,msg("research.search"));submit.type='submit';form.append(query,submit);
 form.onsubmit=e=>{e.preventDefault();advanced.click();const f=$('fts-panel').querySelector('form');f.elements.term.value=query.value;if(query.value.trim())f.requestSubmit();else f.elements.term.focus()};
 const pack=element('button','availability');pack.type='button';pack.onclick=()=>view('packs');uiText(pack, msg("workspace-layout.pack_status"));
 async function packStatus(){
  try{const raw=await window.MansourBooks?.getInstalledPacks();const state=typeof raw==='string'?JSON.parse(raw):raw;
    if(state?.packs)uiText(pack, joinText(localizedNumber(state.packs.filter(p=>p.installed).length), " ", msg("workspace-layout.of"), " ", localizedNumber(state.packs.length), " ", msg("workspace-layout.packs_installed")));
  }catch{uiText(pack, msg("workspace-layout.check_pack_status"))}
 }
 packStatus();window.addEventListener('mansour-pack-progress',e=>{if(e.detail?.state==='complete')packStatus()});
 mast.append(brand,form,pack);
 const session=element('article','open-folio'),sessionTop=element('header','open-heading');
 const name=copy.querySelector('h2'),verse=copy.querySelector('.home-verse');
 const address=element('p','folio-address'),resume=element('div','folio-resume-meta');
 name.lang='ar';name.dir='rtl';verse.dir='rtl';
 const location=element('button','jump-home',msg("workspace-layout.choose_verse"));location.type='button';location.onclick=openJump;
 sessionTop.append(address,location);session.append(sessionTop,name,verse,resume,actions);
 const aside=element('aside','session-sidebar');aside.append(recent,plan);
 const footer=element('footer','session-footer');footer.append(author,advanced);
 const sections=atlas.querySelector('.folio-atlas'),items=[...sections.querySelectorAll('button')];
 sections.replaceChildren();
 for(const [title,indices] of [['بخوان',[4]],['بررسی کن',[0,1,3]],['بنویس',[5,6]],['مدیریت منابع',[2,7]]]){
   const group=element('section','atlas-group');group.append(element('h4',null,authoredLabel(title)));
   for(const i of indices)if(items[i])group.append(items[i]);sections.append(group);
 }
 home.replaceChildren(mast,session,aside,atlas,footer);
 const layoutLabel=document.createElement('label'), layoutChoice=document.createElement('select');
 uiText(layoutLabel,msg('home.layout'));
 for(const [id,key] of [['editorial','home.editorial'],['commands','home.commands']]){
   const option=document.createElement('option');option.value=id;uiText(option,msg(key));layoutChoice.append(option);
 }
 const applyLayout=()=>{home.dataset.layout=layoutChoice.value;atlas.open=layoutChoice.value==='commands'};
 layoutLabel.append(layoutChoice);$('settings').querySelector('.settings-fields').append(layoutLabel);
 layoutChoice.value=prefs.homeLayout==='commands'?'commands':'editorial';applyLayout();
 layoutChoice.onchange=()=>{prefs.homeLayout=layoutChoice.value;remember();applyLayout()};
 const reader=$('reader'),originalBar=reader.querySelector('.reader-toolbar'),controls=reader.querySelector('.folio-controls');
 const searchForm=$('search-form'),find=element('details','reader-find');find.append(element('summary',null,msg("workspace-layout.search_verses")),searchForm,$('search-results'));
 const header=element('div','reader-command');reader.prepend(header);
 header.append(originalBar,find,controls);
 const readingFormat=element('div','reading-formats');readingFormat.setAttribute('role','group');uiAttr(readingFormat, 'aria-label', msg("workspace-layout.reading_format"));
 const details=element('details','verse-inspector');details.append(element('summary',null,msg("workspace-layout.selected_verse_and_tools")));
 single.before(details);details.append(single);
 const tools=element('div','dossier-actions');
 command(tools,msg("workspace-layout.listen"),()=>{const player=$('audio');player.scrollIntoView({block:'center'});if(player.paused)player.play().catch(()=>toast(msg("workspace-layout.audio_playback_failed"))) ;else player.pause()});
 for(const [t,k] of [['تفسیر','tafsir'],['واژگان','words'],['روایت','hadith'],['آیات مرتبط','related']])command(tools,authoredLabel(t),()=>{mode('investigate');document.querySelector('#tabs [data-tab="'+k+'"]').click()});
 command(tools,msg("study.go_to_verse"),openJump);
 const toolMenu=element('details','verse-tool-menu');toolMenu.append(element('summary',null,msg('workspace-layout.selected_verse_and_tools')),tools);dossier.after(readingFormat,toolMenu);
 const formats=new Map();
 function sync(){
   const singleMode=$('reading-mode').value==='single';if(singleMode)details.open=true;
   details.classList.toggle('single-verse',singleMode);
   const current=singleMode?'single':!$('stream-translation').checked?'continuous':'verses';
   reader.dataset.format=current;
   for(const [key,b] of formats)b.setAttribute('aria-pressed',String(current===key));
 }
 function setFormat(format){
   const select=$('reading-mode'),tr=$('stream-translation');
   const next=format==='single'?'single':'surah';
   if(select.value!==next){select.value=next;select.dispatchEvent(new Event('change'))}
   if(format!=='single'&&tr.checked!==(format==='verses')){tr.checked=format==='verses';tr.dispatchEvent(new Event('change'))}
   prefs.folioFormat=format;remember();sync();
   if(format!=='single')details.open=false;
 }
 for(const [key,title] of [['continuous','مصحف پیوسته'],['verses','آیه و ترجمه'],['single','تک‌آیه']])formats.set(key,command(readingFormat,authoredLabel(title),()=>setFormat(key)));
 $('reading-mode').addEventListener('change',sync);$('stream-translation').addEventListener('change',()=>{prefs.folioFormat=$('stream-translation').checked?'verses':'continuous';remember();sync()});
 sync();
 const dockLabel=element('h2','dock-label',msg("workspace-layout.verse_evidence"));dock.prepend(dockLabel);
 const disclosure=element('details','evidence-choices');disclosure.append(element('summary',null,msg("workspace-layout.sources_and_comparison_tools")));
 const tabs=$('tabs');tabs.before(disclosure);disclosure.append(tabs,$('tafsir-controls'));disclosure.open=true;
 const spineLabel=spine.querySelector('h3');uiText(spineLabel, msg("workspace-layout.verse_dossier"));
 reader.classList.add('research-workspace');home.classList.add('observatory');
 return (a,s)=>{
   uiText(name, s.name_ar);uiText(address, joinText(msg("workspace-layout.surah"), " ", localizedNumber(s.id), "  ", msg("workspace-layout.verse"), " ", localizedNumber(a.number)));
   uiText(resume, joinText(msg("research.juz"), " ", localizedNumber(a.juz), "  ", msg("workspace-layout.hizb"), " ", localizedNumber(a.hizb), "  ", msg("workspace-layout.page"), " ", localizedNumber(a.page)));
   uiText(dockLabel, joinText(msg("workspace-layout.evidence_for"), " ", s.name_ar, ' · ', localizedNumber(a.number)));
   sync();
 };
}
