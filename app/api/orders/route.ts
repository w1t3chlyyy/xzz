// app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CATEGORY_IDS } from "@/lib/constants";
import { cleanStr, getCurrentUser, paywall, toInt, unauthorized, userHasAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();

  const sp = new URL(req.url).searchParams;
  const category = sp.get("category");
  const mine = sp.get("mine") === "1";

  let query = createAdminClient()
    .from("orders")
    .select(
      "id, title, description, category, budget_min, budget_max, status, created_at, client_id, client:client_id(first_name), responses:responses(id, status)"
    )
    .order("created_at", { ascending: false })
    .limit(60);

  if (mine) query = query.eq("client_id", me.id);
  else query = query.in("status", ["active", "in_progress"]);

  if (category && category !== "all") query = query.eq("category", category);

  const { data, error } = await query;
  if (error) {
    console.error("GET /api/orders:", error);
    return NextResponse.json({ error: "Не удалось загрузить заказы" }, { status: 500 });
  }

  const orders = (data || []).map((o: any) => {
    const client = Array.isArray(o.client) ? o.client[0] : o.client;
    const responses = Array.isArray(o.responses) ? o.responses : [];
    return {
      id: o.id,
      title: o.title,
      description: o.description,
      category: o.category,
      budget_min: o.budget_min,
      budget_max: o.budget_max,
      status: o.status,
      created_at: o.created_at,
      client_id: o.client_id,
      pending_responses_count: responses.filter((r: any) => r?.status === "pending").length,
      total_responses_count: responses.length,
      client: { first_name: client?.first_name || "Заказчик" },
    };
  });

  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  if (!userHasAccess(me)) return paywall();

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });

  const description = cleanStr(body.description, 5000);
  const category = cleanStr(body.category, 30);
  const title = cleanStr(body.title, 120) || description.slice(0, 60).split("\n")[0];
  const budgetMin = toInt(body.budget_min);
  const budgetMax = toInt(body.budget_max);

  if (description.length < 10) return NextResponse.json({ error: "Опишите задачу подробнее (минимум 10 символов)" }, { status: 400 });
  if (!(CATEGORY_IDS as readonly string[]).includes(category)) return NextResponse.json({ error: "Неверная категория" }, { status: 400 });
  if (budgetMin !== null && budgetMax !== null && budgetMin > budgetMax) {
    return NextResponse.json({ error: "Минимальный бюджет больше максимального" }, { status: 400 });
  }

  const admin = createAdminClient();

  const contactName = cleanStr(body.contact_name, 60);
  if (contactName && contactName !== me.first_name) {
    await admin.from("users").update({ first_name: contactName, updated_at: new Date().toISOString() }).eq("id", me.id);
  }

  const { data: order, error } = await admin
    .from("orders")
    .insert({ client_id: me.id, title, description, category, budget_min: budgetMin, budget_max: budgetMax, status: "active" })
    .select("id, title, category, status, created_at")
    .single();

  if (error || !order) {
    console.error("POST /api/orders:", error);
    return NextResponse.json({ error: "Не удалось создать заказ" }, { status: 500 });
  }

  return NextResponse.json({ success: true, order });
}
