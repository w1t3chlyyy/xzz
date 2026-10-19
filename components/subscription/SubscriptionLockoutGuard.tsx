// components/subscription/SubscriptionLockoutGuard.tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, Crown, ArrowRight, Headphones, Sparkles } from "lucide-react";
import { useSubscription } from "@/lib/useSubscription";
import { openTelegramUrl } from "@/lib/links";
import { SUPPORT_URL } from "@/lib/constants";

const NOTIFIED_KEY = "1337_expired_notified";

// Доступ закрыт после окончания триала/подписки. Никаких «тестовых шлюзов»:
// разблокировать можно только реальной оплатой или промокодом на /subscribe.
export function SubscriptionLockoutGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { hasAccess } = useSubscription({ tick: false });

  useEffect(() => {
    if (hasAccess) return;
    try {
      if (localStorage.getItem(NOTIFIED_KEY)) return;
      localStorage.setItem(NOTIFIED_KEY, "1");
    } catch {
      return;
    }
    fetch("/api/subscription/expired-notify", { method: "POST" }).catch(() => {});
  }, [hasAccess]);

  if (hasAccess || pathname === "/subscribe") return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#F4F3FA] flex flex-col justify-center items-center px-4 py-8 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 border border-purple-200/80 shadow-[0_12px_40px_rgba(124,58,237,0.1)] text-center space-y-5">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-rose-500 to-purple-600 text-white flex items-center justify-center mx-auto shadow-md shadow-rose-500/20">
          <Lock className="w-10 h-10 stroke-[2.2]" />
        </div>

        <div className="space-y-1.5">
          <span className="badge-violet text-[10px] font-bold py-0.5 px-2.5 rounded-lg uppercase tracking-wider">Доступ закрыт</span>
          <h1 className="text-xl font-heading font-light text-slate-900 tracking-tight">Срок пробного периода истёк</h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed font-medium">
            Чтобы продолжить работу с заказами и чатами, оформите подписку <b>Pro</b>.
          </p>
        </div>

        <div className="p-3 bg-purple-50/70 border border-purple-200/70 rounded-2xl flex items-start gap-2.5 text-left text-purple-900">
          <Sparkles className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed font-medium text-[11.5px]">Мы также отправили напоминание в Telegram-бота.</p>
        </div>

        <div className="space-y-2.5">
          <Link href="/subscribe" className="w-full btn-primary py-3.5 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-violet">
            <Crown className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span>Оформить подписку Pro</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            onClick={() => openTelegramUrl(SUPPORT_URL)}
            className="w-full py-2.5 px-4 rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Headphones className="w-3.5 h-3.5 text-violet-600" />
            <span>Связаться с поддержкой</span>
          </button>
        </div>
      </div>
    </div>
  );
}
