import React, {useEffect, useMemo, useState} from 'react';
import {BookOpen, ChevronLeft, ScanSearch, Search, Sparkles} from 'lucide-react';
import {loadSimilarityVerse} from './offlineData.js';

export function normalizeArabic(value) {
  return String(value || '').normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[^\u0621-\u063A\u0641-\u064A\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
const tokens = value => new Set(normalizeArabic(value).split(' ').filter(word => word.length > 1));
const grams = value => { const text = normalizeArabic(value).replace(/\s/g, ''); const result = new Set(); for (let i = 0; i < text.length - 2; i += 1) result.add(text.slice(i, i + 3)); return result; };
const overlap = (left, right) => [...left].filter(item => right.has(item)).length;
export function similarityScore(query, verse) {
  const queryTokens = tokens(query); const verseTokens = tokens(verse);
  const union = new Set([...queryTokens, ...verseTokens]);
  const jaccard = union.size ? overlap(queryTokens, verseTokens) / union.size : 0;
  const queryGrams = grams(query); const verseGrams = grams(verse);
  const dice = queryGrams.size + verseGrams.size ? (2 * overlap(queryGrams, verseGrams)) / (queryGrams.size + verseGrams.size) : 0;
  return Math.min(1, (jaccard * 0.62) + (dice * 0.38) + (normalizeArabic(verse).includes(normalizeArabic(query)) ? 0.18 : 0));
}
const matchedWords = (query, verse) => [...tokens(query)].filter(word => tokens(verse).has(word)).slice(0, 8);

export default function Similarity({ayahs, surahMap, initialAyah, onOpenAyah, onDraftHandled}) {
  const [query, setQuery] = useState(initialAyah?.text_original || '');
  const [selectedAyah, setSelectedAyah] = useState(initialAyah || null);
  const [searched, setSearched] = useState(Boolean(initialAyah));
  const [linked, setLinked] = useState([]);
  const [linkStatus, setLinkStatus] = useState(initialAyah ? 'loading' : 'idle');
  const ayahMap = useMemo(() => new Map(ayahs.map(ayah => [Number(ayah.id), ayah])), [ayahs]);

  useEffect(() => {
    if (!initialAyah) return;
    setQuery(initialAyah.text_original); setSelectedAyah(initialAyah); setSearched(true); onDraftHandled?.();
  }, [initialAyah, onDraftHandled]);

  useEffect(() => {
    if (!selectedAyah) { setLinked([]); setLinkStatus('idle'); return undefined; }
    const controller = new AbortController();
    setLinkStatus('loading');
    loadSimilarityVerse(selectedAyah.surah_id, selectedAyah.number, {signal: controller.signal})
      .then(items => {
        if (controller.signal.aborted) return;
        setLinked(items.map((item, index) => {
          const ayah = ayahMap.get(Number(item.id));
          return ayah ? {...ayah, score: Math.max(0.1, 1 - index / Math.max(12, items.length)), matched: item.words || [], relationType: item.type} : null;
        }).filter(Boolean));
        setLinkStatus('ready');
      })
      .catch(() => { if (!controller.signal.aborted) { setLinked([]); setLinkStatus('error'); } });
    return () => controller.abort();
  }, [ayahMap, selectedAyah]);

  const lexical = useMemo(() => {
    if (!searched || selectedAyah || normalizeArabic(query).length < 3) return [];
    return ayahs.map(ayah => ({...ayah, score: similarityScore(query, ayah.text_original), matched: matchedWords(query, ayah.text_original)}))
      .filter(ayah => ayah.score >= 0.08).sort((left, right) => right.score - left.score).slice(0, 30);
  }, [ayahs, query, searched, selectedAyah]);
  const results = selectedAyah ? linked : lexical;
  function submit(event) { event.preventDefault(); setSelectedAyah(null); setSearched(true); }

  return <div className="similarity-page">
    <header className="page-title"><span className="page-icon"><ScanSearch /></span><div><span>پژوهش در متن قرآن</span><h1>مشابه‌یاب آیات</h1><p>پیوندهای پژوهشی آیه و جست‌وجوی واژگانی، کاملاً آفلاین.</p></div></header>
    <section className="similarity-hero"><Sparkles /><div><strong>موتور مشابه‌یاب آیات جامع التفاسیر منصور</strong><p>برای آیهٔ انتخاب‌شده از پیوندهای پژوهشی همراه برنامه و برای عبارت آزاد از رتبه‌بندی واژگانی استفاده می‌شود.</p></div></section>
    <form className="similarity-form" onSubmit={submit}><label><Search /><textarea value={query} onChange={event => {setQuery(event.target.value); setSelectedAyah(null); setSearched(false);}} placeholder="متن آیه یا عبارت عربی را وارد کنید…" /></label><button className="primary-button" type="submit" disabled={normalizeArabic(query).length < 3}><ScanSearch /> یافتن آیات مشابه</button></form>
    {linkStatus === 'loading' && <div className="inline-state">در حال بازکردن پیوندهای آفلاین…</div>}
    {linkStatus === 'error' && <div className="inline-state error-state">بستهٔ مشابه‌یاب داخل نصب باز نشد.</div>}
    {searched && linkStatus !== 'loading' && <div className="similarity-summary"><strong>{results.length.toLocaleString('fa-IR')}</strong> نتیجهٔ برتر برای مقایسه</div>}
    <div className="similarity-results">{results.map(ayah => <article key={ayah.id}><header><div><span className="mini-seal">{ayah.number.toLocaleString('fa-IR')}</span><div><strong>سوره {surahMap.get(ayah.surah_id)?.name_ar}</strong><small>آیهٔ {ayah.number.toLocaleString('fa-IR')}</small></div></div><em>{Math.round(ayah.score * 100).toLocaleString('fa-IR')}٪</em></header><p lang="ar">{ayah.text_original}</p>{ayah.matched.length > 0 && <div className="matched-words">{ayah.matched.map(word => <span key={word}>{word}</span>)}</div>}<button onClick={() => onOpenAyah(ayah)}><BookOpen /> مطالعهٔ آیه <ChevronLeft /></button></article>)}</div>
    {searched && linkStatus !== 'loading' && !results.length && <div className="large-empty compact"><ScanSearch /><h2>آیهٔ مشابهی پیدا نشد</h2><p>عبارت طولانی‌تر یا واژه‌های شاخص‌تری وارد کنید.</p></div>}
  </div>;
}
