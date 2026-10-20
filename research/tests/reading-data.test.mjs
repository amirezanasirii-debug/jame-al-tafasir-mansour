import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../dist/'+p,import.meta.url),'utf8'));
test('complete phrase translations cover every original token exactly once in all canonical verses',()=>{
 const q=read('content.json');let words=0,groups=0,verses=0;
 for(const surah of q.surahs){const chunk=read(`full-words/surahs/${surah.id}.json`);
  assert.equal(Object.keys(chunk.verses).length,surah.ayah_count);
  for(let n=1;n<=surah.ayah_count;n++){const verse=chunk.verses[n];assert(verse);let covered=0;for(const g of verse.groups){assert.equal(g.start,covered);assert(g.length>0);assert(g.arabic.trim()&&g.meaning.trim());covered+=g.length;}assert.equal(covered,verse.words.length);words+=covered;groups+=verse.groups.length;verses++;}
 }
 assert.equal(verses,6236);assert.equal(words,87876);assert.equal(groups,83100);
 const phrase=read('full-words/surahs/92.json').verses[19].groups.find(g=>g.length===2);assert(phrase.arabic.includes('نِعْمَة'));
});
test('grammar and rhetoric address canonical verses without inserting basmalas into numbering',()=>{
 const q=read('content.json');let rhetoric=0,nodes=0;
 for(const s of q.surahs){const d=read(`grammar/surahs/${s.id}.json`);assert.equal(Object.keys(d.verses).length,s.ayah_count);for(let v=1;v<=s.ayah_count;v++){assert(d.verses[v]);nodes+=(d.verses[v].erab?.nodes||[]).length;rhetoric+=(d.verses[v].rhetoric||[]).length;}}
 assert.equal(nodes,147895);assert.equal(rhetoric,16631);
});
test('QuranKalemat root occurrence links resolve to existing verses',()=>{
 const q=read('content.json'),limits=new Map(q.surahs.map(s=>[s.id,s.ayah_count]));
 const roots=read('kalemat/roots.json');let total=0;
 for(const root of roots){const d=read(`kalemat/roots/${root.id}.json`);for(const w of d.occurrences){assert(w.surah>=1&&w.surah<=114);assert(w.ayah>=1&&w.ayah<=limits.get(w.surah));}total+=d.occurrences.length;}
 assert.equal(total,50298);
});
