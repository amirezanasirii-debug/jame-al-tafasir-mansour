const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

module.exports = async function localeSmoke(win, root) {
  const run = async code => { try {return await win.webContents.executeJavaScript(code)} catch (error) {throw Error(code+" | "+error.message, {cause:error})} };
  const folder = path.join(root, 'locales');
  await fs.mkdir(folder, {recursive:true});
  const switchTo = code => run(`(async()=>{const {switchLocale}=await import('./i18n.mjs');switchLocale(${JSON.stringify(code)})})()`);
  const snapshot = () => run(`JSON.stringify([document.querySelector('#surah').value,document.querySelector('#verse').value,document.querySelector('#translation').value,document.querySelector('#quran-text').textContent,document.querySelector('#nb-title').value,document.querySelector('#nb-text').value,document.querySelector('#audio').currentTime,document.querySelector('#audio').paused,document.querySelector('#tafsir-one').value,document.querySelector('#fts-panel [name=term]').value])`);
  const baseline = await snapshot();
  const pairs = [['en','Mansour reading desk','Resume reading'],['ar','مكتب منصور للقراءة','متابعة التلاوة'],['fa-IR','میز مطالعهٔ منصور','ادامهٔ تلاوت']];
  for (const [code,heading,resume] of pairs) {
    await switchTo(code);
    assert.equal(await run('document.documentElement.lang'),code);
    assert.equal(await run('document.documentElement.dir'),code==='en'?'ltr':'rtl');
    assert.equal(await run("document.querySelector('.observatory-brand h2').textContent"),heading);
    assert.equal(await run("document.querySelector('.welcome-actions [data-go=reader]').textContent"),resume);
    assert.equal(await snapshot(),baseline);
  }
  await run("document.querySelector('[data-go=notebook]').click();document.querySelector('#nb-text').focus();document.querySelector('#nb-text').setSelectionRange(1,3)");
  for (const [code] of pairs) {
    await switchTo(code);
    assert(await run("document.activeElement.id==='nb-text' && document.activeElement.selectionStart===1 && document.activeElement.selectionEnd===3"));
  }
  await switchTo('en');await win.reload();
  for(let i=0;i<80&&!await run("!!document.querySelector('[data-interface-locale]')");i++)await new Promise(r=>setTimeout(r,100));
  assert.equal(await run('document.documentElement.lang'),'en');
  const records=[];
  for (const [code] of pairs) {
    await switchTo(code);
    for(const theme of ['ivory','sepia','midnight','amoled','high-contrast']){
      for(const size of [16,26]){
        await run(`document.querySelector('[data-choice="${theme}"]').click();var fontControl=document.querySelector('#setting-font');fontControl.value='${size}';fontControl.dispatchEvent(new Event('input'));`);
        for(const [view,open] of Object.entries({
          home:"document.querySelector('.study-nav button').click()",
          reader:"document.querySelector('.folio-modes button').click()",
          notebook:"document.querySelector('[data-go=notebook]').click()",
          search:"document.querySelector('[data-command=source-search]').click()",
          settings:"document.querySelector('#nav [data-view=settings]').click()"
        })){
          await run(open);
          await run("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))");
          const width=await run('document.documentElement.scrollWidth-window.innerWidth');
          const file=[code,theme,size,view].join('-')+'.png';
          await fs.writeFile(path.join(folder,file),(await win.webContents.capturePage()).toPNG());
          records.push({code,theme,size,view,overflow:width,file});
        }
      }
    }
  }
  await fs.writeFile(path.join(folder,'matrix.json'),JSON.stringify(records,null,2));
  const over=records.filter(r=>r.overflow>1);
  assert.deepEqual(over.map(r=>[r.file,r.overflow]),[]);
  await switchTo('fa-IR');
};
