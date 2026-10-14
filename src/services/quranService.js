import {fetchJson} from './httpClient.js';

const HOST = 'api.alquran.cloud';
const EDITIONS = ['quran-simple', 'fa.fooladvand'];

function validInteger(value, minimum, maximum, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new RangeError(`${label} باید عددی بین ${minimum} و ${maximum} باشد.`);
  }
  return number;
}

export async function getQuranVerse(surah, ayah, options = {}) {
  const surahNumber = validInteger(surah, 1, 114, 'شمارهٔ سوره');
  const ayahNumber = validInteger(ayah, 1, 286, 'شمارهٔ آیه');
  const url = `https://${HOST}/v1/ayah/${surahNumber}:${ayahNumber}/editions/${EDITIONS.join(',')}`;
  const payload = await fetchJson(url, {...options, allowedHosts: [HOST]});
  if (payload?.code !== 200 || !Array.isArray(payload?.data)) {
    throw new Error('ساختار پاسخ قرآن با قرارداد سرویس سازگار نیست.');
  }
  const arabic = payload.data.find(item => item?.edition?.identifier === 'quran-simple');
  const persian = payload.data.find(item => item?.edition?.identifier === 'fa.fooladvand');
  if (!arabic?.text || !persian?.text) throw new Error('متن عربی یا ترجمهٔ فارسی در پاسخ موجود نیست.');
  return {
    surah: surahNumber,
    ayah: ayahNumber,
    arabic: arabic.text,
    persian: persian.text,
    editions: {
      arabic: {id: arabic.edition.identifier, name: arabic.edition.name, type: arabic.edition.type},
      persian: {id: persian.edition.identifier, name: persian.edition.name, type: persian.edition.type},
    },
    source: 'AlQuran Cloud API',
    sourceUrl: url,
  };
}

