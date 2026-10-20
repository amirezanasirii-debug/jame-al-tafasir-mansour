const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('MansourBooks',{getInstalledPacks:()=>ipcRenderer.invoke('mansour-books-status'),importBookPack:()=>ipcRenderer.invoke('mansour-books-import')});
ipcRenderer.on('mansour-pack-progress',(_event,detail)=>window.dispatchEvent(new CustomEvent('mansour-pack-progress',{detail})));
