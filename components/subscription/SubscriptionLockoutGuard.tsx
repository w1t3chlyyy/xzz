// components/subscription/SubscriptionLockoutGuard.tsx
"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSubscription } from "@/lib/useSubscription";
import { isUserAdmin } from "@/lib/admin";
import { getTelegramUser } from "@/lib/telegram/webapp";
import {
  Lock,
  Crown,
  Zap,
  Check,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  CreditCard,
  Star,
  Landmark,
  Loader2,
  Sparkles,
  Headphones,
  RefreshCw,
  Shield,
} from "lucide-react";

export function SubscriptionLockoutGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const sub = useSubscription();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminBypass, setAdminBypass] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<"card" | "stars" | "crypto">("card");
  const [unlockedSuccess, setUnlockedSuccess] = useState(false);

  useEffect(() => {
    const tg = getTelegramUser();
    const adminStatus = isUserAdmin(tg?.id);
    setIsAdmin(adminStatus);
  }, []);

  // Allow unrestricted access to /subscribe, /admin or if user is active/admin bypass
  if (pathname === "/subscribe" || pathname.startsWith("/admin") || adminBypass) {
    return <>{children}</>;
  }

  // If user still has access (trial active or paid PRO)
  if (sub.hasAccess) {
    return <>{children}</>;
  }

  // --- ACCESS EXPIRED: BLOCK MINI APP ---
  const handleSimulatePayment = async () => {
    setIsPaying(true);
    try {
      // Create local payment / activate pro
      const tg = getTelegramUser();
      const res = await fetch("/api/payments/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "1337UNLOCK" }),
      });

      if (!res.ok) {
        // Fallback local pro
        localStorage.setItem("1337_trial_started_at", String(Date.now()));
      }

      setUnlockedSuccess(true);
      setTimeout(() => {
        sub.refresh();
        setShowPaymentModal(false);
        setIsPaying(false);
        setUnlockedSuccess(false);
      }, 1500);
    } catch {
      localStorage.setItem("1337_trial_started_at", String(Date.now()));
      sub.refresh();
      setShowPaymentModal(false);
      setIsPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F3FA] flex flex-col justify-center items-center px-4 py-8 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-3xl p-6 border border-purple-200/80 shadow-[0_12px_40px_rgba(124,58,237,0.1)] text-center space-y-5"
      >
        {/* Lockout Icon */}
        <div className="relative inline-block">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-rose-500 to-purple-600 text-white flex items-center justify-center mx-auto shadow-md shadow-rose-500/20">
            <Lock className="w-10 h-10 stroke-[2.2]" />
          </div>
          <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 text-slate-900 border-2 border-white flex items-center justify-center text-[10px] font-black">
            !
          </span>
        </div>

        {/* Heading in Unbounded Light */}
        <div className="space-y-1.5">
          <span className="badge-violet text-[10px] font-bold py-0.5 px-2.5 rounded-lg uppercase tracking-wider">
            Доступ заблокирован
          </span>
          <h1 className="text-xl font-heading font-light text-slate-900 tracking-tight">
            Срок пробного периода истёк
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed font-medium">
            5 дней бесплатного доступа на бирже <b>1337</b> завершились. Чтобы продолжить работу с заказами и чатами, продлите подписку.
          </p>
        </div>

        {/* Feature Lockout List */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-left space-y-2.5">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Заблокированные функции:
          </div>
          <div className="space-y-1.5 text-xs text-slate-700 font-medium">
            <div className="flex items-center gap-2 text-rose-700">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>Отклики на новые заказы в ленте</span>
            </div>
            <div className="flex items-center gap-2 text-rose-700">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>Общение с заказчиками в защищенных чатах</span>
            </div>
            <div className="flex items-center gap-2 text-rose-700">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>Оформление безопасных сделок 1337</span>
            </div>
          </div>
        </div>

        {/* Telegram Bot Notification Notice */}
        <div className="p-3 bg-purple-50/70 border border-purple-200/70 rounded-2xl flex items-start gap-2.5 text-left text-xs text-purple-900">
          <Sparkles className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed font-medium text-[11.5px]">
            Вам в Telegram-бота отправлено уведомление с предложением продлить тариф <b>PRO</b>. Вы можете оплатить прямо здесь или в чате с ботом.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          <button
            onClick={() => setShowPaymentModal(true)}
            className="w-full btn-primary py-3.5 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-violet transition-transform active:scale-98"
          >
            <Crown className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span>Продлить подписку PRO (990 ₽/мес)</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => router.push("/chats?support=true")}
            className="w-full py-2.5 px-4 rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Headphones className="w-3.5 h-3.5 text-violet-600" />
            <span>Связаться с поддержкой</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setAdminBypass(true)}
              className="w-full py-2 text-[11px] font-bold text-slate-400 hover:text-violet-700 transition-colors flex items-center justify-center gap-1"
            >
              <Shield className="w-3 h-3 text-violet-600" />
              <span>Режим администратора: разблокировать для теста</span>
            </button>
          )}
        </div>
      </motion.div>

      {/* Payment Stub Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-purple-100 text-left font-sans"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                    <Crown className="w-4 h-4 text-violet-700" />
                  </div>
                  <h3 className="font-heading font-light text-base text-slate-900">
                    Оплата тарифа PRO
                  </h3>
                </div>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1">
                <div className="text-xl font-extrabold text-violet-700">990 ₽ / месяц</div>
                <p className="text-xs text-slate-500 font-medium">
                  Неограниченные отклики, общение в чатах и 0% комиссии биржи.
                </p>
              </div>

              {/* Payment Methods */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Выберите метод оплаты:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMethod("card")}
                    className={`p-2.5 rounded-2xl border text-center transition-all ${
                      selectedMethod === "card"
                        ? "border-violet-600 bg-purple-50 text-violet-700 font-bold"
                        : "border-slate-200 bg-slate-50 text-slate-600 font-medium"
                    }`}
                  >
                    <Landmark className="w-4 h-4 mx-auto mb-1" />
                    <span className="text-[11px]">Карта / СБП</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod("stars")}
                    className={`p-2.5 rounded-2xl border text-center transition-all ${
                      selectedMethod === "stars"
                        ? "border-violet-600 bg-purple-50 text-violet-700 font-bold"
                        : "border-slate-200 bg-slate-50 text-slate-600 font-medium"
                    }`}
                  >
                    <Star className="w-4 h-4 mx-auto mb-1 text-amber-500 fill-amber-500" />
                    <span className="text-[11px]">Stars (⭐500)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod("crypto")}
                    className={`p-2.5 rounded-2xl border text-center transition-all ${
                      selectedMethod === "crypto"
                        ? "border-violet-600 bg-purple-50 text-violet-700 font-bold"
                        : "border-slate-200 bg-slate-50 text-slate-600 font-medium"
                    }`}
                  >
                    <CreditCard className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                    <span className="text-[11px]">CryptoBot</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 leading-relaxed font-medium">
                {selectedMethod === "card" && "Оплата банковской картой или через СБП. Счёт формируется мгновенно."}
                {selectedMethod === "stars" && "Оплата звёздами Telegram Stars прямо в приложении."}
                {selectedMethod === "crypto" && "Оплата криптовалютой USDT / TON через @CryptoBot."}
              </div>

              <button
                type="button"
                onClick={handleSimulatePayment}
                disabled={isPaying || unlockedSuccess}
                className="w-full btn-primary py-3.5 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-violet"
              >
                {isPaying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Проводим оплату...</span>
                  </>
                ) : unlockedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                    <span>Доступ открыт!</span>
                  </>
                ) : (
                  <>
                    <span>Оплатить и разблокировать 1337</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
