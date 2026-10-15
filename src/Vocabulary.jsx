import React, {useDeferredValue, useEffect, useMemo, useState} from 'react';
import {BookOpen, Languages, RefreshCw, Search} from 'lucide-react';
import {loadVocabulary} from './offlineData.js';
import {normalizeSearch} from './verseSearch.js';

export default function Vocabulary() {
  const [entries, setEntries] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('loading');
  const [reload, setReload] = useState(0);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    loadVocabulary({signal: controller.signal})
      .then(data => { if (!controller.signal.aborted) { setEntries(data.entries || []); setStatus('ready'); } })
      .catch(() => { if (!controller.signal.aborted) setStatus('error'); });
    return () => controller.abort();
  }, [reload]);

  const results = useMemo(() => {
    const normalized = normalizeSearch(deferredQuery);
    if (!normalized) return entries.slice(0, 24);
    return entries.filter(entry => {
      const roots = (entry.roots || []).join(' ');
      return normalizeSearch(`${entry.word} ${entry.lemma} ${roots}`).includes(normalized);
    }).slice(0, 60);
  }, [deferredQuery, entries]);

  return <div className="vocabulary-page">
    <header className="page-title"><span className="page-icon"><Languages /></span><div><span>پژوهشگاه واژگان جامع التفاسیر منصور</span><h1>واژه‌نامه</h1><p>ریشه، بن واژه و شرح منابع لغوی، کاملاً آفلاین.</p></div></header>
    <div className="vocabulary-search"><label><Search /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="واژه یا ریشه را بنویسید…" /></label><span>{entries.length.toLocaleString('fa-IR')} مدخل</span></div>
    {status === 'loading' && <div className="inline-state">در حال بازکردن واژه‌نامهٔ آفلاین…</div>}
    {status === 'error' && <div className="large-empty"><RefreshCw /><h2>واژه‌نامه باز نشد</h2><p>فایل نصب ناقص است یا خوانده نمی‌شود.</p><button className="primary-button" onClick={() => setReload(value => value + 1)}>تلاش دوباره</button></div>}
    {status === 'ready' && !results.length && <div className="large-empty"><Search /><h2>مدخلی پیدا نشد</h2><p>املای دیگر یا ریشهٔ واژه را امتحان کنید.</p></div>}
    {status === 'ready' && <div className="vocabulary-results">{results.map(entry => <article className="word-card" key={entry.id}><header><h2>{entry.word}</h2><span>{entry.lemma}</span><strong>{Number(entry.count || 0).toLocaleString('fa-IR')} کاربرد</strong></header><div className="root-row"><small>ریشه</small>{(entry.roots || []).map(root => <b key={root}>{root}</b>)}</div>{(entry.definitions || []).map((definition, index) => <section className="definition" key={`${definition.t}-${definition.p}-${index}`}><header><BookOpen /><strong>{definition.t}</strong><span>جلد {Number(definition.v || 0).toLocaleString('fa-IR')} · صفحه {Number(definition.p || 0).toLocaleString('fa-IR')}</span></header><p lang={definition.l || 'fa'}>{definition.x}</p></section>)}</article>)}</div>}
  </div>;
}
