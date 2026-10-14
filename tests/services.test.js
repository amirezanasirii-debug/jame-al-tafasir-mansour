import assert from 'node:assert/strict';
import test from 'node:test';
import {fetchJson, HttpError} from '../src/services/httpClient.js';
import {getQuranVerse} from '../src/services/quranService.js';
import {getHadith} from '../src/services/hadithService.js';
import {validateDua} from '../src/services/duaRepository.js';
import {formatApaCitation, searchCrossrefPapers, searchSemanticScholarPapers} from '../src/services/scientificReferenceService.js';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {'content-type': 'application/json'},
});

test('fetchJson rejects non-HTTPS and non-allowlisted hosts', async () => {
  await assert.rejects(() => fetchJson('http://example.com/a'), HttpError);
  await assert.rejects(() => fetchJson('https://evil.invalid/a', {allowedHosts: ['api.example.com']}), HttpError);
});

test('fetchJson retries a transient failure', async () => {
  let calls = 0;
  const data = await fetchJson('https://api.example.com/value', {
    allowedHosts: ['api.example.com'], retries: 1, retryDelayMs: 1,
    fetchImpl: async () => { calls += 1; return calls === 1 ? jsonResponse({}, 503) : jsonResponse({ok: true}); },
  });
  assert.equal(calls, 2);
  assert.deepEqual(data, {ok: true});
});

test('getQuranVerse returns named editions without changing text', async () => {
  const result = await getQuranVerse(2, 255, {fetchImpl: async () => jsonResponse({code: 200, data: [
    {text: 'اللَّهُ', edition: {identifier: 'quran-simple', name: 'Simple', type: 'quran'}},
    {text: 'خداست', edition: {identifier: 'fa.fooladvand', name: 'فولادوند', type: 'translation'}},
  ]})});
  assert.equal(result.arabic, 'اللَّهُ');
  assert.equal(result.persian, 'خداست');
});

test('getHadith validates identifiers and reads a pinned Sunni edition', async () => {
  await assert.rejects(() => getHadith('../bad', 1), /نامعتبر/);
  const result = await getHadith('eng-bukhari', 1, {fetchImpl: async () => jsonResponse({hadiths: [
    {hadithnumber: 1, text: 'translation', arabic: 'العربية'},
  ]})});
  assert.equal(result.number, 1);
  assert.equal(result.arabic, 'العربية');
  assert.match(result.sourceUrl, /hadith-api@1/);
});

test('dua package requires sequential aligned text and provenance', () => {
  const valid = validateDua({
    schema: 'jame-mansour-dua', version: 1, id: 'kumayl', title_fa: 'دعای کمیل',
    source: {url: 'https://example.org', license_name: 'CC BY 4.0', retrieved_at: '2026-10-14'},
    verses: [{verse_number: 1, arabic: 'عربی', persian: 'فارسی'}],
  });
  assert.equal(valid.verses.length, 1);
  assert.throws(() => validateDua({...valid, verses: [{verse_number: 2, arabic: 'ع', persian: 'ف'}]}), /شمارهٔ 1/);
});

test('Crossref results are normalized to APA-like citations', async () => {
  const results = await searchCrossrefPapers('quran', {fetchImpl: async () => jsonResponse({message: {items: [{
    DOI: '10.1/test', title: ['A paper'], author: [{family: 'Doe', given: 'Jane'}],
    published: {'date-parts': [[2024]]}, 'container-title': ['Journal'],
  }]}})});
  assert.equal(results[0].year, 2024);
  assert.match(results[0].citationApa, /https:\/\/doi\.org\/10\.1\/test/);
  assert.equal(formatApaCitation(results[0]), results[0].citationApa);
});

test('Semantic Scholar remains opt-in because its API terms are conditional', async () => {
  await assert.rejects(() => searchSemanticScholarPapers('quran'), /پذیرش شرایط/);
});
