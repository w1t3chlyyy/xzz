"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

const VIDEO = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260601_110537_3a579fa0-7bbc-4d94-9d25-0e816c7840f5.mp4";
const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "F1337Bot";
const NAV: [string, string][] = [["Возможности", "#roles"], ["Тариф", "#pro"], ["Вопросы", "#faq"], ["Оферта", "/offer"]];

function useTypewriter(text: string, speed = 38, startDelay = 600) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    let i = 0;
    let interval: ReturnType<typeof setInterval>;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        i += 1;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
    }, startDelay);
    return () => {
      clearTimeout(start);
      clearInterval(interval);
    };
  }, [text, speed, startDelay]);
  return { displayed, done };
}

export function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [menu, setMenu] = useState(false);
  const { displayed, done } = useTypewriter("заказы и исполнители\nв одном месте");

  // ПК: перемотка видео движением мыши (скраббинг)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let prevX: number | null = null;
    let targetTime = 0;
    let seeking = false;

    const apply = () => {
      if (!video.duration || Number.isNaN(video.duration)) return;
      seeking = true;
      video.currentTime = targetTime;
    };

    const onMove = (e: MouseEvent) => {
      if (window.innerWidth < 1024) return;
      if (!video.duration || Number.isNaN(video.duration)) return;

      if (prevX === null) {
        prevX = e.clientX;
        return;
      }
      const delta = e.clientX - prevX;
      prevX = e.clientX;

      targetTime += (delta / window.innerWidth) * 0.8 * video.duration;
      targetTime = Math.min(Math.max(targetTime, 0), video.duration);

      if (!seeking) apply();
    };

    const onSeeked = () => {
      seeking = false;
      // если мышь успела уйти дальше за время перемотки — догоняем
      if (Math.abs(video.currentTime - targetTime) > 0.01) apply();
    };

    if (window.innerWidth >= 1024) {
      video.loop = false;
      video.pause();
    }

    video.addEventListener("seeked", onSeeked);
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      video.removeEventListener("seeked", onSeeked);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  // Мобильные: обычное воспроизведение
  useEffect(() => {
    const video = videoRef.current;
    if (!video || window.innerWidth >= 1024) return;
    video.autoplay = true;
    video.loop = true;
    video.play().catch(() => {});
  }, []);

  const bar = "block w-5 h-[2px] bg-black transition-all duration-300";

  return (
    <section className="relative bg-white text-neutral-900 selection:bg-violet-100 selection:text-black antialiased overflow-hidden min-h-[100svh] flex flex-col">
      <header className="fixed top-4 inset-x-0 z-30 px-4 lg:px-8">
        <div className="relative max-w-5xl lg:max-w-none mx-auto">
          <div className="flex items-center justify-between rounded-full border border-black/5 bg-white/80 backdrop-blur-md shadow-sm pl-6 pr-2 py-2 lg:border-0 lg:bg-transparent lg:backdrop-blur-none lg:shadow-none lg:p-0">
            <Link href="/" className="font-heading text-xl tracking-tight">1337</Link>
            <nav className="hidden md:flex items-center gap-9 text-sm font-semibold text-neutral-700">
              {NAV.map(([label, href]) => (
                <a key={label} href={href} className="hover:text-violet-700 transition-colors">{label}</a>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <Link href="/feed" className="hidden md:inline-flex rounded-full bg-black text-white px-6 py-2.5 text-sm font-semibold hover:bg-violet-700 transition-colors">Войти</Link>
              <button aria-label="Меню" onClick={() => setMenu((v) => !v)} className="md:hidden w-10 h-10 rounded-full bg-neutral-100 flex flex-col items-center justify-center gap-[5px]">
                <span className={`${bar} ${menu ? "rotate-45 translate-y-[7px]" : ""}`} />
                <span className={`${bar} ${menu ? "opacity-0" : ""}`} />
                <span className={`${bar} ${menu ? "-rotate-45 -translate-y-[7px]" : ""}`} />
              </button>
            </div>
          </div>
          <AnimatePresence>
            {menu && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="md:hidden absolute top-full mt-2 inset-x-0 rounded-[2rem] bg-white border border-black/5 shadow-lg p-3 flex flex-col">
                {NAV.map(([label, href]) => (
                  <a key={label} href={href} onClick={() => setMenu(false)} className="px-5 py-3.5 rounded-full text-base font-semibold hover:bg-violet-50">{label}</a>
                ))}
                <Link href="/feed" className="mt-1 rounded-full bg-black text-white text-center py-3.5 text-base font-semibold">Войти</Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Видео на весь блок. ПК: модель справа внизу. Моб.: растянуто на весь блок, модель по центру */}
      <div className="absolute inset-0 lg:top-0 lg:left-auto lg:w-[92%] z-0 overflow-hidden pointer-events-none lg:[mask-image:linear-gradient(to_right,transparent,black_14%)]">
        <video
          ref={videoRef}
          src={VIDEO}
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover object-[70%_50%] lg:object-right-top max-lg:scale-[1.01]"
        />
      </div>

      {/* Белый градиент снизу → к 0 непрозрачности вверх */}
      <div className="absolute inset-x-0 bottom-0 h-[55%] lg:h-[45%] z-[5] pointer-events-none bg-gradient-to-t from-white from-25% via-white/80 via-55% to-transparent" />

      {/* Весь текст и кнопки — внизу, поверх градиента */}
      <div className="relative z-10 flex-1 flex flex-col justify-end w-full max-w-7xl mx-auto px-6 pt-32 pb-5 lg:pb-14">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 className="text-4xl md:text-5xl lg:text-6xl text-black leading-[1.18] mb-6 select-none w-full whitespace-pre-wrap min-h-[2.4em]">
            {displayed}
            {!done && <span className="inline-block w-[3px] h-[1em] bg-violet-600 align-middle ml-[3px] animate-blink" />}
          </h1>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
          <p className="text-base md:text-lg text-neutral-600 leading-relaxed mb-8 max-w-lg">
            Публикуйте задачи, получайте отклики с ценой и сроком и фиксируйте сделку в чате. На сайте и в Telegram.
          </p>
          <div className="flex flex-nowrap gap-2 sm:gap-3">
            <Link href="/feed" className="rounded-full bg-black text-white px-5 sm:px-8 py-3.5 sm:py-4 text-[13px] sm:text-sm font-semibold hover:bg-violet-700 transition-colors whitespace-nowrap">Начать работу</Link>
            <a href={`https://t.me/${BOT}`} className="rounded-full border border-black/15 bg-white/70 px-5 sm:px-8 py-3.5 sm:py-4 text-[13px] sm:text-sm font-semibold hover:border-violet-600 hover:text-violet-700 transition-colors whitespace-nowrap">Открыть бота</a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
