// lib/useSubscription.ts
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { calculateTimeLeft, TRIAL_DURATION_MS, SubscriptionStatus } from "./subscription";

function defaultStatus(): SubscriptionStatus {
  const now = Date.now();
  const trialExpiresAt = now + TRIAL_DURATION_MS;
  return {
    tier: "free",
    isTrialActive: true,
    isPaid: false,
    hasAccess: true,
    trialStartedAt: now,
    trialExpiresAt,
    paidExpiresAt: null,
    timeLeft: calculateTimeLeft(trialExpiresAt),
  };
}

export function useSubscription(): SubscriptionStatus & { refresh: () => void } {
  const [status, setStatus] = useState<SubscriptionStatus>(defaultStatus);
  const supabaseRef = useRef(createClient());

  const refresh = useCallback(async () => {
    const supabase = supabaseRef.current;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setStatus(defaultStatus());
        return;
      }

      // Источник истины — база. trial_started_at выставляется один раз при
      // первой авторизации через Telegram (см. app/api/auth/telegram/route.ts)
      // и не сбрасывается очисткой localStorage.
      const { data } = await supabase
        .from("users")
        .select("subscription_tier, subscription_expires_at, trial_started_at")
        .eq("id", user.id)
        .single();

      const now = Date.now();
      const paidExpiresAt = data?.subscription_expires_at ? new Date(data.subscription_expires_at).getTime() : null;
      const isPaid = !!data && data.subscription_tier !== "free" && (!paidExpiresAt || paidExpiresAt > now);

      const trialStartedAt = data?.trial_started_at ? new Date(data.trial_started_at).getTime() : now;
      const trialExpiresAt = trialStartedAt + TRIAL_DURATION_MS;
      const isTrialActive = now < trialExpiresAt;

      const targetTimestamp = isPaid && paidExpiresAt ? paidExpiresAt : trialExpiresAt;

      setStatus({
        tier: isPaid ? (data!.subscription_tier as "pro" | "ai_pro") : "free",
        isTrialActive,
        isPaid,
        hasAccess: isPaid || isTrialActive,
        trialStartedAt,
        trialExpiresAt,
        paidExpiresAt,
        timeLeft: calculateTimeLeft(targetTimestamp),
      });
    } catch (err) {
      console.warn("Subscription refresh failed:", err);
    }
  }, []);

  useEffect(() => {
    refresh();

    // Тикающий таймер обратного отсчёта — раз в секунду, без запроса к серверу.
    const tick = setInterval(() => {
      setStatus((prev) => ({
        ...prev,
        timeLeft: calculateTimeLeft(prev.isPaid && prev.paidExpiresAt ? prev.paidExpiresAt : prev.trialExpiresAt),
      }));
    }, 1000);

    // Платежи подтверждаются асинхронно ботом/вебхуком CryptoBot, поэтому
    // периодически синхронизируемся с базой, плюс сразу при возврате в приложение.
    const resync = setInterval(refresh, 15000);
    const handleFocus = () => refresh();
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(tick);
      clearInterval(resync);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refresh]);

  return { ...status, refresh };
}
