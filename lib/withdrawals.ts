// lib/withdrawals.ts — общая логика решения по заявке (используют админ-API и кнопки в боте)
import { createAdminClient } from "@/lib/supabase/admin";
import { telegram } from "@/lib/telegram/bot-api";

export async function resolveWithdrawal(
  admin: ReturnType<typeof createAdminClient>,
  id: string,
  paid: boolean,
  adminTelegramId: number
): Promise<{ ok: boolean; reason?: string; amount?: number }> {
  const { data, error } = await admin.rpc("resolve_withdrawal", { p_id: id, p_paid: paid, p_admin: adminTelegramId });
  if (error) return { ok: false, reason: "error" };
  if (!data) return { ok: false, reason: "already_processed" };

  const { data: user } = await admin.from("users").select("telegram_id").eq("id", data.user_id).maybeSingle();
  if (user?.telegram_id) {
    const amount = Number(data.amount).toLocaleString("ru-RU");
    await telegram
      .sendMessage(
        user.telegram_id,
        paid
          ? `✅ Выплата <b>${amount} ₽</b> отправлена на ваши реквизиты.`
          : `❌ Заявка на вывод <b>${amount} ₽</b> отклонена, сумма возвращена на баланс. Если это ошибка — напишите в поддержку.`
      )
      .catch(() => {});
  }
  return { ok: true, amount: data.amount };
}
