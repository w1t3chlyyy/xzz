import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, isAdminUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return unauthorized();

  const { data: chats } = await createAdminClient()
    .from("chats")
    .select("user1_id, unread1, unread2")
    .or(`user1_id.eq.${me.id},user2_id.eq.${me.id}`);

  const unread = (chats || []).reduce((sum: number, c: any) => sum + (c.user1_id === me.id ? c.unread1 : c.unread2), 0);

  return NextResponse.json({ user: me, isAdmin: isAdminUser(me), unread, serverNow: Date.now() });
}
