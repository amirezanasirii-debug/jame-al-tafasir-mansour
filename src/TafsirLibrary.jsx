import React, {useDeferredValue, useEffect, useMemo, useState} from 'react';
import {ArrowRight, BookOpen, ChevronLeft, Library, LoaderCircle, Search, ShieldCheck, Sparkles} from 'lucide-react';
import {formatOfflineSize, loadOfflineTafsirShard} from './offlineTafsir.js';
import {normalizeSearch} from './verseSearch.js';

export default function TafsirLibrary({books, offlineSources = [], ayahMap, surahMap, surahs = []}) {
  const tafsirs = useMemo(() => {
    const bundled = books.filter(book => book.kind === 'tafsir');
    const offlineIds = new Set(offlineSources.map(source => source.id));
    return [...offlineSources, ...bundled.filter(source => !offlineIds.has(source.id))];
  }, [books, offlineSources]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedSurah, setSelectedSurah] = useState(1);
  const [entries, setEntries] = useState([]);
  const [loadState, setLoadState] = useState('idle');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const selected = tafsirs.find(book => book.id === selectedId);

  useEffect(() => {
    if (!selected) {
      setEntries([]);
      setLoadState('idle');
      return undefined;
    }
    if (selected.storage !== 'bundled-gzip-shards') {
      setEntries(selected.entries || []);
      setLoadState('ready');
      return undefined;
    }
    let cancelled = false;
    setLoadState('loading');
    loadOfflineTafsirShard(selected.id, selectedSurah)
      .then(shard => {
        if (cancelled) return;
        setEntries(shard.entries || []);
        setLoadState('ready');
      })
      .catch(() => {
        if (!cancelled) setLoadState('error');
      });
    return () => { cancelled = true; };
  }, [selected, selectedSurah]);

  const results = useMemo(() => {
    const normalized = normalizeSearch(deferredQuery);
    return (normalized ? entries.filter(entry => normalizeSearch(entry.text).includes(normalized)) : entries).slice(0, 80);
  }, [entries, deferredQuery]);

  if (selected) return <div className="library-reader">
    <button className="back-button library-back" onClick={() => {setSelectedId(''); setQuery('');}}><ArrowRight /> بازگشت به کتابخانه</button>
    <header className="source-reader-heading"><div className="library-mark"><BookOpen /></div><div><span>بستهٔ مستقل و کاملاً آفلاین</span><h1>{selected.title}</h1><p>{selected.author} · {selected.publisher || 'ناشر در شناسنامهٔ منبع'} · {selected.version || 'نسخهٔ ثبت‌شده'}</p></div></header>
    {selected.storage === 'bundled-gzip-shards' && <label className="library-surah-picker"><span>سوره</span><select value={selectedSurah} onChange={event => {setSelectedSurah(Number(event.target.value)); setQuery('');}}>{surahs.map(surah => <option value={surah.id} key={surah.id}>{surah.id.toLocaleString('fa-IR')}. {surah.name_ar}</option>)}</select><small>{selected.coverage.toLocaleString('fa-IR')} مدخل · {formatOfflineSize(selected.compressed_bytes)} همراه برنامه</small></label>}
    <label className="library-search"><Search /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={`جست‌وجو در ${selected.title}…`} /></label>
    {loadState === 'loading' && <div className="large-empty compact"><LoaderCircle className="spin" /><h2>در حال بازکردن بستهٔ سوره</h2><p>داده از داخل خود برنامه خوانده می‌شود؛ اینترنت لازم نیست.</p></div>}
    {loadState === 'error' && <div className="large-empty compact"><ShieldCheck /><h2>بسته باز نشد</h2><p>یکپارچگی فایل‌های نصب را بررسی کنید.</p></div>}
    {loadState === 'ready' && <div className="tafsir-entry-list">{results.map((entry, index) => { const ayah = ayahMap.get(entry.ayah_id); const surah = surahMap.get(ayah?.surah_id); return <article key={`${entry.ayah_id}-${entry.part || index}`}><header><strong>سوره {surah?.name_ar || '—'}، آیهٔ {Number(ayah?.number || entry.ayah || 0).toLocaleString('fa-IR')}</strong><small>{selected.title}</small></header><p lang={selected.language || 'ar'}>{entry.text}</p><footer>{selected.author} · {selected.publisher || selected.source_id || selected.series_id}</footer></article>; })}</div>}
    {loadState === 'ready' && !results.length && <div className="large-empty"><Search /><h2>نتیجه‌ای پیدا نشد</h2><p>عبارت یا سورهٔ دیگری را امتحان کنید.</p></div>}
  </div>;

  return <div className="tafsir-library-page">
    <header className="page-title"><span className="page-icon"><Library /></span><div><span>منابع تفسیری همراه برنامه</span><h1>کتابخانه</h1><p>مجموعه‌ای محدود و منتخب برای مطالعهٔ آفلاین؛ هر اثر با نام مؤلف و ناشر خودش.</p></div></header>
    <section className="library-banner"><Sparkles /><div><strong>مطالعهٔ مستقل و آفلاین</strong><p>چهار تفسیر منتخب به‌صورت فشرده و سوره‌به‌سوره داخل برنامه قرار گرفته‌اند؛ هیچ اتصال اینترنتی برای مطالعه لازم نیست.</p></div></section>
    <div className="book-shelf">
      {tafsirs.map(source => <button className="book-card verified-book" key={source.id} onClick={() => {setSelectedId(source.id); setSelectedSurah(1);}}><span className="book-spine">{source.storage === 'bundled-gzip-shards' ? formatOfflineSize(source.compressed_bytes) : `${(source.entries || []).length.toLocaleString('fa-IR')} مدخل`}</span><div><small>{source.language === 'ar' ? 'تفسیر عربی' : 'تفسیر فارسی'} · آفلاین</small><h2>{source.title}</h2><p>{source.author}</p><em>ورود به کتاب <ChevronLeft /></em></div></button>)}
    </div>
    {!tafsirs.length && <div className="large-empty"><BookOpen /><h2>هنوز بستهٔ تفسیری نصب نیست</h2><p>فایل‌های بسته را همراه نصب برنامه قرار دهید.</p></div>}
    <section className="library-note"><ShieldCheck /><div><h2>امانت‌داری علمی</h2><p>متن آثار به نام برنامه ثبت نمی‌شود؛ نام کتاب، مؤلف، ناشر و نشانی منبع در تمام نماها حفظ شده است.</p></div></section>
  </div>;
}
