# Jami Tafasir 4: documented features and modernization opportunities

Scope: read-only ZIP inspection of installed Persian help and About HTML; no target execution or installation changes. Local intermediate text parsing only. Claims below are documentation claims, not tested runtime behavior. Sources are archive-relative members.

Archives:
- C:/Program Files (x86)/Noor/JamiTafasir4/Data/JamiTafasir4/Help/Help_Fa.zip (83 .htm, 6 .html; screenshots and animated GIFs also present)
- C:/Program Files (x86)/Noor/JamiTafasir4/Data/JamiTafasir4/About/About_Fa.zip (8 HTML members)

## Product scope
The user's chosen target is a publicly distributable offline Windows successor. User states they have permission to redistribute Noor data; this is a user-provided statement, not independently verified documentation. This inspection does not block implementation on further rights confirmation.

## Feature taxonomy

| Domain | Documented behavior | Help member evidence |
|---|---|---|
| Library | Book treasury, collections/personal shelves, bibliographic and author details, related books, searchable hierarchical contents, volume/page reading | Pages/library_library.htm; Pages/library_mycollections.htm; Pages/bibliography.htm; Pages/booklink.htm; Pages/view_textview.htm |
| Full-text research | Simple/advanced Boolean and exact-phrase search; book/author/language/collection facets; scope to main text, footnotes, introductions; Quran/hadith/poetry content filters; Arabic/Persian letter normalization options | Pages/advancesearch.htm; Pages/searchoption.htm; Pages/searchrange.htm; Pages/library_search_betters.htm |
| Verse workspace | Quran navigation by surah/verse/juz/page, custom verse collections, surah information; verse-linked tafsir and hadith | Pages/quranency.htm; Pages/quranencyclopedia.htm; Pages/surahinfo.htm; Pages/tafsir.htm; Pages/hadith.htm |
| Translation study | Continuous translation, comparison of translations for one verse, word alignment across translations; language/type/religious-tradition filters and ordering | Pages/continuoustranslation.htm; Pages/comparetranslations.htm; Pages/alignmenttranslations.htm; Pages/translationinterpretationrange.htm |
| Lexicography | Roots/entries/word forms, occurrence statistics, general entry definition vs verse-specific meaning, source and language filtering | Pages/glossary.htm; Pages/description.htm; Pages/termency.htm; Pages/termresult.htm; Pages/terminologydomain.htm |
| Linguistic analysis | Morphological analysis and lexicon (18 criteria/20 subgroups), graphical syntax with source commentary, rhetoric taxonomy and source explanation | Pages/morphologicaanalysis.htm; Pages/morphologicallexicon.htm; Pages/syntacticanalysis.htm; Pages/rhetoricalanalysis.htm |
| Connections | Related verses by lexical overlap, co-occurrence in tafsir paragraphs, and topic; ranking and filters; citations of verses in books | Pages/relatedverses.htm; Pages/relatedversesoption.htm; Pages/versesinbooks.htm |
| Corpus similarity | User-selected or pasted text similarity against the corpus, similarity threshold, main-text/footnote/introduction scope | Pages/similarity.htm; Pages/similarresault.htm; Pages/similaroption.htm |
| Research projects | Research files, excerpts, marginal notes, tags/index terms, text highlighting, bookmarks, search/sort/date filters, Word export | Pages/pajouhnegar.htm; Pages/researchfile.htm; Pages/pajoohfish.htm; Pages/pajoohmargin.htm; Pages/pajoohindex.htm; Pages/pajoohoption.htm; Pages/view_researchactivities.htm |
| Recitation | Synchronized scanned mushaf, verse translation, reciter/translated-audio selection, Quran/translation/both modes, verse/page repeat, playback speed | Pages/quranreading.htm; Pages/multimediaoption.htm |
| Content management/settings | Download/remove reciter packs; progress and cancellation; language/themes/fonts/backgrounds/diacritics/footnotes; citation/export formatting | Pages/soundmanagement.htm; Pages/downloadmanagement.htm; Pages/generaltools.htm; Pages/view_bookviewsetting.htm |

About_Fa.zip / pages/about_software.html describes five main areas (library, Quran encyclopedia, recitation, vocabulary, morphological lexicon), 903 titles / over 3564 volumes, 137 translations across 33 languages (77 Persian), 404 verse-linked tafsir titles, and 11 sources for exegetical hadith. Treat these as shipped documentation counts; inventory may differ.

## Modern successor recommendations (design inferences, not observed defects)

1. Make a single verse-centered research workspace: Quran location stays fixed while translation, tafsir, hadith, and linguistic panes switch or compare. This consolidates the documented many-tab navigation without dropping scholarly depth.
2. Make search one prominent entry point with visible scope/filter chips and optional advanced mode. Preserve exact phrase, exclusions, roots, Arabic/Persian normalization, footnotes and collection scope; show why each hit matched and a stable source/page citation.
3. Provide independent panes with synchronized verse scrolling and persistent layouts. Documented translation comparisons, word alignment, and verse-tafsir links support this priority. Retain clear distinction between original text, editorial metadata, and computed relationships.
4. Expose alignment/recommendation provenance and uncertainty. The help explicitly warns machine-generated word alignment can be wrong (Pages/alignmenttranslations.htm). Allow correction/reporting, display sources behind co-occurrence, and avoid presenting inferred topical links as established scholarly conclusions.
5. Keep notes/projects local by default with autosave, recoverable deletion, open-format backup/export, citation insertion, and portable project files. This modernizes documented excerpts/notes/tags/Word-only workflows; no existing data migration format is established yet.
6. Design accessible RTL typography, keyboard operation, focus states, zoom and high-contrast modes. Help repeatedly exposes actions only on hover/right-click and via icons; explicit context buttons and keyboard equivalents improve discoverability. Actual accessibility needs runtime testing.
7. Offline-first packaging: local search index and corpus packs, resumable optional audio installs, disk-size indicators, integrity/version manifests, and graceful unavailable-content handling. Documentation confirms separately downloadable audio; no need make normal reading depend on network.
8. Any AI layer should be optional and citation-grounded, with clear source quotations and refusal to invent references. For a first offline Windows release, prioritize reliable reading/search/comparison/notes before large local-model requirements.

## Suggested first releasable slice
- Windows application with local licensed content packs and first-run content validation.
- Library + metadata search, book reader with page/volume and table of contents.
- Quran navigator + two-source translation/tafsir comparison.
- Full-text search with Arabic/Persian normalization and source links.
- Local notes/bookmarks/projects and robust backup/export.
- Installer/update strategy, offline smoke tests, representative large-corpus search performance, and RTL/keyboard verification.

Later parity: detailed morphology/syntax/rhetoric, cross-corpus similarity, rich audio management, source-grounded optional assistant. These depend on the inspected data schemas and distribution scope.

## Rights and content evidence to preserve
About_Fa.zip / pages/about_software.html reserves material/intellectual rights to Noor and states authors/publishers authorized use in this product. Help_Fa.zip / Pages/view_textbook.htm documents copying limits of 10% of a book and 1500 characters per operation. Preserve this as evidence of the original product's constraints; it is not a determination of the user's separate redistribution permission. Before public packaging, map the user's permission to relevant corpus, fonts, audio, images and editorial annotations; avoid assuming every shipped third-party asset has identical terms.

## Limitations
No binaries decompiled, no runtime UX/performance tested, no database schema inferred here. Some help pages appear shared with broader Noor library products (e.g. hadith narrator topics), so verify feature availability against the installed UI. Full stripped HTML text exists only as intermediate work/jami-help-review/Help.txt and About.txt; do not redistribute these source-derived dumps as successor content.
