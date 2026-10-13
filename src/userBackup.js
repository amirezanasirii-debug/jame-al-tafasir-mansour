export const USER_BACKUP_SCHEMA = 'jame-mansour-user-data';
export const USER_BACKUP_VERSION = 1;

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
  let parsed;
  try { parsed = JSON.parse(String(text || '')); }
  catch { throw new Error('فایل انتخاب‌شده JSON معتبر نیست.'); }
  if (parsed?.schema !== USER_BACKUP_SCHEMA || parsed?.version !== USER_BACKUP_VERSION) {
    throw new Error('این فایل پشتیبان متعلق به نسخهٔ پشتیبانی‌شدهٔ برنامه نیست.');
  }
  if (!Array.isArray(parsed.notes) || !Array.isArray(parsed.bookmarks)) {
    throw new Error('ساختار یادداشت‌ها یا نشان‌ها در فایل ناقص است.');
  }
  const marks = [...new Set(parsed.bookmarks.filter(value => Number.isInteger(value) && value > 0))];
  const notes = parsed.notes.filter(note => note && typeof note === 'object' && typeof note.id === 'string');
  return {
    notes,
    marks,
    markCategories: safeObject(parsed.bookmarkCategories),
    last: parsed.readingPosition && Number.isInteger(parsed.readingPosition.surah) && Number.isInteger(parsed.readingPosition.verse)
      ? parsed.readingPosition : null,
  };
}
