// app/api/responses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyClientNewResponse } from "@/lib/telegram/notifications";
import { cleanStr, getCurrentUser, paywall, toInt, unauthorized, userHasAccess, UUID_RE } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Мои отклики (as=executor) или отклики на мои заказы (as=client)
export async function GET(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();

  const as = new URL(req.url).searchParams.get("as") === "executor" ? "executor" : "client";
  const admin = createAdminClient();
  const select =
    "id, order_id, executor_id, message, budget, days, status, created_at, executor:executor_id(id, first_name), order:order_id(title, category, client_id, status)";

  let data: any[] | null = null;

  if (as === "executor") {
    const res = await admin.from("responses").select(select).eq("executor_id", me.id).order("created_at", { ascending: false }).limit(100);
    data = res.data;
  } else {
    const { data: orders } = await admin.from("orders").select("id").eq("client_id", me.id);
    const ids = (orders || []).map((o: any) => o.id);
    if (ids.length) {
      const res = await admin.from("responses").select(select).in("order_id", ids).order("created_at", { ascending: false }).limit(200);
      data = res.data;
    }
  }

  const responses = (data || []).map((r: any) => ({
    ...r,
    executor: Array.isArray(r.executor) ? r.executor[0] : r.executor,
    order: Array.isArray(r.order) ? r.order[0] : r.order,
  }));
  return NextResponse.json({ responses });
}

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  if (!userHasAccess(me)) return paywall();
  if (me.role !== "executor") return NextResponse.json({ error: "Откликаться могут только исполнители" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const orderId = body?.order_id;
  const message = cleanStr(body?.message, 2000);
  const budget = toInt(body?.budget);
  const days = toInt(body?.days);

  if (!orderId || !UUID_RE.test(orderId)) return NextResponse.json({ error: "Неверный заказ" }, { status: 400 });
  if (message.length < 10) return NextResponse.json({ error: "Напишите предложение подробнее (минимум 10 символов)" }, { status: 400 });
  if (!budget || budget < 1) return NextResponse.json({ error: "Укажите вашу цену" }, { status: 400 });

  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("id, client_id, status").eq("id", orderId).maybeSingle();
  if (!order) return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
  if (order.client_id === me.id) return NextResponse.json({ error: "Нельзя откликнуться на свой заказ" }, { status: 400 });
  if (order.status !== "active") return NextResponse.json({ error: "Заказ уже не принимает отклики" }, { status: 409 });

  const { data: response, error } = await admin
    .from("responses")
    .insert({ order_id: orderId, executor_id: me.id, message, budget, days: days || null, status: "pending" })
    .select("id, order_id, executor_id, message, budget, days, status, created_at")
    .single();

  if (error || !response) {
    if ((error as any)?.code === "23505") return NextResponse.json({ error: "Вы уже откликались на этот заказ" }, { status: 409 });
    console.error("POST /api/responses:", error);
    return NextResponse.json({ error: "Не удалось отправить отклик" }, { status: 500 });
  }

  try {
    await notifyClientNewResponse(admin, {
      responseId: response.id,
      orderId,
      executorId: me.id,
      executorName: me.first_name || "Специалист",
      executorUsername: me.username || "",
      budget,
      days: days || undefined,
      message,
    });
  } catch (err) {
    console.error("notifyClientNewResponse failed:", err);
  }

  return NextResponse.json({ success: true, response });
}
