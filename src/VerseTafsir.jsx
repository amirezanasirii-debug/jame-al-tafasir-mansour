import React, {useEffect, useMemo, useState} from 'react';
import {BookOpen, Columns2} from 'lucide-react';

function restoreSelected(sources) {
  try {
    const stored = localStorage.getItem('jm-last-tafsir');
    return sources.some(source => source.id === stored) ? stored : sources[0]?.id || '';
  } catch { return sources[0]?.id || ''; }
}

function formatAddress(entry) {
  const address = entry?.source_address?.[0];
  if (!address) return '';
  const pages = address.BookFromPage === address.BookToPage
    ? `صفحهٔ ${Number(address.BookFromPage).toLocaleString('fa-IR')}`
    : `صفحات ${Number(address.BookFromPage).toLocaleString('fa-IR')} تا ${Number(address.BookToPage).toLocaleString('fa-IR')}`;
  return `جلد ${Number(address.Volume).toLocaleString('fa-IR')}، ${pages}`;
}

function TafsirColumn({source, ayah}) {
  const entry = source?.byAyah?.get(ayah.id);
  if (!source) return null;
  return <section className="verse-tafsir-column">
    <header><BookOpen /><div><strong>{source.title}</strong><span>{source.author}</span></div></header>
    {entry ? <article><p lang={source.language || 'ar'}>{entry.text}</p>{entry.footnotes && <small>{entry.footnotes}</small>}</article> : <div className="inline-state">برای این آیه مطلب مستقیمی ثبت نشده است.</div>}
    <footer>{source.title} — {source.author} · {source.publisher || source.source_id || 'منبع همراه برنامه'}{formatAddress(entry) && ` · ${formatAddress(entry)}`}</footer>
  </section>;
}

export default function VerseTafsir({ayah, sources = []}) {
  const available = useMemo(() => sources.filter(source => source.kind === 'tafsir' && source.byAyah?.has(ayah.id)), [ayah.id, sources]);
  const [selected, setSelected] = useState(() => restoreSelected(available));
  const [comparison, setComparison] = useState(false);
  const [second, setSecond] = useState('');
  const selectedSource = available.find(source => source.id === selected) || available[0];
  const secondSource = available.find(source => source.id === second) || available.find(source => source.id !== selectedSource?.id);

  useEffect(() => {
    if (!available.some(source => source.id === selected)) setSelected(available[0]?.id || '');
  }, [available, selected]);
  useEffect(() => {
    if (selectedSource?.id) {
      try { localStorage.setItem('jm-last-tafsir', selectedSource.id); } catch { /* storage unavailable */ }
    }
    if (!secondSource && comparison) setComparison(false);
  }, [comparison, secondSource, selectedSource]);

  if (!available.length) return <div className="empty-state">برای این آیه تفسیر نصب‌شده‌ای وجود ندارد.</div>;
  return <div className="verse-tafsir-box">
    <div className="tafsir-scroll-tabs" role="tablist" aria-label="انتخاب تفسیر">{available.map(source => <button role="tab" aria-selected={selectedSource?.id === source.id} className={selectedSource?.id === source.id ? 'active' : ''} key={source.id} onClick={() => setSelected(source.id)}>{source.title}</button>)}</div>
    <div className="tafsir-compare-controls"><button disabled={available.length < 2} className={comparison ? 'active' : ''} onClick={() => setComparison(value => !value)}><Columns2 /> مقایسهٔ دو تفسیر</button>{comparison && <select aria-label="تفسیر دوم" value={secondSource?.id || ''} onChange={event => setSecond(event.target.value)}>{available.filter(source => source.id !== selectedSource?.id).map(source => <option value={source.id} key={source.id}>{source.title}</option>)}</select>}</div>
    <div className={`verse-tafsir-columns ${comparison ? 'compare' : ''}`}><TafsirColumn source={selectedSource} ayah={ayah} />{comparison && <TafsirColumn source={secondSource} ayah={ayah} />}</div>
  </div>;
}
