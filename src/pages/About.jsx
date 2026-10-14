import React from 'react';
import {HeartHandshake, ShieldCheck} from 'lucide-react';

export default function About({onSupport}) {
  return <div className="about-page" dir="rtl" lang="fa">
    <header className="about-hero">
      <img src={`${import.meta.env.BASE_URL}icon-144.png`} alt="نشان جامع‌التفاسیر منصور" />
      <div><span>نسخهٔ ۲.۵ مستقل و آفلاین‌محور</span><h1>جامع‌التفاسیر منصور</h1><p>نرم‌افزار مستقل مطالعه و پژوهش قرآن</p></div>
    </header>
    <div className="about-grid">
      <section className="about-card"><h2>مشخصات نرم‌افزار</h2><p>پدیدآورنده: <strong>حجت‌الاسلام امیررضا نصیری</strong></p><p>رابط، جست‌وجو و امکانات پژوهشی این برنامه مستقل توسعه یافته‌اند.</p></section>
      <section className="about-card"><h2>متن قرآن</h2><p><strong>Tanzil Uthmani 1.1</strong></p><p>بازتوزیع عین متن با ذکر منبع؛ نص آیات در برنامه تغییر داده نشده است.</p></section>
      <section className="about-card"><h2>ترجمهٔ فارسی</h2><p><strong>ترجمهٔ مرکز رواد</strong></p><p>نسخه و شرایط بازتوزیع در شناسنامهٔ داده ثبت شده است.</p></section>
      <section className="about-card"><h2>تفسیر همراه</h2><p><strong>التفسير الميسر</strong></p><p>نام اثر، مؤلف، منبع و نسخه کنار محتوا حفظ می‌شود.</p></section>
      <section className="about-card full"><ShieldCheck /><h2>سیاست منابع</h2><p>هیچ ترجمه، تفسیر، حدیث، صوت یا واژه‌نامه‌ای بدون منشأ روشن و شرایط بازتوزیع قابل‌بررسی وارد نسخهٔ عمومی نمی‌شود. متن هر اثر همیشه به مؤلف و منبع خودش نسبت داده می‌شود.</p></section>
      <section className="about-card full"><h2>قابلیت‌ها</h2><ul><li>مطالعهٔ کامل قرآن و محتوای پایه بدون اینترنت</li><li>جست‌وجوی قرآن، ترجمه و تفسیر نصب‌شده</li><li>یادداشت پژوهشی، نشان‌ها، ادامهٔ مطالعه و پشتیبان JSON</li><li>مشابه‌یاب واژگانی مستقل و آفلاین</li><li>سه فونت قرآنی آفلاین، تم روشن و تاریک و تنظیم اندازهٔ متن</li></ul></section>
      <section className="about-card full about-support"><HeartHandshake /><div><h2>حمایت از توسعه برنامه</h2><p>حمایت کاملاً اختیاری است و هیچ محدودیتی برای استفاده از برنامه ایجاد نمی‌کند.</p></div><button className="primary-button" type="button" onClick={onSupport}>مشاهده</button></section>
    </div>
  </div>;
}
