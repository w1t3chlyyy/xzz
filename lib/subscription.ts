// lib/subscription.ts
"use client";

// ВАЖНО: этот файл раньше содержал activateLocalSubscription() /
// resetLocalTrial() / expireLocalTrialNow() — функции, которые писали
// "pro"/"ai_pro" прямо в localStorage без какой-либо оплаты. Именно из-за
// них подписка выдавалась "просто так". Источник истины теперь — колонки
// users.subscription_tier / users.subscription_expires_at / users.trial_started_at
// в базе, которые может менять только сервер (см. lib/useSubscription.ts).
// Здесь остаётся только чистая математика времени, без побочных эффектов.

export const TRIAL_DURATION_DAYS = 5;
export const TRIAL_DURATION_MS = TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;

export interface SubscriptionTimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
  formatted: string;
}

export interface SubscriptionStatus {
  tier: "free" | "pro" | "ai_pro";
  isTrialActive: boolean;
  isPaid: boolean;
  hasAccess: boolean;
  trialStartedAt: number;
  trialExpiresAt: number;
  paidExpiresAt: number | null;
  timeLeft: SubscriptionTimeLeft;
}

export function calculateTimeLeft(targetTimestamp: number): SubscriptionTimeLeft {
  const now = Date.now();
  const diffMs = targetTimestamp - now;

  if (diffMs <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalSeconds: 0,
      isExpired: true,
      formatted: "0д 00:00:00",
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, "0");
  const formatted =
    days > 0 ? `${days} дн ${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return { days, hours, minutes, seconds, totalSeconds, isExpired: false, formatted };
}
