import {authoredLabel, localizedNumber, msg, uiText} from './i18n.mjs';
// Displays recorded analysis; does not infer missing graph relationships.
export function createGrammarReader({load,fa}) {
 const fields={Entry:'صورت واژه',Affix:'جزء واژه',Pos:'نوع واژه',Case:'اعراب',Root:'ریشه',RootT:'نوع ریشه',Gend:'جنس',Num:'شمار',Time:'زمان',Trans:'تعدی',Voic:'معلوم / مجهول',Temp:'وزن',Def:'معرفه / نکره',DervT:'اشتقاق',Categ:'باب',Varied:'صرف',Alam:'عَلَم',Kol:'کاربرد',Desc:'توضیح'};
 const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!=null)uiText(e, text);if(cls)e.className=cls;return e};
 async function renderVerse(ayah,kind){
  const data=await load(`grammar/surahs/${ayah.surah_id}.json`),verse=data.verses[ayah.number],root=el('div');
  if(kind==='rhetoric'){
   const rows=verse?.rhetoric||[];root.append(el('p',msg("grammar-reader.0_rhetorical_observations_recorded_for_this_verse", localizedNumber(rows.length)),'footnote'));
   for(const row of rows){const card=el('article',null,'ref-card');card.lang='ar';card.append(el('h3',row.Title),el('p',row.Phrase,'source-text'),el('p',row.Description),el('small',(row.PathOrder||[]).map(p=>p.Title).filter(Boolean).join(' ← ')));root.append(card);}
   if(!rows.length)root.append(el('p',msg("grammar-reader.no_rhetorical_observations_recorded_for_this_verse"),'empty'));
  }else{
   root.append(el('p',msg("grammar-reader.morphology_and_syntax_from_the_source_some"),'footnote'));
   // Follow the original next/previous links. Graph IDs are not token offsets.
   const original=verse?.erab?.nodes||[],byId=new Map(original.map(n=>[n.id,n])),seen=new Set(),ordered=[];
   function appendChain(start){let n=start;while(n&&!seen.has(n.id)){seen.add(n.id);ordered.push(n);n=byId.get(n.nextId);}}
   for(const n of original)if(!byId.has(n.prevId))appendChain(n);
   for(const n of original)appendChain(n); // Preserve disconnected source nodes too.
   const rows=ordered.filter(n=>n.Word&&n.Word!=='*'&&Object.keys(n.attributes||{}).length);
   const grid=el('div',null,'word-grid');for(const row of rows){const card=el('article',null,'word-card');const title=el('h3',row.Word);title.lang='ar';card.append(title);const dl=el('dl',null,'grammar-fields');for(const [key,label]of Object.entries(fields)){const value=row.attributes[key];if(value&&value!=='*'){dl.append(el('dt',authoredLabel(label)),el('dd',value));}}card.append(dl);grid.append(card);}root.append(grid);
   if(!rows.length)root.append(el('p',msg("grammar-reader.no_lexical_analysis_recorded_for_this_verse"),'empty'));
  }
  return root;
 }
 return {renderVerse};
}
