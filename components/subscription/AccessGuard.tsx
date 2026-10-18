"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSubscription } from "@/lib/useSubscription";
import {
  Lock,
  Crown,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  Gift,
  HelpCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { getTelegramUser } from "@/lib/telegram/webapp";

export function AccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { hasAccess, isPaid, isTrialActive, refresh } = useSubscription();

  const [promoCode, setPromoCode] = useState("");
  const [promoMessage, setPromoMessage] = useState<{ text: string; success: boolean } | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [isPayingStub, setIsPayingStub] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);

  // If user has access or is already on /subscribe or /blocked, allow page to render
  if (hasAccess || pathname === "/subscribe" || pathname === "/blocked") {
    return <>{children}</>;
  }

  const tgUser = getTelegramUser();

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setIsApplyingPromo(true);
    setPromoMessage(null);
    try {
      const res = await fetch("/api/payments/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPromoMessage({ text: data.error || "Неверный промокод", success: false });
        return;
      }
      setPromoMessage({ text: "Промокод успешно применен! Доступ продлен 🎉", success: true });
      refresh();
    } catch {
      setPromoMessage({ text: "Ошибка сети, попробуйте еще раз", success: false });
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleQuickPayStub = () => {
    setIsPayingStub(true);
    setTimeout(() => {
      setIsPayingStub(false);
      setPaySuccess(true);
      // Give 30 days locally and refresh
      localStorage.setItem("1337_role", "executor");
      const thirtyDays = Date.now() + 30 * 24 * 60 * 60 * 1000;
      localStorage.setItem("1337_trial_started_at", String(Date.now()));
      setTimeout(() => {
        refresh();
        router.push("/feed");
      }, 1200);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#F4F3FA] flex flex-col justify-between p-5 max-w-md mx-auto text-slate-900 font-sans overflow-y-auto">
      <div className="pt-6 text-center space-y-3">
        {/* Glowing Lock Icon */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-rose-500 via-pink-600 to-purple-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-rose-500/25 ring-8 ring-rose-100">
          <Lock className="w-10 h-10 stroke-[2.2]" />
        </div>

        <div>
          <span className="badge-violet text-[11px] font-extrabold uppercase tracking-wider py-1 px-3 rounded-full mb-2">
            Доступ приостановлен
          </span>
          <h1 className="text-xl font-black text-slate-900 mt-2">
            Пробный период 5 дней истёк
          </h1>
          <p className="text-slate-500 text-xs mt-1.5 max-w-xs mx-auto leading-relaxed font-medium">
            {tgUser?.displayName ? `${tgUser.displayName}, ваш` : "Ваш"} бесплатный пробный доступ к заказам и чатам завершен. Оформите подписку PRO для продолжения работы.
          </p>
        </div>
      </div>

      {/* Plan Card */}
      <div className="bg-white rounded-3xl p-5 border-2 border-purple-200 shadow-[0_8px_30px_rgba(124,58,237,0.08)] space-y-4 my-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-violet-700 flex items-center justify-center">
              <Crown className="w-5 h-5 text-amber-500 fill-amber-500" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Тариф 1337 PRO</h3>
              <p className="text-[11px] text-slate-400 font-medium">Полный безлимитный доступ</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-base font-black text-violet-700">990 ₽</div>
            <div className="text-[10px] text-slate-400 font-bold">в месяц</div>
          </div>
        </div>

        <div className="space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-700 font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Неограниченные отклики на заказы</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Официальные чаты и безопасные сделки</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Значок верифицированного PRO-специалиста</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>0% комиссии биржи</span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-2 pt-1">
          <Link
            href="/subscribe"
            className="w-full btn-primary py-3 rounded-2xl text-xs font-black shadow-violet flex items-center justify-center gap-2 text-white"
          >
            <CreditCard className="w-4 h-4" />
            <span>Выбрать способ оплаты</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <button
            type="button"
            onClick={handleQuickPayStub}
            disabled={isPayingStub || paySuccess}
            className="w-full py-2.5 rounded-2xl border border-purple-200 text-violet-700 bg-purple-50 hover:bg-purple-100 text-xs font-extrabold transition-colors flex items-center justify-center gap-1.5"
          >
            {isPayingStub ? (
              <span>Обработка платежа...</span>
            ) : paySuccess ? (
              <span className="text-emerald-700">Оплачено! Открываем доступ...</span>
            ) : (
              <span>Оплатить в 1 клик (Тестовый шлюз)</span>
            )}
          </button>
        </div>
      </div>

      {/* Promo Code Box */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/90 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Есть промокод? (START1337)"
            className="flex-1 py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium uppercase text-slate-900 focus:outline-none focus:border-violet-500"
          />
          <button
            type="button"
            onClick={handleApplyPromo}
            disabled={isApplyingPromo || !promoCode.trim()}
            className="btn-primary py-2 px-3.5 rounded-xl text-xs font-bold text-white shrink-0 disabled:opacity-50"
          >
            {isApplyingPromo ? "..." : "Активировать"}
          </button>
        </div>
        {promoMessage && (
          <p
            className={`text-[11px] font-bold ${
              promoMessage.success ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {promoMessage.text}
          </p>
        )}
      </div>

      <div className="text-center pt-3 pb-2 text-[11px] text-slate-400 font-medium">
        По вопросам оплаты напишите в поддержку биржи 1337
      </div>
    </div>
  );
}
