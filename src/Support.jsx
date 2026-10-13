import React from 'react';
import {Check, Copy, CreditCard, HeartHandshake} from 'lucide-react';

const CARD_NUMBER = '5022291514618634';

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const field = document.createElement('textarea');
  field.value = value;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand('copy');
  field.remove();
  if (!copied) throw new Error('copy failed');
}

export default function Support({onCopied}) {
  const copyCard = async () => {
    try {
      await copyText(CARD_NUMBER);
      onCopied?.('شماره کارت با موفقیت کپی شد.');
    } catch {
      onCopied?.('کپی خودکار ممکن نشد؛ شماره کارت را دستی انتخاب کنید.');
    }
  };

  return <div className="support-page" dir="rtl" lang="fa">
    <header className="support-hero">
      <span className="support-icon"><HeartHandshake /></span>
      <div><span>همراهی داوطلبانه</span><h1>حمایت از توسعه برنامه</h1><p>این حمایت کاملاً اختیاری است و هیچ‌یک از امکانات برنامه به آن وابسته نیست.</p></div>
    </header>
    <section className="support-card">
      <p>توسعه و بهبود این نرم‌افزار، با هدف ارائه خدمات بهتر و افزودن قابلیت‌های کاربردی، مستلزم صرف زمان و تلاش مستمر است. چنانچه این برنامه برای شما مفید بوده و تمایل دارید در تداوم توسعه آن سهیم باشید، می‌توانید از طریق اطلاعات زیر حمایت مالی داوطلبانه خود را انجام دهید.</p>
      <div className="bank-card" aria-label="اطلاعات کارت بانکی">
        <div className="bank-card-title"><CreditCard /><span>شماره کارت</span></div>
        <strong dir="ltr" aria-label="۵۰۲۲ ۲۹۱۵ ۱۴۶۱ ۸۶۳۴">۵۰۲۲&nbsp; ۲۹۱۵&nbsp; ۱۴۶۱&nbsp; ۸۶۳۴</strong>
        <span className="card-owner">به نام: <b>امیررضا نصیری</b></span>
        <button type="button" onClick={copyCard}><Copy /> کپی شماره کارت</button>
      </div>
      <blockquote><Check /> <p>بی‌تردید، حمایت‌های ارزشمند شما مایه دلگرمی و انگیزه‌ای مضاعف برای ادامه مسیر توسعه نرم‌افزار و ارتقای کیفیت آن خواهد بود. از حسن اعتماد، همراهی و پشتیبانی شما صمیمانه سپاسگزارم.</p></blockquote>
    </section>
  </div>;
}
