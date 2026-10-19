// lib/auth.ts — серверные хелперы авторизации (только для route handlers)
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TRIAL_DURATION_DAYS } from "@/lib/constants";

export interface UserRow {
  id: string;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  role: "client" | "executor" | null;
  subscription_tier: "free" | "pro" | "ai_pro";
  subscription_expires_at: string | null;
  trial_started_at: string | null;
}

export const ADMIN_IDS: number[] = (process.env.ADMIN_TELEGRAM_ID || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map(Number)
  .filter((n) => !Number.isNaN(n));

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getCurrentUser(): Promise<UserRow | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await createAdminClient()
      .from("users")
      .select("id, telegram_id, username, first_name, role, subscription_tier, subscription_expires_at, trial_started_at")
      .eq("id", user.id)
      .maybeSingle();

    return (data as UserRow) || null;
  } catch {
    return null;
  }
}

export function isAdminUser(user: UserRow | null): boolean {
  return !!user && ADMIN_IDS.includes(Number(user.telegram_id));
}

// Доступ = оплаченная подписка, либо идёт пробный период, либо админ.
export function userHasAccess(user: UserRow): boolean {
  if (isAdminUser(user)) return true;
  const now = Date.now();
  if (user.subscription_tier !== "free" && user.subscription_expires_at && new Date(user.subscription_expires_at).getTime() > now) {
    return true;
  }
  const trialStart = user.trial_started_at ? new Date(user.trial_started_at).getTime() : 0;
  return trialStart + TRIAL_DURATION_DAYS * 86400000 > now;
}

export function unauthorized() {
  return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
}

export function forbidden(message = "Нет доступа") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function paywall() {
  return NextResponse.json({ error: "Пробный период закончился — оформите подписку Pro" }, { status: 402 });
}

export function cleanStr(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function toInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

export function escapeHtml(text: string): string {
  return (text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
