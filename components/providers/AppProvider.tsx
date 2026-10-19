// components/providers/AppProvider.tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { getTelegramInitData } from "@/lib/telegram/webapp";
import { LoginScreen } from "@/components/auth/LoginScreen";

export type Role = "client" | "executor" | null;

export interface MeUser {
  id: string;
  telegram_id: number;
  first_name: string | null;
  username: string | null;
  role: Role;
  subscription_tier: "free" | "pro" | "ai_pro";
  subscription_expires_at: string | null;
  trial_started_at: string | null;
}

interface AppState {
  user: MeUser;
  role: Role;
  isAdmin: boolean;
  unread: number;
  clockOffset: number;
  refresh: () => Promise<void>;
  setRole: (role: "client" | "executor") => void;
}

const AppContext = createContext<AppState | null>(null);
const CACHE_KEY = "1337_me";

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

function getTelegramId(): number | null {
  try {
    const id = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id;
    return id ? Number(id) : null;
  } catch {
    return null;
  }
}

async function fetchMe(): Promise<any | null> {
  const res = await fetch("/api/me", { cache: "no-store" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("me_failed");
  return res.json();
}

async function telegramLogin(): Promise<boolean> {
  const initData = getTelegramInitData();
  if (!initData) return false;
  const res = await fetch("/api/auth/telegram", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData }),
  });
  return res.ok;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MeUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unread, setUnread] = useState(0);
  const [clockOffset, setClockOffset] = useState(0);
  const [ready, setReady] = useState(false);
  const [needLogin, setNeedLogin] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const hasUserRef = useRef(false);

  const fail = useCallback((message: string) => {
    if (!hasUserRef.current) {
      setUser(null);
      setAuthError(message);
    }
    setReady(true);
  }, []);

  const apply = useCallback((data: any) => {
    hasUserRef.current = true;
    setUser(data.user);
    setIsAdmin(!!data.isAdmin);
    setUnread(data.unread || 0);
    setClockOffset((data.serverNow || Date.now()) - Date.now());
    setAuthError(null);
    setNeedLogin(false);
    setReady(true);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ user: data.user, isAdmin: !!data.isAdmin }));
      if (data.user.role) {
        localStorage.setItem("1337_role", data.user.role);
        localStorage.setItem("fiolet_role", data.user.role);
      }
    } catch {
      // storage недоступен — не критично
    }
  }, []);

  const refresh = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      let data = await fetchMe();
      const tgId = getTelegramId();
      if (!data || (tgId && Number(data.user.telegram_id) !== tgId)) {
        // Обычный сайт (вне Telegram): показываем экран входа через Telegram Login Widget
        if (!getTelegramInitData()) {
          hasUserRef.current = false;
          setUser(null);
          try { localStorage.removeItem(CACHE_KEY); } catch {}
          setNeedLogin(true);
          setReady(true);
          return;
        }
        const ok = await telegramLogin();
        if (!ok) {
          fail("Не удалось войти через Telegram.");
          return;
        }
        data = await fetchMe();
        if (!data) {
          fail("Не удалось войти. Закройте и откройте приложение заново.");
          return;
        }
      }
      apply(data);
    } catch {
      fail("Не удалось подключиться. Проверьте интернет и попробуйте снова.");
    } finally {
      busyRef.current = false;
    }
  }, [apply, fail]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached?.user?.id) {
          hasUserRef.current = true;
          setUser(cached.user);
          setIsAdmin(!!cached.isAdmin);
          setReady(true);
        }
      }
    } catch {
      // ignore
    }

    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 20000);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(interval);
    };
  }, [refresh]);

  const setRole = useCallback(
    (role: "client" | "executor") => {
      setUser((prev) => {
        if (!prev) return prev;
        const next = { ...prev, role };
        try {
          localStorage.setItem("1337_role", role);
          localStorage.setItem("fiolet_role", role);
          localStorage.setItem(CACHE_KEY, JSON.stringify({ user: next, isAdmin }));
        } catch {
          // ignore
        }
        return next;
      });
    },
    [isAdmin]
  );

  const value = useMemo<AppState | null>(
    () => (user ? { user, role: user.role, isAdmin, unread, clockOffset, refresh, setRole } : null),
    [user, isAdmin, unread, clockOffset, refresh, setRole]
  );

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#F4F3FA] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
      </div>
    );
  }

  if (!value && needLogin) {
    return (
      <LoginScreen
        onDone={() => {
          setReady(false);
          void refresh();
        }}
      />
    );
  }

  if (!value) {
    return (
      <div className="min-h-screen bg-[#F4F3FA] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-3 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="w-14 h-14 rounded-2xl bg-purple-100 text-violet-700 flex items-center justify-center mx-auto">
            <Send className="w-7 h-7" />
          </div>
          <h1 className="text-base font-extrabold text-slate-900">Биржа 1337</h1>
          <p className="text-xs text-slate-500 leading-relaxed">{authError || "Загрузка не удалась."}</p>
          <button
            onClick={() => {
              setReady(false);
              void refresh();
            }}
            className="btn-primary w-full py-3 rounded-2xl text-xs font-extrabold"
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Новый пользователь без роли → на выбор роли
export function RoleGate({ children }: { children: React.ReactNode }) {
  const { user } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!user.role) router.replace("/onboarding");
  }, [user.role, router]);

  if (!user.role) return null;
  return <>{children}</>;
}
