import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
const root=process.argv[2]||'C:/ProgramData/Noor/JamiTafasir4';
const output=new URL('../dist/research-data/',import.meta.url);
fs.mkdirSync(output,{recursive:true});
const library=new DatabaseSync(path.join(root,'library.db'),{readOnly:true});
const quran=new DatabaseSync(path.join(root,'Quran.db'),{readOnly:true});
const catalog=library.prepare(`SELECT s.id,s.title,s.shortTitle,a.name author,p.name publisher,s.serialCount volumes FROM Series s LEFT JOIN Author a ON a.id=s.AuthorId LEFT JOIN Publisher p ON p.id=s.PublisherId ORDER BY s.title,s.id`).all();
const languages=library.prepare('SELECT id,value FROM Series_languages').all();
const subjects=library.prepare('SELECT ss.seriesId,s.name FROM SeriesSubject ss LEFT JOIN Subject s ON s.id=ss.subjectId').all();
for(const b of catalog){b.languages=languages.filter(l=>l.id===b.id).map(l=>l.value);b.subjects=subjects.filter(s=>s.seriesId===b.id).map(s=>s.name);b.availability='catalog-only';}
fs.writeFileSync(new URL('catalog.json',output),JSON.stringify(catalog));
const verses=quran.prepare('SELECT QuranSurahVerseId id,QuranSurahId surah,VerseNumber verse FROM QuranSurahVerses WHERE VerseNumber>0').all();
if(verses.length!==6236)throw Error('Unexpected numbered Quran verse count');
const index=new Map(verses.map(v=>[v.id,v]));
const translationBooks=quran.prepare('SELECT QuranTranslateBookId id,Title title,Creator author FROM QuranTranslateBooks').all();
const translations=quran.prepare('SELECT QuranSurahVerseId verseId,QuranTranslateBookId bookId,TranslateContent text FROM QuranSurahVerseTranslates').all();
const refs=quran.prepare(`SELECT r.QuranSurahVerseId verseId,r.BookAutomation automation,r.RelationTypeId relationType,b.Title title,v.VolumIdNumber volume,v.RealVolumNumber realVolume,p.PageNumber page,r.StartParagraphNumber startParagraph,r.EndParagraphNumber endParagraph FROM QuranSurahVerseBookVolumPageRelations r LEFT JOIN BookVolumPages p ON p.BookVolumPageId=r.StartBookVolumPageId LEFT JOIN BookVolums v ON v.BookVolumId=p.BookVolumId LEFT JOIN Books b ON b.BookId=v.BookId`).all();
const chunks=Object.fromEntries(Array.from({length:114},(_,i)=>[i+1,{translations:{},references:{}}]));
for(const t of translations){const v=index.get(t.verseId);if(!v)continue;(chunks[v.surah].translations[v.verse]??=[]).push({bookId:t.bookId,text:t.text});}
for(const r of refs){const v=index.get(r.verseId);if(!v)continue;const {verseId,...ref}=r;(chunks[v.surah].references[v.verse]??=[]).push(ref);}
for(const [id,chunk]of Object.entries(chunks))fs.writeFileSync(new URL(`${id}.json`,output),JSON.stringify(chunk));
const manifest={version:1,source:'Installed Jami Tafasir 4',importedAt:new Date().toISOString(),permission:'User stated permission to redistribute Noor data in this conversation; document not independently reviewed.',catalogCount:catalog.length,numberedVerses:verses.length,translationBooks,referenceCount:refs.length,limitations:['Catalog entries do not imply full book text availability.','References preserve original page and volume labels.','Source verse IDs mapped by surah and verse number; basmala verse zero omitted from canonical navigation.'],databases:['library.db','Quran.db'].map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))};
fs.writeFileSync(new URL('manifest.json',output),JSON.stringify(manifest,null,2));
library.close();quran.close();console.log(JSON.stringify({catalog:catalog.length,verses:verses.length,references:refs.length}));
