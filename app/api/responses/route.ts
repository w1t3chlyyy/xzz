// app/api/responses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyClientNewResponse } from "@/lib/telegram/notifications";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      order_id,
      executor_id,
      message,
      budget,
      days,
      executor_name,
      executor_username,
      telegram_id,
    } = body;

    if (!order_id || !message) {
      return NextResponse.json({ error: "Missing required fields: order_id, message" }, { status: 400 });
    }

    const supabase = createAdminClient();

    let targetExecId = executor_id;

    // Обновляем/находим профиль исполнителя
    if (targetExecId) {
      const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
      if (executor_username) updatePayload.username = executor_username.replace(/^@/, "");
      if (executor_name) updatePayload.first_name = executor_name;
      if (telegram_id) updatePayload.telegram_id = Number(telegram_id);
      await supabase.from("users").update(updatePayload).eq("id", targetExecId);
    } else if (telegram_id) {
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("telegram_id", Number(telegram_id))
        .maybeSingle();

      if (existingUser) {
        targetExecId = existingUser.id;
        const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
        if (executor_username) updatePayload.username = executor_username.replace(/^@/, "");
        if (executor_name) updatePayload.first_name = executor_name;
        await supabase.from("users").update(updatePayload).eq("id", targetExecId);
      }
    }

    if (!targetExecId) {
      // Ищем любого существующего исполнителя или пользователя
      const { data: anyUser } = await supabase.from("users").select("id").limit(1).maybeSingle();
      if (anyUser) {
        targetExecId = anyUser.id;
      }
    }

    const budgetNum = budget ? parseInt(budget, 10) : 25000;

    // Вставляем отклик в базу
    const { data: newResponse, error: insertError } = await supabase
      .from("responses")
      .insert({
        order_id,
        executor_id: targetExecId,
        message: message.trim(),
        budget: budgetNum,
        status: "pending",
      })
      .select("id, order_id, executor_id, message, budget, status, created_at")
      .single();

    if (insertError || !newResponse) {
      console.error("POST /api/responses insert error:", insertError);
      return NextResponse.json({ error: insertError?.message || "Failed to create response" }, { status: 500 });
    }

    const cleanUsername = executor_username ? executor_username.replace(/^@/, "") : "";
    const cleanName = executor_name || "Специалист";

    // 🔔 Отправляем уведомление ЗАКАЗЧИКУ прямо в Telegram-бота!
    try {
      await notifyClientNewResponse(supabase, {
        responseId: newResponse.id,
        orderId: order_id,
        executorId: targetExecId,
        executorName: cleanName,
        executorUsername: cleanUsername,
        budget: budgetNum,
        days: days || 3,
        message: message.trim(),
      });
    } catch (notifErr) {
      console.error("Failed to notify client in Telegram:", notifErr);
    }

    return NextResponse.json({
      success: true,
      response: {
        ...newResponse,
        executor: {
          id: targetExecId,
          first_name: cleanName,
          username: cleanUsername,
          telegram_id: telegram_id ? Number(telegram_id) : null,
          rating: 5.0,
        },
      },
    });
  } catch (err: any) {
    console.error("POST /api/responses error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
