const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=async(win,app,root)=>{
 const {shell,dialog}=require('electron'),opened=[],checks=[],errors=[];let selections=0;
 const originalOpen=shell.openExternal,originalDialog=dialog.showOpenDialog;
 shell.openExternal=async url=>{opened.push(url);};
 dialog.showOpenDialog=async()=>{selections++;return {canceled:true,filePaths:[]};};
 const js=code=>win.webContents.executeJavaScript(code);
 const wait=async code=>{const until=Date.now()+30000;while(Date.now()<until){if(await js(code))return;await new Promise(r=>setTimeout(r,100));}throw Error('Timed out: '+code)};
 win.webContents.on('console-message',(_event,...args)=>{const message=args.map(String).join(' ');if(message.includes('Uncaught'))errors.push(message)});
 try{
  await fs.mkdir(root,{recursive:true});await wait("document.body.dataset.ready==='true'");
  await wait("document.querySelectorAll('#pack-list .pack-download').length===6");
  await js("document.querySelector('[data-view=library]').click()");
  assert(await js("!document.getElementById('library-import-pack').disabled"));
  await js("document.getElementById('library-import-pack').click()");
  await wait("!document.getElementById('import-pack').disabled");assert.equal(selections,1);
  assert(await js("!document.getElementById('packs').hidden"));checks.push('Library attachment button opens native ZIP picker; cancellation recovers');
  await js("document.querySelector('[data-view=library]').click();document.querySelector('[data-open-packs]').click()");
  assert(await js("document.activeElement.id==='pack-guide'"));
  assert.equal(await js("document.querySelectorAll('#pack-guide li').length"),4);checks.push('Library shortcut opens four-step download/import guide and focuses it');
  const expected=require('../dist/library-downloads.json');
  const urls=await js("[...document.querySelectorAll('#packs a.pack-download')].map(a=>a.href)");
  assert.deepEqual(urls,[expected.releaseUrl,...expected.packs.map(p=>p.url)]);
  for(let i=0;i<urls.length;i++){
   await js(`document.querySelectorAll('#packs a.pack-download')[${i}].click()`);
   const until=Date.now()+5000;while(opened.length<=i&&Date.now()<until)await new Promise(r=>setTimeout(r,50));
   assert.equal(opened[i],urls[i]);assert((await js('location.href')).startsWith('jame://app/'));
  }
  checks.push('All six exact pack URLs and release page route through native external-browser handler');
  await js("const a=document.createElement('a');a.href='https://github.com/unrelated/file';document.body.append(a);a.click();a.remove()");
  await new Promise(r=>setTimeout(r,150));assert.equal(opened.length,7);checks.push('Unlisted external URL stays blocked');
  await js("window.dispatchEvent(new CustomEvent('mansour-pack-progress',{detail:{state:'verifying'}}))");
  assert(await js("[...document.querySelectorAll('[data-import-pack]')].every(b=>b.disabled)"));
  await js("window.dispatchEvent(new CustomEvent('mansour-pack-progress',{detail:{state:'cancelled'}}))");
  await wait("[...document.querySelectorAll('[data-import-pack]')].every(b=>!b.disabled)");checks.push('All import buttons disable during verification and recover afterwards');
  await js("document.querySelector('[data-view=library]').click();window.scrollTo(0,0);document.fonts.ready");
  await new Promise(r=>setTimeout(r,600));
  await fs.writeFile(path.join(root,'library-guide.png'),(await win.webContents.capturePage()).toPNG());
  win.setMinimumSize(320,500);win.setContentSize(390,844);
  await js("document.querySelector('[data-open-packs]').click();window.scrollTo(0,0)");await new Promise(r=>setTimeout(r,500));
  assert(await js('document.documentElement.scrollWidth<=window.innerWidth'));checks.push('Guide and long pack filenames fit 390px mobile viewport');
  await fs.writeFile(path.join(root,'mobile-guide.png'),(await win.webContents.capturePage()).toPNG());
  await js("document.querySelector('#pack-list .pack-card').scrollIntoView()");await new Promise(r=>setTimeout(r,150));
  await fs.writeFile(path.join(root,'mobile-downloads.png'),(await win.webContents.capturePage()).toPNG());
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(root,'report.json'),JSON.stringify({ok:true,checks,externalLinks:opened.length,errors,scope:'Packaged Windows Electron using real navigation and import IPC; OS browser launch and ZIP picker stubbed to avoid downloads or user dialogs. Mobile viewport is not an Android-device test.'},null,2));
  shell.openExternal=originalOpen;dialog.showOpenDialog=originalDialog;app.exit(0);
 }catch(e){await fs.mkdir(root,{recursive:true});await fs.writeFile(path.join(root,'report.json'),JSON.stringify({ok:false,checks,errors,error:e.stack},null,2));app.exit(1);}
};
