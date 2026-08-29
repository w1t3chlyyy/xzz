"use server";

import crypto from "crypto";

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
  const token = process.env.CRYPTOBOT_API_TOKEN;
  
  if (!token) {
    throw new Error("CRYPTOBOT_API_TOKEN is not set in environment variables");
  }

  const response = await fetch(`${CRYPTOBOT_API_URL}/createInvoice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Crypto-Pay-API-Token": token,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
  }

  const data = await response.json();

  if (!data.ok) {
    throw new Error(data.error?.message || data.error?.name || "Failed to create invoice");
  }

  return data.result;
}

export async function getInvoices(params?: { 
  asset?: string; 
  invoice_ids?: string; 
  status?: string 
}): Promise<Invoice[]> {
  const token = process.env.CRYPTOBOT_API_TOKEN;
  
  if (!token) {
    throw new Error("CRYPTOBOT_API_TOKEN is not set in environment variables");
  }

  const queryParams = new URLSearchParams();
  if (params?.asset) queryParams.append("asset", params.asset);
  if (params?.invoice_ids) queryParams.append("invoice_ids", params.invoice_ids);
  if (params?.status) queryParams.append("status", params.status);

  const response = await fetch(`${CRYPTOBOT_API_URL}/getInvoices?${queryParams}`, {
    headers: {
      "Crypto-Pay-API-Token": token,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
  }

  const data = await response.json();

  if (!data.ok) {
    throw new Error(data.error?.message || data.error?.name || "Failed to get invoices");
  }

  return data.result.items;
}

export function verifyWebhookSignature(body: string, signature: string, token: string): boolean {
  try {
    // Теперь используем импортированный crypto вместо require
    const secret = crypto.createHash("sha256").update(token).digest();
    const hmac = crypto.createHmac("sha256", secret)
      .update(body)
      .digest("hex");
    
    // Возвращаем результат сравнения
    return hmac === signature;
  } catch (error) {
    console.error("Webhook verification failed:", error);
    return false;
  }
}

// Дополнительная полезная функция для проверки статуса платежа
export async function checkInvoiceStatus(invoiceId: number): Promise<Invoice | null> {
  try {
    const invoices = await getInvoices({ invoice_ids: String(invoiceId) });
    return invoices[0] || null;
  } catch (error) {
    console.error("Failed to check invoice status:", error);
    return null;
  }
}

// Функция для обработки вебхука (удобный враппер)
export async function handleWebhook(
  body: string,
  signature: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const token = process.env.CRYPTOBOT_API_TOKEN;
    
    if (!token) {
      throw new Error("CRYPTOBOT_API_TOKEN is not set");
    }

    // Проверяем подпись
    const isValid = verifyWebhookSignature(body, signature, token);
    
    if (!isValid) {
      return { success: false, error: "Invalid webhook signature" };
    }

    // Парсим тело
    const data = JSON.parse(body);
    
    // Обрабатываем событие
    const { update_type, payload } = data;
    
    switch (update_type) {
      case "invoice_paid":
        console.log("✅ Invoice paid:", payload);
        // Здесь можно обновить БД
        break;
      case "invoice_expired":
        console.log("⏰ Invoice expired:", payload);
        break;
      default:
        console.log("📨 Unknown webhook event:", update_type);
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
