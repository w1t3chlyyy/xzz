// Исполнитель отзывает свой (ещё не принятый) отклик
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { forbidden, getCurrentUser, unauthorized, UUID_RE } from "@/lib/auth";

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const { id } = await Promise.resolve(ctx.params);
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  const admin = createAdminClient();
  const { data: resp } = await admin.from("responses").select("executor_id, status").eq("id", id).maybeSingle();
  if (!resp) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  if (resp.executor_id !== me.id) return forbidden();
  if (resp.status === "accepted") return NextResponse.json({ error: "Принятый отклик отозвать нельзя" }, { status: 409 });

  await admin.from("responses").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
