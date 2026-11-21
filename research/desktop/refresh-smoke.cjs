const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=async(win,app,root)=>{
 const checks=[],{clipboard}=require('electron');let copied='';clipboard.writeText=text=>{copied=text;};
 const js=async code=>{try{return await win.webContents.executeJavaScript(code)}catch(e){throw Error(code+' | '+await win.webContents.executeJavaScript('JSON.stringify({startup:document.body.dataset.error,buttons:[...document.querySelectorAll(".study-nav button")].map(b=>b.textContent)})')+' | '+e.message)}},wait=async code=>{const end=Date.now()+30000;while(Date.now()<end){if(await js(code))return;await new Promise(r=>setTimeout(r,100));}throw Error('Timed out '+code);};
 try{await wait("document.body.dataset.ready==='true'");assert(await js("!document.getElementById('home').hidden"));checks.push('Native jame protocol loads new home and user artwork');
 await js("document.querySelector('[data-go=notebook]').click();document.getElementById('nb-new').click();document.getElementById('nb-title').value='Native notebook';document.getElementById('nb-title').dispatchEvent(new Event('input'));document.getElementById('nb-text').value='Offline persistence';document.getElementById('nb-text').dispatchEvent(new Event('input'))");await wait("document.getElementById('nb-save').textContent.includes('ذخیره شد')");await win.reload();await wait("document.body.dataset.ready==='true'");await js("document.querySelector('[data-go=notebook]').click()");assert.equal(await js("document.getElementById('nb-text').value"),'Offline persistence');checks.push('Native notebook autosave survives reload');
 await js("document.getElementById('tools-menu').click();[...document.querySelectorAll('#drawer-items button')].find(b=>b.textContent.includes('نظرسنجی')).click();document.getElementById('copy-support-card').click()");await new Promise(r=>setTimeout(r,200));assert.equal(copied,'5022291514618634');checks.push('Native clipboard bridge receives exact donation card; OS clipboard stubbed');
 await js("document.getElementById('feedback-rating').value='4';document.getElementById('feedback-text').value='Native feedback';document.getElementById('feedback-form').requestSubmit()");assert.equal(await js("JSON.parse(localStorage.getItem('mansour-feedback-v1')).rating"),4);checks.push('Native survey stores locally');
 assert.equal(await js("document.body.dataset.error||''"),'');
 await js("document.querySelector('.study-nav button:nth-child(3)').click();const f=document.querySelector('.verse-dialog[open] form');f.elements.start.value=2;f.elements.end.value=4;f.requestSubmit()");
 await wait("document.querySelectorAll('#verse-stream .verse-row').length===3");checks.push('Verse selector opens a bounded range');
 await js("document.querySelector('[data-choice=amoled]').click()");
 assert.equal(await js("document.body.dataset.theme"),'amoled');checks.push('AMOLED theme applies');
 const wordBytes=await js("(async()=>{const {makeWord}=await import('./export-study.mjs');return Array.from(new Uint8Array(await (await makeWord('عنوان','## پژوهش\\nمنبع: قرآن کریم',['قرآن کریم'])).arrayBuffer()))})()");
 assert.equal(Buffer.from(wordBytes).readUInt32LE(),0x04034b50);await fs.writeFile(path.join(root,'note.docx'),Buffer.from(wordBytes));checks.push('Offline RTL DOCX generated');
 await js("document.querySelector('[data-go=library]').click();const s=document.querySelector('#fts-panel form');s.elements.scope.value='quran';s.elements.term.value='رحیم';s.requestSubmit()");
 await wait("document.querySelector('#fts-panel .search-item')||document.querySelector('#fts-panel [name=stop]').disabled");
 assert(await js("Boolean(document.querySelector('#fts-panel .search-item'))"),await js("document.querySelector('#fts-panel [role=status]').textContent"));
 await js("document.querySelector('#fts-panel .search-item').click()");
 assert(await js("!document.querySelector('#reader').hidden"));checks.push('SQLite FTS5 search opens original verse');
 if(await fs.stat(path.join(root,'book-fixture')).catch(()=>null)){
   await js("document.querySelector('[data-go=library]').click();const bf=document.querySelector('#fts-panel form');bf.elements.scope.value='book';bf.elements.author.value='الخوئي';bf.elements.term.value='الله';bf.requestSubmit()");
   await wait("document.querySelector('#fts-panel .search-item')||document.querySelector('#fts-panel [name=stop]').disabled");
   assert(await js("Boolean(document.querySelector('#fts-panel .search-item'))"),await js("document.querySelector('#fts-panel [role=status]').textContent"));
   await js("document.querySelector('#fts-panel .search-item').click()");await wait("document.querySelector('#book-citation').textContent.includes('صفحه')");checks.push('Verified installed book text search and page navigation using a volume from book pack 1');
 }
 await win.webContents.debugger.attach('1.3');
 await win.webContents.debugger.sendCommand('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await js("document.querySelector('.study-nav button').click()");
 assert(await js("document.documentElement.scrollWidth <= window.innerWidth+1"));await fs.writeFile(path.join(root,'mobile.png'),(await win.webContents.capturePage()).toPNG());checks.push('390px home layout fits viewport');
 await fs.mkdir(root,{recursive:true});await fs.writeFile(path.join(root,'report.json'),JSON.stringify({ok:true,checks,scope:'Actual Electron runtime; isolated profile; no physical Android run'},null,2));app.exit(0);
 }catch(e){await fs.mkdir(root,{recursive:true});await fs.writeFile(path.join(root,'report.json'),JSON.stringify({ok:false,checks,error:e.stack},null,2));app.exit(1);}
};
