"use server";

const CRYPTOBOT_API_URL = "https://pay.crypt.bot/api";

interface CreateInvoiceParams {
  amount: number;
  asset?: string;
  description?: string;
  hidden_message?: string;
  paid_btn_name?: string;
  paid_btn_url?: string;
  payload?: string;
  allow_comments?: boolean;
  allow_anonymous?: boolean;
  expires_in?: number;
}

interface Invoice {
  invoice_id: number;
  status: string;
  hash: string;
  asset: string;
  amount: string;
  pay_url: string;
  description?: string;
  created_at: string;
  allow_comments: boolean;
  allow_anonymous: boolean;
  expiration_date?: string;
  paid_at?: string;
  paid_anonymously?: boolean;
  comment?: string;
  hidden_message?: string;
  payload?: string;
  paid_btn_name?: string;
  paid_btn_url?: string;
}

export async function createInvoice(params: CreateInvoiceParams): Promise<Invoice> {
  const response = await fetch(`${CRYPTOBOT_API_URL}/createInvoice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Crypto-Pay-API-Token": process.env.CRYPTOBOT_API_TOKEN!,
    },
    body: JSON.stringify(params),
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(data.error?.name || "Failed to create invoice");
  }

  return data.result;
}

export async function getInvoices(params?: { asset?: string; invoice_ids?: string; status?: string }): Promise<Invoice[]> {
  const queryParams = new URLSearchParams();
  if (params?.asset) queryParams.append("asset", params.asset);
  if (params?.invoice_ids) queryParams.append("invoice_ids", params.invoice_ids);
  if (params?.status) queryParams.append("status", params.status);

  const response = await fetch(`${CRYPTOBOT_API_URL}/getInvoices?${queryParams}`, {
    headers: {
      "Crypto-Pay-API-Token": process.env.CRYPTOBOT_API_TOKEN!,
    },
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(data.error?.name || "Failed to get invoices");
  }

  return data.result.items;
}

export function verifyWebhookSignature(body: string, signature: string, token: string): boolean {
  const crypto = require("crypto");
  const secret = crypto.createHash("sha256").update(token).digest();
  const hmac = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return hmac === signature;
}
