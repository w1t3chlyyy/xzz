// app/api/orders/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const orderId = resolvedParams.id;

    if (!orderId) {
      return NextResponse.json({ error: "Missing order id" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Получаем заказ с данными заказчика
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        `
        id, title, description, category, budget_min, budget_max, status, created_at, updated_at, client_id,
        client:client_id (
          id,
          first_name,
          username,
          avatar_url,
          telegram_id,
          subscription_tier
        )
      `
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      console.error("GET /api/orders/[id] orderError:", orderError);
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 2. Получаем отклики к этому заказу
    const { data: responses, error: responsesError } = await supabase
      .from("responses")
      .select(
        `
        id, order_id, executor_id, message, budget, status, created_at,
        executor:executor_id (
          id,
          first_name,
          username,
          avatar_url,
          telegram_id,
          subscription_tier
        )
      `
      )
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    if (responsesError) {
      console.warn("GET /api/orders/[id] responsesError:", responsesError);
    }

    const clientData = Array.isArray(order.client) ? order.client[0] : order.client;

    const formattedOrder = {
      id: order.id,
      title: order.title,
      description: order.description,
      category: order.category,
      budget_min: order.budget_min,
      budget_max: order.budget_max,
      status: order.status,
      created_at: order.created_at,
      updated_at: order.updated_at,
      client_id: order.client_id,
      client: {
        id: clientData?.id,
        first_name: clientData?.first_name || "Заказчик",
        username: clientData?.username ? clientData.username.replace(/^@/, "") : "",
        avatar_url: clientData?.avatar_url || null,
        telegram_id: clientData?.telegram_id || null,
        rating: 5.0,
      },
    };

    const formattedResponses = (responses || []).map((r: any) => {
      const execData = Array.isArray(r.executor) ? r.executor[0] : r.executor;
      return {
        id: r.id,
        order_id: r.order_id,
        executor_id: r.executor_id,
        message: r.message,
        budget: r.budget,
        status: r.status,
        created_at: r.created_at,
        executor: {
          id: execData?.id,
          first_name: execData?.first_name || "Исполнитель",
          username: execData?.username ? execData.username.replace(/^@/, "") : "",
          avatar_url: execData?.avatar_url || null,
          telegram_id: execData?.telegram_id || null,
          rating: 5.0,
        },
      };
    });

    return NextResponse.json({
      order: formattedOrder,
      responses: formattedResponses,
    });
  } catch (err: any) {
    console.error("GET /api/orders/[id] error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const orderId = resolvedParams.id;
    const supabase = createAdminClient();

    const { error } = await supabase.from("orders").delete().eq("id", orderId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
