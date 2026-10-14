import React, {useEffect, useMemo, useState} from 'react';
import {BookHeart, BookOpen, Quote, ShieldAlert, X} from 'lucide-react';
import {BRAND_TEXT} from './brandText.js';

export default function RelatedHadith({surahs, versesBySurah, sources = [], initialAyah, onDraftHandled}) {
  const [surahId, setSurahId] = useState(initialAyah?.surah_id || 1);
  const [verseNumber, setVerseNumber] = useState(initialAyah?.number || 1);
  const [showBibliography, setShowBibliography] = useState(false);
  const verses = versesBySurah.get(Number(surahId)) || [];
  const ayah = useMemo(() => verses.find(item => item.number === Number(verseNumber)) || verses[0], [verseNumber, verses]);
  const installedSources = useMemo(() => sources.filter(source => source.kind === 'hadith'), [sources]);

  useEffect(() => {
    if (!initialAyah) return;
    setSurahId(initialAyah.surah_id);
    setVerseNumber(initialAyah.number);
    onDraftHandled?.();
  }, [initialAyah, onDraftHandled]);
  useEffect(() => { setVerseNumber(1); }, [surahId]);

  return <div className="hadith-page">
    <header className="page-title"><span className="page-icon"><Quote /></span><div><span>پیوند قرآن و حدیث</span><h1>احادیث مرتبط</h1><p>ساختار این بخش آماده است؛ هر بسته باید ارجاع کتاب، جلد، شمارهٔ حدیث و مجوز روشن داشته باشد.</p></div></header>
    <section className="hadith-source"><BookHeart /><div><strong>{BRAND_TEXT.hadithArchiveTitle}</strong><p>{installedSources.length ? BRAND_TEXT.hadithArchiveDescription : BRAND_TEXT.hadithArchivePending}</p></div><button type="button" onClick={() => setShowBibliography(true)}><BookOpen /> {BRAND_TEXT.bibliographyTitle}</button></section>
    <section className="source-controls hadith-controls"><label><span>سوره</span><select value={surahId} onChange={event => setSurahId(Number(event.target.value))}>{surahs.map(surah => <option key={surah.id} value={surah.id}>{surah.id.toLocaleString('fa-IR')}. {surah.name_ar}</option>)}</select></label><label><span>آیه</span><select value={verseNumber} onChange={event => setVerseNumber(Number(event.target.value))}>{verses.map(item => <option key={item.id} value={item.number}>{item.number.toLocaleString('fa-IR')}</option>)}</select></label></section>
    {ayah && <article className="source-ayah" lang="ar"><small>{surahs.find(item => item.id === Number(surahId))?.name_ar} · آیهٔ {ayah.number.toLocaleString('fa-IR')}</small><p>{ayah.text_original}</p></article>}
    <div className="large-empty compact"><ShieldAlert /><h2>در انتظار منبع قابل‌بازتوزیع</h2><p>پس از تأیید شرایط رسمی، بستهٔ آفلاین مستقل بدون نیاز به اینترنت فعال می‌شود.</p></div>
    {showBibliography && <div className="bibliography-backdrop" onMouseDown={event => event.target === event.currentTarget && setShowBibliography(false)}><section className="bibliography-sheet" role="dialog" aria-modal="true" aria-labelledby="bibliography-title"><header><div><span>شناسنامهٔ محتوای نصب‌شده</span><h2 id="bibliography-title">{BRAND_TEXT.bibliographyTitle}</h2></div><button type="button" onClick={() => setShowBibliography(false)} aria-label="بستن فهرست مآخذ"><X /></button></header>{installedSources.length ? <div className="bibliography-list">{installedSources.map(source => <article key={source.id}><BookOpen /><div><strong>{source.title}</strong><p>{source.author || 'نام مؤلف در شناسنامهٔ این بسته ثبت نشده است.'}</p><small>{source.license_name || 'مجوز ثبت‌نشده'}{source.version ? ` · نسخهٔ ${source.version}` : ''}</small></div></article>)}</div> : <div className="large-empty compact"><ShieldAlert /><h3>هنوز بستهٔ حدیثی نصب نشده است</h3><p>پس از نصب بستهٔ معتبر، نام کتاب، مؤلف، نسخه و مجوز آن در این فهرست دیده می‌شود.</p></div>}</section></div>}
  </div>;
}
