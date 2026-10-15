import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {BookHeart, Quote, RefreshCw} from 'lucide-react';
import {loadHadithVerse} from './offlineData.js';

export default function RelatedHadith({surahs, versesBySurah, initialAyah, onDraftHandled}) {
  const [surahId, setSurahId] = useState(initialAyah?.surah_id || 1);
  const [verseNumber, setVerseNumber] = useState(initialAyah?.number || 1);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [reload, setReload] = useState(0);
  const verses = versesBySurah.get(Number(surahId)) || [];
  const ayah = useMemo(() => verses.find(item => item.number === Number(verseNumber)) || verses[0], [verseNumber, verses]);

  useEffect(() => {
    if (!initialAyah) return;
    setSurahId(initialAyah.surah_id);
    setVerseNumber(initialAyah.number);
    onDraftHandled?.();
  }, [initialAyah, onDraftHandled]);

  const load = useCallback(async signal => {
    setStatus('loading');
    try {
      const next = await loadHadithVerse(surahId, verseNumber, {signal});
      if (!signal.aborted) { setItems(next); setStatus('ready'); }
    } catch {
      if (!signal.aborted) { setItems([]); setStatus('error'); }
    }
  }, [surahId, verseNumber]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load, reload]);

  return <div className="hadith-page">
    <header className="page-title"><span className="page-icon"><Quote /></span><div><span>پیوند قرآن و حدیث</span><h1>احادیث مرتبط</h1><p>روایات و ارجاعات علمیِ همراه برنامه، بدون نیاز به اینترنت.</p></div></header>
    <section className="hadith-source"><BookHeart /><div><strong>منابع حدیثی آفلاین جامع التفاسیر منصور</strong><p>روایات منتخب و ارجاعات علمی آن‌ها به‌صورت مستقل در پایگاه دادهٔ برنامه تعبیه شده‌اند.</p></div></section>
    <section className="source-controls hadith-controls"><label><span>سوره</span><select value={surahId} onChange={event => {setSurahId(Number(event.target.value)); setVerseNumber(1);}}>{surahs.map(surah => <option key={surah.id} value={surah.id}>{surah.id.toLocaleString('fa-IR')}. {surah.name_ar}</option>)}</select></label><label><span>آیه</span><select value={verseNumber} onChange={event => setVerseNumber(Number(event.target.value))}>{verses.map(item => <option key={item.id} value={item.number}>{item.number.toLocaleString('fa-IR')}</option>)}</select></label></section>
    {ayah && <article className="source-ayah" lang="ar"><small>{surahs.find(item => item.id === Number(surahId))?.name_ar} · آیهٔ {ayah.number.toLocaleString('fa-IR')}</small><p>{ayah.text_original}</p></article>}
    {status === 'loading' && <div className="inline-state">در حال بازکردن بستهٔ حدیثی آفلاین…</div>}
    {status === 'error' && <div className="large-empty compact"><RefreshCw /><h2>بستهٔ حدیثی باز نشد</h2><p>فایل داخل نصب ناقص است یا قابل‌خواندن نیست.</p><button className="primary-button" onClick={() => setReload(value => value + 1)}>تلاش دوباره</button></div>}
    {status === 'ready' && !items.length && <div className="large-empty compact"><Quote /><h2>برای این آیه روایتی ثبت نشده است</h2><p>آیهٔ دیگری را انتخاب کنید.</p></div>}
    {status === 'ready' && items.length > 0 && <div className="hadith-results">{items.map((item, index) => <article key={`${item.group || index}-${item.page || index}`}><header><Quote /><div><strong>{item.title || 'منبع حدیثی'}</strong><span>جلد {Number(item.volume || 0).toLocaleString('fa-IR')} · صفحه {Number(item.page || 0).toLocaleString('fa-IR')}</span></div></header><p lang="ar">{item.text}</p></article>)}</div>}
  </div>;
}
