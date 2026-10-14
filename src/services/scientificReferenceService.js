import {fetchJson} from './httpClient.js';

const CROSSREF_HOST = 'api.crossref.org';
const SEMANTIC_HOST = 'api.semanticscholar.org';

const clean = value => String(value || '').replace(/\s+/g, ' ').trim();

function publicationYear(item) {
  return item?.published?.['date-parts']?.[0]?.[0]
    ?? item?.['published-print']?.['date-parts']?.[0]?.[0]
    ?? item?.['published-online']?.['date-parts']?.[0]?.[0]
    ?? null;
}

function authorName(author = {}) {
  return clean([author.family, author.given].filter(Boolean).join(', ')) || clean(author.name) || 'بی‌نام';
}

export function formatApaCitation({title, authors, year, doi, venue}) {
  const authorText = authors.length ? authors.join('؛ ') : 'بی‌نام';
  const date = year || 'بی‌تاریخ';
  const venueText = venue ? ` ${venue}.` : '';
  const doiText = doi ? ` https://doi.org/${doi}` : '';
  return `${authorText} (${date}). ${title}.${venueText}${doiText}`.replace(/\.\./g, '.');
}

export async function searchCrossrefPapers(query, options = {}) {
  const term = clean(query);
  if (term.length < 2 || term.length > 300) throw new RangeError('عبارت جست‌وجو باید بین ۲ تا ۳۰۰ نویسه باشد.');
  const url = new URL(`https://${CROSSREF_HOST}/works`);
  url.searchParams.set('query', term);
  url.searchParams.set('rows', String(Math.min(20, Math.max(1, Number(options.rows) || 5))));
  url.searchParams.set('select', 'DOI,title,author,published,published-print,published-online,container-title,URL');
  const payload = await fetchJson(url.href, {...options, allowedHosts: [CROSSREF_HOST]});
  const items = payload?.message?.items;
  if (!Array.isArray(items)) throw new Error('ساختار پاسخ Crossref معتبر نیست.');
  return items.map(item => {
    const result = {
      title: clean(item.title?.[0]) || 'بدون عنوان',
      authors: Array.isArray(item.author) ? item.author.map(authorName) : [],
      year: publicationYear(item),
      doi: clean(item.DOI),
      venue: clean(item['container-title']?.[0]),
      url: item.DOI ? `https://doi.org/${item.DOI}` : clean(item.URL),
      source: 'Crossref',
    };
    return {...result, citationApa: formatApaCitation(result)};
  });
}

export async function searchSemanticScholarPapers(query, options = {}) {
  if (options.usageTermsAccepted !== true) {
    throw new Error('استفاده از Semantic Scholar فقط پس از پذیرش شرایط جاری API فعال می‌شود.');
  }
  const term = clean(query);
  if (term.length < 2 || term.length > 300) throw new RangeError('عبارت جست‌وجو معتبر نیست.');
  const url = new URL(`https://${SEMANTIC_HOST}/graph/v1/paper/search`);
  url.searchParams.set('query', term);
  url.searchParams.set('limit', String(Math.min(20, Math.max(1, Number(options.rows) || 5))));
  url.searchParams.set('fields', 'title,authors,year,externalIds,venue,url');
  const headers = options.apiKey ? {'x-api-key': options.apiKey} : {};
  const payload = await fetchJson(url.href, {...options, headers, allowedHosts: [SEMANTIC_HOST]});
  if (!Array.isArray(payload?.data)) throw new Error('ساختار پاسخ Semantic Scholar معتبر نیست.');
  return payload.data.map(item => {
    const result = {
      title: clean(item.title) || 'بدون عنوان',
      authors: Array.isArray(item.authors) ? item.authors.map(author => clean(author.name)).filter(Boolean) : [],
      year: item.year || null,
      doi: clean(item.externalIds?.DOI),
      venue: clean(item.venue),
      url: clean(item.url),
      source: 'Semantic Scholar',
    };
    return {...result, citationApa: formatApaCitation(result)};
  });
}

export const searchScientificPapers = searchCrossrefPapers;

