// lib/useSubscription.ts
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { calculateTimeLeft, TRIAL_DURATION_MS, SubscriptionStatus } from "./subscription";
import { getTelegramUser } from "./telegram/webapp";

const TRIAL_STORAGE_KEY = "1337_trial_started_at";
const EXPIRED_NOTIFIED_KEY = "1337_expired_notified";

function getLocalTrialStart(): number {
  if (typeof window === "undefined") return Date.now();
  try {
    const saved = localStorage.getItem(TRIAL_STORAGE_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    const now = Date.now();
    localStorage.setItem(TRIAL_STORAGE_KEY, String(now));
    return now;
  } catch {
    return Date.now();
  }
}

function defaultStatus(): SubscriptionStatus {
  const trialStartedAt = getLocalTrialStart();
  const trialExpiresAt = trialStartedAt + TRIAL_DURATION_MS;
  const now = Date.now();
  const isTrialActive = now < trialExpiresAt;

  return {
    tier: "free",
    isTrialActive,
    isPaid: false,
    hasAccess: isTrialActive,
    trialStartedAt,
    trialExpiresAt,
    paidExpiresAt: null,
    timeLeft: calculateTimeLeft(trialExpiresAt),
  };
}

export function useSubscription(): SubscriptionStatus & { refresh: () => void } {
  const [status, setStatus] = useState<SubscriptionStatus>(defaultStatus);
  const supabaseRef = useRef(createClient());
  const notifiedRef = useRef(false);

  const refresh = useCallback(async () => {
    const supabase = supabaseRef.current;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const localStart = getLocalTrialStart();
      let trialStartedAt = localStart;
      let paidExpiresAt: number | null = null;
      let tier: "free" | "pro" | "ai_pro" = "free";

      if (user) {
        const { data } = await supabase
          .from("users")
          .select("subscription_tier, subscription_expires_at, trial_started_at")
          .eq("id", user.id)
          .single();

        if (data?.trial_started_at) {
          trialStartedAt = new Date(data.trial_started_at).getTime();
        }
        if (data?.subscription_expires_at) {
          paidExpiresAt = new Date(data.subscription_expires_at).getTime();
        }
        if (data?.subscription_tier) {
          tier = data.subscription_tier as any;
        }
      }

      const now = Date.now();
      const isPaid = (tier === "pro" || tier === "ai_pro") && (!paidExpiresAt || paidExpiresAt > now);
      const trialExpiresAt = trialStartedAt + TRIAL_DURATION_MS;
      const isTrialActive = now < trialExpiresAt;
      const hasAccess = isPaid || isTrialActive;

      const targetTimestamp = isPaid && paidExpiresAt ? paidExpiresAt : trialExpiresAt;

      // If access has just expired, notify the user via Telegram bot once
      if (!hasAccess && !notifiedRef.current && typeof window !== "undefined") {
        const alreadyNotified = localStorage.getItem(EXPIRED_NOTIFIED_KEY);
        if (!alreadyNotified) {
          const tg = getTelegramUser();
          if (tg && tg.id) {
            notifiedRef.current = true;
            localStorage.setItem(EXPIRED_NOTIFIED_KEY, "true");
            fetch("/api/subscription/expired-notify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                telegramId: tg.id,
                userName: tg.displayName,
              }),
            }).catch(() => {});
          }
        }
      }

      setStatus({
        tier: isPaid ? tier : "free",
        isTrialActive,
        isPaid,
        hasAccess,
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

    const tick = setInterval(() => {
      setStatus((prev) => ({
        ...prev,
        timeLeft: calculateTimeLeft(prev.isPaid && prev.paidExpiresAt ? prev.paidExpiresAt : prev.trialExpiresAt),
      }));
    }, 1000);

    const resync = setInterval(refresh, 20000);
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
