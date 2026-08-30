// lib/crypto-bot/client.ts
import crypto from 'crypto';

export interface CryptoBotInvoice {
  invoice_id: string;
  status: string;
  hash: string;
  asset: string;
  amount: string;
  pay_url?: string;
  created_at: string;
  allow_comments?: boolean;
  allow_anonymous?: boolean;
  expiration?: string;
  paid_at?: string;
  paid_anonymously?: boolean;
  comment?: string;
  hidden_message?: string;
  payload?: string;
}

export interface CryptoBotWebhook {
  update_id: number;
  update_type: 'invoice_paid' | 'invoice_created' | 'invoice_expired';
  invoice: CryptoBotInvoice;
}

export interface CreateInvoiceParams {
  asset: 'TON' | 'BTC' | 'USDT' | 'ETH';
  amount: string;
  description?: string;
  paid_btn_name?: 'viewItem' | 'openChannel' | 'openBot' | 'callback' | 'openUrl';
  paid_btn_url?: string;
  payload?: string;
  allow_comments?: boolean;
  allow_anonymous?: boolean;
  expires_in?: number;
}

// CryptoBot возвращает ошибку в формате { ok: false, error: { code: number, name: string } },
// то есть data.error — это ОБЪЕКТ, а не строка. Раньше код делал
// `CryptoBot API error: ${data.error}`, что для объекта превращается в
// нечитаемое "[object Object]" и скрывает реальную причину (неверный токен,
// недопустимая сумма/точность для актива, неверный asset и т.п.).
function stringifyCryptoBotError(data: any): string {
  if (!data) return 'unknown error';
  const err = data.error;
  if (!err) return JSON.stringify(data);
  if (typeof err === 'string') return err;
  if (typeof err === 'object') {
    const name = err.name || err.code || 'ERROR';
    const code = err.code !== undefined ? ` (code ${err.code})` : '';
    return `${name}${code}`;
  }
  return String(err);
}

export class CryptoBotClient {
  private apiKey: string;
  private baseUrl: string;
  private webhookToken?: string;

  constructor(apiKey: string, testnet: boolean = false, webhookToken?: string) {
    this.apiKey = apiKey;
    this.baseUrl = testnet
      ? 'https://testnet-pay.crypt.bot/api'
      : 'https://pay.crypt.bot/api';
    this.webhookToken = webhookToken;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Crypto-Pay-API-Token': this.apiKey,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok || data.ok === false) {
      const message = stringifyCryptoBotError(data);
      // Полный ответ в логи Vercel — на случай если понадобятся детали за пределами
      // короткого message (например, конкретное поле, которое не прошло валидацию).
      console.error('CryptoBot API raw error response:', JSON.stringify(data));
      throw new Error(`CryptoBot API error: ${message}`);
    }

    return data as T;
  }

  async createInvoice(params: CreateInvoiceParams): Promise<CryptoBotInvoice> {
    const result = await this.request<{
      ok: boolean;
      result: CryptoBotInvoice;
    }>('POST', '/createInvoice', params);

    return result.result;
  }

  async getInvoices(
    asset?: string,
    status?: string,
    offset?: number,
    count?: number
  ): Promise<CryptoBotInvoice[]> {
    const params = new URLSearchParams();
    if (asset) params.append('asset', asset);
    if (status) params.append('status', status);
    if (offset) params.append('offset', String(offset));
    if (count) params.append('count', String(count));

    const result = await this.request<{
      ok: boolean;
      result: {
        items: CryptoBotInvoice[];
        total: number;
      };
    }>('GET', `/getInvoices?${params.toString()}`);

    return result.result.items;
  }

  async getBalance(): Promise<Record<string, number>> {
    const result = await this.request<{
      ok: boolean;
      result: Array<{ currency_code: string; available: number; frozen: number; }>;
    }>('GET', '/getBalance');

    return result.result.reduce((acc, item) => {
      acc[item.currency_code] = item.available;
      return acc;
    }, {} as Record<string, number>);
  }

  async getMe(): Promise<{ app_id: number; name: string; payment_processing_bot_username: string }> {
    const result = await this.request<{
      ok: boolean;
      result: { app_id: number; name: string; payment_processing_bot_username: string };
    }>('GET', '/getMe');

    return result.result;
  }

  verifyWebhook(body: string, signature: string): boolean {
    if (!this.webhookToken) {
      throw new Error('Webhook token is required for signature verification');
    }

    const secret = crypto.createHash('sha256').update(this.webhookToken).digest();
    const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex');
    return hmac === signature;
  }

  parseWebhook(body: string, signature: string): CryptoBotWebhook | null {
    try {
      if (this.webhookToken) {
        const isValid = this.verifyWebhook(body, signature);
        if (!isValid) {
          console.warn('Webhook signature verification failed');
          return null;
        }
      }

      const data = JSON.parse(body);
      return data as CryptoBotWebhook;
    } catch (error) {
      console.error('Error parsing webhook:', error);
      return null;
    }
  }
}

// Singleton instance
let cryptoBotInstance: CryptoBotClient | null = null;

export function getCryptoBotClient(): CryptoBotClient {
  if (!cryptoBotInstance) {
    // ВАЖНО: раньше здесь читались CRYPTO_BOT_API_KEY / CRYPTO_BOT_TESTNET /
    // CRYPTO_BOT_WEBHOOK_TOKEN, а .env.example и API-роут платежей использовали
    // CRYPTOBOT_API_TOKEN — эти переменные никогда не совпадали, поэтому
    // getCryptoBotClient() всегда падал с ошибкой "not set", даже если токен
    // был задан. Теперь имена приведены к единому стилю.
    const apiKey = process.env.CRYPTOBOT_API_TOKEN || '';
    const testnet = process.env.CRYPTOBOT_TESTNET === 'true';
    const webhookToken = process.env.CRYPTOBOT_WEBHOOK_TOKEN || '';

    if (!apiKey) {
      throw new Error('CRYPTOBOT_API_TOKEN is not set in environment variables');
    }

    cryptoBotInstance = new CryptoBotClient(apiKey, testnet, webhookToken);
  }

  return cryptoBotInstance;
}

// Utility function for webhook signature verification (exported separately)
export function verifyWebhookSignature(body: string, signature: string, token: string): boolean {
  const secret = crypto.createHash('sha256').update(token).digest();
  const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return hmac === signature;
}
