"use client";

import { useEffect } from "react";
import { expandTelegramApp } from "@/lib/telegram/webapp";

export function TelegramInitializer() {
  useEffect(() => {
    // 1. Немедленно при монтировании
    expandTelegramApp();

    // 2. Повторяем с небольшой задержкой на случай медленной загрузки скрипта Telegram WebApp SDK
    const timer1 = setTimeout(() => {
      expandTelegramApp();
    }, 150);

    const timer2 = setTimeout(() => {
      expandTelegramApp();
    }, 500);

    // 3. Подписываемся на изменение viewport (если пользователь или система меняет размер)
    const handleViewportChanged = () => {
      try {
        const tg = window.Telegram?.WebApp as any;
        if (tg && !tg.isExpanded) {
          tg.expand();
        }
      } catch {
        // ignore
      }
    };

    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      try {
        window.Telegram.WebApp.onEvent?.("viewportChanged", handleViewportChanged);
      } catch {
        // ignore
      }
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      if (typeof window !== "undefined" && window.Telegram?.WebApp) {
        try {
          window.Telegram.WebApp.offEvent?.("viewportChanged", handleViewportChanged);
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return null;
}
