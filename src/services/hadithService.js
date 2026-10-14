import {fetchJson} from './httpClient.js';

const SUNNI_HOST = 'cdn.jsdelivr.net';
const SHIA_HOST = 'www.thaqalayn-api.net';
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;

function safeIdentifier(value, label) {
  const identifier = String(value || '').trim();
  if (!SAFE_ID.test(identifier)) throw new TypeError(`${label} نامعتبر است.`);
  return identifier;
}

function positiveInteger(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) throw new RangeError('شمارهٔ حدیث باید عدد صحیح مثبت باشد.');
  return number;
}

function normalizeSunni(payload, book, number, edition, sourceUrl) {
  const collection = payload?.hadiths;
  const item = Array.isArray(collection)
    ? collection.find(candidate => Number(candidate?.hadithnumber ?? candidate?.hadithNumber) === number)
    : collection?.[number] ?? collection?.[String(number)];
  if (!item) throw new Error('حدیث در ویرایش انتخاب‌شده پیدا نشد.');
  return {
    provider: 'hadith-api', book, number, edition,
    arabic: item.arabic || item.text || item.hadithArabic || '',
    translation: item.text || item.english?.text || item.hadithEnglish || '',
    chapter: item.reference?.book ?? item.chapter ?? null,
    grades: item.grades || [],
    raw: item,
    sourceUrl,
  };
}

function normalizeShia(payload, book, number, sourceUrl) {
  const item = Array.isArray(payload) ? payload[0] : payload?.data ?? payload;
  if (!item || typeof item !== 'object') throw new Error('حدیث در منبع انتخاب‌شده پیدا نشد.');
  return {
    provider: 'thaqalayn', book, number,
    arabic: item.arabicText || item.arabic || item.text_ar || '',
    translation: item.englishText || item.english || item.text_en || '',
    chapter: item.chapter || item.chapter_en || null,
    grades: item.grades || item.grade || [],
    raw: item,
    sourceUrl,
    redistributionNotice: 'پیش از ذخیره یا بازتوزیع، شرایط متن کتاب و ترجمهٔ بالادستی بررسی شود.',
  };
}

/**
 * Fetch a single hadith. Online results are never silently inserted into the
 * offline library; an importer must first attach provenance and license data.
 */
export async function getHadith(book, hadithNumber, options = {}) {
  const provider = options.provider === 'shia' ? 'shia' : 'sunni';
  const safeBook = safeIdentifier(book, 'شناسهٔ کتاب');
  const number = positiveInteger(hadithNumber);
  if (provider === 'shia') {
    const sourceUrl = `https://${SHIA_HOST}/api/v2/${encodeURIComponent(safeBook)}/${number}`;
    const payload = await fetchJson(sourceUrl, {...options, allowedHosts: [SHIA_HOST]});
    return normalizeShia(payload, safeBook, number, sourceUrl);
  }
  const edition = safeIdentifier(options.edition || safeBook, 'شناسهٔ ویرایش');
  const sourceUrl = `https://${SUNNI_HOST}/gh/fawazahmed0/hadith-api@1/editions/${encodeURIComponent(edition)}.min.json`;
  const payload = await fetchJson(sourceUrl, {...options, allowedHosts: [SUNNI_HOST]});
  return normalizeSunni(payload, safeBook, number, edition, sourceUrl);
}

