"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTelegramInitData, expandTelegramApp } from "@/lib/telegram/webapp";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    expandTelegramApp();
    login();
  }, []);

  async function login() {
    const initData = getTelegramInitData();

    if (!initData) {
      setError("Откройте приложение через Telegram");
      return;
    }

    try {
      const response = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Ошибка авторизации");
        return;
      }

      router.push(data.role ? "/feed" : "/onboarding");
    } catch (e) {
      console.error(e);
      setError("Не удалось подключиться к серверу");
    }
  }

  return (
    <div className="min-h-screen bg-violet-dark flex flex-col items-center justify-center p-6 text-center">
      {error ? (
        <p className="text-violet-200">{error}</p>
      ) : (
        <>
          <Loader2 className="w-8 h-8 text-violet-accent animate-spin mb-3" />
          <p className="text-violet-300">Входим...</p>
        </>
      )}
    </div>
  );
}
