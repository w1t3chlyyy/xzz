// app/api/payments/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCryptoBotClient } from "@/lib/crypto-bot/client";
import { telegram } from "@/lib/telegram/bot-api";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { getPricing } from "@/lib/pricing";

export async function POST(request: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me) return unauthorized();

    const { method, durationDays } = await request.json().catch(() => ({}));
    const days = Number(durationDays) === 365 ? 365 : 30;
    if (!["crypto", "stars", "bank"].includes(method)) {
      return NextResponse.json({ error: "Неверный способ оплаты" }, { status: 400 });
    }
    if (!me.telegram_id) return NextResponse.json({ error: "Telegram аккаунт не привязан" }, { status: 400 });

    const admin = createAdminClient();
    // Раньше цена была захардкожена и за «год» списывалась цена месяца. Теперь цена зависит от срока
    // и берётся из settings.pro_price (команда /setprices).
    const { data: settings } = await admin.from("settings").select("pro_price").eq("id", 1).maybeSingle();
    const price = getPricing(settings?.pro_price || 990)[days];
    const tier = "pro";
    const base = { user_id: me.id, telegram_id: me.telegram_id, tier, status: "pending", duration_days: days };

    if (method === "crypto") {
      if (!process.env.CRYPTOBOT_API_TOKEN) {
        return NextResponse.json({ error: "Оплата криптовалютой временно недоступна" }, { status: 503 });
      }
      const invoice = await getCryptoBotClient().createInvoice({
        amount: price.usdt.toString(),
        asset: "USDT",
        description: `Подписка 1337 Pro на ${days} дней`,
        allow_comments: false,
        allow_anonymous: false,
        expires_in: 3600,
      });

      const { data: payment, error } = await admin
        .from("payments")
        .insert({ ...base, invoice_id: Number(invoice.invoice_id), amount: price.usdt, currency: "USDT", method: "crypto" })
        .select("id")
        .single();
      if (error) throw error;

      // Подписка выдаётся только вебхуком invoice_paid
      return NextResponse.json({ success: true, paymentId: payment.id, payUrl: invoice.pay_url });
    }

    if (method === "stars") {
      const { data: payment, error } = await admin
        .from("payments")
        .insert({ ...base, invoice_id: Date.now(), amount: price.stars, currency: "XTR", method: "stars" })
        .select("id")
        .single();
      if (error) throw error;

      await telegram.sendInvoice(me.telegram_id, {
        title: "Подписка 1337 — Pro",
        description: `Доступ на ${days} дней`,
        payload: JSON.stringify({ paymentId: payment.id }),
        currency: "XTR",
        prices: [{ label: "Pro", amount: price.stars }],
      });

      return NextResponse.json({
        success: true,
        paymentId: payment.id,
        message: "Счёт выставлен в чате с ботом — откройте Telegram, чтобы оплатить.",
      });
    }

    // bank — перевод по реквизитам, подтверждает админ
    const { data: requisites } = await admin.from("payment_requisites").select("details").eq("id", 1).maybeSingle();
    const { data: payment, error } = await admin
      .from("payments")
      .insert({ ...base, invoice_id: Date.now(), amount: price.rub, currency: "RUB", method: "bank" })
      .select("id")
      .single();
    if (error) throw error;

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      amount: price.rub,
      requisites: requisites?.details || "Реквизиты не заданы, свяжитесь с администратором.",
    });
  } catch (error) {
    console.error("Payment create error:", error);
    return NextResponse.json({ error: "Не удалось создать платёж" }, { status: 500 });
  }
}
