import {fetchJson} from './httpClient.js';

const SAFE_DUA_NAME = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export function validateDua(input) {
  if (!input || typeof input !== 'object' || input.schema !== 'jame-mansour-dua' || input.version !== 1) {
    throw new Error('ساختار بستهٔ دعا معتبر نیست.');
  }
  if (!SAFE_DUA_NAME.test(input.id) || !String(input.title_fa || '').trim() || !Array.isArray(input.verses)) {
    throw new Error('شناسه، عنوان یا بندهای دعا ناقص است.');
  }
  let expected = 1;
  const verses = input.verses.map(item => {
    if (item?.verse_number !== expected || !String(item?.arabic || '').trim() || !String(item?.persian || '').trim()) {
      throw new Error(`بند شمارهٔ ${expected} ناقص یا نامرتب است.`);
    }
    expected += 1;
    return {
      verse_number: item.verse_number,
      arabic: String(item.arabic),
      persian: String(item.persian),
      audio_url: item.audio_url ? String(item.audio_url) : null,
    };
  });
  if (!input.source?.url || !input.source?.license_name || !input.source?.retrieved_at) {
    throw new Error('شناسنامهٔ منبع و مجوز بستهٔ دعا کامل نیست.');
  }
  return {...input, verses};
}

/** Load a verified, packaged dua. The slug cannot escape the local data folder. */
export async function getDua(duaName, options = {}) {
  const id = String(duaName || '').trim().toLowerCase();
  if (!SAFE_DUA_NAME.test(id)) throw new TypeError('نام دعا معتبر نیست.');
  const baseUrl = options.baseUrl ?? `${import.meta.env?.BASE_URL || '/'}data/duas/`;
  const payload = await fetchJson(new URL(`${id}.json`, new URL(baseUrl, globalThis.location?.href || 'https://local.invalid/')).href, {
    ...options,
    allowedHosts: options.allowedHosts || (globalThis.location?.hostname ? [globalThis.location.hostname] : ['local.invalid']),
  });
  return validateDua(payload);
}

