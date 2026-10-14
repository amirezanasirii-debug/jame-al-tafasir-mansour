const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_RETRIES = 2;

export class HttpError extends Error {
  constructor(message, {status = 0, url = '', cause} = {}) {
    super(message, {cause});
    this.name = 'HttpError';
    this.status = status;
    this.url = url;
  }
}

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

function retryable(error) {
  if (error?.name === 'AbortError') return true;
  if (error instanceof TypeError) return true;
  return error instanceof HttpError && (error.status === 408 || error.status === 429 || error.status >= 500);
}

/** Fetch JSON with a bounded timeout and exponential retry. */
export async function fetchJson(url, options = {}) {
  const {
    fetchImpl = globalThis.fetch,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    retryDelayMs = 250,
    allowedHosts = [],
    signal,
    headers = {},
  } = options;
  if (typeof fetchImpl !== 'function') throw new HttpError('امکان اتصال شبکه در این محیط وجود ندارد.');

  let parsedUrl;
  try { parsedUrl = new URL(url); }
  catch { throw new HttpError('نشانی سرویس معتبر نیست.', {url: String(url)}); }
  if (parsedUrl.protocol !== 'https:') throw new HttpError('فقط اتصال امن HTTPS مجاز است.', {url: parsedUrl.href});
  if (allowedHosts.length && !allowedHosts.includes(parsedUrl.hostname)) {
    throw new HttpError('دامنهٔ سرویس در فهرست مجاز نیست.', {url: parsedUrl.href});
  }

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const abortFromCaller = () => controller.abort(signal?.reason);
    signal?.addEventListener('abort', abortFromCaller, {once: true});
    const timer = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);
    try {
      const response = await fetchImpl(parsedUrl.href, {
        method: 'GET',
        headers: {Accept: 'application/json', ...headers},
        signal: controller.signal,
        credentials: 'omit',
        redirect: 'error',
        referrerPolicy: 'no-referrer',
      });
      if (!response.ok) {
        throw new HttpError(`پاسخ سرویس ناموفق بود (${response.status}).`, {
          status: response.status,
          url: parsedUrl.href,
        });
      }
      return await response.json();
    } catch (error) {
      lastError = error instanceof HttpError
        ? error
        : new HttpError(error?.name === 'AbortError' ? 'مهلت اتصال به پایان رسید.' : 'دریافت اطلاعات انجام نشد.', {
          url: parsedUrl.href,
          cause: error,
        });
      if (attempt >= retries || !retryable(error)) throw lastError;
      await wait(retryDelayMs * (2 ** attempt));
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abortFromCaller);
    }
  }
  throw lastError;
}

