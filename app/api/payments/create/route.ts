// app/api/payments/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCryptoBotClient } from "@/lib/crypto-bot/client";
import { getXRocketClient } from "@/lib/xrocket/client";
import { telegram } from "@/lib/telegram/bot-api";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { getPricing } from "@/lib/pricing";

export async function POST(request: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me) return unauthorized();

    const { method, durationDays } = await request.json().catch(() => ({}));
    const days = Number(durationDays) === 365 ? 365 : 30;
    if (!["crypto", "stars", "bank", "xrocket"].includes(method)) {
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

    if (method === "xrocket") {
      if (!process.env.XROCKET_API_TOKEN) {
        return NextResponse.json({ error: "Оплата через Xrocket временно недоступна" }, { status: 503 });
      }

      // Сначала создаём строку платежа — её id уходит в xRocket как clientInvoiceId
      // и возвращается в webhook, чтобы связывать событие с платежом.
      const { data: payment, error } = await admin
        .from("payments")
        .insert({ ...base, invoice_id: Date.now(), amount: price.usdt, currency: "USDT", method: "xrocket" })
        .select("id")
        .single();
      if (error) throw error;

      const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
      try {
        const invoice = await getXRocketClient().createInvoice({
          priceAmount: price.usdt.toString(),
          priceCurrency: "USDT",
          description: `Подписка 1337 Pro на ${days} дней`,
          numPayments: 1,
          expiresIn: 3600000, // миллисекунды (1 час)
          clientInvoiceId: payment.id,
          customerTelegramId: me.telegram_id,
          // callbackUrl на уровне инвойса гарантирует, что событие придёт именно сюда,
          // даже если в приложении xRocket настроен другой application-level URL.
          callbackUrl: siteUrl ? `${siteUrl}/api/payments/webhook-xrocket` : undefined,
          payload: { paymentId: payment.id },
        });

        await admin
          .from("payments")
          .update({ xrocket_invoice_id: String(invoice.id) })
          .eq("id", payment.id);

        // Подписка выдаётся только вебхуком invoice_status_changed → paid
        return NextResponse.json({
          success: true,
          paymentId: payment.id,
          payUrl: invoice.links?.telegramBotLink,
        });
      } catch (err) {
        // Инвойс в xRocket не создался — не оставляем висящий pending-платёж
        await admin.from("payments").delete().eq("id", payment.id);
        throw err;
      }
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

    // bank — перевод по реквизитам (карта), подтверждает админ вручную.
    // Если задан NEXT_PUBLIC_MANUAL_PAY_USERNAME, клиент покажет кнопку
    // с редиректом на t.me/<username> для ручной выдачи подписки.
    const { data: requisites } = await admin.from("payment_requisites").select("details").eq("id", 1).maybeSingle();
    const { data: payment, error } = await admin
      .from("payments")
      .insert({ ...base, invoice_id: Date.now(), amount: price.rub, currency: "RUB", method: "bank" })
      .select("id")
      .single();
    if (error) throw error;

    const manualUsername = (process.env.NEXT_PUBLIC_MANUAL_PAY_USERNAME || "").replace(/^@/, "").trim();

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      amount: price.rub,
      requisites: requisites?.details || "Реквизиты не заданы, свяжитесь с администратором.",
      manualPayUrl: manualUsername ? `https://t.me/${manualUsername}` : null,
    });
  } catch (error) {
    console.error("Payment create error:", error);
    return NextResponse.json({ error: "Не удалось создать платёж" }, { status: 500 });
  }
}
