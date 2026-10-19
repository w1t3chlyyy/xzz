// app/api/orders/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { forbidden, getCurrentUser, isAdminUser, unauthorized, UUID_RE } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> | { id: string } };

async function getId(ctx: Ctx): Promise<string> {
  return (await Promise.resolve(ctx.params)).id;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const id = await getId(ctx);
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, title, description, category, budget_min, budget_max, status, created_at, client_id, client:client_id(id, first_name, avatar_url)")
    .eq("id", id)
    .maybeSingle();

  if (!order) return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });

  const isOwner = order.client_id === me.id;

  // Заказчик видит все отклики, исполнитель — только свой (чужие предложения и цены скрыты).
  let rq = admin
    .from("responses")
    .select("id, order_id, executor_id, message, budget, days, status, created_at, executor:executor_id(id, first_name, avatar_url)")
    .eq("order_id", id)
    .order("created_at", { ascending: false });
  if (!isOwner) rq = rq.eq("executor_id", me.id);
  const { data: responses } = await rq;

  const client: any = Array.isArray(order.client) ? order.client[0] : order.client;

  return NextResponse.json({
    isOwner,
    order: {
      id: order.id,
      title: order.title,
      description: order.description,
      category: order.category,
      budget_min: order.budget_min,
      budget_max: order.budget_max,
      status: order.status,
      created_at: order.created_at,
      client_id: order.client_id,
      client: { id: client?.id, first_name: client?.first_name || "Заказчик", avatar_url: client?.avatar_url || null },
    },
    responses: (responses || []).map((r: any) => {
      const ex = Array.isArray(r.executor) ? r.executor[0] : r.executor;
      return {
        id: r.id,
        order_id: r.order_id,
        executor_id: r.executor_id,
        message: r.message,
        budget: r.budget,
        days: r.days,
        status: r.status,
        created_at: r.created_at,
        executor: { id: ex?.id, first_name: ex?.first_name || "Исполнитель", avatar_url: ex?.avatar_url || null },
      };
    }),
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const id = await getId(ctx);
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });

  const { status } = await req.json().catch(() => ({}));
  if (!["completed", "cancelled"].includes(status)) return NextResponse.json({ error: "Неверный статус" }, { status: 400 });

  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("id, client_id, status").eq("id", id).maybeSingle();
  if (!order) return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
  if (order.client_id !== me.id && !isAdminUser(me)) return forbidden();
  if (!["active", "in_progress"].includes(order.status)) return NextResponse.json({ error: "Заказ уже закрыт" }, { status: 409 });

  await admin.from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  return NextResponse.json({ success: true, status });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const id = await getId(ctx);
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });

  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("client_id").eq("id", id).maybeSingle();
  if (!order) return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
  if (order.client_id !== me.id && !isAdminUser(me)) return forbidden();

  const { error } = await admin.from("orders").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Не удалось удалить" }, { status: 500 });
  return NextResponse.json({ success: true });
}
