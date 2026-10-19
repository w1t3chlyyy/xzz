// lib/useSubscription.ts
"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { calculateTimeLeft, TRIAL_DURATION_MS, SubscriptionStatus } from "./subscription";

// Данные приходят из AppProvider (один запрос на всё приложение), здесь только расчёт.
// tick:false — не перерисовывать каждую секунду (нужно только для обратного отсчёта).
export function useSubscription(opts?: { tick?: boolean }): SubscriptionStatus & { refresh: () => void } {
  const { user, isAdmin, clockOffset, refresh } = useApp();
  const tick = opts?.tick !== false;
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!tick) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [tick]);

  const now = Date.now() + clockOffset;
  const trialStartedAt = user?.trial_started_at ? new Date(user.trial_started_at).getTime() : now;
  const paidExpiresAt = user?.subscription_expires_at ? new Date(user.subscription_expires_at).getTime() : null;
  const tier = user?.subscription_tier || "free";

  const isPaid = (tier === "pro" || tier === "ai_pro") && !!paidExpiresAt && paidExpiresAt > now;
  const trialExpiresAt = trialStartedAt + TRIAL_DURATION_MS;
  const isTrialActive = now < trialExpiresAt;
  const target = isPaid && paidExpiresAt ? paidExpiresAt : trialExpiresAt;

  return {
    tier: isPaid ? tier : "free",
    isTrialActive,
    isPaid,
    hasAccess: isPaid || isTrialActive || isAdmin,
    trialStartedAt,
    trialExpiresAt,
    paidExpiresAt,
    timeLeft: calculateTimeLeft(target, now),
    refresh: () => {
      void refresh();
    },
  };
}
