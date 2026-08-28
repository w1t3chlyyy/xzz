"use client";

import { initData, useSignal } from "@telegram-apps/sdk-react";

export function useTelegramUser() {
  const user = useSignal(initData.user);
  return user;
}

export function getTelegramInitData(): string {
  if (typeof window !== "undefined" && window.Telegram?.WebApp) {
    return window.Telegram.WebApp.initData;
  }
  return "";
}

export function expandTelegramApp() {
  if (typeof window !== "undefined" && window.Telegram?.WebApp) {
    window.Telegram.WebApp.expand();
    window.Telegram.WebApp.ready();
  }
}

export function setTelegramHeaderColor(color: string) {
  if (typeof window !== "undefined" && window.Telegram?.WebApp) {
    window.Telegram.WebApp.setHeaderColor(color);
    window.Telegram.WebApp.setBackgroundColor(color);
  }
}
