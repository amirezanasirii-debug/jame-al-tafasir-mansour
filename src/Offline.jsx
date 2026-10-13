import React, {useState} from 'react';
import {CheckCircle2, Download, HardDrive} from 'lucide-react';

export default function Offline() {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const isPackaged = location.protocol === 'jame:' || location.hostname === 'app.jame.invalid';

  async function save() {
    setBusy(true);
    setStatus('در حال ذخیرهٔ متن قرآن، ترجمه و تفسیر مجاز…');
    try {
      if (!('serviceWorker' in navigator)) throw Error('برای ذخیرهٔ آفلاین، برنامه را با localhost یا HTTPS باز کنید.');
      const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
      await registration.update();
      await navigator.serviceWorker.ready;
      setStatus('محتوای پایه برای استفادهٔ آفلاین ذخیره شد.');
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  if (isPackaged) return <section className="settings-card"><header><HardDrive /><div><h2>مطالعهٔ آفلاین</h2><p>محتوای پایه همراه برنامه نصب شده است</p></div></header><p><CheckCircle2 /> متن قرآن، ترجمه و تفسیر ثبت‌شده بدون اینترنت آماده‌اند.</p></section>;

  return <section className="settings-card"><header><Download /><div><h2>دسترسی آفلاین</h2><p>ذخیرهٔ محتوای پایه روی این دستگاه</p></div></header><button className="primary-button" disabled={busy} onClick={save}>{busy ? 'در حال ذخیره…' : 'ذخیرهٔ محتوای پایه'}</button><p role="status">{status}</p></section>;
}
