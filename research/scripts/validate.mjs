import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const root=new URL('../dist/',import.meta.url);const json=p=>JSON.parse(fs.readFileSync(new URL(p,root),'utf8'));
const content=json('content.json');if(content.surahs.length!==114||content.ayahs.length!==6236)throw Error('Quran inventory invalid');
const manifest=json('offline/manifest.json');let tafsirFiles=0,missing=[];for(const book of Object.keys(manifest.books))for(let s=1;s<=114;s++){const file=`offline/tafsir/${book}/${s}.json`;if(fs.existsSync(new URL(file,root))){json(file);tafsirFiles++;}else missing.push(file);}
for(let s=1;s<=114;s++){json(`research-data/${s}.json`);json(`offline/hadith/${s}.json`);if(!fs.existsSync(new URL(`audio/minshawi/${String(s).padStart(3,'0')}.mp3`,root)))throw Error('Missing local audio '+s);}
const mizan=json('almizan/catalog.json');for(const v of mizan.volumes)json(`almizan/${v.volume}.json`);
const report={version:'2.8.0-preview.3',quran:{surahs:114,ayahs:6236,sha256:crypto.createHash('sha256').update(fs.readFileSync(new URL('content.json',root))).digest('hex')},catalog:json('research-data/catalog.json').length,tafsirFiles,missingTafsirFiles:missing,mizanVolumes:mizan.volumes.length,audioFiles:114,scope:'Build/data integrity checks only; missing tafsir files shown as unavailable in UI.'};
fs.writeFileSync(new URL('../BUILD_REPORT.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
