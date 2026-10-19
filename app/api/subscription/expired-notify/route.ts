// app/api/subscription/expired-notify/route.ts
import { NextResponse } from "next/server";
import { telegram } from "@/lib/telegram/bot-api";
import { escapeHtml, getCurrentUser, unauthorized, userHasAccess } from "@/lib/auth";
import { SUPPORT_URL } from "@/lib/constants";

export async function POST() {
  // Раньше любой мог передать произвольный telegramId и слать сообщения от имени бота.
  // Теперь адресат — только текущий авторизованный пользователь, и только если доступ реально закончился.
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  if (userHasAccess(me)) return NextResponse.json({ ok: true, skipped: true });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const text =
    `⌛️ <b>Здравствуйте, ${escapeHtml(me.first_name || "пользователь")}!</b>\n\n` +
    `Пробный период на бирже <b>1337</b> завершился.\n` +
    `Чтобы продолжить откликаться на заказы и общаться в чатах, оформите подписку <b>Pro</b>.`;

  await telegram.sendMessage(me.telegram_id, text, {
    reply_markup: {
      inline_keyboard: [
        [
          siteUrl.startsWith("https://")
            ? { text: "💳 Оформить подписку Pro", web_app: { url: `${siteUrl}/subscribe` } }
            : { text: "💬 Поддержка", url: SUPPORT_URL },
        ],
      ],
    },
  });

  return NextResponse.json({ ok: true });
}
