// app/api/subscription/expired-notify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { telegram } from "@/lib/telegram/bot-api";

export async function POST(req: NextRequest) {
  try {
    const { telegramId, userName } = await req.json();

    if (!telegramId) {
      return NextResponse.json({ ok: false, error: "telegramId required" }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

    const message =
      `⌛️ <b>Здравствуйте, ${userName || "пользователь"}!</b>\n\n` +
      `Срок действия вашего 5-дневного пробного периода на бирже <b>1337</b> завершился.\n\n` +
      `Чтобы продолжить откликаться на заказы, вести диалоги с заказчиками и заключать безопасные сделки, продлите доступ к тарифу <b>PRO</b>.\n\n` +
      `💳 Стоимость подписки: <b>990 ₽ / месяц</b>\n` +
      `💎 0% комиссии биржи, неограниченные отклики и приоритет в ленте.`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: "💳 Продлить подписку PRO",
            web_app: siteUrl && siteUrl.startsWith("https://") ? { url: `${siteUrl}/subscribe` } : undefined,
            url: !siteUrl || !siteUrl.startsWith("https://") ? "https://t.me/F1337H" : undefined,
          },
        ],
      ],
    };

    const res = await telegram.sendMessage(telegramId, message, {
      reply_markup: keyboard,
    });

    return NextResponse.json({ ok: true, result: res });
  } catch (error) {
    console.error("Expired notification error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
