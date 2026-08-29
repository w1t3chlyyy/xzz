"use client";

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
  const formatted = days > 0 
    ? `${days} дн ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return {
    days,
    hours,
    minutes,
    seconds,
    totalSeconds,
    isExpired: false,
    formatted,
  };
}

export function getLocalSubscriptionStatus(): SubscriptionStatus {
  if (typeof window === "undefined") {
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

  // 1. Check or initialize trial start time
  let trialStartStr = localStorage.getItem("1337_trial_start");
  let trialExpiresStr = localStorage.getItem("1337_trial_expires");
  const now = Date.now();

  if (!trialStartStr || !trialExpiresStr) {
    const start = now;
    const expires = start + TRIAL_DURATION_MS;
    localStorage.setItem("1337_trial_start", String(start));
    localStorage.setItem("1337_trial_expires", String(expires));
    trialStartStr = String(start);
    trialExpiresStr = String(expires);
  }

  const trialStartedAt = Number(trialStartStr) || now;
  const trialExpiresAt = Number(trialExpiresStr) || (now + TRIAL_DURATION_MS);

  // 2. Check paid subscription status
  const savedTier = (localStorage.getItem("1337_subscription_tier") || "free") as "free" | "pro" | "ai_pro";
  const paidExpiresStr = localStorage.getItem("1337_subscription_expires");
  const paidExpiresAt = paidExpiresStr ? Number(paidExpiresStr) : null;

  const isPaid = (savedTier === "pro" || savedTier === "ai_pro") && (!paidExpiresAt || paidExpiresAt > now);
  const isTrialActive = now < trialExpiresAt;
  const hasAccess = isPaid || isTrialActive;

  const targetTimerTimestamp = isPaid && paidExpiresAt ? paidExpiresAt : trialExpiresAt;
  const timeLeft = calculateTimeLeft(targetTimerTimestamp);

  return {
    tier: isPaid ? savedTier : "free",
    isTrialActive,
    isPaid,
    hasAccess,
    trialStartedAt,
    trialExpiresAt,
    paidExpiresAt,
    timeLeft,
  };
}

export function activateLocalSubscription(tier: "pro" | "ai_pro", days: number = 30) {
  if (typeof window === "undefined") return;
  const expiresAt = Date.now() + days * 24 * 60 * 60 * 1000;
  localStorage.setItem("1337_subscription_tier", tier);
  localStorage.setItem("1337_subscription_expires", String(expiresAt));
  window.dispatchEvent(new Event("subscription_updated"));
}

export function resetLocalTrial(days: number = 5) {
  if (typeof window === "undefined") return;
  const start = Date.now();
  const expires = start + days * 24 * 60 * 60 * 1000;
  localStorage.setItem("1337_trial_start", String(start));
  localStorage.setItem("1337_trial_expires", String(expires));
  localStorage.removeItem("1337_subscription_tier");
  localStorage.removeItem("1337_subscription_expires");
  window.dispatchEvent(new Event("subscription_updated"));
}

export function expireLocalTrialNow() {
  if (typeof window === "undefined") return;
  const past = Date.now() - 10000;
  localStorage.setItem("1337_trial_start", String(past - TRIAL_DURATION_MS));
  localStorage.setItem("1337_trial_expires", String(past));
  localStorage.removeItem("1337_subscription_tier");
  localStorage.removeItem("1337_subscription_expires");
  window.dispatchEvent(new Event("subscription_updated"));
}
