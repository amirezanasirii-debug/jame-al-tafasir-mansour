import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {resolveVerseReference, searchQuran, normalizeSearch} from '../src/verseSearch.js';

const surahs = [
  {id: 2, name_ar: 'البقرة', ayah_count: 286},
  {id: 12, name_ar: 'يوسف', ayah_count: 111},
  {id: 23, name_ar: 'المؤمنون', ayah_count: 118},
  {id: 24, name_ar: 'النور', ayah_count: 64},
  {id: 3, name_ar: 'آل عمران', ayah_count: 200},
];

for (const input of ['بقره ۲۵۵', 'سوره بقره آیه 255', '۲:۲۵۵', '2/255', 'البقرة ٢٥٥', 'بقره ۲۵۵ ', 'ال بقره ۲۵۵'])
  test(`direct reference: ${input}`, () => assert.equal(resolveVerseReference(input, surahs)?.number, 255));

test('invalid verse number', () => assert.equal(resolveVerseReference('۲:۳۰۰', surahs), null));
test('surah with ال in query', () => assert.equal(resolveVerseReference('المؤمنون ۱۸', surahs)?.surah.id, 23));
test('ؤ and ومنون spelling match', () => assert.equal(resolveVerseReference('مومنون ۱', surahs)?.surah.id, 23));

test('quranic diacritics and mixed text', () => {
  const ayahs = [{id: 1, surah_id: 24, number: 35, text_original: 'اللَّهُ نُورُ السَّمَاوَاتِ'}];
  const tr = new Map([[1, 'خدا نور آسمان‌هاست']]);
  assert.equal(searchQuran('الله نور', surahs, ayahs, tr).total, 1);
  assert.equal(searchQuran('خدا نور', surahs, ayahs, tr).total, 1);
});

test('ZWNJ and spacing are interchangeable in Persian search', () => {
  const ayahs = [{id: 2, surah_id: 2, number: 1, text_original: 'الم'}];
  const tr = new Map([[2, 'آنان که می‌خواهند']]);
  assert.equal(searchQuran('میخواهند', surahs, ayahs, tr).total, 1);
  assert.equal(searchQuran('می خواهند', surahs, ayahs, tr).total, 1);
});

test('surah name search with and without ال', () => {
  assert.equal(searchQuran('البقرة', surahs, [], new Map()).matchingSurahs[0]?.id, 2);
  assert.equal(searchQuran('بقره', surahs, [], new Map()).matchingSurahs[0]?.id, 2);
  assert.equal(searchQuran('ال عمران', surahs, [], new Map()).matchingSurahs[0]?.id, 3);
});

test('normalizeSearch removes Quranic marks', () => {
  assert.equal(normalizeSearch('بِسْمِ ٱللَّهِ'), normalizeSearch('بسم الله'));
});
