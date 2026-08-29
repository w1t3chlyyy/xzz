import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { tier, method, durationDays = 30 } = await request.json();

    if (!tier || (tier !== "pro" && tier !== "ai_pro")) {
      return NextResponse.json({ error: "Invalid subscription tier" }, { status: 400 });
    }

    const prices: Record<string, { rub: number; stars: number; usdt: number }> = {
      pro: { rub: 990, stars: 500, usdt: 11 },
      ai_pro: { rub: 1990, stars: 1000, usdt: 22 },
    };

    const planPrice = prices[tier];

    // Try CryptoBot if token is available
    if (process.env.CRYPTOBOT_API_TOKEN && method === "crypto") {
      try {
        const { createInvoice } = await import("@/lib/crypto-bot/client");
        const invoice = await createInvoice({
          amount: planPrice.usdt,
          asset: "USDT",
          description: `Подписка 1337 ${tier.toUpperCase()} на ${durationDays} дней`,
          payload: JSON.stringify({ tier, durationDays }),
        });

        return NextResponse.json({
          success: true,
          payUrl: invoice.pay_url,
          invoiceId: invoice.invoice_id,
        });
      } catch (cryptoErr) {
        console.warn("CryptoBot invoice creation error:", cryptoErr);
      }
    }

    // Default simulation / Telegram direct invoice response
    return NextResponse.json({
      success: true,
      tier,
      durationDays,
      amountRub: planPrice.rub,
      amountStars: planPrice.stars,
      message: "Счёт сформирован",
      payUrl: null,
    });
  } catch (error) {
    console.error("Payment create error:", error);
    return NextResponse.json({ error: "Failed to process payment request" }, { status: 500 });
  }
}
