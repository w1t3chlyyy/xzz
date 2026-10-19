// Чистая математика времени. Источник истины по подписке — сервер (таблица users).
import { TRIAL_DURATION_DAYS } from "./constants";

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

export function calculateTimeLeft(targetTimestamp: number, now: number = Date.now()): SubscriptionTimeLeft {
  const diffMs = targetTimestamp - now;

  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isExpired: true, formatted: "0д 00:00:00" };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, "0");
  const clock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return { days, hours, minutes, seconds, totalSeconds, isExpired: false, formatted: days > 0 ? `${days} дн ${clock}` : clock };
}
