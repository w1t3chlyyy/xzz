// lib/payments.ts — подтверждение/отклонение платежей (используют бот-вебхук и админ-API)
import { createAdminClient } from "@/lib/supabase/admin";
import { telegram } from "@/lib/telegram/bot-api";

type AdminClient = ReturnType<typeof createAdminClient>;

const TIER_LABEL: Record<string, string> = { pro: "Pro" };

export async function confirmPayment(supabase: AdminClient, paymentId: string, adminId?: number): Promise<boolean> {
  const { data: payment } = await supabase.from("payments").select("*").eq("id", paymentId).single();
  if (!payment || payment.status === "paid") return false;

  const { data: userRow } = await supabase
    .from("users")
    .select("subscription_tier, subscription_expires_at, telegram_id")
    .eq("id", payment.user_id)
    .single();

  const now = Date.now();
  const currentExpiry = userRow?.subscription_expires_at ? new Date(userRow.subscription_expires_at).getTime() : 0;
  const sameTierStillActive = currentExpiry > now && userRow?.subscription_tier === payment.tier;
  const base = sameTierStillActive ? currentExpiry : now;
  const newExpiry = new Date(base + (payment.duration_days || 30) * 86400000).toISOString();

  await supabase
    .from("payments")
    .update({ status: "paid", paid_at: new Date().toISOString(), reviewed_by: adminId ?? null, reviewed_at: new Date().toISOString() })
    .eq("id", paymentId);

  await supabase
    .from("users")
    .update({ subscription_tier: payment.tier, subscription_expires_at: newExpiry })
    .eq("id", payment.user_id);

  if (userRow?.telegram_id) {
    await telegram.sendMessage(
      userRow.telegram_id,
      `✅ Оплата подтверждена! Тариф <b>${TIER_LABEL[payment.tier] || payment.tier}</b> активирован.`
    );
  }
  return true;
}

export async function rejectPayment(supabase: AdminClient, paymentId: string, adminId?: number): Promise<boolean> {
  const { data: payment } = await supabase.from("payments").select("*").eq("id", paymentId).single();
  if (!payment || payment.status === "paid") return false;

  await supabase
    .from("payments")
    .update({ status: "rejected", reviewed_by: adminId ?? null, reviewed_at: new Date().toISOString() })
    .eq("id", paymentId);

  const { data: userRow } = await supabase.from("users").select("telegram_id").eq("id", payment.user_id).single();
  if (userRow?.telegram_id) {
    await telegram.sendMessage(userRow.telegram_id, "❌ Оплата не подтверждена. Если это ошибка — напишите в поддержку.");
  }
  return true;
}
