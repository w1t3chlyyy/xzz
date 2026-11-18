// lib/xrocket/client.ts — тонкий клиент xRocket Pay API (актуальная версия, не Legacy).
// Документация: https://docs.xrocket.exchange/api/pay/pay-api-overview
//
// Ключевые отличия от Legacy API (https://pay.xrocket.tg):
//   - Base URL: https://pay.api.xrocket.exchange, префикс /api/v1/... на всех роутах
//   - Авторизация: Authorization: Bearer <XROCKET_API_TOKEN>
//   - Суммы — строки ("11"), а не числа
//   - Ответ без обёртки { success, data }: проверяем HTTP-статус
//   - Webhook подписывается НЕ токеном, а отдельным webhook secret:
//       headers Signature / Signature-Version: v1 / Signature-Timestamp (unix ms)
//       signed_string = "{timestamp}.{rawBody}", HMAC-SHA256 с ключом-SECRET (без хэша)
import crypto from "crypto";

const DEFAULT_BASE_URL = "https://pay.api.xrocket.exchange";

export interface XRocketInvoiceLinks {
  telegramBotLink: string;
  [key: string]: unknown;
}

export interface XRocketInvoice {
  id: string;
  priceAmount?: string;
  minPayment?: string;
  priceCurrency?: string;
  payCurrencies?: string[];
  clientInvoiceId?: string;
  description?: string;
  expiresIn?: number;
  createdAt?: string;
  expiresAt?: string | null;
  status: "active" | "paid" | "partially_paid" | "expired" | "cancelled" | string;
  links?: XRocketInvoiceLinks;
  [key: string]: unknown;
}

export interface XRocketCreateInvoiceParams {
  priceAmount: string; // точная сумма; строка!
  priceCurrency: string; // например "USDT"
  description?: string;
  numPayments?: number;
  expiresIn?: number; // миллисекунды! (1800000 = 30 минут)
  clientInvoiceId?: string; // наш внутренний id платежа для связывания
  callbackUrl?: string; // переопределяет application-level webhook URL
  payload?: Record<string, unknown>; // вернётся в webhook в data.invoice.callback.payload
  successUrl?: string;
  cancelUrl?: string;
  customerTelegramId?: number | string;
}

export interface XRocketWebhookPayment {
  id: string;
  userId?: number;
  paymentNum?: number;
  paymentAmount?: string;
  paymentAmountReceived?: string;
  paid?: string;
  [key: string]: unknown;
}

export interface XRocketWebhook {
  id: string; // уникальный id доставки — для идемпотентности
  type: "invoice" | "cheque" | "payout" | "withdrawal" | string;
  timestamp: string;
  data: {
    event?: string; // у invoice: "invoice_status_changed" | "payment_status_changed"
    invoice?: XRocketInvoice & {
      callback?: { callbackUrl?: string; payload?: Record<string, unknown> };
    };
    payment?: XRocketWebhookPayment;
    [key: string]: unknown;
  };
}

let xrocketInstance: XRocketClient | null = null;

export class XRocketClient {
  private apiToken: string;
  private baseUrl: string;

  constructor(apiToken: string, baseUrl?: string) {
    this.apiToken = apiToken;
    this.baseUrl = (baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      /* тело не JSON */
    }

    if (!res.ok) {
      // Pay API отдаёт ошибки как application/json (не problem+json):
      // либо { type, title, ... }, либо { message, errors }
      const message =
        (data && (data.title || data.message)) ||
        `HTTP ${res.status}`;
      console.error("XRocket API raw error response:", JSON.stringify(data));
      throw new Error(`XRocket API error: ${message}`);
    }

    return data as T;
  }

  // POST /api/v1/invoices — ответ 201, тело — сам инвойс (без обёртки)
  async createInvoice(params: XRocketCreateInvoiceParams): Promise<XRocketInvoice> {
    const body: Record<string, unknown> = {
      priceAmount: params.priceAmount,
      priceCurrency: params.priceCurrency,
      numPayments: params.numPayments ?? 1,
    };
    if (params.description) body.description = params.description;
    if (params.expiresIn !== undefined) body.expiresIn = params.expiresIn;
    if (params.clientInvoiceId) body.clientInvoiceId = params.clientInvoiceId;
    if (params.customerTelegramId) body.customer = { telegramId: String(params.customerTelegramId) };
    if (params.callbackUrl || params.payload) {
      body.callback = {
        ...(params.callbackUrl ? { callbackUrl: params.callbackUrl } : {}),
        ...(params.payload ? { payload: params.payload } : {}),
      };
    }
    if (params.successUrl || params.cancelUrl) {
      body.url = {
        ...(params.successUrl ? { successUrl: params.successUrl } : {}),
        ...(params.cancelUrl ? { cancelUrl: params.cancelUrl } : {}),
      };
    }

    return this.request<XRocketInvoice>("POST", "/api/v1/invoices", body);
  }

  // GET /api/v1/invoice?invoiceId=... — статус инвойса (для polling/ручной сверки)
  async getInvoice(invoiceId: string): Promise<XRocketInvoice> {
    return this.request<XRocketInvoice>("GET", `/api/v1/invoice?invoiceId=${encodeURIComponent(invoiceId)}`);
  }
}

export function getXRocketClient(): XRocketClient {
  if (!xrocketInstance) {
    const apiToken = process.env.XROCKET_API_TOKEN || "";
    if (!apiToken) {
      throw new Error("XROCKET_API_TOKEN is not set in environment variables");
    }
    xrocketInstance = new XRocketClient(apiToken, process.env.XROCKET_API_BASE || undefined);
  }
  return xrocketInstance;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

// Верификация webhook-а Pay API:
//   signed_string = "{Signature-Timestamp}.{rawBody}"
//   signature     = HMAC_SHA256(webhook_secret, signed_string) — secret используется как есть
export function verifyXRocketWebhook(
  rawBody: string,
  signature: string,
  signatureVersion: string,
  signatureTimestamp: string,
  webhookSecret: string,
  toleranceMs = 5 * 60 * 1000
): boolean {
  if (!signature || !signatureVersion || !signatureTimestamp || !webhookSecret) return false;
  if (signatureVersion !== "v1") return false;

  const ts = Number(signatureTimestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > toleranceMs) return false;

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(`${signatureTimestamp}.${rawBody}`)
    .digest("hex");

  return timingSafeEqualHex(expected, signature);
}
