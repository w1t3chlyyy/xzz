// app/api/chats/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { telegram } from "@/lib/telegram/bot-api";
import { cleanStr, escapeHtml, getCurrentUser, paywall, toInt, unauthorized, userHasAccess, UUID_RE, UserRow } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> | { id: string } };
const ISO_RE = /^\d{4}-\d{2}-\d{2}T[\d:.+\-Z]+$/;

async function loadChat(admin: ReturnType<typeof createAdminClient>, id: string, me: UserRow) {
  if (!UUID_RE.test(id)) return null;
  const { data: chat } = await admin.from("chats").select("*").eq("id", id).maybeSingle();
  if (!chat || (chat.user1_id !== me.id && chat.user2_id !== me.id)) return null;
  return chat;
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const { id } = await Promise.resolve(ctx.params);
  const admin = createAdminClient();

  const chat = await loadChat(admin, id, me);
  if (!chat) return NextResponse.json({ error: "Чат не найден" }, { status: 404 });

  const after = new URL(req.url).searchParams.get("after");
  let messages: any[] = [];

  if (after && ISO_RE.test(after)) {
    const { data } = await admin
      .from("messages")
      .select("id, sender_id, type, text, deal, created_at")
      .eq("chat_id", id)
      .gt("created_at", after)
      .order("created_at", { ascending: true })
      .limit(200);
    messages = data || [];
  } else {
    const { data } = await admin
      .from("messages")
      .select("id, sender_id, type, text, deal, created_at")
      .eq("chat_id", id)
      .order("created_at", { ascending: false })
      .limit(200);
    messages = (data || []).reverse();
  }

  const myUnread = chat.user1_id === me.id ? chat.unread1 : chat.unread2;
  if (myUnread > 0) {
    await admin.from("chats").update(chat.user1_id === me.id ? { unread1: 0 } : { unread2: 0 }).eq("id", id);
  }

  let meta: any = undefined;
  if (!after) {
    const otherId = chat.user1_id === me.id ? chat.user2_id : chat.user1_id;
    const [{ data: other }, orderRes] = await Promise.all([
      admin.from("users").select("id, first_name, avatar_url, role").eq("id", otherId).maybeSingle(),
      chat.order_id ? admin.from("orders").select("id, title").eq("id", chat.order_id).maybeSingle() : Promise.resolve({ data: null as any }),
    ]);
    meta = {
      id: chat.id,
      order_id: chat.order_id,
      order_title: orderRes.data?.title || null,
      other: { id: otherId, first_name: other?.first_name || "Пользователь", avatar_url: other?.avatar_url || null, role: other?.role || null },
    };
  }

  return NextResponse.json({ chat: meta, messages, me: me.id });
}

async function notifyOther(chat: any, me: UserRow, previewText: string) {
  const otherId = chat.user1_id === me.id ? chat.user2_id : chat.user1_id;
  const otherUnreadBefore = chat.user1_id === me.id ? chat.unread2 : chat.unread1;
  if (otherUnreadBefore > 0) return; // уведомляем только о первом непрочитанном — без спама

  const { data: other } = await createAdminClient().from("users").select("telegram_id").eq("id", otherId).maybeSingle();
  if (!other?.telegram_id) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const text = `💬 <b>${escapeHtml(me.first_name || "Собеседник")}</b> написал вам в чате 1337:\n<i>${escapeHtml(previewText.slice(0, 200))}</i>`;
  await telegram
    .sendMessage(other.telegram_id, text, {
      reply_markup: siteUrl.startsWith("https://")
        ? { inline_keyboard: [[{ text: "Открыть чат", web_app: { url: `${siteUrl}/chats?chatId=${chat.id}` } }]] }
        : undefined,
    })
    .catch(() => {});
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  if (!userHasAccess(me)) return paywall();

  const { id } = await Promise.resolve(ctx.params);
  const admin = createAdminClient();
  const chat = await loadChat(admin, id, me);
  if (!chat) return NextResponse.json({ error: "Чат не найден" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });

  const otherId = chat.user1_id === me.id ? chat.user2_id : chat.user1_id;

  // ---- обычное сообщение ----
  if (body.action === "send") {
    const text = cleanStr(body.text, 2000);
    if (!text) return NextResponse.json({ error: "Пустое сообщение" }, { status: 400 });

    const { data: message, error } = await admin
      .from("messages")
      .insert({ chat_id: id, sender_id: me.id, type: "text", text })
      .select("id, sender_id, type, text, deal, created_at")
      .single();
    if (error || !message) return NextResponse.json({ error: "Не удалось отправить" }, { status: 500 });

    await admin.rpc("chat_bump", { p_chat: id, p_sender: me.id, p_preview: text.slice(0, 120) });
    await notifyOther(chat, me, text);
    return NextResponse.json({ message });
  }

  // ---- предложение сделки ----
  if (body.action === "deal_propose") {
    const title = cleanStr(body.title, 120);
    const amount = toInt(body.amount);
    const days = toInt(body.days) || 1;
    const description = cleanStr(body.description, 1000);
    if (!title || !amount || amount < 1 || amount > 10000000) {
      return NextResponse.json({ error: "Укажите название и сумму сделки" }, { status: 400 });
    }

    // кто в этой сделке заказчик
    let clientId: string;
    if (chat.order_id) {
      const { data: order } = await admin.from("orders").select("client_id").eq("id", chat.order_id).maybeSingle();
      clientId = order?.client_id || me.id;
    } else {
      const { data: other } = await admin.from("users").select("role").eq("id", otherId).maybeSingle();
      clientId = me.role === "client" ? me.id : other?.role === "client" ? otherId : me.id;
    }

    const deal = { title, amount, days: Math.min(days, 365), description, status: "pending", proposer_id: me.id, client_id: clientId };
    const { data: message, error } = await admin
      .from("messages")
      .insert({ chat_id: id, sender_id: me.id, type: "deal", deal })
      .select("id, sender_id, type, text, deal, created_at")
      .single();
    if (error || !message) return NextResponse.json({ error: "Не удалось отправить предложение" }, { status: 500 });

    const preview = `💼 Предложение сделки: ${amount.toLocaleString("ru-RU")} ₽`;
    await admin.rpc("chat_bump", { p_chat: id, p_sender: me.id, p_preview: preview });
    await notifyOther(chat, me, preview);
    return NextResponse.json({ message });
  }

  // ---- решение по сделке ----
  if (body.action === "deal_decision") {
    const messageId = body.message_id;
    const decision = body.decision;
    if (!UUID_RE.test(messageId || "") || !["accept", "reject", "complete"].includes(decision)) {
      return NextResponse.json({ error: "Неверный запрос" }, { status: 400 });
    }

    const { data: msg } = await admin.from("messages").select("id, type, deal").eq("id", messageId).eq("chat_id", id).maybeSingle();
    if (!msg || msg.type !== "deal" || !msg.deal) return NextResponse.json({ error: "Сделка не найдена" }, { status: 404 });

    const deal = msg.deal as any;
    let nextStatus: string;
    let systemText: string;

    if (deal.status === "pending" && (decision === "accept" || decision === "reject")) {
      if (deal.proposer_id === me.id) return NextResponse.json({ error: "Свою сделку подтверждает собеседник" }, { status: 403 });
      nextStatus = decision === "accept" ? "accepted" : "rejected";
      systemText = decision === "accept" ? `✅ Условия сделки «${deal.title}» приняты. Можно приступать к работе.` : `❌ Условия сделки «${deal.title}» отклонены. Обсудите правки в чате.`;
    } else if (deal.status === "accepted" && decision === "complete") {
      if (deal.client_id !== me.id) return NextResponse.json({ error: "Завершить сделку может заказчик" }, { status: 403 });
      nextStatus = "completed";
      systemText = `🏁 Заказчик подтвердил выполнение сделки «${deal.title}».`;
    } else {
      return NextResponse.json({ error: "Это действие сейчас недоступно" }, { status: 409 });
    }

    const updatedDeal = { ...deal, status: nextStatus };
    await admin.from("messages").update({ deal: updatedDeal }).eq("id", messageId);
    const { data: system } = await admin
      .from("messages")
      .insert({ chat_id: id, sender_id: null, type: "system", text: systemText })
      .select("id, sender_id, type, text, deal, created_at")
      .single();

    await admin.rpc("chat_bump", { p_chat: id, p_sender: me.id, p_preview: systemText.slice(0, 120) });
    await notifyOther(chat, me, systemText);
    return NextResponse.json({ deal: updatedDeal, message_id: messageId, system });
  }

  return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
}
