// app/api/payments/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const paymentId = request.nextUrl.searchParams.get("id");
  if (!paymentId) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // RLS ("Users can view own payments") гарантирует, что видно только свои платежи.
  const { data: payment, error } = await supabase
    .from("payments")
    .select("id, status, tier, method")
    .eq("id", paymentId)
    .eq("user_id", user.id)
    .single();

  if (error || !payment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ payment });
}
