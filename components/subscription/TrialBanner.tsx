"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useSubscription } from "@/lib/useSubscription";
import {
  Clock,
  Crown,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";

export function TrialBanner() {
  const pathname = usePathname();
  const { isTrialActive, isPaid, tier, timeLeft } = useSubscription();

  // Don't show redundant mini-banner if we're already on the dedicated /subscribe page
  if (pathname === "/subscribe") {
    return null;
  }

  // 1. Paid active subscription
  if (isPaid) {
    return (
      <div className="mb-3">
        <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white rounded-2xl p-2.5 px-3.5 flex items-center justify-between shadow-sm border border-violet-400/30">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              {tier === "ai_pro" ? (
                <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
              ) : (
                <Crown className="w-4 h-4 text-amber-300 fill-amber-300" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-extrabold leading-tight">
                <span>{tier === "ai_pro" ? "AI Pro Тариф" : "Pro Тариф"}</span>
                <span className="bg-amber-400/20 text-amber-200 border border-amber-300/40 text-[9px] font-bold px-1.5 py-0.2 rounded-md">
                  Активен
                </span>
              </div>
              <p className="text-[10px] text-violet-100/90 font-medium">
                Осталось: {timeLeft.days > 0 ? `${timeLeft.days} дн.` : `${timeLeft.hours} ч.`}
              </p>
            </div>
          </div>

          <Link
            href="/subscribe"
            className="text-[11px] font-bold bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white px-2.5 py-1 rounded-xl flex items-center gap-1"
          >
            <span>Тариф</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    );
  }

  // 2. Active 5-day Trial
  if (isTrialActive) {
    return (
      <div className="mb-3">
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-2.5 px-3.5 flex items-center justify-between border border-purple-200 shadow-[0_2px_12px_rgba(124,58,237,0.06)] ring-1 ring-purple-100"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200">
              <Zap className="w-4 h-4 text-violet-700 fill-violet-700/20" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900 leading-tight">
                <span>Пробный период: 5 дней</span>
                <span className="badge-violet text-[9px] font-bold py-0.2 px-1.5 rounded-md">
                  Free Trial
                </span>
              </div>
              <p className="text-[11px] text-violet-700 font-bold flex items-center gap-1 mt-0.5 font-mono">
                <Clock className="w-3 h-3 stroke-[2.5]" />
                <span>Осталось {timeLeft.formatted}</span>
              </p>
            </div>
          </div>

          <Link
            href="/subscribe"
            className="text-[11px] font-extrabold btn-primary py-1.5 px-3 rounded-xl flex items-center gap-1 shrink-0 shadow-xs"
          >
            <span>Продлить</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </motion.div>
      </div>
    );
  }

  // 3. Expired Trial (Paywall notification)
  return (
    <div className="mb-3">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-r from-rose-50 via-amber-50 to-purple-50 rounded-2xl p-3 border border-rose-200/90 shadow-sm flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-extrabold text-rose-950 truncate">
              Пробный период 5 дней истёк
            </h4>
            <p className="text-[11px] text-slate-600 font-medium truncate">
              Продлите подписку для продолжения работы
            </p>
          </div>
        </div>

        <Link
          href="/subscribe"
          className="text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white py-1.5 px-3 rounded-xl flex items-center gap-1 shrink-0 shadow-sm animate-pulse"
        >
          <span>Продлить</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </motion.div>
    </div>
  );
}
