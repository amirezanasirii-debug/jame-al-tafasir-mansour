const {app, BrowserWindow, protocol, session, shell} = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

protocol.registerSchemesAsPrivileged([{
  scheme: 'jame',
  privileges: {standard: true, secure: true, supportFetchAPI: true, corsEnabled: true},
}]);

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
};

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 720,
    minHeight: 620,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f6f4ee',
    title: 'جامع التفاسیر منصور',
    icon: path.resolve(__dirname, '../dist/app-icon.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: false,
      webSecurity: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({url}) => {
    if (/^https:\/\/tanzil\.net\//i.test(url) || /^https:\/\/quranenc\.com\//i.test(url)) shell.openExternal(url);
    return {action: 'deny'};
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('jame://app/')) event.preventDefault();
  });
  mainWindow.webContents.on('will-attach-webview', event => event.preventDefault());
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.loadURL('jame://app/index.html');
}

app.whenReady().then(() => {
  app.setAppUserModelId('org.jamealtafasir.desktop');
  const root = path.resolve(__dirname, '../dist');
  protocol.handle('jame', async request => {
    try {
      const url = new URL(request.url);
      if (url.host !== 'app') return new Response('', {status: 403});
      if (request.method !== 'GET') return new Response('', {status: 403});
      const requestedPath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      const target = path.resolve(root, `.${requestedPath}`);
      const relative = path.relative(root, target);
      if (relative.startsWith('..') || path.isAbsolute(relative)) return new Response('', {status: 403});
      const body = await fs.readFile(target);
      const headers = {
        'Content-Type': mime[path.extname(target).toLowerCase()] || 'application/octet-stream',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; worker-src 'self'; connect-src 'self'; media-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'none'",
        'X-Content-Type-Options': 'nosniff',
      };
      const range = request.headers.get('range');
      if (range && path.extname(target).toLowerCase() === '.mp3') {
        const match = /^bytes=(\d+)-(\d*)$/.exec(range);
        if (!match) return new Response('', {status: 416});
        const start = Number(match[1]);
        const end = Math.min(body.length - 1, match[2] ? Number(match[2]) : start + 1024 * 1024 - 1);
        if (start < 0 || start >= body.length || end < start) return new Response('', {status: 416, headers: {'Content-Range': `bytes */${body.length}`}});
        return new Response(body.subarray(start, end + 1), {status: 206, headers: {...headers, 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${body.length}`, 'Content-Length': String(end - start + 1)}});
      }
      return new Response(body, {headers});
    } catch {
      return new Response('', {status: 404});
    }
  });

  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.on('window-all-closed', () => app.quit());
