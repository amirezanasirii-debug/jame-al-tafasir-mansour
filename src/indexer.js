import {normalizeSearch} from './verseSearch.js';
export const words = text => normalizeSearch(text).match(/[\p{L}\p{N}]+/gu)||[];
export function createIndex(rows){
 const index=new Map();
 rows.forEach((r,i)=>{for(const w of new Set(words(r.text))) {if(!index.has(w))index.set(w,[]);index.get(w).push(i)}});
 return {rows,index};
}
export function searchIndex({rows,index},query,volume=0,offset=0,limit=30){
 const terms=[...new Set(words(query))];if(!terms.length)return {total:0,rows:[]};
 const lists=terms.map(t=>index.get(t)||[]).sort((a,b)=>a.length-b.length);
 const rest=lists.slice(1).map(l=>new Set(l));
 const ids=lists[0].filter(id=>(!volume||rows[id].volume===volume)&&rest.every(s=>s.has(id)));
 return {total:ids.length,rows:ids.slice(offset,offset+limit).map(i=>rows[i])};
}
