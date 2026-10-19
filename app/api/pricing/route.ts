import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { getPricing } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const { data } = await createAdminClient().from("settings").select("pro_price").eq("id", 1).maybeSingle();
  return NextResponse.json({ pricing: getPricing(data?.pro_price || 990) });
}
