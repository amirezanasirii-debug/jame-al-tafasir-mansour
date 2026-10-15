import React, {useEffect, useMemo, useState} from 'react';
import {ArrowRight, BookOpen, ChevronLeft, Library, RefreshCw, ShieldCheck, Sparkles} from 'lucide-react';
import {loadOfflineManifest, loadTafsirVerse} from './offlineData.js';

export default function TafsirLibrary({books, surahs, versesBySurah}) {
  const [offlineSources, setOfflineSources] = useState([]);
  const [status, setStatus] = useState('loading');
  const [selectedId, setSelectedId] = useState('');
  const [surahId, setSurahId] = useState(1);
  const [verseNumber, setVerseNumber] = useState(1);
  const [entries, setEntries] = useState([]);
  const [entryStatus, setEntryStatus] = useState('idle');
  const embedded = useMemo(() => books.filter(book => book.kind === 'tafsir').map(book => ({...book, id: `embedded:${book.id}`, embedded: true})), [books]);
  const sources = useMemo(() => [...offlineSources.map(source => ({...source, id: `offline:${source.id}`, offlineId: source.id})), ...embedded], [embedded, offlineSources]);
  const selected = sources.find(source => source.id === selectedId);
  const verses = versesBySurah.get(Number(surahId)) || [];

  useEffect(() => {
    const controller = new AbortController();
    loadOfflineManifest({signal: controller.signal})
      .then(manifest => { if (!controller.signal.aborted) { setOfflineSources(manifest.sources || []); setStatus('ready'); } })
      .catch(() => { if (!controller.signal.aborted) setStatus('error'); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selected) return undefined;
    if (selected.embedded) {
      const ayah = verses.find(item => item.number === Number(verseNumber));
      const item = selected.entries.find(entry => entry.ayah_id === ayah?.id);
      setEntries(item ? [item] : []); setEntryStatus('ready'); return undefined;
    }
    const controller = new AbortController();
    setEntryStatus('loading');
    loadTafsirVerse(selected.offlineId, surahId, verseNumber, {signal: controller.signal})
      .then(items => { if (!controller.signal.aborted) { setEntries(items); setEntryStatus('ready'); } })
      .catch(() => { if (!controller.signal.aborted) { setEntries([]); setEntryStatus('error'); } });
    return () => controller.abort();
  }, [selected, surahId, verseNumber, verses]);

  if (selected) return <div className="library-reader">
    <button className="back-button library-back" onClick={() => setSelectedId('')}><ArrowRight /> بازگشت به کتابخانه</button>
    <header className="source-reader-heading"><div className="library-mark"><BookOpen /></div><div><span>بستهٔ آفلاین آیه‌محور</span><h1>{selected.title}</h1><p>{selected.author || 'شناسنامهٔ اثر همراه بسته'} · {selected.version || 'نسخهٔ نصب‌شده'}</p></div></header>
    <section className="source-controls"><label><span>سوره</span><select value={surahId} onChange={event => {setSurahId(Number(event.target.value)); setVerseNumber(1);}}>{surahs.map(surah => <option value={surah.id} key={surah.id}>{surah.id.toLocaleString('fa-IR')}. {surah.name_ar}</option>)}</select></label><label><span>آیه</span><select value={verseNumber} onChange={event => setVerseNumber(Number(event.target.value))}>{verses.map(ayah => <option value={ayah.number} key={ayah.id}>{ayah.number.toLocaleString('fa-IR')}</option>)}</select></label></section>
    {entryStatus === 'loading' && <div className="inline-state">در حال بازکردن متن آفلاین…</div>}
    {entryStatus === 'error' && <div className="large-empty compact"><RefreshCw /><h2>متن باز نشد</h2><p>بسته داخل نصب ناقص است یا خوانده نمی‌شود.</p></div>}
    {entryStatus === 'ready' && <div className="tafsir-entry-list">{entries.map((entry, index) => <article key={`${entry.page || index}-${index}`}><header><strong>آیهٔ {Number(verseNumber).toLocaleString('fa-IR')}</strong><small>{entry.title || selected.title}{entry.volume ? ` · جلد ${Number(entry.volume).toLocaleString('fa-IR')}` : ''}{entry.page ? ` · صفحه ${Number(entry.page).toLocaleString('fa-IR')}` : ''}</small></header><p lang={selected.language || 'ar'}>{entry.text}</p><footer>{selected.title} · {selected.author || 'مشخصات مؤلف در شناسنامهٔ اثر'}</footer></article>)}</div>}
    {entryStatus === 'ready' && !entries.length && <div className="large-empty"><BookOpen /><h2>برای این آیه مطلبی ثبت نشده است</h2><p>آیهٔ دیگری را انتخاب کنید.</p></div>}
  </div>;

  return <div className="tafsir-library-page">
    <header className="page-title"><span className="page-icon"><Library /></span><div><span>منابع تفسیری</span><h1>کتابخانه</h1><p>تفاسیر نصب‌شده، آیه‌به‌آیه و بدون نیاز به اینترنت.</p></div></header>
    <section className="library-banner"><Sparkles /><div><strong>کتابخانهٔ پژوهشی مستقل و آفلاین</strong><p>متن منابع داخل برنامه قرار دارد و نام اثر، مؤلف و مشخصات کتاب‌شناختی حفظ می‌شود.</p></div></section>
    {status === 'loading' && <div className="inline-state">در حال شناسایی بسته‌های کتابخانه…</div>}
    {status === 'error' && <div className="inline-state error-state">فهرست بسته‌های آفلاین باز نشد؛ نصب برنامه را بررسی کنید.</div>}
    <div className="book-shelf">{sources.map(source => <button className="book-card verified-book" key={source.id} onClick={() => setSelectedId(source.id)}><span className="book-spine">آفلاین</span><div><small>{source.language === 'ar' ? 'تفسیر عربی' : 'تفسیر فارسی'} · {source.version || 'نسخهٔ همراه'}</small><h2>{source.title}</h2><p>{source.author || 'شناسنامهٔ علمی همراه اثر'}</p><em>ورود به کتاب <ChevronLeft /></em></div></button>)}</div>
    {!sources.length && status !== 'loading' && <div className="large-empty"><BookOpen /><h2>بستهٔ تفسیری پیدا نشد</h2><p>فایل‌های نصب برنامه ناقص است.</p></div>}
    <section className="library-note"><ShieldCheck /><div><h2>حفظ امانت علمی</h2><p>نام کتاب، مؤلف و مشخصات منبع زیر هر متن نمایش داده می‌شود؛ متن علمی هنگام تبدیل ساختار تغییر نمی‌کند.</p></div></section>
  </div>;
}
