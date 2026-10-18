# Jami Tafasir 4: read-only data findings

Inspected 2026-10-18. Sources under `C:/ProgramData/Noor/JamiTafasir4/`: `library.db`, `Quran.db`, and exactly one representative book database, `Books/01396/01396_001.db`. REA SQLite inspector read schema; Node 24.20.0 `node:sqlite` with `{readOnly:true}` ran bounded samples and aggregate SELECT queries. No source edits, extension loading, decryption, or target execution.

## What is immediately usable

- `library.db`: 903 Series, 3,586 Document rows. Catalog titles, authors, publishers, languages, subjects, document metadata are ordinary SQLite text.
- `Quran.db`: 6,348 verse rows, 18,932 translation rows across three translations, 33,879 tafsir-reference rows. Verse and translation text can be read directly.
- IMPORTANT: 112 verse rows have `VerseNumber=0`. These are additional basmala rows, not additional canonical numbered verses. There are 6,236 numbered verses. `(QuranSurahId,VerseNumber)` has no duplicates in this database. Preserve source verse IDs and never compute verse IDs from a standard cumulative verse-count formula.
- Translation IDs 1 and 2 each have 6,348 rows; ID 3 has 6,236. Treat missing verse-0 translations as valid missing data.
- Representative book has 933 Page rows and 1,728 DocItem rows, but **all DocItem.context values are NULL**. Its TOC/page/paragraph structure is readable; its prose is not present in this column.
- `Quran.BookVolumPages` has 344,331 rows, but **all PageContent, XmlContent and PagePhotoContent values are NULL**. These rows are address metadata, not a usable complete book-text corpus.

## Catalog model and query

`Series(id,title,shortTitle,AuthorId,PublisherId,serialCount)` links to Author and Publisher. `Document(id,SeriesId,serialNo,partTitle,info,...)` is a volume/document. `Document.info` is XML metadata. `Series_languages(id,value)`, `SeriesSubject(seriesId,subjectId)`, `Subject(id,name)`, and Shelf/ShelfBook support filters. Do not include the opaque Series.key BLOB in UI or exports; it was not sampled.

```sql
SELECT s.id,s.title,s.shortTitle,a.name AS author,p.name AS publisher,
       s.serialCount
FROM Series s
LEFT JOIN Author a ON a.id=s.AuthorId
LEFT JOIN Publisher p ON p.id=s.PublisherId
ORDER BY s.title,s.id LIMIT ? OFFSET ?;

SELECT id,serialNo,partTitle,info FROM Document
WHERE SeriesId=? ORDER BY serialNo,id;
```

Verified example: series `01396` is جواهر التفسیر, author کاشفی، حسین بن علی; document `01396_001` maps to the observed path `Books/01396/01396_001.db`. Do not assume every catalog entry has an installed corresponding file; check exact paths beneath the approved data root. Avoid exposing arbitrary path reads via renderer input.

## Book structure

- `Page(id,Book_id,serialNo,number,PageLayoutId)`: preserve `number` as text (printed page label). `serialNo` is reading order, not printed page number. First sampled page has id=1, serialNo=1, number='4'.
- `DocItem(id,Book_id,itemNo,SectionId,StoryId,pageNumber,length,context)`: paragraph/content-unit metadata. `itemNo` is TEXT; numeric sorting needs a validated conversion.
- `Story(id,type,name)` distinguishes MainText (sample id 1) and Footnote (sample id 2).
- `Section(id,type,title,sectionNumber,ParentId)` provides volume/section structure.
- `PageBreak(PageId,DocItemId,StartOffset)` links page starts to document-item offsets. First sampled offsets are 15. Do not assume these are UTF-8 bytes, Unicode scalar indices, or UTF-16 indices until the actual content format is known.
- `tableofContent(id,title,levelNo,ParentId,DocItemId,startOffset,endOffset)` forms a tree; root id 0 has ParentId NULL and DocItemId NULL. TOC offsets similarly require content-format validation.
- `ExtraData(key,Book_id,value)` contains `info` (5,587 bytes) and `dictionary` (176 bytes); values were not decoded.
- `PdfPageMap(Id,PageIndex)` exists; existence alone does not prove associated PDF files are installed.

```sql
SELECT id,serialNo,number FROM Page ORDER BY serialNo,id LIMIT ? OFFSET ?;
SELECT pb.DocItemId,pb.StartOffset,d.itemNo,d.SectionId,d.StoryId,d.pageNumber
FROM PageBreak pb JOIN DocItem d ON d.id=pb.DocItemId
WHERE pb.PageId=? ORDER BY pb.StartOffset,d.id;
SELECT id,title,levelNo,ParentId,DocItemId,startOffset,endOffset
FROM tableofContent ORDER BY id;
```

The PageBreak query identifies starts, not necessarily every item spanning a page. It cannot by itself reconstruct complete page prose. The representative directory contains `01396.jpg`, `01396_001.jpg`, `01396_001.db`, `Image01396_001.zip`. Archive contents were not opened in this subtask. This sample does not establish that all books lack readable content elsewhere.

## Quran, translation, and tafsir addresses

`QuranSurahs(QuranSurahId,SurahTitle,SurahOrder,Kind)` and `QuranSurahVerses(QuranSurahVerseId,QuranSurahId,VerseNumber,VerseContent,VerseContentOthmanTaha,VerseContentOthmanTahaNew,SearchText,SearchTextOthmanTaha,JuzNumber,HizbId,PageNumber,...)` support reader navigation. Preserve original displayed Arabic and use separate normalized text only for searching.

```sql
SELECT QuranSurahVerseId,VerseNumber,VerseContent,
       VerseContentOthmanTaha,JuzNumber,PageNumber
FROM QuranSurahVerses WHERE QuranSurahId=? ORDER BY VerseNumber;

SELECT t.QuranTranslateBookId,b.Title,b.Creator,t.TranslateContent
FROM QuranSurahVerseTranslates t
JOIN QuranTranslateBooks b ON b.QuranTranslateBookId=t.QuranTranslateBookId
WHERE t.QuranSurahVerseId=? ORDER BY t.QuranTranslateBookId;

SELECT r.QuranSurahVerseId,r.BookAutomation,r.RelationTypeId,
       b.Title,v.VolumIdNumber,v.RealVolumNumber,v.SectionNumber,
       p.PageNumber,r.StartParagraphNumber,r.StartWordInParagraph,
       r.EndParagraphNumber,r.EndWordInParagraph
FROM QuranSurahVerseBookVolumPageRelations r
LEFT JOIN BookVolumPages p ON p.BookVolumPageId=r.StartBookVolumPageId
LEFT JOIN BookVolums v ON v.BookVolumId=p.BookVolumId
LEFT JOIN Books b ON b.BookId=v.BookId
WHERE r.QuranSurahVerseId=? LIMIT ?;
```

`RelationTypes` sampled value 1 is تفسير. Verified sample relation BookAutomation=1913 joins to مجمع البيان في تفسير القرآن, volume `01`, page 92, paragraph 38. Catalog series `01913` is مجمع البيان, supporting a candidate cross-database mapping `String(BookAutomation).padStart(5,'0')`. Validate this against every selected series before treating it as universal; virtual and real volume numbers both exist and can differ. Do not equate `StartParagraphNumber` with `DocItem.id` without a cross-check in that book.

Root/word tables (`QuranRoots`, `QuranRootAddress`, `QuranRootWordWithErab`, `QuranWordWithErab`, `QuranWordWithErabAddress`) support morphology-aware navigation. Audio tables expose sound IDs and per-verse timelines, but usable media presence was not checked.

## Implementation recommendations and limits

Keep source DB connections read-only. Store notes, bookmarks, reading positions and any FTS index in a separately owned new application database. A working offline first milestone can honestly include real catalog browsing, real Quran/translation reading, and tafsir reference navigation; complete tafsir prose reading remains dependent on locating an authorized accessible content source. Do not manufacture missing book text or present sample prose as extracted text.

Normalize Arabic/Persian kaf/ya and diacritics in a search-only field; retain exact original text for rendering and citations. SQLite NOCASE alone does not provide Persian orthographic normalization. Use parameter binding, limits, explicit columns and a narrow trusted-main-process API. Sanitize imported XML/HTML and never execute data as instructions/scripts.

REA library SHA-256: `73cdc6932fe2fd0d2173a4b1b86bf268ce6b9231ad3cdf7f1b9e00093282bda7`; evidence `ev_cf9d418e79291a7ada52eafed1fb2b3c757ecf1e5be5e7dda622db1f2cea4baf`. Representative book SHA-256: `ab6ff64cb980bed8f89264001dae7e5d3fd7e47ae577cb1fe72f04db38c203af`. REA reported no sibling WAL for these two files. No atomic live snapshot, full integrity check, exhaustive cross-database coverage, encryption analysis, or full-corpus readability was established.
