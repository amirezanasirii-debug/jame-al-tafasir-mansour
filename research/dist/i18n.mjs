import fa from './locale-fa-IR.mjs';
import en from './locale-en.mjs';
import ar from './locale-ar.mjs';

export const catalogs = { 'fa-IR': fa, en, ar };
const names = { 'fa-IR': 'فارسی', en: 'English', ar: 'العربية' };
const storageKey = 'mansour-interface-locale';
let locale = 'fa-IR';
try {
  const saved = globalThis.localStorage?.getItem(storageKey);
  if (Object.hasOwn(catalogs, saved)) locale = saved;
} catch { /* Storage can be unavailable when the app starts. */ }

const bindings = new WeakMap();
const attributes = ['aria-label', 'placeholder', 'title', 'alt'];
const authored = new Map(Object.entries(fa).map(([key, value]) => [value, key]));
export const interfaceLocale = () => locale;
export function msg(key, ...args) {
  return new UiMessage(language => (catalogs[language][key] ?? fa[key]).replace(/\{(\d+)\}/g, (_, n) => {
    const value = args[n];
    return typeof value === 'number' ? value.toLocaleString(language) : render(value, language);
  }));
}
class UiMessage {
  constructor(format) { this.format = format; }
  toString() { return this.format(locale); }
}
const render = (value, language) => value instanceof UiMessage ? value.format(language) : String(value ?? '');
export const joinText = (...parts) => new UiMessage(language => parts.map(part => render(part, language)).join(''));
export const localizedNumber = n => new UiMessage(language => Number(n).toLocaleString(language));
export function authoredLabel(value) {
  const key = authored.get(value);
  return key ? msg(key) : value;
}
function bind(target, slot, value) {
  let slots = bindings.get(target);
  if (value instanceof UiMessage) {
    if (!slots) bindings.set(target, slots = new Map());
    slots.set(slot, value);
  } else slots?.delete(slot);
}
export function uiText(element, value) {
  const text = document.createTextNode(String(value ?? ''));
  bind(text, 'data', value);
  element.replaceChildren(text);
}
export function uiAttr(element, slot, value) {
  bind(element, slot, value);
  element.setAttribute(slot, String(value));
}
export function uiOption(text, value) {
  const option = new Option('', value);
  uiText(option, text);
  return option;
}
// This entry point receives developer-authored HTML only, before any source or user data is added.
export function bindMarkup(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  for (let n = root; n; n = walker.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) {
      const raw = n.data;
      const key = authored.get(raw.trim());
      if (key) {
        const value = joinText(raw.match(/^\s*/)[0], msg(key), raw.match(/\s*$/)[0]);
        bind(n, 'data', value);
        n.data = String(value);
      }
    } else for (const slot of attributes) {
      if (n.hasAttribute?.(slot)) uiAttr(n, slot, authoredLabel(n.getAttribute(slot)));
    }
  }
}
export function uiMarkup(element, html) {
  element.innerHTML = html;
  bindMarkup(element);
}
function direction() {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'en' ? 'ltr' : 'rtl';
}
export function switchLocale(next) {
  if (!Object.hasOwn(catalogs, next)) return;
  const stream = document.getElementById('verse-stream');
  const active = stream?.querySelector('.verse-row.selected .stream-arabic');
  const offset = active?.getBoundingClientRect().top;
  const visible = stream && stream.clientHeight > 0 && active;
  locale = next;
  direction();
  globalThis.MansourAndroid?.setInterfaceLocale?.(next);
  const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  for (let n = document.documentElement; n; n = walker.nextNode()) {
    const slots = bindings.get(n);
    if (!slots) continue;
    for (const [slot, phrase] of slots) {
      if (slot === 'data') n.data = String(phrase);
      else n.setAttribute(slot, String(phrase));
    }
  }
  for (const select of document.querySelectorAll('[data-interface-locale]')) select.value = next;
  if (visible) stream.scrollTop += active.getBoundingClientRect().top - offset;
  try { localStorage.setItem(storageKey, next); } catch {
    const notice = document.querySelector('#toast');
    if (notice) { uiText(notice, authoredLabel('تنظیمات ذخیره نشد؛ فضای ذخیره‌سازی را بررسی کنید.')); notice.hidden = false; }
  }
}
export function installLanguageControls() {
  const settings = document.querySelector('#settings .section-intro');
  for (const parent of [document.querySelector('.observatory-head'), settings]) {
    if (!parent) continue;
    const label = document.createElement('label');
    label.className = 'language-switch';
    const caption = new UiMessage(lang => ({'fa-IR':'زبان رابط', en:'Interface language', ar:'لغة الواجهة'})[lang]);
    const name = document.createElement('span');
    uiText(name, caption);
    const select = document.createElement('select');
    select.dataset.interfaceLocale = '';
    for (const [id, text] of Object.entries(names)) {
      const option = new Option(text, id);
      option.lang = id;
      select.append(option);
    }
    select.value = locale;
    select.onchange = () => switchLocale(select.value);
    label.append(name, select);
    parent.append(label);
  }
}
if (typeof document !== 'undefined') {
  direction();
  bindMarkup(document.documentElement);
}
