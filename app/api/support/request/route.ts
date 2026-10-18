// app/api/support/request/route.ts
import { NextRequest, NextResponse } from "next/server";
import { telegram } from "@/lib/telegram/bot-api";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chatId, userName, orderTitle, userTelegramId, problemText } = body;

    const adminIds = (process.env.ADMIN_TELEGRAM_ID || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    const text =
      `🚨 <b>Вызов поддержки в бирже 1337!</b>\n\n` +
      `👤 Пользователь: <b>${userName || "Пользователь"}</b> ${userTelegramId ? `(TG ID: <code>${userTelegramId}</code>)` : ""}\n` +
      `💬 Чат ID: <code>${chatId || "Не указан"}</code>\n` +
      `📋 Задача: <b>«${orderTitle || "Консультация"}»</b>\n` +
      (problemText ? `💬 Сообщение: <i>«${problemText}»</i>\n\n` : `\n`) +
      `👉 Войдите в Mini App под аккаунтом администратора/агента поддержки, чтобы ответить пользователю.`;

    // Send alert to admin(s)
    for (const adminId of adminIds) {
      try {
        await telegram.sendMessage(adminId, text);
      } catch (err) {
        console.warn(`Could not send support alert to admin ${adminId}:`, err);
      }
    }

    // Try to record support ticket in Supabase settings/tickets if possible
    try {
      const supabase = createAdminClient();
      await supabase.from("support_tickets").insert({
        chat_id: chatId,
        user_name: userName,
        order_title: orderTitle,
        telegram_id: userTelegramId || null,
        status: "open",
        created_at: new Date().toISOString(),
      });
    } catch {
      // Table may not exist yet, ignored
    }

    return NextResponse.json({ ok: true, message: "Support notified" });
  } catch (error) {
    console.error("Support request error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
