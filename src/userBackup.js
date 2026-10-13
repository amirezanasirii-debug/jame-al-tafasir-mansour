export const USER_BACKUP_SCHEMA = 'jame-mansour-user-data';
export const USER_BACKUP_VERSION = 1;
export const USER_BACKUP_MAX_CHARS = 5 * 1024 * 1024;

const MAX_NOTES = 5000;
const MAX_BOOKMARKS = 6236;
const NOTE_LIMITS = {id: 128, title: 500, body: 250000, bodyHtml: 500000, reference: 500, tags: 2000};

const safeArray = value => Array.isArray(value) ? value : [];
const safeObject = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

export function createUserBackup({notes, marks, markCategories, last}) {
  return {
    schema: USER_BACKUP_SCHEMA,
    version: USER_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    notes: safeArray(notes),
    bookmarks: safeArray(marks).filter(Number.isInteger),
    bookmarkCategories: safeObject(markCategories),
    readingPosition: last && Number.isInteger(last.surah) && Number.isInteger(last.verse) ? last : null,
  };
}

export function parseUserBackup(text) {
  const input = String(text || '');
  if (input.length > USER_BACKUP_MAX_CHARS) {
    throw new Error('حجم فایل پشتیبان بیش از حد مجاز است.');
  }
  let parsed;
  try { parsed = JSON.parse(input); }
  catch { throw new Error('فایل انتخاب‌شده JSON معتبر نیست.'); }
  if (parsed?.schema !== USER_BACKUP_SCHEMA || parsed?.version !== USER_BACKUP_VERSION) {
    throw new Error('این فایل پشتیبان متعلق به نسخهٔ پشتیبانی‌شدهٔ برنامه نیست.');
  }
  if (!Array.isArray(parsed.notes) || !Array.isArray(parsed.bookmarks)) {
    throw new Error('ساختار یادداشت‌ها یا نشان‌ها در فایل ناقص است.');
  }
  if (parsed.notes.length > MAX_NOTES || parsed.bookmarks.length > MAX_BOOKMARKS) {
    throw new Error('تعداد یادداشت‌ها یا نشان‌ها بیش از حد مجاز است.');
  }
  const marks = [...new Set(parsed.bookmarks.filter(
    value => Number.isInteger(value) && value > 0 && value <= MAX_BOOKMARKS,
  ))];
  const notes = parsed.notes.map((note, index) => {
    if (!note || typeof note !== 'object' || Array.isArray(note)) {
      throw new Error(`یادداشت شمارهٔ ${index + 1} ساختار معتبری ندارد.`);
    }
    const clean = {};
    for (const [field, limit] of Object.entries(NOTE_LIMITS)) {
      const value = note[field];
      if (value == null) continue;
      if (typeof value !== 'string' || value.length > limit) {
        throw new Error(`فیلد ${field} در یادداشت شمارهٔ ${index + 1} معتبر نیست.`);
      }
      clean[field] = value;
    }
    if (!clean.id?.trim()) throw new Error(`شناسهٔ یادداشت شمارهٔ ${index + 1} معتبر نیست.`);
    clean.ayahId = note.ayahId == null ? null
      : (Number.isInteger(note.ayahId) && note.ayahId > 0 && note.ayahId <= MAX_BOOKMARKS ? note.ayahId : null);
    for (const field of ['createdAt', 'updatedAt']) {
      if (typeof note[field] === 'string' && note[field].length <= 64) clean[field] = note[field];
    }
    return clean;
  });
  return {
    notes,
    marks,
    markCategories: safeObject(parsed.bookmarkCategories),
    last: parsed.readingPosition && Number.isInteger(parsed.readingPosition.surah) && Number.isInteger(parsed.readingPosition.verse)
      ? parsed.readingPosition : null,
  };
}
