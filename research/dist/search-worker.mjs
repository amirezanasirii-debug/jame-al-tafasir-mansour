import init from './vendor/sqlite.mjs';
import {normalize} from './research-core.mjs';

const sqlite = init();
let cache;
function openCache() {
  return new Promise(resolve => {
    const req = indexedDB.open('mansour-fts-v1', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('volumes');
    req.onerror = () => resolve(null);
    req.onsuccess = () => resolve(req.result);
  });
}
async function cached(key, value) {
  const store = await (cache ||= openCache());
  if (!store) return;
  return new Promise(resolve => {
    const tx = store.transaction('volumes', value ? 'readwrite' : 'readonly');
    const table = tx.objectStore('volumes');
    const req = value ? table.put(value, key) : table.get(key);
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = tx.onabort = () => resolve();
  });
}
async function fetchData(path, gzip = false) {
  const response = await fetch(path);
  if (!response.ok) throw Error('فایل منبع در دسترس نیست.');
  return gzip ? new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).json() : response.json();
}
async function index(db, part) {
  db.exec('CREATE VIRTUAL TABLE docs USING fts5(body, ref UNINDEXED, original UNINDEXED)');
  db.exec('BEGIN');
  const statement = db.prepare('INSERT INTO docs VALUES(?,?,?)');
  const insert = (ref, original) => {
    if (!original) return;
    statement.bind([normalize(original), JSON.stringify(ref), original]).stepReset();
  };
  try {
    if (part.type === 'quran') {
      const {ayahs, books} = await fetchData('content.json');
      const source = books.find(b => b.id === part.source);
      const rows = source ? source.entries.map(e => [ayahs[e.ayah_id-1], e.text]) : ayahs.map(a => [a,a.text_original]);
      for (const [a,text] of rows) if (a) insert([a.surah_id,a.number], text);
    } else if (part.type === 'mizan') {
      for (const row of await fetchData('almizan/' + part.volume + '.json')) insert([row.pdfPage],row.text);
    } else {
      const path = 'full-books/' + part.manifest;
      const volume = await fetchData(path);
      for (const file of new Set(volume.pages.map(p => p.chunk))) {
        for (const page of await fetchData(path.replace(/manifest\.json$/,file), true)) {
          insert([page.id,page.label,page.section], page.stories.flatMap(s => s.paragraphs).join('\n'));
        }
      }
    }
    db.exec('COMMIT');
  } finally { statement.finalize(); }
}
async function lookup(part, expression, remaining) {
  const s = await sqlite, db = new s.oo1.DB();
  try {
    const bytes = await cached(part.key);
    if (bytes) {
      const ptr = s.wasm.allocFromTypedArray(bytes);
      const rc = s.capi.sqlite3_deserialize(db.pointer, 'main', ptr, bytes.byteLength, bytes.byteLength, 1);
      if (rc) throw Error('نمایهٔ کتاب باز نشد.');
    } else {
      await index(db, part);
      await cached(part.key, s.capi.sqlite3_js_db_export(db.pointer));
    }
    const rows = db.selectObjects('SELECT ref, original, snippet(docs,0,\'\',\'\',\'…\',18) AS excerpt FROM docs WHERE docs MATCH ? ORDER BY rank LIMIT ?', [expression, remaining]);
    return rows.map(r => ({ref:JSON.parse(r.ref), excerpt:part.type==='quran'?r.original:r.excerpt,part}));
  } finally { db.close(); }
}
self.onmessage = async ({data:{parts, expression}}) => {
  let count = 0, skipped = 0;
  try {
    await sqlite;
    for (const [i,part] of parts.entries()) {
      postMessage({progress:i+1, total:parts.length, title:part.title});
      try {
        const hits = await lookup(part, expression, 100-count);
        postMessage({hits});
        count += hits.length;
      } catch (error) {
        if (!skipped) postMessage({warning:error.message});
        skipped++;
      }
      if (count>=100) break;
    }
    postMessage({done:true,count,skipped});
  } catch(error) {postMessage({error:error.message});}
};
