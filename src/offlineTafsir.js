const manifestUrl = () => `${import.meta.env.BASE_URL}data/tafsir/index.json`;
const shardUrl = (sourceId, surah) => (
  `${import.meta.env.BASE_URL}data/tafsir/${encodeURIComponent(sourceId)}/${String(surah).padStart(3, '0')}.json.gz`
);

let manifestPromise;
const shardCache = new Map();

async function parseGzipJson(response) {
  if (!response.ok) throw new Error(`بستهٔ آفلاین یافت نشد (${response.status}).`);
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('نسخهٔ WebView دستگاه از بازکردن بستهٔ آفلاین پشتیبانی نمی‌کند؛ WebView را به‌روز کنید.');
  }
  const decompressed = response.body.pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(decompressed).text());
}

export function loadOfflineTafsirManifest() {
  if (!manifestPromise) {
    manifestPromise = fetch(manifestUrl(), {cache: 'force-cache'})
      .then(response => {
        if (!response.ok) throw new Error('فهرست تفاسیر آفلاین در دسترس نیست.');
        return response.json();
      });
  }
  return manifestPromise;
}

export function loadOfflineTafsirShard(sourceId, surah) {
  const key = `${sourceId}:${Number(surah)}`;
  if (!shardCache.has(key)) {
    shardCache.set(key, fetch(shardUrl(sourceId, surah), {cache: 'force-cache'}).then(parseGzipJson));
  }
  return shardCache.get(key);
}

export async function loadOfflineTafsirBooksForSurah(surah, sources) {
  const installed = sources || (await loadOfflineTafsirManifest()).sources || [];
  return Promise.all(installed.map(async source => {
    const shard = await loadOfflineTafsirShard(source.id, surah);
    const byAyah = new Map();
    for (const entry of shard.entries || []) {
      const previous = byAyah.get(entry.ayah_id);
      byAyah.set(entry.ayah_id, previous ? {
        ...previous,
        text: `${previous.text}\n\n${entry.text}`,
        source_address: [...(previous.source_address || []), ...(entry.source_address || [])],
      } : entry);
    }
    return {
      ...source,
      kind: 'tafsir',
      entries: shard.entries || [],
      byAyah,
    };
  }));
}

export function formatOfflineSize(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024)).toLocaleString('fa-IR')} کیلوبایت`;
  return `${(value / 1024 / 1024).toLocaleString('fa-IR', {maximumFractionDigits: 1})} مگابایت`;
}
