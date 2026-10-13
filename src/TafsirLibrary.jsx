import React, {useDeferredValue, useMemo, useState} from 'react';
import {ArrowRight, BookOpen, ChevronLeft, Library, Search, ShieldCheck, Sparkles} from 'lucide-react';
import {normalizeSearch} from './verseSearch.js';

export default function TafsirLibrary({books, ayahMap, surahMap}) {
  const tafsirs = useMemo(() => books.filter(book => book.kind === 'tafsir'), [books]);
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const selected = tafsirs.find(book => book.id === selectedId);
  const results = useMemo(() => {
    if (!selected) return [];
    const normalized = normalizeSearch(deferredQuery);
    const entries = normalized
      ? selected.entries.filter(entry => normalizeSearch(entry.text).includes(normalized))
      : selected.entries;
    return entries.slice(0, 80);
  }, [selected, deferredQuery]);

  if (selected) return <div className="library-reader">
    <button className="back-button library-back" onClick={() => setSelectedId('')}><ArrowRight /> بازگشت به کتابخانه</button>
    <header className="source-reader-heading"><div className="library-mark"><BookOpen /></div><div><span>بستهٔ آفلاین با شناسنامهٔ منبع</span><h1>{selected.title}</h1><p>{selected.author} · نسخهٔ {selected.version || 'ثبت‌نشده'} · {selected.entries.length.toLocaleString('fa-IR')} مدخل</p></div></header>
    <label className="library-search"><Search /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={`جست‌وجو در ${selected.title}…`} /></label>
    <div className="tafsir-entry-list">{results.map(entry => { const ayah = ayahMap.get(entry.ayah_id); const surah = surahMap.get(ayah?.surah_id); return <article key={entry.ayah_id}><header><strong>سوره {surah?.name_ar || '—'}، آیهٔ {Number(ayah?.number || 0).toLocaleString('fa-IR')}</strong><small>{selected.title}</small></header><p lang={selected.language || 'ar'}>{entry.text}</p><footer>{selected.author} · منبع: {selected.source_id}</footer></article>; })}</div>
    {!results.length && <div className="large-empty"><Search /><h2>نتیجه‌ای پیدا نشد</h2><p>عبارت دیگری را امتحان کنید.</p></div>}
  </div>;

  return <div className="tafsir-library-page">
    <header className="page-title"><span className="page-icon"><Library /></span><div><span>منابع تفسیری</span><h1>کتابخانه</h1><p>فقط بسته‌هایی نمایش داده می‌شوند که منشأ، نسخه و شرایط بازتوزیعشان ثبت شده باشد.</p></div></header>
    <section className="library-banner"><Sparkles /><div><strong>مطالعهٔ مستقل و آفلاین</strong><p>متن بسته‌های نصب‌شده داخل برنامه است و نام اثر، مؤلف و منبع زیر هر مطلب حفظ می‌شود.</p></div></section>
    <div className="book-shelf">
      {tafsirs.map(source => <button className="book-card verified-book" key={source.id} onClick={() => setSelectedId(source.id)}><span className="book-spine">{source.entries.length.toLocaleString('fa-IR')} مدخل</span><div><small>{source.language === 'ar' ? 'تفسیر عربی' : 'تفسیر فارسی'} · نسخهٔ {source.version || '—'}</small><h2>{source.title}</h2><p>{source.author}</p><em>ورود به کتاب <ChevronLeft /></em></div></button>)}
    </div>
    {!tafsirs.length && <div className="large-empty"><BookOpen /><h2>هنوز بستهٔ تفسیری نصب نیست</h2><p>پس از تأیید مجوز هر اثر، بستهٔ مستقل آن از کتابخانه قابل نصب خواهد بود.</p></div>}
    <section className="library-note"><ShieldCheck /><div><h2>کنترل منشأ محتوا</h2><p>وجود یک فایل در اینترنت یا GitHub به‌تنهایی مجوز بازتوزیع نیست؛ هر بسته جداگانه بررسی و ثبت می‌شود.</p></div></section>
  </div>;
}
