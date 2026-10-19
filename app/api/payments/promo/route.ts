// app/api/payments/promo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanStr, getCurrentUser, unauthorized } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();

  const { code } = await request.json().catch(() => ({}));
  const normalized = cleanStr(code, 32).toUpperCase();
  if (!normalized) return NextResponse.json({ error: "Код не указан" }, { status: 400 });

  const admin = createAdminClient();
  const { data: promo } = await admin.from("promo_codes").select("*").eq("code", normalized).eq("active", true).maybeSingle();
  if (!promo) return NextResponse.json({ error: "Промокод не найден или больше не активен" }, { status: 404 });
  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
    return NextResponse.json({ error: "Лимит использований промокода исчерпан" }, { status: 400 });
  }

  // 1) один пользователь — один раз (PK code+user_id)
  const { error: redeemError } = await admin.from("promo_redemptions").insert({ code: normalized, user_id: me.id });
  if (redeemError) return NextResponse.json({ error: "Вы уже использовали этот промокод" }, { status: 400 });

  // 2) атомарно занимаем использование: апдейт сработает, только если счётчик не изменился
  const { data: bumped } = await admin
    .from("promo_codes")
    .update({ used_count: promo.used_count + 1 })
    .eq("code", normalized)
    .eq("used_count", promo.used_count)
    .select("code");
  if (!bumped || bumped.length === 0) {
    await admin.from("promo_redemptions").delete().eq("code", normalized).eq("user_id", me.id);
    return NextResponse.json({ error: "Не удалось применить, попробуйте ещё раз" }, { status: 409 });
  }

  const now = Date.now();
  const current = me.subscription_expires_at ? new Date(me.subscription_expires_at).getTime() : 0;
  const base = current > now && me.subscription_tier === promo.tier ? current : now;
  const newExpiry = new Date(base + promo.duration_days * 86400000).toISOString();

  await admin.from("users").update({ subscription_tier: promo.tier, subscription_expires_at: newExpiry }).eq("id", me.id);
  return NextResponse.json({ success: true, tier: promo.tier, expiresAt: newExpiry });
}
