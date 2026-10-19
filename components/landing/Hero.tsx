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
  const modelRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState(false);
  const { displayed, done } = useTypewriter("заказы и исполнители\nв одном месте");

  useEffect(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  // ПК: модель плавно следует за курсором. Телефон (нет курсора): модель сама медленно «плавает».
  useEffect(() => {
    const el = modelRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const pointerFine = window.matchMedia("(hover: hover) and (pointer: fine)");
    let tx = 0; // цель курсора, -1..1
    let ty = 0;
    let x = 0;
    let y = 0;
    let r = 0;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    const tick = (now: number) => {
      let targetX: number;
      let targetY: number;
      let targetR: number;
      let k: number;

      if (pointerFine.matches) {
        targetX = tx * 70;
        targetY = ty * 36;
        targetR = tx * 3;
        k = 0.06; // чем меньше, тем плавнее
      } else {
        targetX = Math.sin(now / 1800) * 14;
        targetY = Math.cos(now / 2300) * 10;
        targetR = Math.sin(now / 2600) * 1.6;
        k = 0.12;
      }

      x += (targetX - x) * k;
      y += (targetY - y) * k;
      r += (targetR - r) * k;
      el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${r.toFixed(2)}deg)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  const bar = "block w-5 h-[2px] bg-black transition-all duration-300";

  return (
    <section className="relative bg-white text-neutral-900 selection:bg-violet-100 selection:text-black antialiased overflow-hidden min-h-[100svh] flex flex-col">
      <header className="fixed top-4 inset-x-0 z-30 px-4">
        <div className="relative max-w-5xl mx-auto">
          <div className="flex items-center justify-between rounded-full border border-black/5 bg-white/80 backdrop-blur-md shadow-sm pl-6 pr-2 py-2">
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

      {/* Модель: на телефоне — в верхней части блока, на ПК — справа, ниже и чуть меньше */}
      <div className="absolute inset-x-0 top-20 h-[62svh] lg:inset-0 lg:top-0 lg:h-full z-0 pointer-events-none flex justify-center lg:justify-end">
        <div className="w-full h-full lg:w-[62%] lg:translate-y-[14%] lg:scale-[0.86] origin-bottom-right">
          <div ref={modelRef} className="w-full h-full will-change-transform">
            <video
              ref={videoRef}
              src={VIDEO}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="w-full h-full object-contain object-center lg:object-right-bottom"
            />
          </div>
        </div>
      </div>

      {/* Белый градиент снизу модели → к 0 непрозрачности вверх */}
      <div className="absolute inset-x-0 bottom-0 h-[62%] lg:h-[55%] z-[5] pointer-events-none bg-gradient-to-t from-white from-30% via-white/85 via-60% to-transparent" />

      {/* Весь текст и кнопки — внизу, поверх градиента */}
      <div className="relative z-10 flex-1 flex flex-col justify-end w-full max-w-7xl mx-auto px-6 pt-32 pb-10 lg:pb-16">
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
          <div className="flex flex-wrap gap-3">
            <Link href="/feed" className="rounded-full bg-black text-white px-8 py-4 text-sm font-semibold hover:bg-violet-700 transition-colors">Начать работу</Link>
            <a href={`https://t.me/${BOT}`} className="rounded-full border border-black/15 bg-white/70 px-8 py-4 text-sm font-semibold hover:border-violet-600 hover:text-violet-700 transition-colors">Открыть бота</a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
