import React, {useEffect, useMemo, useState} from 'react';
import {BookOpen, Columns2, RefreshCw} from 'lucide-react';
import {loadOfflineManifest, loadTafsirVerse} from './offlineData.js';

function restoreSelected(sources) {
  try {
    const stored = localStorage.getItem('jm-last-tafsir');
    return sources.some(source => source.key === stored) ? stored : sources[0]?.key || '';
  } catch { return sources[0]?.key || ''; }
}

function TafsirColumn({source, state}) {
  if (!source) return null;
  return <section className="verse-tafsir-column">
    <header><BookOpen /><div><strong>{source.title}</strong><span>{source.author || 'شناسنامهٔ اثر همراه بسته'}</span></div></header>
    {state?.status === 'loading' && <div className="inline-state">در حال بازکردن متن آفلاین…</div>}
    {state?.status === 'error' && <div className="inline-state error-state"><RefreshCw /> متن این بسته باز نشد؛ نصب ناقص است.</div>}
    {state?.status === 'ready' && !state.entries.length && <div className="inline-state">برای این آیه مطلب مستقیمی ثبت نشده است.</div>}
    {state?.status === 'ready' && state.entries.map((entry, index) => <article key={`${entry.page || 0}-${entry.part || index}`}><h4>{entry.title || source.title}{entry.volume ? ` · جلد ${Number(entry.volume).toLocaleString('fa-IR')}` : ''}{entry.page ? ` · صفحه ${Number(entry.page).toLocaleString('fa-IR')}` : ''}</h4><p lang={source.language || 'ar'}>{entry.text}</p></article>)}
    <footer>{source.title} — {source.author || 'مؤلف ثبت‌شده در شناسنامهٔ اثر'}{source.publisher ? ` · ${source.publisher}` : ''}</footer>
  </section>;
}

export default function VerseTafsir({ayah, sources = []}) {
  const [manifestSources, setManifestSources] = useState([]);
  const [manifestStatus, setManifestStatus] = useState('loading');
  const [selected, setSelected] = useState('');
  const [comparison, setComparison] = useState(false);
  const [second, setSecond] = useState('');
  const [content, setContent] = useState({});

  useEffect(() => {
    const controller = new AbortController();
    loadOfflineManifest({signal: controller.signal})
      .then(manifest => { if (!controller.signal.aborted) { setManifestSources(manifest.sources || []); setManifestStatus('ready'); } })
      .catch(() => { if (!controller.signal.aborted) setManifestStatus('error'); });
    return () => controller.abort();
  }, []);

  const available = useMemo(() => [
    ...manifestSources.map(source => ({...source, key: `offline:${source.id}`, mode: 'offline'})),
    ...sources.filter(source => source.kind === 'tafsir' && source.byAyah?.has(ayah.id)).map(source => ({...source, key: `embedded:${source.id}`, mode: 'embedded'})),
  ], [ayah.id, manifestSources, sources]);

  useEffect(() => {
    if (!selected || !available.some(source => source.key === selected)) setSelected(restoreSelected(available));
  }, [available, selected]);
  const selectedSource = available.find(source => source.key === selected) || available[0];
  const secondSource = available.find(source => source.key === second && source.key !== selectedSource?.key)
    || available.find(source => source.key !== selectedSource?.key);

  useEffect(() => {
    const requested = [selectedSource, comparison ? secondSource : null].filter(Boolean);
    const controllers = [];
    requested.forEach(source => {
      const stateKey = `${source.key}:${ayah.surah_id}:${ayah.number}`;
      if (content[stateKey]) return;
      if (source.mode === 'embedded') {
        const entry = source.byAyah.get(ayah.id);
        setContent(current => ({...current, [stateKey]: {status: 'ready', entries: entry ? [entry] : []}}));
        return;
      }
      const controller = new AbortController(); controllers.push(controller);
      setContent(current => ({...current, [stateKey]: {status: 'loading', entries: []}}));
      loadTafsirVerse(source.id, ayah.surah_id, ayah.number, {signal: controller.signal})
        .then(entries => { if (!controller.signal.aborted) setContent(current => ({...current, [stateKey]: {status: 'ready', entries}})); })
        .catch(() => { if (!controller.signal.aborted) setContent(current => ({...current, [stateKey]: {status: 'error', entries: []}})); });
    });
    return () => controllers.forEach(controller => controller.abort());
  }, [ayah.id, ayah.number, ayah.surah_id, comparison, secondSource, selectedSource]);

  useEffect(() => {
    if (selectedSource?.key) {
      try { localStorage.setItem('jm-last-tafsir', selectedSource.key); } catch { /* storage unavailable */ }
    }
    if (!secondSource && comparison) setComparison(false);
  }, [comparison, secondSource, selectedSource]);

  if (manifestStatus === 'loading') return <div className="inline-state">در حال شناسایی تفاسیر آفلاین…</div>;
  if (!available.length) return <div className="empty-state">برای این آیه تفسیر نصب‌شده‌ای وجود ندارد.</div>;
  const stateOf = source => content[`${source?.key}:${ayah.surah_id}:${ayah.number}`];
  return <div className="verse-tafsir-box">
    {manifestStatus === 'error' && <div className="inline-state error-state">فهرست بسته‌های آفلاین باز نشد؛ تفاسیر پایهٔ داخلی نمایش داده می‌شوند.</div>}
    <div className="tafsir-scroll-tabs" role="tablist" aria-label="انتخاب تفسیر">{available.map(source => <button role="tab" aria-selected={selectedSource?.key === source.key} className={selectedSource?.key === source.key ? 'active' : ''} key={source.key} onClick={() => setSelected(source.key)}>{source.title}</button>)}</div>
    <div className="tafsir-compare-controls"><button disabled={available.length < 2} className={comparison ? 'active' : ''} onClick={() => setComparison(value => !value)}><Columns2 /> مقایسهٔ دو تفسیر</button>{comparison && <select aria-label="تفسیر دوم" value={secondSource?.key || ''} onChange={event => setSecond(event.target.value)}>{available.filter(source => source.key !== selectedSource?.key).map(source => <option value={source.key} key={source.key}>{source.title}</option>)}</select>}</div>
    <div className={`verse-tafsir-columns ${comparison ? 'compare' : ''}`}><TafsirColumn source={selectedSource} state={stateOf(selectedSource)} />{comparison && <TafsirColumn source={secondSource} state={stateOf(secondSource)} />}</div>
  </div>;
}
