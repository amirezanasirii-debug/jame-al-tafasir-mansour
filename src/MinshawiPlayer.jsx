import React from 'react';
import {Headphones, ShieldCheck} from 'lucide-react';

export default function MinshawiPlayer({surah}) {
  return <section className="recitation-player"><div className="recitation-icon"><Headphones /></div><div className="recitation-info"><span>بسته‌های صوتی اختیاری</span><strong>ترتیل سورهٔ {surah.name_ar}</strong><small>برای نسخهٔ عمومی، فقط صوتی افزوده می‌شود که شرایط بازتوزیع رسمی آن ثبت شده باشد.</small></div><span className="audio-review"><ShieldCheck /> در انتظار بستهٔ مجاز</span></section>;
}
