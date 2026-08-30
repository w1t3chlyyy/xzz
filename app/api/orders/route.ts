// app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const clientId = searchParams.get("client_id");

    let query = supabase
      .from("orders")
      .select(
        `
        id, title, description, category, budget_min, budget_max, status, created_at, updated_at, client_id,
        client:client_id (
          id,
          first_name,
          username,
          avatar_url,
          telegram_id
        ),
        responses:responses (
          id,
          status
        )
      `
      )
      .in("status", ["active", "in_progress"])
      .order("created_at", { ascending: false });

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    if (clientId) {
      query = query.eq("client_id", clientId);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error("GET /api/orders error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedOrders = (orders || []).map((o: any) => {
      const clientData = Array.isArray(o.client) ? o.client[0] : o.client;
      const responsesList = Array.isArray(o.responses) ? o.responses : [];
      const pendingCount = responsesList.filter(
        (r: any) => r && (r.status === "pending" || !r.status)
      ).length;
      const totalCount = responsesList.length;

      return {
        id: o.id,
        title: o.title,
        description: o.description,
        category: o.category,
        budget_min: o.budget_min,
        budget_max: o.budget_max,
        status: o.status || "active",
        pending_responses_count: pendingCount,
        total_responses_count: totalCount,
        created_at: o.created_at,
        client_id: o.client_id,
        client: {
          id: clientData?.id,
          first_name: clientData?.first_name || "Заказчик",
          username: clientData?.username ? clientData.username.replace(/^@/, "") : "",
          avatar_url: clientData?.avatar_url || null,
          telegram_id: clientData?.telegram_id || null,
        },
      };
    });

    return NextResponse.json({ orders: formattedOrders });
  } catch (err: any) {
    console.error("GET /api/orders caught error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      description,
      category,
      budget_min,
      budget_max,
      client_id,
      contact_username,
      contact_name,
      telegram_id,
    } = body;

    if (!title || !description || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createAdminClient();

    let targetUserId = client_id;

    // Если есть telegram_id или contact_username, обновляем/находим пользователя
    if (targetUserId) {
      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (contact_username) updatePayload.username = contact_username.replace(/^@/, "");
      if (contact_name) updatePayload.first_name = contact_name;
      if (telegram_id) updatePayload.telegram_id = Number(telegram_id);

      await supabase.from("users").update(updatePayload).eq("id", targetUserId);
    } else if (telegram_id) {
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("telegram_id", Number(telegram_id))
        .maybeSingle();

      if (existingUser) {
        targetUserId = existingUser.id;
        const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
        if (contact_username) updatePayload.username = contact_username.replace(/^@/, "");
        if (contact_name) updatePayload.first_name = contact_name;
        await supabase.from("users").update(updatePayload).eq("id", targetUserId);
      }
    }

    if (!targetUserId) {
      // Ищем любого существующего клиента или используем fallback
      const { data: anyUser } = await supabase.from("users").select("id").limit(1).maybeSingle();
      if (anyUser) {
        targetUserId = anyUser.id;
      }
    }

    const { data: newOrder, error: insertError } = await supabase
      .from("orders")
      .insert({
        client_id: targetUserId,
        title: title.trim(),
        description: description.trim(),
        category,
        budget_min: budget_min ? parseInt(budget_min, 10) : null,
        budget_max: budget_max ? parseInt(budget_max, 10) : null,
        status: "active",
      })
      .select("id, title, description, category, budget_min, budget_max, status, created_at, client_id")
      .single();

    if (insertError || !newOrder) {
      console.error("POST /api/orders insert error:", insertError);
      return NextResponse.json({ error: insertError?.message || "Failed to create order" }, { status: 500 });
    }

    const cleanUsername = contact_username ? contact_username.replace(/^@/, "") : "";
    const cleanName = contact_name || "Заказчик";

    return NextResponse.json({
      success: true,
      order: {
        ...newOrder,
        client: {
          id: targetUserId,
          first_name: cleanName,
          username: cleanUsername,
          telegram_id: telegram_id ? Number(telegram_id) : null,
        },
      },
    });
  } catch (err: any) {
    console.error("POST /api/orders caught error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
