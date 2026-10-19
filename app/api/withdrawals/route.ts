// app/api/withdrawals/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { telegram } from "@/lib/telegram/bot-api";
import { ADMIN_IDS, cleanStr, escapeHtml, getCurrentUser, toInt, unauthorized } from "@/lib/auth";
import { MIN_WITHDRAWAL } from "@/lib/constants";

export const dynamic = "force-dynamic";

// Баланс и история заявок
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return unauthorized();

  const admin = createAdminClient();
  const [{ data: u }, { data: withdrawals }] = await Promise.all([
    admin.from("users").select("balance").eq("id", me.id).maybeSingle(),
    admin.from("withdrawals").select("id, amount, bank, status, created_at").eq("user_id", me.id).order("created_at", { ascending: false }).limit(20),
  ]);

  return NextResponse.json({ balance: u?.balance || 0, min: MIN_WITHDRAWAL, withdrawals: withdrawals || [] });
}

// Заявка на вывод → админу уходит сообщение с кнопками «Выплачено / Отклонить»
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();

  const body = await req.json().catch(() => null);
  const amount = toInt(body?.amount);
  const bank = cleanStr(body?.bank, 60);
  const details = cleanStr(body?.details, 300);

  if (!amount || amount < MIN_WITHDRAWAL) {
    return NextResponse.json({ error: `Минимальная сумма вывода — ${MIN_WITHDRAWAL} ₽` }, { status: 400 });
  }
  if (!bank) return NextResponse.json({ error: "Укажите банк" }, { status: 400 });
  if (details.length < 6) return NextResponse.json({ error: "Укажите реквизиты (карта, телефон СБП или счёт)" }, { status: 400 });

  const admin = createAdminClient();
  const { data: id, error } = await admin.rpc("request_withdrawal", { p_user: me.id, p_amount: amount, p_bank: bank, p_details: details });

  if (error || !id) {
    const msg = error?.message || "";
    if (msg.includes("insufficient_balance")) return NextResponse.json({ error: "Недостаточно средств на балансе" }, { status: 400 });
    if (msg.includes("min_amount")) return NextResponse.json({ error: `Минимальная сумма вывода — ${MIN_WITHDRAWAL} ₽` }, { status: 400 });
    console.error("request_withdrawal:", error);
    return NextResponse.json({ error: "Не удалось создать заявку" }, { status: 500 });
  }

  const text =
    `💸 <b>Заявка на вывод средств</b>\n\n` +
    `👤 ${escapeHtml(me.first_name || "Исполнитель")}${me.username ? ` (@${escapeHtml(me.username)})` : ""} · TG ID <code>${me.telegram_id}</code>\n` +
    `💰 Сумма: <b>${amount.toLocaleString("ru-RU")} ₽</b>\n` +
    `🏦 Банк: <b>${escapeHtml(bank)}</b>\n` +
    `📋 Реквизиты:\n<code>${escapeHtml(details)}</code>\n\n` +
    `ID заявки: <code>${id}</code>`;

  await Promise.all(
    ADMIN_IDS.map((adminId) =>
      telegram
        .sendMessage(adminId, text, {
          reply_markup: {
            inline_keyboard: [[
              { text: "✅ Выплачено", callback_data: `wd_ok:${id}` },
              { text: "❌ Отклонить", callback_data: `wd_no:${id}` },
            ]],
          },
        })
        .catch(() => {})
    )
  );

  const { data: u } = await admin.from("users").select("balance").eq("id", me.id).maybeSingle();
  return NextResponse.json({ success: true, balance: u?.balance || 0 });
}
