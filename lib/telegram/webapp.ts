"use client";

import { useEffect, useState } from "react";
import type { TelegramUser } from "@/types/telegram-web-app";

export interface ExtractedTelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  is_premium?: boolean;
  displayName: string;
  displayUsername: string;
}

/**
 * Extracts Telegram user object from window.Telegram, URL hash/params or local cache
 */
export function getTelegramUser(): ExtractedTelegramUser | null {
  if (typeof window === "undefined") return null;

  try {
    // 1. Direct WebApp initDataUnsafe
    if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
      const u = window.Telegram.WebApp.initDataUnsafe.user;
      if (u.first_name || u.username) {
        const extracted: ExtractedTelegramUser = {
          id: u.id || 0,
          first_name: u.first_name || "",
          last_name: u.last_name || "",
          username: u.username || "",
          photo_url: u.photo_url || "",
          is_premium: !!u.is_premium,
          displayName: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || "Пользователь",
          displayUsername: u.username ? `@${u.username.replace(/^@/, "")}` : `id${u.id || ""}`,
        };
        localStorage.setItem("1337_tg_user", JSON.stringify(extracted));
        return extracted;
      }
    }

    // 2. Parse from window.Telegram.WebApp.initData string
    if (window.Telegram?.WebApp?.initData) {
      const params = new URLSearchParams(window.Telegram.WebApp.initData);
      const userRaw = params.get("user");
      if (userRaw) {
        const u = JSON.parse(userRaw) as TelegramUser;
        const extracted: ExtractedTelegramUser = {
          id: u.id || 0,
          first_name: u.first_name || "",
          last_name: u.last_name || "",
          username: u.username || "",
          photo_url: u.photo_url || "",
          is_premium: !!u.is_premium,
          displayName: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || "Пользователь",
          displayUsername: u.username ? `@${u.username.replace(/^@/, "")}` : `id${u.id || ""}`,
        };
        localStorage.setItem("1337_tg_user", JSON.stringify(extracted));
        return extracted;
      }
    }

    // 3. Check URL parameters / hash (Telegram Web sometimes passes tgWebAppData in hash)
    const hash = window.location.hash.substring(1);
    const search = window.location.search.substring(1);
    const combined = new URLSearchParams(hash || search);
    const tgWebAppData = combined.get("tgWebAppData") || combined.get("initData");
    if (tgWebAppData) {
      const dataParams = new URLSearchParams(tgWebAppData);
      const userRaw = dataParams.get("user");
      if (userRaw) {
        const u = JSON.parse(userRaw) as TelegramUser;
        const extracted: ExtractedTelegramUser = {
          id: u.id || 0,
          first_name: u.first_name || "",
          last_name: u.last_name || "",
          username: u.username || "",
          photo_url: u.photo_url || "",
          is_premium: !!u.is_premium,
          displayName: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || "Пользователь",
          displayUsername: u.username ? `@${u.username.replace(/^@/, "")}` : `id${u.id || ""}`,
        };
        localStorage.setItem("1337_tg_user", JSON.stringify(extracted));
        return extracted;
      }
    }

    // 4. Fallback to cached Telegram user in localStorage
    const cached = localStorage.getItem("1337_tg_user");
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    console.warn("Could not extract Telegram user:", err);
  }

  return null;
}

/**
 * React hook to get the Telegram user dynamically
 */
export function useTelegramUser(): {
  user: ExtractedTelegramUser | null;
  isLoading: boolean;
} {
  const [user, setUser] = useState<ExtractedTelegramUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const tgUser = getTelegramUser();
    if (tgUser) {
      setUser(tgUser);
    }
    setIsLoading(false);
  }, []);

  return { user, isLoading };
}

export function getTelegramInitData(): string {
  if (typeof window !== "undefined" && window.Telegram?.WebApp) {
    return window.Telegram.WebApp.initData || "";
  }
  return "";
}

export function expandTelegramApp() {
  if (typeof window !== "undefined" && window.Telegram?.WebApp) {
    try {
      const tg = window.Telegram.WebApp as any;
      tg.ready();
      tg.expand();

      const hasVersionCheck = typeof tg.isVersionAtLeast === "function";

      // Запрос на открытие во весь экран (доступно только в Telegram WebApp 8.0+)
      if (
        hasVersionCheck &&
        tg.isVersionAtLeast("8.0") &&
        typeof tg.requestFullscreen === "function"
      ) {
        try {
          tg.requestFullscreen();
        } catch {
          // ignore
        }
      }

      // Отключение вертикальных свайпов для предотвращения случайного сворачивания (доступно с 7.7+)
      if (
        hasVersionCheck &&
        tg.isVersionAtLeast("7.7") &&
        typeof tg.disableVerticalSwipes === "function"
      ) {
        try {
          tg.disableVerticalSwipes();
        } catch {
          // ignore
        }
      }

      // Настройка цвета шапки (доступно с 6.1+)
      if (
        (!hasVersionCheck || tg.isVersionAtLeast("6.1")) &&
        typeof tg.setHeaderColor === "function"
      ) {
        try {
          tg.setHeaderColor("#F4F3FA");
          tg.setBackgroundColor("#F4F3FA");
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.warn("Telegram WebApp initialization error:", err);
    }
  }
}

export function setTelegramHeaderColor(color: string) {
  if (typeof window !== "undefined" && window.Telegram?.WebApp) {
    try {
      const tg = window.Telegram.WebApp as any;
      if (
        typeof tg.isVersionAtLeast !== "function" ||
        tg.isVersionAtLeast("6.1")
      ) {
        tg.setHeaderColor?.(color);
        tg.setBackgroundColor?.(color);
      }
    } catch {
      // ignore
    }
  }
}

