// app/api/responses/[id]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyExecutorResponseStatus } from "@/lib/telegram/notifications";
import { forbidden, getCurrentUser, unauthorized, UUID_RE } from "@/lib/auth";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();

  const { id } = await Promise.resolve(ctx.params);
  const { status } = await req.json().catch(() => ({}));
  if (!UUID_RE.test(id) || !["accepted", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Неверный статус" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: resp } = await admin.from("responses").select("id, status, order_id").eq("id", id).maybeSingle();
  if (!resp) return NextResponse.json({ error: "Отклик не найден" }, { status: 404 });

  const { data: order } = await admin.from("orders").select("client_id").eq("id", resp.order_id).maybeSingle();
  if (!order || order.client_id !== me.id) return forbidden("Решать по отклику может только заказчик");
  if (resp.status !== "pending") return NextResponse.json({ error: "Решение уже принято" }, { status: 409 });

  const result = await notifyExecutorResponseStatus(admin, { responseId: id, status });
  if (!result.ok) return NextResponse.json({ error: "Не удалось обновить отклик" }, { status: 500 });

  return NextResponse.json({ success: true, status });
}
