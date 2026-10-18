// app/(main)/blocked/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Crown,
  ArrowRight,
  Landmark,
  Star,
  CreditCard,
  Loader2,
  Check,
  Headphones,
  Sparkles,
} from "lucide-react";
import { useSubscription } from "@/lib/useSubscription";

export default function BlockedPage() {
  const router = useRouter();
  const sub = useSubscription();
  const [isPaying, setIsPaying] = useState(false);
  const [unlockedSuccess, setUnlockedSuccess] = useState(false);

  const handleSimulatePayment = async () => {
    setIsPaying(true);
    try {
      localStorage.setItem("1337_trial_started_at", String(Date.now()));
      setUnlockedSuccess(true);
      setTimeout(() => {
        sub.refresh();
        router.push("/feed");
      }, 1500);
    } catch {
      setIsPaying(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-2 py-6 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl p-6 border border-purple-200/80 shadow-[0_12px_40px_rgba(124,58,237,0.1)] text-center space-y-5"
      >
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-rose-500 to-purple-600 text-white flex items-center justify-center mx-auto shadow-md shadow-rose-500/20">
          <Lock className="w-10 h-10 stroke-[2.2]" />
        </div>

        <div className="space-y-1.5">
          <span className="badge-violet text-[10px] font-bold py-0.5 px-2.5 rounded-lg uppercase tracking-wider">
            Доступ заблокирован
          </span>
          <h1 className="text-xl font-heading font-light text-slate-900 tracking-tight">
            Срок пробного периода истёк
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed font-medium">
            Срок действия вашего 5-дневного пробного периода завершился. Для продолжения работы на бирже продлите тариф <b>PRO</b>.
          </p>
        </div>

        <div className="p-3.5 bg-purple-50/70 border border-purple-200/70 rounded-2xl flex items-start gap-2.5 text-left text-xs text-purple-900">
          <Sparkles className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed font-medium text-[11.5px]">
            Уведомление с кнопкой продления также отправлено вам в Telegram-бота 1337.
          </p>
        </div>

        <div className="space-y-2.5 pt-1">
          <button
            onClick={handleSimulatePayment}
            disabled={isPaying || unlockedSuccess}
            className="w-full btn-primary py-3.5 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-violet transition-transform active:scale-98"
          >
            {isPaying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Проводим оплату...</span>
              </>
            ) : unlockedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300 stroke-[3]" />
                <span>Оплачено! Переходим...</span>
              </>
            ) : (
              <>
                <Crown className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>Продлить подписку PRO (990 ₽/мес)</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <button
            onClick={() => router.push("/chats?support=true")}
            className="w-full py-2.5 px-4 rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Headphones className="w-3.5 h-3.5 text-violet-600" />
            <span>Связаться с поддержкой</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
