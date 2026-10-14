import React, {useMemo, useRef, useState} from 'react';
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, ChevronLeft, ClipboardCopy,
  Eraser, FilePlus2, Highlighter, Italic, List, ListOrdered, NotebookPen, Redo2,
  Search, Share2, Strikethrough, Trash2, Underline, Undo2, X,
} from 'lucide-react';
import {migrateNote, notePlainText, sanitizeNoteHtml} from './noteSanitizer.js';
import {normalizeSearch} from './verseSearch.js';

const newDraft = () => ({id: '', title: '', bodyHtml: '', body: '', ayahId: null, reference: '', tags: ''});

function ToolButton({title, command, value, run, children}) {
  return <button type="button" title={title} aria-label={title} onMouseDown={event => event.preventDefault()} onClick={() => run(command, value)}>{children}</button>;
}

export default function Notes({notes, setNotes, initialDraft, onDraftHandled}) {
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState(() => migrateNote(initialDraft || newDraft()));
  const [editing, setEditing] = useState(Boolean(initialDraft));
  const [copyStatus, setCopyStatus] = useState('');
  const editorRef = useRef(null);

  React.useEffect(() => {
    if (!initialDraft) return;
    const value = migrateNote(initialDraft); setDraft(value); setEditing(true); onDraftHandled?.();
  }, [initialDraft, onDraftHandled]);
  React.useEffect(() => {
    if (editing && editorRef.current && editorRef.current.innerHTML !== draft.bodyHtml) editorRef.current.innerHTML = draft.bodyHtml || '';
  }, [editing, draft.id]);

  const normalizedNotes = useMemo(() => notes.map(migrateNote), [notes]);
  const filtered = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    return normalizedNotes.filter(note => !normalizedQuery || normalizeSearch(`${note.title} ${notePlainText(note)} ${note.reference} ${note.tags}`).includes(normalizedQuery));
  }, [normalizedNotes, query]);
  function openNew() { setDraft(newDraft()); setEditing(true); setCopyStatus(''); }
  function openEdit(note) { setDraft(migrateNote(note)); setEditing(true); setCopyStatus(''); }
  function syncEditor() { setDraft(value => ({...value, bodyHtml: editorRef.current?.innerHTML || ''})); }
  function run(command, value = null) {
    editorRef.current?.focus();
    if (typeof document.execCommand === 'function') document.execCommand(command, false, value);
    syncEditor();
  }
  function save(event) {
    event.preventDefault();
    const bodyHtml = sanitizeNoteHtml(editorRef.current?.innerHTML || draft.bodyHtml || '');
    const plain = notePlainText({bodyHtml});
    if (!draft.title.trim() && !plain) return;
    const now = new Date().toISOString();
    const value = {...draft, id: draft.id || `note-${Date.now()}`, title: draft.title.trim() || 'یادداشت بدون عنوان', bodyHtml, body: plain, tags: draft.tags.trim(), updatedAt: now, createdAt: draft.createdAt || now};
    setNotes(current => current.some(note => note.id === value.id) ? current.map(note => note.id === value.id ? value : note) : [value, ...current]);
    setEditing(false); setDraft(newDraft());
  }
  function remove(id) { setNotes(current => current.filter(note => note.id !== id)); if (draft.id === id) setEditing(false); }
  async function copyRichText() {
    const html = sanitizeNoteHtml(editorRef.current?.innerHTML || draft.bodyHtml || '');
    const text = notePlainText({bodyHtml: html});
    try {
      if (window.ClipboardItem && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({'text/html': new Blob([html], {type: 'text/html'}), 'text/plain': new Blob([text], {type: 'text/plain'})})]);
      } else await navigator.clipboard.writeText(text);
      setCopyStatus('متن با قالب‌بندی کپی شد.');
    } catch { setCopyStatus('کپی در این دستگاه در دسترس نیست.'); }
  }
  async function shareNote() {
    const html = sanitizeNoteHtml(editorRef.current?.innerHTML || draft.bodyHtml || '');
    const text = [draft.title, draft.reference, notePlainText({bodyHtml: html})].filter(Boolean).join('\n\n');
    if (!text) return;
    try {
      if (navigator.share) await navigator.share({title: draft.title || 'یادداشت قرآنی', text});
      else { await navigator.clipboard.writeText(text); setCopyStatus('متن یادداشت برای اشتراک کپی شد.'); }
    } catch (error) {
      if (error?.name !== 'AbortError') setCopyStatus('اشتراک‌گذاری در این دستگاه در دسترس نیست.');
    }
  }
  function paste(event) {
    const html = event.clipboardData?.getData('text/html');
    if (!html || typeof document.execCommand !== 'function') return;
    event.preventDefault(); document.execCommand('insertHTML', false, sanitizeNoteHtml(html)); syncEditor();
  }

  return <div className="notes-page">
    <header className="page-title"><span className="page-icon"><NotebookPen /></span><div><span>دفتر پژوهش شخصی</span><h1>یادداشت و پژوهش</h1><p>آیه و ترجمه را وارد پژوهش کنید و متن را با ابزارهایی شبیه Word قالب‌بندی، رنگ‌آمیزی و کپی کنید.</p></div></header>
    <div className="notes-toolbar"><label><Search /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="جست‌وجو در عنوان، متن، ارجاع و برچسب" /></label><button className="primary-button" onClick={openNew}><FilePlus2 /> پژوهش تازه</button></div>
    <div className="notes-layout"><div className="notes-list">{filtered.map(note => <article key={note.id}><button className="note-main" onClick={() => openEdit(note)}><strong>{note.title}</strong>{note.reference && <span>{note.reference}</span>}<p>{notePlainText(note) || 'بدون متن'}</p>{note.tags && <em>{note.tags}</em>}<small>{new Date(note.updatedAt || Date.now()).toLocaleDateString('fa-IR')} <ChevronLeft /></small></button><button className="delete-note" aria-label="حذف یادداشت" onClick={() => remove(note.id)}><Trash2 /></button></article>)}{!filtered.length && <div className="large-empty compact"><NotebookPen /><h2>هنوز یادداشتی ندارید</h2><p>از پنل هر آیه، متن آیه و ترجمه را مستقیم به پژوهش بفرستید.</p></div>}</div>
      {editing && <form className="note-editor" onSubmit={save}><header><div><span>{draft.id ? 'ویرایش پژوهش' : 'پژوهش تازه'}</span><h2>{draft.reference || 'دفتر شخصی'}</h2></div><div className="note-header-actions"><button type="button" onClick={shareNote} title="اشتراک‌گذاری یادداشت"><Share2 /></button><button type="button" onClick={copyRichText} title="کپی با قالب‌بندی"><ClipboardCopy /></button><button type="button" onClick={() => setEditing(false)} aria-label="بستن"><X /></button></div></header>
        <div className="note-fields"><label><span>عنوان</span><input value={draft.title} onChange={event => setDraft(value => ({...value, title: event.target.value}))} placeholder="عنوان پژوهش" /></label><label><span>برچسب‌ها</span><input value={draft.tags} onChange={event => setDraft(value => ({...value, tags: event.target.value}))} placeholder="مثلاً توحید، اخلاق، سوره بقره" /></label></div>
        <div className="rich-toolbar" role="toolbar" aria-label="قالب‌بندی متن">
          <div><ToolButton title="واگرد" command="undo" run={run}><Undo2 /></ToolButton><ToolButton title="ازنو" command="redo" run={run}><Redo2 /></ToolButton></div>
          <div><ToolButton title="ضخیم" command="bold" run={run}><Bold /></ToolButton><ToolButton title="مورب" command="italic" run={run}><Italic /></ToolButton><ToolButton title="زیرخط" command="underline" run={run}><Underline /></ToolButton><ToolButton title="خط‌خورده" command="strikeThrough" run={run}><Strikethrough /></ToolButton></div>
          <div><ToolButton title="راست‌چین" command="justifyRight" run={run}><AlignRight /></ToolButton><ToolButton title="وسط‌چین" command="justifyCenter" run={run}><AlignCenter /></ToolButton><ToolButton title="چپ‌چین" command="justifyLeft" run={run}><AlignLeft /></ToolButton><ToolButton title="تراز دوطرفه" command="justifyFull" run={run}><AlignJustify /></ToolButton></div>
          <div><ToolButton title="فهرست نشانه‌دار" command="insertUnorderedList" run={run}><List /></ToolButton><ToolButton title="فهرست شماره‌دار" command="insertOrderedList" run={run}><ListOrdered /></ToolButton><ToolButton title="پاک‌کردن قالب" command="removeFormat" run={run}><Eraser /></ToolButton></div>
          <label className="format-select"><span>سبک</span><select defaultValue="p" onChange={event => run('formatBlock', event.target.value)}><option value="p">متن عادی</option><option value="h1">عنوان ۱</option><option value="h2">عنوان ۲</option><option value="h3">عنوان ۳</option><option value="blockquote">نقل‌قول</option></select></label>
          <label className="format-select"><span>اندازه</span><select defaultValue="3" onChange={event => run('fontSize', event.target.value)}><option value="2">کوچک</option><option value="3">عادی</option><option value="4">درشت</option><option value="5">بزرگ</option><option value="6">خیلی بزرگ</option></select></label>
          <label className="color-tool" title="رنگ متن"><span><Highlighter /></span><input type="color" defaultValue="#173f35" onChange={event => run('foreColor', event.target.value)} /></label>
          <label className="color-tool" title="رنگ زمینه"><span>زمینه</span><input type="color" defaultValue="#fff1a8" onChange={event => run('hiliteColor', event.target.value)} /></label>
        </div>
        <label className="editor-label"><span>متن پژوهش</span><div ref={editorRef} className="rich-editor" contentEditable suppressContentEditableWarning dir="rtl" onInput={syncEditor} onPaste={paste} data-placeholder="برداشت، نکته یا مطلب خود را اینجا بنویسید…" /></label>
        <div className="note-save-row">{copyStatus && <span>{copyStatus}</span>}<button className="primary-button" type="submit">ذخیرهٔ پژوهش</button></div>
      </form>}
    </div>
  </div>;
}
