import React, {useEffect, useMemo, useState} from 'react';
import {BookHeart, Quote, ShieldAlert} from 'lucide-react';

export default function RelatedHadith({surahs, versesBySurah, initialAyah, onDraftHandled}) {
  const [surahId, setSurahId] = useState(initialAyah?.surah_id || 1);
  const [verseNumber, setVerseNumber] = useState(initialAyah?.number || 1);
  const verses = versesBySurah.get(Number(surahId)) || [];
  const ayah = useMemo(() => verses.find(item => item.number === Number(verseNumber)) || verses[0], [verseNumber, verses]);

  useEffect(() => {
    if (!initialAyah) return;
    setSurahId(initialAyah.surah_id);
    setVerseNumber(initialAyah.number);
    onDraftHandled?.();
  }, [initialAyah, onDraftHandled]);
  useEffect(() => { setVerseNumber(1); }, [surahId]);

  return <div className="hadith-page">
    <header className="page-title"><span className="page-icon"><Quote /></span><div><span>پیوند قرآن و حدیث</span><h1>احادیث مرتبط</h1><p>ساختار این بخش آماده است؛ هر بسته باید ارجاع کتاب، جلد، شمارهٔ حدیث و مجوز روشن داشته باشد.</p></div></header>
    <section className="hadith-source"><BookHeart /><div><strong>هیچ بستهٔ حدیثی عمومی نصب نشده است</strong><p>برای جلوگیری از بازنشر محتوای مبهم، دادهٔ بدون مجوز رسمی در برنامه قرار نمی‌گیرد.</p></div></section>
    <section className="source-controls hadith-controls"><label><span>سوره</span><select value={surahId} onChange={event => setSurahId(Number(event.target.value))}>{surahs.map(surah => <option key={surah.id} value={surah.id}>{surah.id.toLocaleString('fa-IR')}. {surah.name_ar}</option>)}</select></label><label><span>آیه</span><select value={verseNumber} onChange={event => setVerseNumber(Number(event.target.value))}>{verses.map(item => <option key={item.id} value={item.number}>{item.number.toLocaleString('fa-IR')}</option>)}</select></label></section>
    {ayah && <article className="source-ayah" lang="ar"><small>{surahs.find(item => item.id === Number(surahId))?.name_ar} · آیهٔ {ayah.number.toLocaleString('fa-IR')}</small><p>{ayah.text_original}</p></article>}
    <div className="large-empty compact"><ShieldAlert /><h2>در انتظار منبع قابل‌بازتوزیع</h2><p>پس از تأیید شرایط رسمی، بستهٔ آفلاین مستقل بدون نیاز به اینترنت فعال می‌شود.</p></div>
  </div>;
}
