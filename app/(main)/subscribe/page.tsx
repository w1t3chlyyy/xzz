"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSubscription } from "@/lib/useSubscription";
import {
  activateLocalSubscription,
  resetLocalTrial,
  expireLocalTrialNow,
} from "@/lib/subscription";
import { createClient } from "@/lib/supabase/client";
import {
  Crown,
  Sparkles,
  Zap,
  Check,
  Clock,
  ShieldCheck,
  ArrowRight,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Gift,
  Flame,
  Star,
  ChevronRight,
  Info,
  RefreshCw,
  Sliders
} from "lucide-react";

export default function SubscribePage() {
  const router = useRouter();
  const { isTrialActive, isPaid, tier, timeLeft, refresh } = useSubscription();

  const [selectedTier, setSelectedTier] = useState<"pro" | "ai_pro">("pro");
  const [billingPeriod, setBillingPeriod] = useState<"month" | "year">("month");
  const [paymentMethod, setPaymentMethod] = useState<"sbp" | "stars" | "crypto">("sbp");
  const [promoCode, setPromoCode] = useState("");
  const [promoMessage, setPromoMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const supabase = createClient();

  const plans = [
    {
      id: "pro" as const,
      name: "Pro Тариф",
      badge: "Популярный",
      priceMonth: 990,
      priceYear: 790, // per month when paid yearly
      stars: 500,
      icon: Crown,
      color: "from-violet-600 to-indigo-600",
      features: [
        "Неограниченные отклики на заказы",
        "Прямой контакт с заказчиками в Telegram",
        "Приоритетное отображение в ленте специалистов",
        "Значок верифицированного PRO-специалиста",
        "Уведомления о новых заказах по стеку",
        "Без комиссии биржи за сделки",
      ],
    },
    {
      id: "ai_pro" as const,
      name: "AI Pro Тариф",
      badge: "Максимум возможностей",
      priceMonth: 1990,
      priceYear: 1590,
      stars: 1000,
      icon: Sparkles,
      color: "from-purple-600 via-indigo-600 to-pink-600",
      features: [
        "Всё, что входит в тариф Pro",
        "AI-генератор персональных откликов и питчей",
        "AI-оценка сложности, бюджета и стека проектов",
        "AI-генератор ТЗ и структуры проекта в 1 клик",
        "Умный автоподбор идеальных исполнителей/заказов",
        "Персональный Telegram AI-ассистент 24/7",
      ],
    },
  ];

  const handleApplyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;

    if (code === "1337VIP" || code === "PROMO30") {
      activateLocalSubscription("pro", 30);
      setPromoMessage({ text: "Промокод применён! Активирован Pro на 30 дней 🎉", type: "success" });
      refresh();
    } else if (code === "AIPRO" || code === "AI1337") {
      activateLocalSubscription("ai_pro", 30);
      setPromoMessage({ text: "Промокод применён! Активирован AI Pro на 30 дней 🚀", type: "success" });
      refresh();
    } else if (code === "BONUS5" || code === "TEST5") {
      resetLocalTrial(5);
      setPromoMessage({ text: "Пробный период продлён на 5 дней! ✨", type: "success" });
      refresh();
    } else {
      setPromoMessage({ text: "Неверный промокод или срок его действия истёк", type: "error" });
    }
  };

  const handleActivatePlan = async (tierToActivate: "pro" | "ai_pro") => {
    setIsProcessing(true);
    try {
      // 1. Call payments endpoint
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: tierToActivate,
          method: paymentMethod,
          durationDays: billingPeriod === "year" ? 365 : 30,
        }),
      });

      const data = await res.json();
      if (data.payUrl) {
        window.open(data.payUrl, "_blank");
      }

      // 2. Persist in local storage & supabase
      const days = billingPeriod === "year" ? 365 : 30;
      activateLocalSubscription(tierToActivate, days);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const expiresDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
          await supabase
            .from("users")
            .update({
              subscription_tier: tierToActivate,
              subscription_expires_at: expiresDate,
            })
            .eq("id", user.id);
        }
      } catch (err) {
        console.warn("Supabase sub update:", err);
      }

      setShowSuccessModal(true);
      refresh();
    } catch (error) {
      console.error("Subscription activation failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4 pb-28 text-slate-900 font-sans">
      {/* Top Navigation / Breadcrumb */}
      <div className="flex items-center justify-between px-1">
        <Link
          href="/profile"
          className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 py-1 px-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs"
        >
          <span>← Назад в профиль</span>
        </Link>
        <span className="badge-violet text-xs font-bold py-1 px-3 rounded-xl">
          Биржа 1337
        </span>
      </div>

      {/* Trial Countdown Card / Paywall Alert */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-violet-100/50 rounded-full blur-2xl pointer-events-none" />

        {isPaid ? (
          <div className="space-y-2 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-sm">
              <Crown className="w-6 h-6 text-amber-300 fill-amber-300" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900">
              Ваша подписка {tier === "ai_pro" ? "AI Pro" : "Pro"} активна!
            </h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Вам доступны все премиум-инструменты, AI-генерация и неограниченные отклики.
            </p>
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1.5 rounded-xl mt-1">
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Осталось {timeLeft.days} дней</span>
            </div>
          </div>
        ) : isTrialActive ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0">
                  <Flame className="w-5 h-5 text-violet-700" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-extrabold text-sm text-slate-900">Бесплатный период</h3>
                    <span className="badge-violet text-[9px] font-bold py-0.2 px-1.5 rounded-md">
                      5 ДНЕЙ
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Полный доступ ко всем заказам и откликам
                  </p>
                </div>
              </div>
            </div>

            {/* Countdown Display */}
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Clock className="w-4 h-4 text-violet-600" />
                <span>До окончания периода:</span>
              </div>
              <span className="text-sm font-extrabold text-violet-700 font-mono tracking-tight bg-white px-2.5 py-1 rounded-xl border border-purple-200 shadow-2xs">
                {timeLeft.formatted}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              После завершения 5 дней выберите тариф ниже, чтобы сохранить неограниченные отклики, прямой контакт в Telegram и AI-ассистента.
            </p>
          </div>
        ) : (
          <div className="space-y-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Пробный 5-дневный период завершён
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Чтобы продолжать отвечать на заказы, публиковать проекты и общаться с заказчиками, продлите подписку.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Billing Switcher (Month / Year) */}
      <div className="bg-slate-200/70 p-1 rounded-2xl flex items-center max-w-xs mx-auto">
        <button
          onClick={() => setBillingPeriod("month")}
          className={`flex-1 text-xs font-bold py-2 rounded-xl transition-all cursor-pointer ${
            billingPeriod === "month"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Ежемесячно
        </button>
        <button
          onClick={() => setBillingPeriod("year")}
          className={`flex-1 text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
            billingPeriod === "year"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>На год</span>
          <span className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 py-0.2 rounded-md">
            -20%
          </span>
        </button>
      </div>

      {/* Subscription Plans Cards */}
      <div className="space-y-3.5">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isSelected = selectedTier === plan.id;
          const isCurrentActive = isPaid && tier === plan.id;
          const price = billingPeriod === "year" ? plan.priceYear : plan.priceMonth;

          return (
            <motion.div
              key={plan.id}
              whileTap={{ scale: 0.99 }}
              onClick={() => setSelectedTier(plan.id)}
              className={`bg-white rounded-3xl p-5 space-y-4 border transition-all cursor-pointer relative overflow-hidden ${
                isSelected
                  ? "border-violet-600 shadow-[0_6px_25px_rgba(124,58,237,0.12)] ring-2 ring-violet-500/30"
                  : "border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:border-purple-200"
              }`}
            >
              {isSelected && (
                <div className="absolute top-0 right-0 bg-violet-600 text-white text-[10px] font-extrabold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                  Выбран
                </div>
              )}

              <div className="flex items-start gap-3.5">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${plan.color} text-white flex items-center justify-center shrink-0 shadow-sm`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 pr-12">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-slate-900">{plan.name}</h3>
                    {plan.badge && (
                      <span className="badge-violet text-[9px] font-bold py-0.2 px-1.5 rounded-md">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl font-extrabold text-violet-700">
                      {price.toLocaleString("ru-RU")} ₽
                    </span>
                    <span className="text-xs text-slate-400 font-medium">/ месяц</span>
                    <span className="text-xs text-slate-400 font-medium">
                      (⭐ {plan.stars})
                    </span>
                  </div>
                </div>
              </div>

              {/* Features List */}
              <ul className="space-y-2 pt-2 border-t border-slate-100">
                {plan.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                    <div className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              {/* Action Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleActivatePlan(plan.id);
                }}
                disabled={isProcessing}
                className={`w-full py-3 px-4 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all ${
                  isSelected
                    ? "btn-primary shadow-md shadow-violet-500/20"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                }`}
              >
                {isProcessing && selectedTier === plan.id ? (
                  <span>Обработка платежа...</span>
                ) : isCurrentActive ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Продлить текущий тариф</span>
                  </>
                ) : (
                  <>
                    <span>Подключить {plan.name}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Payment Methods Selector */}
      <div className="bg-white rounded-3xl p-5 space-y-3.5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-violet-600" />
          Способ оплаты
        </h4>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setPaymentMethod("sbp")}
            className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
              paymentMethod === "sbp"
                ? "border-violet-600 bg-purple-50/70 text-violet-700 font-extrabold shadow-2xs"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 font-medium"
            }`}
          >
            <div className="text-xs font-extrabold">СБП / Карта</div>
            <div className="text-[10px] text-slate-400">Мгновенно</div>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod("stars")}
            className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
              paymentMethod === "stars"
                ? "border-violet-600 bg-purple-50/70 text-violet-700 font-extrabold shadow-2xs"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 font-medium"
            }`}
          >
            <div className="text-xs font-extrabold flex items-center justify-center gap-1">
              <span>Stars</span>
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
            </div>
            <div className="text-[10px] text-slate-400">Telegram</div>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod("crypto")}
            className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
              paymentMethod === "crypto"
                ? "border-violet-600 bg-purple-50/70 text-violet-700 font-extrabold shadow-2xs"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 font-medium"
            }`}
          >
            <div className="text-xs font-extrabold">CryptoBot</div>
            <div className="text-[10px] text-slate-400">USDT / TON</div>
          </button>
        </div>
      </div>

      {/* Promo Code Section */}
      <div className="bg-white rounded-3xl p-5 space-y-3 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-violet-600" />
          <h4 className="font-extrabold text-xs text-slate-900">У вас есть промокод?</h4>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Например: 1337VIP"
            className="flex-1 input-clean text-xs font-mono uppercase px-3 py-2.5 rounded-2xl"
          />
          <button
            type="button"
            onClick={handleApplyPromo}
            className="btn-secondary text-xs px-4 py-2.5 rounded-2xl font-extrabold cursor-pointer"
          >
            Применить
          </button>
        </div>

        {promoMessage && (
          <p
            className={`text-xs font-medium px-1 flex items-center gap-1.5 ${
              promoMessage.type === "success" ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {promoMessage.type === "success" ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{promoMessage.text}</span>
          </p>
        )}
      </div>

      {/* Tester & Simulation Controls (for verifying 5-day trial) */}
      <div className="bg-slate-100/80 rounded-2xl p-3 border border-slate-200/80 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 px-1">
          <span className="flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            Тестирование таймера подписки
          </span>
          <span className="text-[10px] text-slate-400">Для проверки</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              resetLocalTrial(5);
              refresh();
            }}
            className="text-[10px] font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 py-1.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1"
          >
            <RefreshCw className="w-3 h-3 text-violet-600" />
            <span>Сбросить на 5 дней</span>
          </button>

          <button
            type="button"
            onClick={() => {
              expireLocalTrialNow();
              refresh();
            }}
            className="text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 py-1.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1"
          >
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            <span>Сделать истёкшим</span>
          </button>
        </div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl border border-purple-100"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <Check className="w-7 h-7 stroke-[3]" />
              </div>

              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Подписка успешно активирована!
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Все возможности тарифа {selectedTier === "ai_pro" ? "AI Pro" : "Pro"} теперь доступны. Удачной работы на бирже 1337!
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  router.push("/feed");
                }}
                className="w-full btn-primary text-xs py-3 rounded-2xl font-extrabold"
              >
                Перейти в ленту заказов
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
