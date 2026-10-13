import React from 'react';
import {Languages, ShieldAlert} from 'lucide-react';

export default function Vocabulary() {
  return <div className="vocabulary-page">
    <header className="page-title"><span className="page-icon"><Languages /></span><div><span>واژه‌نامهٔ پژوهشی</span><h1>واژه‌نامه</h1><p>ساختار بسته‌های صرف، ریشه و معنای واژه آماده است.</p></div></header>
    <div className="large-empty"><ShieldAlert /><h2>هنوز بستهٔ واژه‌نامه نصب نشده است</h2><p>دادهٔ قبلی منشأ مستقل و مجوز بازتوزیع قابل‌اثبات نداشت. پس از انتخاب دیتاست رسمی، واژه‌نامه به‌صورت آفلاین فعال می‌شود.</p></div>
  </div>;
}
