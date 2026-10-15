import React, {useDeferredValue, useEffect, useMemo, useRef, useState} from 'react';
import {
  ArrowLeft, ArrowRight, BookHeart, BookOpen, Bookmark, Check, ChevronLeft, Copy,
  FileText, Home, Info, Languages, Library, Menu, Minus, Moon, PanelRightClose,
  HeartHandshake, NotebookPen, Plus, Quote, ScanSearch, Search, Settings2, Share2, Sparkles, Sun, X,
} from 'lucide-react';
import Offline from './Offline.jsx';
import About from './pages/About.jsx';
import MinshawiPlayer from './MinshawiPlayer.jsx';
import Notes from './Notes.jsx';
import RelatedHadith from './RelatedHadith.jsx';
import Similarity from './Similarity.jsx';
import Support from './Support.jsx';
import TafsirLibrary from './TafsirLibrary.jsx';
import Vocabulary from './Vocabulary.jsx';
import VerseTafsir from './VerseTafsir.jsx';
import {normalizeSearch, searchQuran} from './verseSearch.js';
import {createUserBackup, parseUserBackup} from './userBackup.js';

const navItems = [
  {id: 'home', label: 'خانه', icon: Home},
  {id: 'quran', label: 'قرآن کریم', icon: BookOpen},
  {id: 'library', label: 'کتابخانه', icon: Library},
  {id: 'similarity', label: 'مشابه‌یاب', icon: ScanSearch},
  {id: 'hadith', label: 'احادیث مرتبط', icon: Quote},
  {id: 'vocabulary', label: 'واژه‌نامه', icon: Languages},
  {id: 'notes', label: 'یادداشت‌ها', icon: NotebookPen},
  {id: 'saved', label: 'نشان‌ها', icon: Bookmark},
  {id: 'settings', label: 'تنظیمات', icon: Settings2},
  {id: 'support', label: 'حمایت از توسعه', icon: HeartHandshake},
];
const QURAN_FONTS = [
  {id: 'amiri-quran', label: 'امیری قرآن', family: "'Amiri Quran', 'Amiri', serif", lineHeight: 2.45},
  {id: 'scheherazade', label: 'شهرزاد نو', family: "'Scheherazade New', 'Amiri', serif", lineHeight: 2.35},
  {id: 'noto-naskh', label: 'نوتو نسخ عربی', family: "'Noto Naskh Arabic', 'Amiri', serif", lineHeight: 2.35},
];
const SEARCH_SCOPES = [
  {id: 'all', label: 'همه'}, {id: 'quran', label: 'قرآن'},
  {id: 'translation', label: 'ترجمه'}, {id: 'tafsir', label: 'تفسیر'},
];
const safeRead = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
const fa = value => Number(value || 0).toLocaleString('fa-IR');
const escapeHtml = value => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function App() {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [view, setView] = useState('home');
  const [selectedId, setSelectedId] = useState(1);
  const [query, setQuery] = useState('');
  const [searchScope, setSearchScope] = useState(() => {
    const stored = safeRead('jm-search-scope', 'all');
    return SEARCH_SCOPES.some(item => item.id === stored) ? stored : 'all';
  });
  const [searchHistory, setSearchHistory] = useState(() => {
    const stored = safeRead('jm-search-history', []);
    return Array.isArray(stored) ? stored.slice(0, 10) : [];
  });
  const [dark, setDark] = useState(() => safeRead('jm-dark', true));
  const [marks, setMarks] = useState(() => {
    const stored = safeRead('jm-marks', []);
    return Array.isArray(stored) ? stored : [];
  });
  const [notes, setNotes] = useState(() => {
    const stored = safeRead('jm-notes', []);
    return Array.isArray(stored) ? stored : [];
  });
  const [markCategories, setMarkCategories] = useState(() => safeRead('jm-mark-categories', {}));
  const [noteDraft, setNoteDraft] = useState(null);
  const [similarityDraft, setSimilarityDraft] = useState(null);
  const [hadithDraft, setHadithDraft] = useState(null);
  const [last, setLast] = useState(() => safeRead('jm-last', null));
  const [fontSize, setFontSize] = useState(() => Math.min(48, Math.max(22, Number(safeRead('jm-font', 32)) || 32)));
  const [quranFont, setQuranFont] = useState(() => {
    const stored = safeRead('jm-quran-font', 'amiri-quran');
    return QURAN_FONTS.some(font => font.id === stored) ? stored : 'amiri-quran';
  });
  const [showTranslation, setShowTranslation] = useState(() => safeRead('jm-translation', true));
  const [readerMode, setReaderMode] = useState('mushaf');
  const [mushafPage, setMushafPage] = useState(1);
  const [activeAyahId, setActiveAyahId] = useState(null);
  const [detailTab, setDetailTab] = useState('translation');
  const [sourceFilter, setSourceFilter] = useState('');
  const [toast, setToast] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const searchInput = useRef(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}content.json`)
      .then(response => { if (!response.ok) throw Error('داده‌های قرآن یافت نشد.'); return response.json(); })
      .then(setData).catch(error => setLoadError(error.message));
  }, []);

  useEffect(() => {
    const values = [
      ['jm-dark', dark], ['jm-marks', marks], ['jm-mark-categories', markCategories], ['jm-notes', notes], ['jm-last', last],
      ['jm-font', fontSize], ['jm-quran-font', quranFont], ['jm-translation', showTranslation],
      ['jm-search-scope', searchScope], ['jm-search-history', searchHistory],
    ];
    try { values.forEach(([key, value]) => localStorage.setItem(key, JSON.stringify(value))); }
    catch { setToast('ذخیرهٔ تنظیمات ممکن نشد؛ فضای دستگاه را بررسی کنید.'); }
  }, [dark, marks, markCategories, notes, last, fontSize, quranFont, showTranslation, searchScope, searchHistory]);

  useEffect(() => {
    const onKeyDown = event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); searchInput.current?.focus();
      }
      if (event.key === 'Escape') {
        if (activeAyahId) setActiveAyahId(null);
        else if (mobileMenu) setMobileMenu(false);
        else if (view === 'reader') setView('quran');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeAyahId, mobileMenu, view]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const surahs = data?.surahs || [];
  const ayahs = data?.ayahs || [];
  const books = data?.books || [];
  const surahMap = useMemo(() => new Map(surahs.map(surah => [surah.id, surah])), [surahs]);
  const ayahMap = useMemo(() => new Map(ayahs.map(ayah => [ayah.id, ayah])), [ayahs]);
  const versesBySurah = useMemo(() => {
    const map = new Map();
    ayahs.forEach(ayah => { if (!map.has(ayah.surah_id)) map.set(ayah.surah_id, []); map.get(ayah.surah_id).push(ayah); });
    map.forEach(list => list.sort((left, right) => left.id - right.id));
    return map;
  }, [ayahs]);
  const versesByPage = useMemo(() => {
    const map = new Map();
    ayahs.forEach(ayah => { if (!map.has(ayah.page)) map.set(ayah.page, []); map.get(ayah.page).push(ayah); });
    map.forEach(list => list.sort((left, right) => left.id - right.id));
    return map;
  }, [ayahs]);
  const entriesByBook = useMemo(
    () => books.map(book => ({...book, byAyah: new Map((book.entries || []).map(entry => [entry.ayah_id, entry]))})),
    [books],
  );
  const translations = useMemo(() => {
    const map = new Map();
    entriesByBook.filter(book => book.kind === 'translation').forEach(book => book.byAyah.forEach((entry, id) => map.set(id, entry.text)));
    return map;
  }, [entriesByBook]);
  const tafsirSearchText = useMemo(() => {
    const map = new Map();
    entriesByBook.filter(book => book.kind === 'tafsir').forEach(book => book.byAyah.forEach((entry, id) => map.set(id, `${map.get(id) || ''} ${entry.text}`)));
    return map;
  }, [entriesByBook]);
  const searchableAyahs = useMemo(() => ayahs.map(ayah => {
    const parts = searchScope === 'quran' ? ayah.text_original
      : searchScope === 'translation' ? translations.get(ayah.id) || ''
        : searchScope === 'tafsir' ? tafsirSearchText.get(ayah.id) || ''
          : `${ayah.text_original} ${translations.get(ayah.id) || ''} ${tafsirSearchText.get(ayah.id) || ''}`;
    const searchText = normalizeSearch(parts);
    return {...ayah, searchText, searchCompact: searchText.replace(/\s/g, ''), matchedSource: searchScope};
  }), [ayahs, translations, tafsirSearchText, searchScope]);
  const deferredQuery = useDeferredValue(query);
  const results = useMemo(
    () => searchQuran(deferredQuery, surahs, searchableAyahs, translations),
    [deferredQuery, surahs, searchableAyahs, translations],
  );
  const selected = surahMap.get(selectedId) || surahs[0];
  const selectedVerses = versesBySurah.get(selected?.id) || [];
  const pageVerses = versesByPage.get(mushafPage) || [];
  const activeAyah = ayahMap.get(activeAyahId);
  const savedVerses = marks.map(id => ayahMap.get(id)).filter(Boolean);
  const noteAyahIds = useMemo(() => new Set(notes.map(note => Number(note.ayahId)).filter(Boolean)), [notes]);
  const activeSources = entriesByBook.filter(book => {
    const expectedKind = detailTab === 'translation' ? 'translation' : 'tafsir';
    return book.kind === expectedKind && book.byAyah.has(activeAyahId)
      && (!sourceFilter || normalizeSearch(book.title).includes(normalizeSearch(sourceFilter)));
  });
  const selectedQuranFont = QURAN_FONTS.find(font => font.id === quranFont) || QURAN_FONTS[0];

  function navigate(next) {
    setView(next); setMobileMenu(false); setQuery('');
    if (next !== 'reader') setActiveAyahId(null);
    window.scrollTo({top: 0, behavior: 'smooth'});
  }
  function rememberSearch(value = query) {
    const clean = String(value || '').trim();
    if (clean.length < 2) return;
    setSearchHistory(current => [clean, ...current.filter(item => normalizeSearch(item) !== normalizeSearch(clean))].slice(0, 10));
  }
  function openSurah(surah, verseNumber = 1) {
    if (!surah) return;
    const list = versesBySurah.get(surah.id) || [];
    const target = list.find(ayah => ayah.number === Number(verseNumber)) || list[0];
    setSelectedId(surah.id); setMushafPage(target?.page || 1);
    setLast({surah: surah.id, verse: target?.number || 1}); setReaderMode('mushaf');
    setView('reader'); setQuery(''); setActiveAyahId(null); window.scrollTo({top: 0});
  }
  function jumpToVerse(surahId, verseNumber) {
    openSurah(surahMap.get(Number(surahId)), Number(verseNumber));
    setReaderMode('verses');
    window.setTimeout(() => document.getElementById(`verse-${Number(verseNumber)}`)?.scrollIntoView({behavior: 'smooth', block: 'center'}), 80);
  }
  function openDetails(ayah) {
    setActiveAyahId(ayah.id); setDetailTab('translation'); setSourceFilter('');
    setLast({surah: ayah.surah_id, verse: ayah.number});
  }
  function toggleMark(ayah) {
    const marked = marks.includes(ayah.id);
    setMarks(current => marked ? current.filter(id => id !== ayah.id) : [...current, ayah.id]);
    setMarkCategories(current => {
      const next = {...current};
      if (marked) delete next[ayah.id];
      else next[ayah.id] = 'بعداً';
      return next;
    });
    setToast(marked ? 'نشان این آیه برداشته شد.' : 'آیه به نشان‌ها افزوده شد.');
  }
  function updateMarkCategory(ayahId, category) {
    setMarkCategories(current => ({...current, [ayahId]: category}));
    setToast('دستهٔ نشان تغییر کرد.');
  }
  function exportUserData() {
    const payload = createUserBackup({notes, marks, markCategories, last});
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'}));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `jame-mansour-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
    setToast('فایل پشتیبان ساخته شد.');
  }
  async function importUserData(file) {
    if (!file) return;
    try {
      const restored = parseUserBackup(await file.text());
      setNotes(restored.notes); setMarks(restored.marks); setMarkCategories(restored.markCategories); setLast(restored.last);
      setToast('یادداشت‌ها و نشان‌ها با موفقیت بازیابی شدند.');
    } catch (error) { setToast(error.message || 'بازیابی فایل انجام نشد.'); }
  }
  async function copyVerse(ayah) {
    const surah = surahMap.get(ayah.surah_id);
    const text = `${ayah.text_original}\n${translations.get(ayah.id) || ''}\nسوره ${surah?.name_ar}، آیه ${ayah.number}`;
    try { await navigator.clipboard.writeText(text); setToast('متن آیه کپی شد.'); }
    catch { setToast('کپی در این دستگاه در دسترس نیست.'); }
  }
  async function shareVerse(ayah) {
    const surah = surahMap.get(ayah.surah_id);
    const text = `${ayah.text_original}\n${translations.get(ayah.id) || ''}\nسوره ${surah?.name_ar}، آیه ${ayah.number}`;
    if (navigator.share) { try { await navigator.share({text}); } catch { /* لغو توسط کاربر */ } }
    else copyVerse(ayah);
  }
  function addNoteFromAyah(ayah) {
    const surah = surahMap.get(ayah.surah_id);
    const translation = translations.get(ayah.id) || '';
    setNoteDraft({id: '', title: `پژوهش آیهٔ ${fa(ayah.number)} سوره ${surah?.name_ar}`, body: '', bodyHtml: `<p dir="rtl" style="font-size:24px;text-align:right"><strong>${escapeHtml(ayah.text_original)}</strong></p>${translation ? `<p dir="rtl">${escapeHtml(translation)}</p>` : ''}<blockquote dir="rtl">برداشت پژوهشی:</blockquote>`, ayahId: ayah.id, reference: `سوره ${surah?.name_ar}، آیهٔ ${fa(ayah.number)}`, tags: `قرآن، ${surah?.name_ar}`});
    setActiveAyahId(null); setView('notes');
  }
  function findSimilar(ayah) { setSimilarityDraft(ayah); setActiveAyahId(null); setView('similarity'); }
  function showRelatedHadith(ayah) { setHadithDraft(ayah); setActiveAyahId(null); setView('hadith'); }

  if (loadError) return <main className="loading-screen"><Info /><h1>بارگذاری انجام نشد</h1><p>{loadError}</p><button onClick={() => location.reload()}>تلاش دوباره</button></main>;
  if (!data) return <main className="loading-screen"><img src={`${import.meta.env.BASE_URL}icon-144.png`} alt="" /><div className="loading-ring" /><p>در حال آماده‌سازی کتابخانه…</p></main>;

  return (
    <div className={`app ${dark ? 'dark' : 'light'}`} dir="rtl" style={{'--quran-font-family': selectedQuranFont.family, '--quran-line-height': selectedQuranFont.lineHeight}}>
      <aside className={`sidebar ${mobileMenu ? 'mobile-open' : ''}`} aria-label="ناوبری اصلی">
        <div className="brand">
          <img src={`${import.meta.env.BASE_URL}icon-144.png`} alt="نشان جامع التفاسیر منصور" />
          <div><strong>جامع التفاسیر منصور</strong><span>پژوهش و مطالعهٔ قرآن</span></div>
          <button className="mobile-close" onClick={() => setMobileMenu(false)} aria-label="بستن فهرست"><X /></button>
        </div>
        <nav className="main-nav">
          <span className="nav-caption">فضای مطالعه</span>
          {navItems.map(item => {
            const Icon = item.icon;
            const active = view === item.id || (item.id === 'quran' && view === 'reader');
            return <button key={item.id} className={active ? 'active' : ''} onClick={() => navigate(item.id)} aria-label={item.id === 'home' ? 'صفحه اصلی قرآن' : item.label}><Icon /><span>{item.label}</span>{active && <i />}</button>;
          })}
        </nav>
        <div className="sidebar-card"><Sparkles /><strong>کتابخانهٔ پژوهشی</strong><p>قرآن، تفاسیر، واژه‌نامه و یادداشت‌های شخصی در یک محیط.</p></div>
        <button className={`about-link ${view === 'about' ? 'active' : ''}`} onClick={() => navigate('about')}><Info /> درباره برنامه</button>
        <small className="version">نسخهٔ ۲.۷.۰ آفلاین · بازسازی پایدار بر پایهٔ ۲.۴</small>
      </aside>
      {mobileMenu && <button className="menu-backdrop" onClick={() => setMobileMenu(false)} aria-label="بستن فهرست" />}

      <div className="app-main">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMobileMenu(true)} aria-label="بازکردن فهرست"><Menu /></button>
          <div className={`global-search ${query ? 'has-query' : ''}`}>
            <Search /><input ref={searchInput} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => event.key === 'Enter' && rememberSearch()} placeholder="جست‌وجو در قرآن، ترجمه و تفسیر…" aria-label="جست‌وجوی سراسری" />
            <kbd>Ctrl K</kbd>{query && <button onClick={() => setQuery('')} aria-label="پاک‌کردن جست‌وجو"><X /></button>}
          </div>
          <button className="round-button" onClick={() => setDark(value => !value)} aria-label={dark ? 'حالت روشن' : 'حالت تاریک'}>{dark ? <Sun /> : <Moon />}</button>
          <button className="round-button settings-shortcut" onClick={() => navigate('settings')} aria-label="تنظیمات"><Settings2 /></button>
        </header>
        {query.trim() && <SearchOverlay results={results} query={query} scope={searchScope} setScope={setSearchScope} history={searchHistory} onClearHistory={() => setSearchHistory([])} onUseHistory={setQuery} surahMap={surahMap} translations={translations} onRemember={rememberSearch} onOpenSurah={openSurah} onOpenAyah={ayah => jumpToVerse(ayah.surah_id, ayah.number)} onClose={() => setQuery('')} />}
        <main className="content">
          {view === 'home' && <HomePage surahs={surahs} last={last} marks={marks} surahMap={surahMap} onNavigate={navigate} onOpenSurah={openSurah} />}
          {view === 'quran' && <QuranPage surahs={surahs} versesBySurah={versesBySurah} ayahs={ayahs} onOpenSurah={openSurah} />}
          {view === 'reader' && selected && <ReaderPage surahs={surahs} ayahs={ayahs} selected={selected} selectedVerses={selectedVerses} pageVerses={pageVerses} mushafPage={mushafPage} setMushafPage={setMushafPage} readerMode={readerMode} setReaderMode={setReaderMode} fontSize={fontSize} setFontSize={setFontSize} showTranslation={showTranslation} setShowTranslation={setShowTranslation} translations={translations} marks={marks} noteAyahIds={noteAyahIds} surahMap={surahMap} onSelectSurah={openSurah} onJump={jumpToVerse} onDetails={openDetails} onToggleMark={toggleMark} onCopy={copyVerse} onShare={shareVerse} onBack={() => navigate('quran')} />}
          {view === 'library' && <TafsirLibrary books={books} ayahMap={ayahMap} surahMap={surahMap} surahs={surahs} versesBySurah={versesBySurah} />}
          {view === 'similarity' && <Similarity ayahs={ayahs} surahMap={surahMap} initialAyah={similarityDraft} onDraftHandled={() => setSimilarityDraft(null)} onOpenAyah={ayah => jumpToVerse(ayah.surah_id, ayah.number)} />}
          {view === 'hadith' && <RelatedHadith surahs={surahs} versesBySurah={versesBySurah} initialAyah={hadithDraft} onDraftHandled={() => setHadithDraft(null)} />}
          {view === 'vocabulary' && <Vocabulary />}
          {view === 'notes' && <Notes notes={notes} setNotes={setNotes} initialDraft={noteDraft} onDraftHandled={() => setNoteDraft(null)} />}
          {view === 'saved' && <SavedPage verses={savedVerses} markCategories={markCategories} surahMap={surahMap} translations={translations} onCategory={updateMarkCategory} onOpen={ayah => jumpToVerse(ayah.surah_id, ayah.number)} />}
          {view === 'settings' && <SettingsPage dark={dark} setDark={setDark} fontSize={fontSize} setFontSize={setFontSize} quranFont={quranFont} setQuranFont={setQuranFont} showTranslation={showTranslation} setShowTranslation={setShowTranslation} onExport={exportUserData} onImport={importUserData} onSupport={() => navigate('support')} />}
          {view === 'support' && <Support onCopied={setToast} />}
          {view === 'about' && <About onSupport={() => navigate('support')} />}
        </main>
      </div>

      <nav className="mobile-nav" aria-label="ناوبری موبایل">
        {navItems.filter(item => ['home', 'quran', 'library', 'hadith', 'notes'].includes(item.id)).map(item => {
          const Icon = item.icon;
          const active = view === item.id || (item.id === 'quran' && view === 'reader');
          return <button key={item.id} className={active ? 'active' : ''} onClick={() => navigate(item.id)} aria-label={item.id === 'home' ? 'صفحه اصلی قرآن' : item.label}><Icon /><span>{item.label}</span></button>;
        })}
      </nav>

      {activeAyah && <VerseDetails ayah={activeAyah} surah={surahMap.get(activeAyah.surah_id)} tab={detailTab} setTab={setDetailTab} sources={activeSources} sourceFilter={sourceFilter} setSourceFilter={setSourceFilter} marked={marks.includes(activeAyah.id)} onMark={() => toggleMark(activeAyah)} onCopy={() => copyVerse(activeAyah)} onNote={() => addNoteFromAyah(activeAyah)} onSimilarity={() => findSimilar(activeAyah)} onHadith={() => showRelatedHadith(activeAyah)} onClose={() => setActiveAyahId(null)} />}
      {toast && <div className="toast" role="status"><Check />{toast}</div>}
    </div>
  );
}

function HomePage({surahs, last, marks, surahMap, onNavigate, onOpenSurah}) {
  const popular = [1, 2, 18, 36, 55, 67, 112].map(id => surahs.find(surah => surah.id === id)).filter(Boolean);
  const lastSurah = last ? surahMap.get(last.surah) : null;
  return <div className="home-page">
    <section className="welcome-card">
      <div className="welcome-copy"><span className="eyebrow"><Sparkles /> به نام خداوند بخشندهٔ مهربان</span><h1>قرآن و تفسیر، در یک فضای آرام برای مطالعه</h1><p>متن کامل قرآن، ترجمه، تفاسیر، واژه‌نامه و یادداشت‌های پژوهشی؛ سریع و همراه با ارجاع دقیق منابع.</p><div className="welcome-actions"><button className="primary-button" onClick={() => onNavigate('quran')}><BookOpen /> آغاز مطالعه</button><button className="secondary-button" onClick={() => onNavigate('library')}><Library /> ورود به کتابخانه</button></div></div>
      <div className="quran-emblem" aria-hidden="true"><span>القرآن</span><small>الکریم</small></div>
    </section>
    <section className="stats-row" aria-label="آمار کتابخانه"><div><strong>۱۱۴</strong><span>سوره</span></div><div><strong>۶٬۲۳۶</strong><span>آیه</span></div><div><strong>۱۶٬۳۵۱</strong><span>مدخل واژه‌نامه</span></div><div><strong>{fa(marks.length)}</strong><span>نشان ذخیره‌شده</span></div></section>
    <div className="home-grid">
      <section className="home-section continue-section"><div className="section-heading"><div><span>مسیر مطالعه</span><h2>ادامه از آخرین مطالعه</h2></div><BookHeart /></div>{lastSurah ? <button className="continue-card" onClick={() => onOpenSurah(lastSurah, last.verse)}><span className="surah-seal">{fa(lastSurah.id)}</span><span><small>سوره</small><strong>{lastSurah.name_ar}</strong><em>آیهٔ {fa(last.verse)}</em></span><ChevronLeft /></button> : <button className="continue-card empty-continue" onClick={() => onOpenSurah(surahs[0])}><span className="surah-seal">۱</span><span><small>شروع مطالعه</small><strong>سوره الفاتحة</strong><em>نخستین آیه</em></span><ChevronLeft /></button>}</section>
      <section className="home-section research-section"><div className="section-heading"><div><span>فضای پژوهش</span><h2>منبع را گم نکنید</h2></div><FileText /></div><p>ترجمه و تفسیر هر آیه همراه نام اثر، مؤلف و شناسهٔ منبع نمایش داده می‌شود. بسته‌های بدون شناسنامه وارد نسخهٔ عمومی نمی‌شوند.</p><button onClick={() => onNavigate('library')}>ورود به کتابخانه <ArrowLeft /></button></section>
    </div>
    <section className="home-section popular-section"><div className="section-heading"><div><span>دسترسی سریع</span><h2>سوره‌های منتخب</h2></div><button onClick={() => onNavigate('quran')}>فهرست سوره‌ها <ChevronLeft /></button></div><div className="popular-surahs">{popular.map(surah => <button key={surah.id} onClick={() => onOpenSurah(surah)}><span>{fa(surah.id)}</span><strong>{surah.name_ar}</strong><small>{fa(surah.ayah_count)} آیه</small></button>)}</div></section>
  </div>;
}

function QuranPage({surahs, versesBySurah, ayahs, onOpenSurah}) {
  const [surahId, setSurahId] = useState(1);
  const [verseNumber, setVerseNumber] = useState(1);
  const [juz, setJuz] = useState(1);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');
  const selected = surahs.find(surah => surah.id === Number(surahId)) || surahs[0];
  const filtered = surahs.filter(surah => normalizeSearch(surah.name_ar).includes(normalizeSearch(filter)) || String(surah.id) === filter.trim());
  function syncFromAyah(ayah) {
    if (!ayah) return;
    setSurahId(ayah.surah_id); setVerseNumber(ayah.number); setJuz(ayah.juz); setPage(ayah.page);
  }
  return <div className="library-page">
    <PageTitle eyebrow="متن کامل قرآن کریم" title="فهرست سوره‌ها" description="از نوار پژوهشی مستقیماً به سوره، آیه، جزء یا صفحه بروید." icon={BookOpen} />
    <section className="research-toolbar" aria-label="ناوبری سریع قرآن">
      <label><span>سوره</span><select value={surahId} onChange={event => {const id = Number(event.target.value); setSurahId(id); setVerseNumber(1); syncFromAyah((versesBySurah.get(id) || [])[0]);}}>{surahs.map(surah => <option value={surah.id} key={surah.id}>{fa(surah.id)}. {surah.name_ar}</option>)}</select></label>
      <label><span>آیه</span><select value={verseNumber} onChange={event => {const number = Number(event.target.value); setVerseNumber(number); syncFromAyah((versesBySurah.get(Number(surahId)) || []).find(ayah => ayah.number === number));}}>{(versesBySurah.get(Number(surahId)) || []).map(ayah => <option value={ayah.number} key={ayah.id}>{fa(ayah.number)}</option>)}</select></label>
      <label><span>جزء</span><select value={juz} onChange={event => {const value = Number(event.target.value); setJuz(value); syncFromAyah(ayahs.find(ayah => ayah.juz === value));}}>{Array.from({length: 30}, (_, index) => <option value={index + 1} key={index + 1}>{fa(index + 1)}</option>)}</select></label>
      <label><span>صفحه</span><select value={page} onChange={event => {const value = Number(event.target.value); setPage(value); syncFromAyah(ayahs.find(ayah => ayah.page === value));}}>{Array.from({length: 604}, (_, index) => <option value={index + 1} key={index + 1}>{fa(index + 1)}</option>)}</select></label>
      <button className="primary-button toolbar-go" onClick={() => onOpenSurah(selected, verseNumber)}>نمایش آیه <ArrowLeft /></button>
    </section>
    <div className="list-tools"><div><h2>۱۱۴ سوره</h2><p>به ترتیب مصحف</p></div><label><Search /><input value={filter} onChange={event => setFilter(event.target.value)} placeholder="نام یا شمارهٔ سوره" /></label></div>
    <div className="surah-grid">{filtered.map(surah => <button className="surah-card" key={surah.id} onClick={() => onOpenSurah(surah)}><span className="surah-seal">{fa(surah.id)}</span><span className="surah-card-name"><strong>{surah.name_ar}</strong><small>{surah.revelation === 'meccan' ? 'مکی' : 'مدنی'} · {fa(surah.ayah_count)} آیه</small></span><ChevronLeft /></button>)}</div>
  </div>;
}

function ReaderPage(props) {
  const {surahs, ayahs, selected, selectedVerses, pageVerses, mushafPage, setMushafPage,
    readerMode, setReaderMode, fontSize, setFontSize, showTranslation, setShowTranslation,
    translations, marks, noteAyahIds, surahMap, onSelectSurah, onJump, onDetails, onToggleMark,
    onCopy, onShare, onBack} = props;
  const current = pageVerses[0] || selectedVerses[0];
  const [jumpVerse, setJumpVerse] = useState(1);
  useEffect(() => setJumpVerse(1), [selected.id]);
  function goPage(next) { setMushafPage(Math.max(1, Math.min(604, Number(next)))); window.scrollTo({top: 0, behavior: 'smooth'}); }
  return <div className="reader-page">
    <div className="reader-heading"><button className="back-button" onClick={onBack}><ArrowRight /> فهرست سوره‌ها</button><div><span>در حال مطالعه</span><h1>{selected.name_ar}</h1></div><div className="reader-view-switch"><button className={readerMode === 'mushaf' ? 'active' : ''} onClick={() => setReaderMode('mushaf')}>صفحات قرآن</button><button className={readerMode === 'verses' ? 'active' : ''} onClick={() => setReaderMode('verses')}>آیه‌به‌آیه</button></div></div>
    <MinshawiPlayer surah={selected} />
    <section className="research-toolbar reader-toolbar" aria-label="ناوبری سریع هنگام مطالعه">
      <label><span>سوره</span><select value={selected.id} onChange={event => onSelectSurah(surahs.find(surah => surah.id === Number(event.target.value)))}>{surahs.map(surah => <option value={surah.id} key={surah.id}>{fa(surah.id)}. {surah.name_ar}</option>)}</select></label>
      <label><span>آیه</span><select value={jumpVerse} onChange={event => {const number = Number(event.target.value); setJumpVerse(number); onJump(selected.id, number);}}>{selectedVerses.map(ayah => <option value={ayah.number} key={ayah.id}>{fa(ayah.number)}</option>)}</select></label>
      <label><span>جزء</span><select value={current?.juz || 1} onChange={event => {const ayah = ayahs.find(item => item.juz === Number(event.target.value)); if (ayah) onJump(ayah.surah_id, ayah.number);}}>{Array.from({length: 30}, (_, index) => <option value={index + 1} key={index + 1}>{fa(index + 1)}</option>)}</select></label>
      <label><span>صفحه</span><select value={mushafPage} onChange={event => goPage(event.target.value)}>{Array.from({length: 604}, (_, index) => <option value={index + 1} key={index + 1}>{fa(index + 1)}</option>)}</select></label>
    </section>
    {readerMode === 'mushaf' ? <section className="mushaf-view">
      <div className="mushaf-meta"><span>جزء {fa(current?.juz || 1)}</span><strong>صفحهٔ {fa(mushafPage)}</strong><span>سوره {surahMap.get(current?.surah_id)?.name_ar || selected.name_ar}</span></div>
      <article className="mushaf-paper"><div className="paper-ornament">۞</div><div className="mushaf-flow" dir="rtl" lang="ar">{pageVerses.map(ayah => {const surah = surahMap.get(ayah.surah_id); const beginning = ayah.number === 1; const open = () => onDetails(ayah); return <React.Fragment key={ayah.id}>{beginning && <><div className="mushaf-surah-title"><i>۞</i><strong>سُورَةُ {surah?.name_ar}</strong><i>۞</i></div>{ayah.surah_id !== 1 && ayah.surah_id !== 9 && <div className="bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>}</>}<span className="mushaf-ayah" role="button" tabIndex="0" onClick={open} onKeyDown={event => {if (event.key === 'Enter' || event.key === ' ') {event.preventDefault(); open();}}} style={{fontSize}} aria-label={`آیهٔ ${fa(ayah.number)}`}>{ayah.text_original}<span className="mushaf-ayah-number"> ﴿{fa(ayah.number)}﴾ </span></span></React.Fragment>;})}</div></article>
      <div className="page-navigation"><button disabled={mushafPage <= 1} onClick={() => goPage(mushafPage - 1)}><ArrowRight /> صفحهٔ قبل</button><span>{fa(mushafPage)} از ۶۰۴</span><button disabled={mushafPage >= 604} onClick={() => goPage(mushafPage + 1)}>صفحهٔ بعد <ArrowLeft /></button></div>
      <button className="text-mode-button" onClick={() => setReaderMode('verses')}><Languages /> نمایش آیه‌به‌آیه و ترجمه</button>
    </section> : <section className="verse-reading">
      <div className="reading-tools"><button onClick={() => setShowTranslation(value => !value)}><Languages /> {showTranslation ? 'پنهان‌کردن ترجمه' : 'نمایش ترجمه'}</button><span className="tool-divider" /><button aria-label="کوچک‌کردن خط" onClick={() => setFontSize(value => Math.max(22, value - 2))}><Minus /></button><span>اندازهٔ خط {fa(fontSize)}</span><button aria-label="بزرگ‌کردن خط" onClick={() => setFontSize(value => Math.min(48, value + 2))}><Plus /></button></div>
      <div className="verse-list">{selectedVerses.map(ayah => <article className="verse-card" id={`verse-${ayah.number}`} key={ayah.id}><header><span className="ayah-number">{fa(ayah.number)}</span><span>جزء {fa(ayah.juz)} · صفحه {fa(ayah.page)}</span>{noteAyahIds.has(ayah.id) && <span className="verse-note-indicator" title="این آیه یادداشت دارد"><NotebookPen /></span>}<div><button aria-label="کپی آیه" onClick={() => onCopy(ayah)}><Copy /></button><button aria-label="اشتراک‌گذاری آیه" onClick={() => onShare(ayah)}><Share2 /></button><button aria-label="نشان‌گذاری آیه" className={marks.includes(ayah.id) ? 'marked' : ''} onClick={() => onToggleMark(ayah)}><Bookmark fill={marks.includes(ayah.id) ? 'currentColor' : 'none'} /></button></div></header><button className="arabic-text" style={{fontSize}} onClick={() => onDetails(ayah)}>{ayah.text_original}</button>{showTranslation && translations.has(ayah.id) && <p className="translation-text">{translations.get(ayah.id)}</p>}<button className="verse-info-button" onClick={() => onDetails(ayah)}>مشاهدهٔ ترجمه و تفسیر <PanelRightClose /></button></article>)}</div>
    </section>}
  </div>;
}

function VerseDetails({ayah, surah, tab, setTab, sources, sourceFilter, setSourceFilter, marked, onMark, onCopy, onNote, onSimilarity, onHadith, onClose}) {
  return <div className="details-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}><aside className="verse-details" role="dialog" aria-modal="true" aria-label="ترجمه و تفسیر آیه">
    <header className="details-header"><div><span>سوره {surah?.name_ar}</span><h2>آیهٔ {fa(ayah.number)}</h2></div><div><button onClick={onNote} aria-label="یادداشت برای آیه"><NotebookPen /></button><button onClick={onCopy} aria-label="کپی"><Copy /></button><button onClick={onMark} className={marked ? 'marked' : ''} aria-label="نشان‌گذاری"><Bookmark fill={marked ? 'currentColor' : 'none'} /></button><button onClick={onClose} aria-label="بستن"><X /></button></div></header>
    <p className="details-arabic">{ayah.text_original}</p><div className="verse-research-actions"><button onClick={onNote}><NotebookPen /> افزودن آیه و ترجمه به پژوهش</button><button onClick={onSimilarity}><ScanSearch /> یافتن آیات مشابه</button><button onClick={onHadith}><Quote /> احادیث مرتبط</button></div><div className="source-tabs"><button className={tab === 'translation' ? 'active' : ''} onClick={() => setTab('translation')}>ترجمه</button><button className={tab === 'tafsir' ? 'active' : ''} onClick={() => setTab('tafsir')}>تفسیر</button></div>
    {tab === 'tafsir' ? <VerseTafsir ayah={ayah} sources={sources} /> : <><label className="source-filter"><Search /><input value={sourceFilter} onChange={event => setSourceFilter(event.target.value)} placeholder="فیلتر نام منبع" /></label><div className="source-count">{fa(sources.length)} منبع برای این آیه</div>{sources.length ? sources.map(source => {const entry = source.byAyah.get(ayah.id); return <article className="panel-source" key={source.id}><header><div><strong>{source.title}</strong><span>{source.author || 'منبع همراه برنامه'}</span></div><small>{source.language === 'ar' ? 'عربی' : 'فارسی'}</small></header><p lang={source.language}>{entry.text}</p>{entry.footnotes && <footer>{entry.footnotes}</footer>}</article>;}) : <div className="empty-state">منبعی با این مشخصات پیدا نشد.</div>}</>}
  </aside></div>;
}

function SearchOverlay({results, query, scope, setScope, history, onClearHistory, onUseHistory, surahMap, translations, onRemember, onOpenSurah, onOpenAyah, onClose}) {
  const hasResults = results.direct || results.matchingSurahs.length || results.matchingAyahs.length;
  return <div className="search-overlay"><div className="search-results"><header><div><span>نتایج جست‌وجو</span><strong>{fa(results.total + results.matchingSurahs.length)} مورد</strong></div><button onClick={onClose} aria-label="بستن نتایج"><X /></button></header>
    <div className="search-scope" role="radiogroup" aria-label="محدودهٔ جست‌وجو">{SEARCH_SCOPES.map(item => <button role="radio" aria-checked={scope === item.id} className={scope === item.id ? 'active' : ''} key={item.id} onClick={() => setScope(item.id)}>{item.label}</button>)}</div>
    {history.length > 0 && <section className="search-history"><div><h3>جست‌وجوهای اخیر</h3><button onClick={onClearHistory}>پاک‌کردن</button></div><p>{history.map(item => <button key={item} onClick={() => onUseHistory(item)}>{item}</button>)}</p></section>}
    {!hasResults && <div className="empty-state">نتیجه‌ای پیدا نشد. نام سوره، نشانی مانند «بقره ۲۵۵» یا بخشی از متن را بنویسید.</div>}
    {results.direct && <button className="direct-result" onClick={() => {onRemember(query); onOpenSurah(results.direct.surah, results.direct.number);}}><span>رفتن مستقیم</span><strong>سوره {results.direct.surah.name_ar}، آیهٔ {fa(results.direct.number)}</strong><ArrowLeft /></button>}
    {results.matchingSurahs.length > 0 && <section><h3>سوره‌ها</h3>{results.matchingSurahs.slice(0, 8).map(surah => <button className="search-row" key={surah.id} onClick={() => {onRemember(query); onOpenSurah(surah);}}><span className="mini-seal">{fa(surah.id)}</span><span><strong>{surah.name_ar}</strong><small>{fa(surah.ayah_count)} آیه</small></span><ChevronLeft /></button>)}</section>}
    {results.matchingAyahs.length > 0 && <section><h3>آیات و منابع</h3>{results.matchingAyahs.slice(0, 24).map(ayah => <button className="search-row ayah-result" key={ayah.id} onClick={() => {onRemember(query); onOpenAyah(ayah);}}><span className="mini-seal">{fa(ayah.number)}</span><span><strong>{surahMap.get(ayah.surah_id)?.name_ar}</strong><small>{translations.get(ayah.id) || ayah.text_original}</small></span><em>{SEARCH_SCOPES.find(item => item.id === scope)?.label}</em><ChevronLeft /></button>)}</section>}
  </div></div>;
}

function SavedPage({verses, markCategories, surahMap, translations, onCategory, onOpen}) {
  const [category, setCategory] = useState('همه');
  const categories = ['همه', 'حفظ', 'منبر', 'بعداً'];
  const filtered = category === 'همه' ? verses : verses.filter(ayah => (markCategories[ayah.id] || 'بعداً') === category);
  return <div className="saved-page"><PageTitle eyebrow="مطالعهٔ شخصی" title="آیات نشان‌شده" description={`${fa(verses.length)} آیه برای مراجعهٔ دوباره ذخیره شده است.`} icon={Bookmark} /><div className="bookmark-categories" role="tablist" aria-label="دسته‌های نشان‌ها">{categories.map(item => <button role="tab" aria-selected={category === item} className={category === item ? 'active' : ''} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div>{!filtered.length ? <div className="large-empty"><Bookmark /><h2>{verses.length ? 'در این دسته نشانی ندارید' : 'هنوز نشانی ندارید'}</h2><p>در صفحهٔ مطالعه، نشانک کنار هر آیه را انتخاب کنید.</p></div> : <div className="saved-list">{filtered.map(ayah => <article key={ayah.id}><button onClick={() => onOpen(ayah)}><span className="surah-seal">{fa(ayah.number)}</span><span><strong>{surahMap.get(ayah.surah_id)?.name_ar}</strong><small>{translations.get(ayah.id) || ayah.text_original}</small></span><ChevronLeft /></button><label><span>دسته</span><select value={markCategories[ayah.id] || 'بعداً'} onChange={event => onCategory(ayah.id, event.target.value)}>{categories.slice(1).map(item => <option key={item}>{item}</option>)}</select></label></article>)}</div>}</div>;
}

function SettingsPage({dark, setDark, fontSize, setFontSize, quranFont, setQuranFont, showTranslation, setShowTranslation, onExport, onImport, onSupport}) {
  return <div className="settings-page"><PageTitle eyebrow="شخصی‌سازی" title="تنظیمات مطالعه" description="ظاهر و شیوهٔ نمایش متن را مطابق نیاز خود تنظیم کنید." icon={Settings2} /><div className="settings-grid">
    <section className="settings-card"><header><Sun /><div><h2>نمای برنامه</h2><p>انتخاب حالت روشن یا تاریک</p></div></header><div className="theme-options"><button className={!dark ? 'active' : ''} onClick={() => setDark(false)}><Sun /> روشن</button><button className={dark ? 'active' : ''} onClick={() => setDark(true)}><Moon /> تاریک</button></div></section>
    <section className="settings-card quran-settings"><header><BookOpen /><div><h2>رسم‌الخط و اندازهٔ قرآن</h2><p>انتخاب فونت آفلاین با پیش‌نمایش زنده</p></div></header><div className="font-picker" role="radiogroup" aria-label="انتخاب فونت قرآن">{QURAN_FONTS.map(font => <button type="button" role="radio" aria-checked={quranFont === font.id} className={quranFont === font.id ? 'active' : ''} key={font.id} onClick={() => setQuranFont(font.id)}><span style={{fontFamily: font.family}}>بِسْمِ اللَّهِ</span><small>{font.label}</small></button>)}</div><p className="quran-font-preview" lang="ar" dir="rtl" style={{fontSize}}>اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ</p><label className="font-slider"><span>اندازهٔ متن: <strong>{fa(fontSize)}</strong></span><input type="range" min="22" max="48" step="1" value={fontSize} onChange={event => setFontSize(Number(event.target.value))} /></label><label className="toggle-row"><span><strong>نمایش ترجمهٔ فارسی</strong><small>در حالت مطالعهٔ آیه‌به‌آیه</small></span><input type="checkbox" checked={showTranslation} onChange={event => setShowTranslation(event.target.checked)} /></label></section>
    <Offline /><section className="settings-card shortcut-card"><header><Search /><div><h2>میان‌بر جست‌وجو</h2><p>از هر بخش برنامه</p></div></header><div><kbd>Ctrl</kbd><span>+</span><kbd>K</kbd></div></section>
    <section className="settings-card backup-card"><header><Bookmark /><div><h2>پشتیبان پژوهش شخصی</h2><p>خروجی و بازیابی محلی یادداشت‌ها، نشان‌ها و آخرین مطالعه</p></div></header><div className="backup-actions"><button className="primary-button" type="button" onClick={onExport}>دریافت فایل JSON</button><label className="secondary-button">بازیابی از JSON<input type="file" accept="application/json,.json" onChange={event => {onImport(event.target.files?.[0]); event.target.value = '';}} /></label></div><small>هیچ اطلاعاتی بدون انتخاب شما از دستگاه خارج نمی‌شود.</small></section>
    <section className="settings-card support-shortcut"><header><HeartHandshake /><div><h2>حمایت از توسعه برنامه</h2><p>حمایت داوطلبانه و بدون محدودیت در امکانات</p></div></header><button className="primary-button" type="button" onClick={onSupport}>مشاهدهٔ بخش حمایت</button></section>
  </div></div>;
}

function PageTitle({eyebrow, title, description, icon: Icon}) {
  return <header className="page-title"><span className="page-icon"><Icon /></span><div><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div></header>;
}

export default App;
