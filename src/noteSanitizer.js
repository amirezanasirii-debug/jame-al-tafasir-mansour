const ALLOWED_TAGS = new Set([
  'P', 'DIV', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE',
  'H1', 'H2', 'H3', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'SPAN', 'FONT',
]);
const ALLOWED_STYLES = new Set(['color', 'background-color', 'font-size', 'text-align']);

function isSafeStyle(property, value) {
  if (/url|expression|binding|javascript|[{};]/i.test(value)) return false;
  if (property === 'color' || property === 'background-color') {
    return /^(?:#[0-9a-f]{3,8}|[a-z]+|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\))$/i.test(value);
  }
  if (property === 'font-size') return /^\d+(?:\.\d+)?(?:px|em|rem|%)$/i.test(value);
  if (property === 'text-align') return /^(?:start|end|left|right|center|justify)$/i.test(value);
  return false;
}

export function escapeNoteHtml(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function sanitizeNoteHtml(html = '', Parser = globalThis.DOMParser) {
  if (typeof Parser !== 'function') throw new Error('پاک‌سازی HTML در این محیط در دسترس نیست.');
  const parsed = new Parser().parseFromString(String(html), 'text/html');
  [...parsed.body.querySelectorAll('script, style, iframe, object, embed, link, meta, img, svg, math')]
    .forEach(node => node.remove());
  [...parsed.body.querySelectorAll('*')].forEach(node => {
    if (!ALLOWED_TAGS.has(node.tagName)) {
      node.replaceWith(...node.childNodes);
      return;
    }
    const direction = node.getAttribute('dir');
    const color = node.tagName === 'FONT' ? node.getAttribute('color') : '';
    const size = node.tagName === 'FONT' ? node.getAttribute('size') : '';
    const styles = {};
    for (const property of ALLOWED_STYLES) {
      const value = node.style.getPropertyValue(property);
      if (value && isSafeStyle(property, value)) styles[property] = value;
    }
    [...node.attributes].forEach(attribute => node.removeAttribute(attribute.name));
    if (direction === 'rtl' || direction === 'ltr') node.setAttribute('dir', direction);
    Object.entries(styles).forEach(([property, value]) => node.style.setProperty(property, value));
    if (color && /^#[0-9a-f]{3,8}$|^[a-z]+$/i.test(color)) node.style.color = color;
    if (size && /^[1-7]$/.test(size)) {
      node.style.fontSize = ({1: '10px', 2: '12px', 3: '14px', 4: '18px', 5: '24px', 6: '32px', 7: '40px'})[size];
    }
    if (node.tagName === 'FONT') {
      const span = parsed.createElement('span');
      span.setAttribute('style', node.getAttribute('style') || '');
      span.append(...node.childNodes);
      node.replaceWith(span);
    }
  });
  return parsed.body.innerHTML.trim();
}

export function migrateNote(note = {}, Parser = globalThis.DOMParser) {
  const rawHtml = note.bodyHtml || escapeNoteHtml(note.body || '').replace(/\n/g, '<br>');
  return {
    id: '', title: '', bodyHtml: '', body: '', ayahId: null, reference: '', tags: '',
    ...note,
    bodyHtml: sanitizeNoteHtml(rawHtml, Parser),
    tags: Array.isArray(note.tags) ? note.tags.join('، ') : (note.tags || ''),
  };
}

export function notePlainText(note = {}, Parser = globalThis.DOMParser) {
  if (typeof Parser !== 'function') throw new Error('خواندن HTML در این محیط در دسترس نیست.');
  const parsed = new Parser().parseFromString(
    note.bodyHtml || escapeNoteHtml(note.body || ''),
    'text/html',
  );
  return (parsed.body.textContent || '').replace(/\s+/g, ' ').trim();
}
