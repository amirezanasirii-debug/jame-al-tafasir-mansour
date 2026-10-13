// جست‌وجوی فارسی و عربی آیات قرآن و نشانی‌های مستقیم (مثلاً «بقره ۲۵۵» یا «۲:۲۵۵»)

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export const latinDigits = value => String(value ?? '')
  .replace(/[۰-۹]/g, c => String(PERSIAN_DIGITS.indexOf(c)))
  .replace(/[٠-٩]/g, c => String(ARABIC_DIGITS.indexOf(c)));

// نرمال‌سازی یکسان برای متن قرآن و ورودی کاربر:
// - همهٔ نشانه‌های اعراب و علائم قرآنی (Unicode Mn) حذف می‌شوند
// - نیم‌فاصله (ZWNJ) و کشیده (ـ) حذف می‌شوند، نه این‌که فاصله شوند
// - شکل‌های «ی/ک/ا/ه/ؤ/ئ» یکسان می‌شوند
export const normalizeSearch = value => latinDigits(value)
  .normalize('NFC')
  .replace(/\p{Mn}/gu, '')
  .replace(/[\u200c-\u200f\u0640]/g, '')
  .replace(/ي/g, 'ی').replace(/ى/g, 'ی')
  .replace(/ك/g, 'ک')
  .replace(/[أإآٱ]/g, 'ا')
  .replace(/ة/g, 'ه')
  .replace(/ؤ/g, 'و')
  .replace(/ئ/g, 'ی')
  .replace(/ۀ/g, 'ه')
  .replace(/[\s\u00a0]+/g, ' ')
  .trim()
  .toLowerCase();

// فاصله‌ها را هم حذف می‌کند تا «میخواهم» و «می خواهم» یکی شوند
const compact = s => s.replace(/\s/g, '');
const stripAl = s => s.replace(/^ال\s*(?=\S)/, '');

const aliases = {
  1: ['حمد', 'فاتحه'], 2: ['بقره'], 3: ['ال عمران', 'آل عمران'], 9: ['توبه', 'برائت'],
  17: ['اسرا', 'بنی اسرائیل'], 36: ['یس', 'یاسین'], 67: ['ملک', 'تبارک'], 112: ['توحید', 'اخلاص'],
};

const surahNames = s => [s.name_ar, ...(aliases[s.id] || [])].map(n => stripAl(normalizeSearch(n)));

export function resolveVerseReference(input, surahs) {
  const q = normalizeSearch(input)
    .replace(/[،,:：؛/-]/g, ' ')
    .replace(/(?:^|\s)(?:سوره|سورت|آیه|ایه|شماره)(?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!q) return null;

  const numeric = q.match(/^(\d{1,3})\s+(\d{1,3})$/);
  if (numeric) {
    const s = surahs.find(s => s.id === Number(numeric[1]));
    const n = Number(numeric[2]);
    return s && n >= 1 && n <= s.ayah_count ? { surah: s, number: n } : null;
  }

  const m = q.match(/^(.+?)\s+(\d{1,3})$/);
  if (!m) return null;
  const name = stripAl(m[1]);
  const n = Number(m[2]);
  const s = surahs.find(s => surahNames(s).includes(name));
  return s && n >= 1 && n <= s.ayah_count ? { surah: s, number: n } : null;
}

export function searchQuran(query, surahs, ayahs, translations, limit = 80) {
  const q = normalizeSearch(query);
  if (!q) return { matchingSurahs: [], matchingAyahs: [], direct: null, total: 0 };
  const qc = compact(q);
  const qName = stripAl(q);
  const direct = resolveVerseReference(query, surahs);

  const matchingSurahs = surahs.filter(s =>
    surahNames(s).some(n => n.includes(qName) || compact(n).includes(compact(qName))) || String(s.id) === q
  );

  const matches = [];
  let total = 0;
  const hit = text => {
    const n = normalizeSearch(text);
    return n.includes(q) || compact(n).includes(qc);
  };
  for (const a of ayahs) {
    if (a.searchText != null ? (a.searchText.includes(q) || (a.searchCompact ?? compact(a.searchText)).includes(qc)) : (hit(a.text_original) || hit(translations.get(a.id) || ''))) {
      total++;
      if (matches.length < limit) matches.push(a);
    }
  }
  return { matchingSurahs, matchingAyahs: matches, direct, total };
}
