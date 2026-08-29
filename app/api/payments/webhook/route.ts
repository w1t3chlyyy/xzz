// app/api/payments/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/crypto-bot/client";
import { telegram } from "@/lib/telegram/bot-api";

const TIER_LABEL: Record<string, string> = { pro: "Pro", ai_pro: "AI Pro" };

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("crypto-pay-api-signature") || "";
  const token = process.env.CRYPTOBOT_API_TOKEN || "";

  if (!token || !signature || !verifyWebhookSignature(rawBody, signature, token)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let update: any;
  try {
    update = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (update.update_type !== "invoice_paid") {
    return NextResponse.json({ ok: true });
  }

  const invoice = update.payload;
  const invoiceId = Number(invoice?.invoice_id);
  if (!invoiceId) return NextResponse.json({ ok: true });

  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("*")
    .eq("invoice_id", invoiceId)
    .eq("method", "crypto")
    .maybeSingle();

  if (payment && payment.status !== "paid") {
    const { data: userRow } = await admin
      .from("users")
      .select("subscription_tier, subscription_expires_at, telegram_id")
      .eq("id", payment.user_id)
      .single();

    const now = Date.now();
    const currentExpiry = userRow?.subscription_expires_at ? new Date(userRow.subscription_expires_at).getTime() : 0;
    const sameTierStillActive = currentExpiry > now && userRow?.subscription_tier === payment.tier;
    const base = sameTierStillActive ? currentExpiry : now;
    const newExpiry = new Date(base + (payment.duration_days || 30) * 86400000).toISOString();

    await admin
      .from("payments")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", payment.id);

    await admin
      .from("users")
      .update({ subscription_tier: payment.tier, subscription_expires_at: newExpiry })
      .eq("id", payment.user_id);

    if (userRow?.telegram_id) {
      await telegram.sendMessage(
        userRow.telegram_id,
        `✅ Оплата через CryptoBot получена! Тариф <b>${TIER_LABEL[payment.tier] || payment.tier}</b> активирован.`
      );
    }
  }

  return NextResponse.json({ ok: true });
}
