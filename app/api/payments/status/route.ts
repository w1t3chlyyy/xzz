import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const paymentId = request.nextUrl.searchParams.get("id");
  if (!paymentId) return NextResponse.json({ error: "id required" }, { status: 400 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: payment, error } = await createAdminClient()
    .from("payments")
    .select("id, status, tier, method")
    .eq("id", paymentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !payment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ payment });
}
