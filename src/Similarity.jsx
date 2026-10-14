import React, {useEffect, useMemo, useState} from 'react';
import {BookOpen, ChevronLeft, ScanSearch, Search, Sparkles} from 'lucide-react';
import {BRAND_TEXT} from './brandText.js';

const STOP_WORDS = new Set(['و', 'ف', 'ثم', 'او', 'بل', 'من', 'في', 'على', 'الى', 'عن', 'ما', 'لا', 'ان', 'إن', 'يا', 'هو', 'هي', 'هم']);

export function normalizeArabic(value = '') {
  return value.normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[^\u0621-\u063A\u0641-\u064A\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokens(value) { return new Set(normalizeArabic(value).split(' ').filter(word => word.length > 1 && !STOP_WORDS.has(word))); }
function grams(value, size = 3) { const compact = normalizeArabic(value).replace(/\s/g, ''); const output = new Set(); for (let index = 0; index <= compact.length - size; index += 1) output.add(compact.slice(index, index + size)); return output; }
function overlap(left, right) { if (!left.size || !right.size) return 0; let common = 0; left.forEach(value => { if (right.has(value)) common += 1; }); return common; }

export function similarityScore(query, verse) {
  const queryTokens = tokens(query); const verseTokens = tokens(verse);
  const sharedTokens = overlap(queryTokens, verseTokens);
  const union = queryTokens.size + verseTokens.size - sharedTokens;
  const jaccard = union ? sharedTokens / union : 0;
  const queryGrams = grams(query); const verseGrams = grams(verse);
  const dice = queryGrams.size + verseGrams.size ? (2 * overlap(queryGrams, verseGrams)) / (queryGrams.size + verseGrams.size) : 0;
  const phraseBoost = normalizeArabic(verse).includes(normalizeArabic(query)) ? 0.18 : 0;
  return Math.min(1, (jaccard * 0.62) + (dice * 0.38) + phraseBoost);
}

function matchedWords(query, verse) { const verseTokens = tokens(verse); return [...tokens(query)].filter(word => verseTokens.has(word)).slice(0, 8); }

export default function Similarity({ayahs, surahMap, initialAyah, onOpenAyah, onDraftHandled}) {
  const [query, setQuery] = useState(initialAyah?.text_original || '');
  const [excludedId, setExcludedId] = useState(initialAyah?.id || null);
  const [searched, setSearched] = useState(Boolean(initialAyah));
  useEffect(() => {
    if (!initialAyah) return;
    setQuery(initialAyah.text_original); setExcludedId(initialAyah.id); setSearched(true); onDraftHandled?.();
  }, [initialAyah, onDraftHandled]);
  const results = useMemo(() => {
    if (!searched || normalizeArabic(query).length < 3) return [];
    return ayahs.filter(ayah => ayah.id !== excludedId)
      .map(ayah => ({...ayah, score: similarityScore(query, ayah.text_original), matched: matchedWords(query, ayah.text_original)}))
      .filter(ayah => ayah.score >= 0.08).sort((left, right) => right.score - left.score).slice(0, 30);
  }, [ayahs, excludedId, query, searched]);
  function submit(event) { event.preventDefault(); setExcludedId(null); setSearched(true); }

  return <div className="similarity-page">
    <header className="page-title"><span className="page-icon"><ScanSearch /></span><div><span>پژوهش در متن قرآن</span><h1>مشابه‌یاب آیات</h1><p>آیات نزدیک از نظر واژگان و ساختار متن را در کل قرآن پیدا کنید.</p></div></header>
    <section className="similarity-hero"><Sparkles /><div><strong>{BRAND_TEXT.similarityTitle}</strong><p>{BRAND_TEXT.similarityDescription}</p></div></section>
    <form className="similarity-form" onSubmit={submit}><label><Search /><textarea value={query} onChange={event => {setQuery(event.target.value); setSearched(false);}} placeholder="متن آیه یا عبارت عربی را وارد کنید…" /></label><button className="primary-button" type="submit" disabled={normalizeArabic(query).length < 3}><ScanSearch /> یافتن آیات مشابه</button></form>
    {searched && <div className="similarity-summary"><strong>{results.length.toLocaleString('fa-IR')}</strong> نتیجهٔ برتر برای مقایسه</div>}
    <div className="similarity-results">{results.map(ayah => <article key={ayah.id}><header><div><span className="mini-seal">{ayah.number.toLocaleString('fa-IR')}</span><div><strong>سوره {surahMap.get(ayah.surah_id)?.name_ar}</strong><small>آیهٔ {ayah.number.toLocaleString('fa-IR')}</small></div></div><em>{Math.round(ayah.score * 100).toLocaleString('fa-IR')}٪ شباهت</em></header><p lang="ar">{ayah.text_original}</p>{ayah.matched.length > 0 && <div className="matched-words">{ayah.matched.map(word => <span key={word}>{word}</span>)}</div>}<button onClick={() => onOpenAyah(ayah)}><BookOpen /> مطالعهٔ آیه <ChevronLeft /></button></article>)}</div>
    {searched && !results.length && <div className="large-empty compact"><ScanSearch /><h2>آیهٔ مشابهی پیدا نشد</h2><p>عبارت طولانی‌تر یا واژه‌های شاخص‌تری وارد کنید.</p></div>}
  </div>;
}
