// app/api/payments/webhook-xrocket/route.ts
// Вебхук xRocket Pay API (актуальная версия, не Legacy).
// Заголовки: Signature / Signature-Version: v1 / Signature-Timestamp (unix ms).
// Подпись: HMAC-SHA256 от "{timestamp}.{rawBody}", ключ — XROCKET_WEBHOOK_SECRET.
// События инвойса различаются полем data.event; оплату фиксирует
// data.event === "invoice_status_changed" + data.invoice.status === "paid".
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyXRocketWebhook } from "@/lib/xrocket/client";
import { confirmPayment } from "@/lib/payments";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  const signature = request.headers.get("signature") || "";
  const signatureVersion = request.headers.get("signature-version") || "";
  const signatureTimestamp = request.headers.get("signature-timestamp") || "";
  const webhookSecret = process.env.XROCKET_WEBHOOK_SECRET || "";

  if (
    !webhookSecret ||
    !verifyXRocketWebhook(rawBody, signature, signatureVersion, signatureTimestamp, webhookSecret)
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.type !== "invoice") return NextResponse.json({ ok: true });
  if (event.data?.event !== "invoice_status_changed") return NextResponse.json({ ok: true });

  const invoice = event.data.invoice;
  if (!invoice || invoice.status !== "paid") return NextResponse.json({ ok: true });

  // Привязка к нашему платежу: сначала по xrocket_invoice_id, fallback —
  // по clientInvoiceId, который мы передавали при создании инвойса.
  const admin = createAdminClient();
  let paymentId: string | null = null;

  const { data: byInvoiceId } = await admin
    .from("payments")
    .select("id, status")
    .eq("method", "xrocket")
    .eq("xrocket_invoice_id", String(invoice.id))
    .maybeSingle();
  if (byInvoiceId) {
    paymentId = byInvoiceId.id;
  } else if (invoice.clientInvoiceId) {
    const { data: byClientId } = await admin
      .from("payments")
      .select("id, status")
      .eq("method", "xrocket")
      .eq("id", String(invoice.clientInvoiceId))
      .maybeSingle();
    if (byClientId) paymentId = byClientId.id;
  }

  // confirmPayment сам проверяет, что платёж существует и ещё не paid (идемпотентность)
  if (paymentId) {
    await confirmPayment(admin, paymentId);
  }

  return NextResponse.json({ ok: true });
}
