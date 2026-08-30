// app/api/responses/[id]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyExecutorResponseStatus } from "@/lib/telegram/notifications";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const responseId = resolvedParams.id;
    const body = await req.json();
    const { status } = body;

    if (!responseId || !["accepted", "rejected", "pending"].includes(status)) {
      return NextResponse.json({ error: "Invalid status or response id" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 🔔 Обновляем статус и отправляем уведомление ИСПОЛНИТЕЛЮ в Telegram-бота!
    const result = await notifyExecutorResponseStatus(supabase, {
      responseId,
      status: status as "accepted" | "rejected",
    });

    if (!result.ok) {
      // Даже если уведомление упало, проверяем прямое обновление в базе
      await supabase.from("responses").update({ status }).eq("id", responseId);
    }

    return NextResponse.json({ success: true, status });
  } catch (err: any) {
    console.error("POST /api/responses/[id]/status error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
