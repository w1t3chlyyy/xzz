// app/api/payments/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCryptoBotClient } from "@/lib/crypto-bot/client";
import { telegram } from "@/lib/telegram/bot-api";

const PRICES: Record<string, { rub: number; stars: number; usdt: number }> = {
  pro: { rub: 990, stars: 500, usdt: 11 },
  ai_pro: { rub: 1990, stars: 1000, usdt: 22 },
};

export async function POST(request: NextRequest) {
  try {
    const { tier, method, durationDays = 30 } = await request.json();

    if (!tier || !PRICES[tier]) {
      return NextResponse.json({ error: "Invalid subscription tier" }, { status: 400 });
    }
    if (!["crypto", "stars", "bank"].includes(method)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }

    // Реальный авторизованный пользователь — без этого раньше подписка вообще
    // не была привязана ни к какой проверке.
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin.from("users").select("telegram_id").eq("id", user.id).single();
    if (!profile?.telegram_id) {
      return NextResponse.json({ error: "Telegram аккаунт не привязан" }, { status: 400 });
    }

    const price = PRICES[tier];

    if (method === "crypto") {
      if (!process.env.CRYPTOBOT_API_TOKEN) {
        return NextResponse.json({ error: "Оплата криптовалютой временно недоступна" }, { status: 503 });
      }
      const client = getCryptoBotClient();
      const invoice = await client.createInvoice({
        amount: price.usdt.toString(),
        asset: "USDT",
        description: `Подписка 1337 ${tier.toUpperCase()} на ${durationDays} дней`,
        allow_comments: true,
        allow_anonymous: false,
        expires_in: 3600,
      });

      const { data: payment, error } = await admin
        .from("payments")
        .insert({
          user_id: user.id,
          telegram_id: profile.telegram_id,
          invoice_id: Number(invoice.invoice_id),
          amount: price.usdt,
          currency: "USDT",
          tier,
          method: "crypto",
          status: "pending",
          duration_days: durationDays,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Подписка НЕ выдаётся здесь. Она появится только когда CryptoBot
      // пришлёт invoice_paid на /api/payments/webhook.
      return NextResponse.json({ success: true, paymentId: payment.id, payUrl: invoice.pay_url });
    }

    if (method === "stars") {
      const { data: payment, error } = await admin
        .from("payments")
        .insert({
          user_id: user.id,
          telegram_id: profile.telegram_id,
          invoice_id: Date.now(),
          amount: price.stars,
          currency: "XTR",
          tier,
          method: "stars",
          status: "pending",
          duration_days: durationDays,
        })
        .select("id")
        .single();

      if (error) throw error;

      await telegram.sendInvoice(profile.telegram_id, {
        title: `Подписка 1337 — ${tier === "ai_pro" ? "AI Pro" : "Pro"}`,
        description: `Доступ на ${durationDays} дней`,
        payload: JSON.stringify({ paymentId: payment.id }),
        currency: "XTR",
        prices: [{ label: tier === "ai_pro" ? "AI Pro" : "Pro", amount: price.stars }],
      });

      // Подписка выдастся, когда бот получит апдейт successful_payment.
      return NextResponse.json({
        success: true,
        paymentId: payment.id,
        message: "Счёт выставлен в чате с ботом — откройте Telegram, чтобы оплатить.",
      });
    }

    // method === "bank" — оплата по реквизитам, подтверждается админом вручную
    const { data: requisites } = await admin.from("payment_requisites").select("details").eq("id", 1).single();

    const { data: payment, error } = await admin
      .from("payments")
      .insert({
        user_id: user.id,
        telegram_id: profile.telegram_id,
        invoice_id: Date.now(),
        amount: price.rub,
        currency: "RUB",
        tier,
        method: "bank",
        status: "pending",
        duration_days: durationDays,
      })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      amount: price.rub,
      requisites: requisites?.details || "Реквизиты не заданы, свяжитесь с администратором.",
      instructions:
        "Переведите указанную сумму по реквизитам и отправьте скриншот чека в чат с ботом 1337 в Telegram — администратор подтвердит оплату вручную.",
    });
  } catch (error) {
    console.error("Payment create error:", error);
    return NextResponse.json({ error: "Failed to process payment request" }, { status: 500 });
  }
}
