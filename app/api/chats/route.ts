// app/api/chats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, paywall, unauthorized, userHasAccess, UUID_RE } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Список моих диалогов
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return unauthorized();

  const admin = createAdminClient();
  const { data: chats, error } = await admin
    .from("chats")
    .select("id, order_id, user1_id, user2_id, unread1, unread2, last_message_text, last_message_at, order:order_id(title)")
    .or(`user1_id.eq.${me.id},user2_id.eq.${me.id}`)
    .not("last_message_text", "is", null)
    .order("last_message_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("GET /api/chats:", error);
    return NextResponse.json({ error: "Не удалось загрузить чаты" }, { status: 500 });
  }

  const otherIds = Array.from(new Set((chats || []).map((c: any) => (c.user1_id === me.id ? c.user2_id : c.user1_id))));
  const { data: users } = otherIds.length
    ? await admin.from("users").select("id, first_name, avatar_url, role").in("id", otherIds)
    : { data: [] as any[] };
  const byId = new Map<string, any>((users || []).map((u: any) => [u.id, u] as [string, any]));

  return NextResponse.json({
    chats: (chats || []).map((c: any) => {
      const otherId = c.user1_id === me.id ? c.user2_id : c.user1_id;
      const other = byId.get(otherId);
      const order = Array.isArray(c.order) ? c.order[0] : c.order;
      return {
        id: c.id,
        order_id: c.order_id,
        order_title: order?.title || null,
        unread: c.user1_id === me.id ? c.unread1 : c.unread2,
        last_message_text: c.last_message_text,
        last_message_at: c.last_message_at,
        other: { id: otherId, first_name: other?.first_name || "Пользователь", avatar_url: other?.avatar_url || null, role: other?.role || null },
      };
    }),
  });
}

// Открыть (или создать) диалог с пользователем, опционально в контексте заказа
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  if (!userHasAccess(me)) return paywall();

  const body = await req.json().catch(() => null);
  const otherId = body?.other_user_id;
  const orderId = body?.order_id || null;

  if (!otherId || !UUID_RE.test(otherId) || otherId === me.id) {
    return NextResponse.json({ error: "Неверный собеседник" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: other } = await admin.from("users").select("id").eq("id", otherId).maybeSingle();
  if (!other) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });

  if (orderId) {
    if (!UUID_RE.test(orderId)) return NextResponse.json({ error: "Неверный заказ" }, { status: 400 });
    const { data: order } = await admin.from("orders").select("client_id").eq("id", orderId).maybeSingle();
    if (!order || (order.client_id !== me.id && order.client_id !== otherId)) {
      return NextResponse.json({ error: "Заказ не связан с этим диалогом" }, { status: 400 });
    }
  }

  const [u1, u2] = [me.id, otherId].sort();
  const find = async () => {
    let q = admin.from("chats").select("id").eq("user1_id", u1).eq("user2_id", u2);
    q = orderId ? q.eq("order_id", orderId) : q.is("order_id", null);
    const { data } = await q.maybeSingle();
    return data?.id as string | undefined;
  };

  let chatId = await find();
  if (!chatId) {
    const { data, error } = await admin.from("chats").insert({ user1_id: u1, user2_id: u2, order_id: orderId }).select("id").single();
    if (error) {
      chatId = await find(); // гонка двух одновременных открытий
      if (!chatId) return NextResponse.json({ error: "Не удалось открыть чат" }, { status: 500 });
    } else {
      chatId = data.id;
    }
  }

  return NextResponse.json({ chat_id: chatId });
}
