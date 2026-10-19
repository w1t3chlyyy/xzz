"use client";

import { useEffect, useRef, useState } from "react";

const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "F1337Bot";

export function LoginScreen({ onDone }: { onDone: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (window as any).onTelegramAuth = async (user: unknown) => {
      setError(null);
      const res = await fetch("/api/auth/telegram-widget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      }).catch(() => null);
      if (res?.ok) onDone();
      else setError("Не удалось войти. Попробуйте ещё раз.");
    };
    if (!BOT || !box.current) return;
    const s = document.createElement("script");
    s.src = "https://telegram.org/js/telegram-widget.js?22";
    s.async = true;
    s.setAttribute("data-telegram-login", BOT);
    s.setAttribute("data-size", "large");
    s.setAttribute("data-radius", "10");
    s.setAttribute("data-request-access", "write");
    s.setAttribute("data-userpic", "false");
    s.setAttribute("data-onauth", "onTelegramAuth(user)");
    box.current.appendChild(s);
    return () => {
      if (box.current) box.current.innerHTML = "";
    };
  }, [onDone]);

  return (
    <div className="min-h-screen bg-[#F4F3FA] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <a href="/" className="font-heading text-2xl">1337</a>
        <h1 className="mt-8 text-2xl font-heading">Вход</h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Аккаунт создаётся в Telegram-боте. Нажмите кнопку, в боте выберите «Открыть сайт», и вы окажетесь здесь уже авторизованным.
        </p>
        {BOT ? (
          <a href={`https://t.me/${BOT}?start=site`} className="btn-primary mt-6 w-full py-3.5 text-sm font-bold">
            Войти через бота
          </a>
        ) : (
          <p className="mt-6 text-xs font-bold text-rose-600">Не задан NEXT_PUBLIC_TELEGRAM_BOT_USERNAME</p>
        )}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <p className="text-xs text-slate-500 mb-3">Уже есть аккаунт? Войдите кнопкой Telegram:</p>
          <div ref={box} className="min-h-[40px]" />
          {error && <p className="mt-3 text-xs font-bold text-rose-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
