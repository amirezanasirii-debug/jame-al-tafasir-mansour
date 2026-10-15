import React, {useEffect, useRef, useState} from 'react';
import {Download, Headphones, Pause, Play, RotateCcw} from 'lucide-react';
import {localAudioUrl} from './offlineData.js';

export default function MinshawiPlayer({surah}) {
  const audio = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const src = localAudioUrl(surah.id);

  useEffect(() => {
    setPlaying(false); setError(false);
    if (audio.current) { audio.current.pause(); audio.current.load(); }
  }, [src]);

  async function toggle() {
    if (!audio.current) return;
    try {
      if (audio.current.paused) await audio.current.play();
      else audio.current.pause();
    } catch { setError(true); setPlaying(false); }
  }

  return <section className="recitation-player">
    <audio ref={audio} src={src} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => setError(true)} />
    <div className="recitation-icon"><Headphones /></div>
    <div className="recitation-info"><span>تلاوت آفلاین قرآن</span><strong>استاد محمد صدیق منشاوی — سورهٔ {surah.name_ar}</strong><small>{error ? 'فایل این سوره باز نشد؛ نصب برنامه را بررسی کنید.' : 'فایل صوتی داخل برنامه قرار دارد و به اینترنت نیاز ندارد.'}</small></div>
    <div className="audio-actions">
      <button type="button" onClick={toggle} aria-label={playing ? 'توقف تلاوت' : 'پخش تلاوت'}>{playing ? <Pause /> : error ? <RotateCcw /> : <Play />}</button>
      <a href={src} download={`minshawi-${String(surah.id).padStart(3, '0')}.mp3`} aria-label="ذخیره فایل صوتی"><Download /></a>
    </div>
  </section>;
}
