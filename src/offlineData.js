const BASE = import.meta.env.BASE_URL;
const cache = new Map();

async function fetchLocalJson(relativePath, {signal, retries = 1} = {}) {
  const cacheKey = relativePath.replace(/^\/+/, '');
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const request = (async () => {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const response = await fetch(`${BASE}${cacheKey}`, {signal, cache: 'force-cache'});
        if (!response.ok) throw new Error(`بستهٔ آفلاین با خطای ${response.status} باز نشد.`);
        return await response.json();
      } catch (error) {
        lastError = error;
        if (signal?.aborted || attempt === retries) break;
      }
    }
    cache.delete(cacheKey);
    throw lastError || new Error('بستهٔ آفلاین باز نشد.');
  })();

  cache.set(cacheKey, request);
  return request;
}

export async function loadOfflineManifest(options) {
  const raw = await fetchLocalJson('offline/manifest.json', options);
  if (Array.isArray(raw.sources)) return raw;
  return {
    ...raw,
    sources: Object.entries(raw.books || {}).map(([id, title]) => ({
      id,
      title,
      author: 'مشخصات مؤلف در متن و شناسنامهٔ اثر',
      language: ['21', '236', '317', '660', '723'].includes(id) ? 'fa' : 'ar',
      offline: true,
      storage: 'legacy-json-shards',
    })),
  };
}

function decodeLegacyTafsir(raw, verseNumber) {
  return (raw?.[String(verseNumber)] || []).flatMap((section, sectionIndex) => {
    const pages = Array.isArray(section.pages) ? section.pages : [];
    if (!pages.length && section.text) return [{...section, part: sectionIndex + 1}];
    return pages.map((page, pageIndex) => ({
      ...page,
      title: section.title,
      volume: page.volume ?? section.volume,
      part: pageIndex + 1,
      group: page.group,
    }));
  }).filter(item => String(item.text || '').trim());
}

function decodeSchemaPack(raw, verseNumber) {
  if (raw?.schemaVersion === 2) {
    return (raw.verses?.[String(verseNumber)] || []).flatMap(item =>
      (item.refs || []).map(([hash, page], index) => ({
        text: raw.chunks?.[hash] || '', page, volume: item.volume,
        title: item.title, part: index + 1,
      })),
    ).filter(item => item.text);
  }
  if (raw?.schema === 1 && Array.isArray(raw.entries)) {
    return raw.entries.filter(item => Number(item.ayah) === Number(verseNumber));
  }
  return decodeLegacyTafsir(raw, verseNumber);
}

export async function loadTafsirVerse(sourceId, surah, verseNumber, options) {
  const raw = await fetchLocalJson(`offline/tafsir/${sourceId}/${Number(surah)}.json`, options);
  return decodeSchemaPack(raw, verseNumber);
}

export async function loadHadithVerse(surah, verseNumber, options) {
  const raw = await fetchLocalJson(`offline/hadith/${Number(surah)}.json`, options);
  return raw?.[String(verseNumber)] || [];
}

export async function loadSimilarityVerse(surah, verseNumber, options) {
  const raw = await fetchLocalJson(`offline/similarity/${Number(surah)}.json`, options);
  return raw?.[String(verseNumber)] || [];
}

export function loadVocabulary(options) {
  return fetchLocalJson('vocabulary.json', options);
}

export function localAudioUrl(surah) {
  return `${BASE}audio/minshawi/${String(Number(surah)).padStart(3, '0')}.mp3`;
}

export function clearOfflineCache() {
  cache.clear();
}
