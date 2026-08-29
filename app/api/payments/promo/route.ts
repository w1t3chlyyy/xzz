// app/api/payments/promo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const { code } = await request.json();
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Код не указан" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const admin = createAdminClient();
  const normalized = code.trim().toUpperCase();

  const { data: promo } = await admin
    .from("promo_codes")
    .select("*")
    .eq("code", normalized)
    .eq("active", true)
    .maybeSingle();

  if (!promo) {
    return NextResponse.json({ error: "Промокод не найден или больше не активен" }, { status: 404 });
  }
  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
    return NextResponse.json({ error: "Лимит использований промокода исчерпан" }, { status: 400 });
  }

  const { data: userRow } = await admin
    .from("users")
    .select("subscription_tier, subscription_expires_at")
    .eq("id", user.id)
    .single();

  const now = Date.now();
  const currentExpiry = userRow?.subscription_expires_at ? new Date(userRow.subscription_expires_at).getTime() : 0;
  const sameTierStillActive = currentExpiry > now && userRow?.subscription_tier === promo.tier;
  const base = sameTierStillActive ? currentExpiry : now;
  const newExpiry = new Date(base + promo.duration_days * 86400000).toISOString();

  await admin
    .from("users")
    .update({ subscription_tier: promo.tier, subscription_expires_at: newExpiry })
    .eq("id", user.id);

  await admin.from("promo_codes").update({ used_count: promo.used_count + 1 }).eq("code", normalized);

  return NextResponse.json({ success: true, tier: promo.tier, expiresAt: newExpiry });
}
