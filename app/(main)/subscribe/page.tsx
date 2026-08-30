"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSubscription } from "@/lib/useSubscription";
import {
  Crown,
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
  Loader2,
  Landmark,
  Copy,
} from "lucide-react";

type PaymentMethod = "bank" | "stars" | "crypto";

interface PendingPayment {
  id: string;
  method: PaymentMethod;
  requisites?: string;
  amount?: number;
}

export default function SubscribePage() {
  const router = useRouter();
  const { isTrialActive, isPaid, tier, timeLeft, refresh } = useSubscription();

  const selectedTier = "pro" as const;
  const [billingPeriod, setBillingPeriod] = useState<"month" | "year">("month");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank");
  const [promoCode, setPromoCode] = useState("");
  const [promoMessage, setPromoMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const plans = [
    {
      id: "pro" as const,
      name: "Pro Тариф",
      badge: "Полный доступ",
      priceMonth: 990,
      priceYear: 790,
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
  ];

  const handleApplyPromo = async () => {
    const code = promoCode.trim();
    if (!code) return;
    setIsApplyingPromo(true);
    setPromoMessage(null);

    try {
      const res = await fetch("/api/payments/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPromoMessage({ text: data.error || "Не удалось применить промокод", type: "error" });
        return;
      }

      setPromoMessage({
        text: `Промокод применён! Тариф Pro активирован 🎉`,
        type: "success",
      });
      refresh();
    } catch {
      setPromoMessage({ text: "Ошибка сети, попробуйте ещё раз", type: "error" });
    } finally {
      setIsApplyingPromo(false);
    }
  };

  // Оплата подтверждается асинхронно (ботом / вебхуком CryptoBot), поэтому
  // после создания платежа мы опрашиваем его статус, а не активируем тариф сразу.
  const pollPaymentStatus = (paymentId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/status?id=${paymentId}`);
        if (!res.ok) return;
        const { payment } = await res.json();

        if (payment.status === "paid") {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setPendingPayment(null);
          setShowSuccessModal(true);
          refresh();
        } else if (payment.status === "rejected") {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setPendingPayment(null);
          setPromoMessage({ text: "Оплата отклонена администратором.", type: "error" });
        }
      } catch {
        // сеть моргнула — просто попробуем на следующем тике
      }
    }, 4000);
  };

  const handleActivatePlan = async (tierToActivate: "pro") => {
    setIsProcessing(true);
    setPromoMessage(null);
    try {
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
      if (!res.ok) {
        // ВРЕМЕННАЯ ДИАГНОСТИКА: показываем debug-объект прямо в UI, чтобы
        // можно было прочитать причину ошибки на телефоне, без DevTools.
        // Уберите строку с JSON.stringify(data.debug) после того, как
        // разберётесь с причиной — не стоит показывать это в проде.
        const debugText = data.debug ? `\n\nDEBUG: ${JSON.stringify(data.debug)}` : "";
        setPromoMessage({ text: (data.error || "Не удалось создать платёж") + debugText, type: "error" });
        return;
      }

      if (paymentMethod === "crypto" && data.payUrl) {
        window.open(data.payUrl, "_blank");
      }

      setPendingPayment({
        id: data.paymentId,
        method: paymentMethod,
        requisites: data.requisites,
        amount: data.amount,
      });
      pollPaymentStatus(data.paymentId);
    } catch (error) {
      console.error("Subscription activation failed:", error);
      setPromoMessage({ text: "Ошибка сети, попробуйте ещё раз", type: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  const copyRequisites = () => {
    if (pendingPayment?.requisites) {
      navigator.clipboard.writeText(pendingPayment.requisites).catch(() => {});
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
        <span className="badge-violet text-xs font-bold py-1 px-3 rounded-xl">Биржа 1337</span>
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
              Ваша подписка Pro активна!
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
                    <span className="badge-violet text-[9px] font-bold py-0.2 px-1.5 rounded-md">5 ДНЕЙ</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Полный доступ ко всем заказам и откликам</p>
                </div>
              </div>
            </div>

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
              <h2 className="text-lg font-extrabold text-slate-900">Пробный 5-дневный период завершён</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Чтобы продолжать отвечать на заказы, публиковать проекты и общаться с заказчиками, продлите подписку.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Pending payment banner */}
      <AnimatePresence>
        {pendingPayment && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-3xl p-4 space-y-3"
          >
            <div className="flex items-center gap-2 text-amber-800 font-extrabold text-xs">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Ожидаем подтверждения оплаты...</span>
            </div>

            {pendingPayment.method === "bank" && (
              <div className="space-y-2">
                <div className="bg-white rounded-2xl p-3 border border-amber-200/80 text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed">
                  {pendingPayment.requisites}
                </div>
                <button
                  onClick={copyRequisites}
                  className="text-[11px] font-bold text-amber-800 flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Скопировать реквизиты</span>
                </button>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Переведите {pendingPayment.amount?.toLocaleString("ru-RU")} ₽ и отправьте скриншот чека{" "}
                  <b>в чат с ботом 1337 в Telegram</b>. Администратор подтвердит оплату вручную, это может занять некоторое время.
                </p>
              </div>
            )}

            {pendingPayment.method === "stars" && (
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Счёт на оплату Stars отправлен в чат с ботом — откройте Telegram, чтобы завершить оплату.
              </p>
            )}

            {pendingPayment.method === "crypto" && (
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Окно оплаты CryptoBot открыто в новой вкладке. После оплаты подписка активируется автоматически.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Billing Switcher (Month / Year) */}
      <div className="bg-slate-200/70 p-1 rounded-2xl flex items-center max-w-xs mx-auto">
        <button
          onClick={() => setBillingPeriod("month")}
          className={`flex-1 text-xs font-bold py-2 rounded-xl transition-all cursor-pointer ${
            billingPeriod === "month" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Ежемесячно
        </button>
        <button
          onClick={() => setBillingPeriod("year")}
          className={`flex-1 text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
            billingPeriod === "year" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>На год</span>
          <span className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 py-0.2 rounded-md">-20%</span>
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
              className={`bg-white rounded-3xl p-5 space-y-4 border transition-all relative overflow-hidden ${
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
                      <span className="badge-violet text-[9px] font-bold py-0.2 px-1.5 rounded-md">{plan.badge}</span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl font-extrabold text-violet-700">{price.toLocaleString("ru-RU")} ₽</span>
                    <span className="text-xs text-slate-400 font-medium">/ месяц</span>
                    <span className="text-xs text-slate-400 font-medium">(⭐ {plan.stars})</span>
                  </div>
                </div>
              </div>

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

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleActivatePlan(plan.id);
                }}
                disabled={isProcessing || !!pendingPayment}
                className={`w-full py-3 px-4 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                  isSelected ? "btn-primary shadow-md shadow-violet-500/20" : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                }`}
              >
                {isProcessing && selectedTier === plan.id ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Создаём счёт...</span>
                  </span>
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
            onClick={() => setPaymentMethod("bank")}
            className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
              paymentMethod === "bank"
                ? "border-violet-600 bg-purple-50/70 text-violet-700 font-extrabold shadow-2xs"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 font-medium"
            }`}
          >
            <div className="text-xs font-extrabold flex items-center justify-center gap-1">
              <Landmark className="w-3.5 h-3.5" />
              <span>По реквизитам</span>
            </div>
            <div className="text-[10px] text-slate-400">Проверка вручную</div>
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
            <div className="text-[10px] text-slate-400">USDT</div>
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
            className="flex-1 input-violet text-xs font-mono uppercase px-3 py-2.5 rounded-2xl"
          />
          <button
            type="button"
            onClick={handleApplyPromo}
            disabled={isApplyingPromo}
            className="btn-outline text-xs px-4 py-2.5 rounded-2xl font-extrabold cursor-pointer disabled:opacity-50"
          >
            {isApplyingPromo ? <Loader2 className="w-4 h-4 animate-spin" /> : "Применить"}
          </button>
        </div>

        {promoMessage && (
          <p
            className={`text-xs font-medium px-1 flex items-start gap-1.5 whitespace-pre-wrap break-words ${
              promoMessage.type === "success" ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {promoMessage.type === "success" ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            )}
            <span>{promoMessage.text}</span>
          </p>
        )}
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Промокоды проверяются и применяются на сервере — управлять ими можно только напрямую через таблицу
          <code className="mx-1 bg-slate-100 px-1 rounded">promo_codes</code> в Supabase.
        </p>
      </div>

      {/* Security note replacing the old client-side test panel */}
      <div className="bg-slate-100/80 rounded-2xl p-3 border border-slate-200/80 flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-600 leading-relaxed">
          Пробный период и статус подписки теперь считаются на сервере (таблица <code>users</code>), а не в браузере —
          их больше нельзя изменить через localStorage.
        </p>
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
                <h3 className="text-lg font-extrabold text-slate-900">Подписка успешно активирована!</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Все возможности тарифа Pro теперь доступны. Удачной работы на бирже 1337!
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
