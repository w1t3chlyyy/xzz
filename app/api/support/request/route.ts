// app/api/support/request/route.ts
import { NextRequest, NextResponse } from "next/server";
import { telegram } from "@/lib/telegram/bot-api";
import { ADMIN_IDS, cleanStr, escapeHtml, getCurrentUser, unauthorized } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const chatId = cleanStr(body.chatId, 64);
  const problem = cleanStr(body.problemText, 500);

  // Данные пользователя берём из базы, а не из тела запроса — их нельзя подделать.
  const text =
    `🚨 <b>Обращение в поддержку 1337</b>\n\n` +
    `👤 ${escapeHtml(me.first_name || "Пользователь")}${me.username ? ` (@${escapeHtml(me.username)})` : ""} · TG ID <code>${me.telegram_id}</code>\n` +
    (chatId ? `💬 Чат: <code>${escapeHtml(chatId)}</code>\n` : "") +
    (problem ? `📝 <i>${escapeHtml(problem)}</i>` : "");

  await Promise.all(ADMIN_IDS.map((id) => telegram.sendMessage(id, text).catch(() => {})));
  return NextResponse.json({ ok: true });
}
