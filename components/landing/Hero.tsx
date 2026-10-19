"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";

const VIDEO = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260601_110537_3a579fa0-7bbc-4d94-9d25-0e816c7840f5.mp4";
const NAV: [string, string][] = [["Возможности", "#roles"], ["Тариф", "#pro"], ["Вопросы", "#faq"], ["Оферта", "/offer"]];
const OPTIONS = ["Программирование", "Дизайн", "Маркетинг", "Копирайтинг"];

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
  const [scrolled, setScrolled] = useState(false);
  const [services, setServices] = useState<string[]>([]);
  const { displayed, done } = useTypewriter("заказы и исполнители\nв одном месте");

  // Десктоп: перемотка видео движением мыши
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let prevX: number | null = null;
    let target = 0;
    let seeking = false;
    const apply = () => {
      if (seeking) return;
      seeking = true;
      v.currentTime = target;
    };
    const onMove = (e: MouseEvent) => {
      if (window.innerWidth < 1024 || !v.duration) return;
      if (prevX === null) {
        prevX = e.clientX;
        return;
      }
      const delta = e.clientX - prevX;
      prevX = e.clientX;
      target = Math.min(Math.max(target + (delta / window.innerWidth) * 0.8 * v.duration, 0), v.duration);
      apply();
    };
    const onSeeked = () => {
      seeking = false;
      if (Math.abs(v.currentTime - target) > 0.02) apply();
    };
    window.addEventListener("mousemove", onMove);
    v.addEventListener("seeked", onSeeked);
    return () => {
      window.removeEventListener("mousemove", onMove);
      v.removeEventListener("seeked", onSeeked);
    };
  }, []);

  // Мобильные: обычное воспроизведение
  useEffect(() => {
    const v = videoRef.current;
    if (!v || window.innerWidth >= 1024) return;
    v.autoplay = true;
    v.loop = true;
    v.play().catch(() => {});
  }, []);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const toggle = (s: string) => setServices((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));
  const bar = "block w-6 h-[2px] bg-black transition-all duration-300";

  return (
    <section className="relative bg-white text-neutral-900 selection:bg-violet-100 selection:text-black antialiased overflow-x-hidden flex flex-col lg:block lg:min-h-screen">
      <header className={`fixed top-0 inset-x-0 z-20 px-5 sm:px-8 py-4 sm:py-5 flex flex-row justify-between items-center transition-colors duration-300 ${scrolled || menu ? "bg-white/85 backdrop-blur-md" : "bg-transparent"}`}>
        <div className="flex flex-row gap-3 items-center">
          <span className="text-[21px] sm:text-[26px] tracking-tight text-black font-medium select-none">1337&reg;</span>
          <span className="text-[25px] sm:text-[30px] text-black select-none tracking-[-0.02em] font-medium leading-none mb-1">&#10033;</span>
        </div>

        <nav className="hidden md:flex flex-row text-[23px] text-black">
          {NAV.map(([label, href], i) => (
            <span key={label} className="flex">
              <a href={href} className="hover:opacity-60 transition-opacity">{label}</a>
              {i < NAV.length - 1 && <span className="opacity-40">,&nbsp;</span>}
            </span>
          ))}
        </nav>

        <Link href="/feed" className="hidden md:inline text-[23px] text-black underline underline-offset-2 hover:opacity-60 transition-opacity">Войти</Link>

        <button aria-label="Меню" onClick={() => setMenu((v) => !v)} className="md:hidden flex flex-col gap-[5px] p-1">
          <span className={`${bar} ${menu ? "rotate-45 translate-y-[7px]" : ""}`} />
          <span className={`${bar} ${menu ? "opacity-0" : ""}`} />
          <span className={`${bar} ${menu ? "-rotate-45 -translate-y-[7px]" : ""}`} />
        </button>
      </header>

      <div className={`md:hidden fixed inset-0 z-[15] bg-white/95 backdrop-blur-sm flex flex-col justify-center gap-6 px-8 text-4xl text-black transition-opacity duration-300 ${menu ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        {NAV.map(([label, href]) => (
          <a key={label} href={href} onClick={() => setMenu(false)}>{label}</a>
        ))}
        <Link href="/feed" className="underline underline-offset-4">Войти</Link>
      </div>

      <div className="order-last lg:order-none relative lg:absolute lg:inset-0 lg:z-0 overflow-hidden pointer-events-none w-full aspect-square md:aspect-video lg:aspect-auto lg:h-full bg-neutral-50 lg:bg-transparent">
        <video ref={videoRef} src={VIDEO} muted playsInline preload="auto" className="w-full h-full object-cover object-right lg:object-right-bottom" />
      </div>

      <div className="relative z-10 flex flex-col order-first lg:order-none w-full bg-white lg:bg-transparent pb-8 lg:pb-0 lg:min-h-screen">
        <main id="spade-hero" className="w-full max-w-7xl mx-auto px-6 py-12 pt-28 lg:pt-12 flex-1 flex flex-col justify-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-5xl md:text-6xl lg:text-[76px] font-normal tracking-tight text-black leading-[1.08] mb-8 select-none w-full whitespace-pre-wrap">
              {displayed}
              {!done && <span className="inline-block w-[2px] h-[1.1em] bg-black align-middle ml-[2px] animate-blink" />}
            </h1>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
            <p className="text-lg md:text-xl text-neutral-600 leading-relaxed font-normal mb-14 max-w-2xl">
              Публикуйте задачи, получайте отклики с ценой и сроком, <br />
              договаривайтесь в чате и фиксируйте сделку — на сайте и в Telegram.
            </p>
          </motion.div>

          <div>
            <h2 className="text-2xl font-medium tracking-tight mb-2">Что вас интересует?</h2>
            <p className="opacity-85 text-neutral-500 mb-8">Выберите всё подходящее</p>

            <div className="flex flex-wrap gap-3">
              {OPTIONS.map((o) => {
                const on = services.includes(o);
                return (
                  <motion.button
                    key={o}
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => toggle(o)}
                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-base transition-colors ${on ? "bg-black text-white shadow-md shadow-violet-950/10 transform" : "bg-white text-black border border-neutral-200 hover:bg-violet-50"}`}
                  >
                    {on && (
                      <motion.span initial={{ opacity: 0, y: -10, scale: 0.4 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="flex">
                        <Check className="w-4 h-4" />
                      </motion.span>
                    )}
                    {o}
                  </motion.button>
                );
              })}
            </div>

            <div className="mt-6 max-w-2xl">
              <AnimatePresence mode="wait">
                {services.length === 0 ? (
                  <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} className="italic text-xs">
                    Нажмите, чтобы выбрать направления выше.
                  </motion.p>
                ) : (
                  <motion.div key="ready" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 28 }} className="overflow-hidden">
                    <div className="bg-violet-50/60 border border-violet-100 rounded-2xl px-5 py-4 flex flex-wrap items-center justify-between gap-4">
                      <span className="text-sm text-black">Подберём заказы и специалистов: {services.join(", ")}</span>
                      <Link href="/feed" className="inline-flex items-center gap-1.5 text-violet-700 uppercase text-xs font-medium tracking-wide hover:opacity-70 transition-opacity">
                        Начать <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>
    </section>
  );
}
