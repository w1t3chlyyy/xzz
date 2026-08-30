// lib/telegram/bot-api.ts
// Тонкий серверный клиент Telegram Bot API поверх fetch — без node-telegram-bot-api,
// потому что этот файл вызывается из serverless-роутов (по одному запросу за раз),
// а не из долгоживущего процесса с polling.

function getBotToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN || null;
}

async function call<T = any>(method: string, payload: Record<string, unknown>): Promise<T> {
  const token = getBotToken();
  if (!token) {
    console.warn(`Telegram API "${method}" skipped: TELEGRAM_BOT_TOKEN is not set`);
    return { ok: false, description: "TELEGRAM_BOT_TOKEN is not set" } as T;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error(`Telegram API "${method}" failed:`, data.description || data);
    }
    return data as T;
  } catch (err) {
    console.error(`Telegram API "${method}" network error:`, err);
    return { ok: false, description: String(err) } as T;
  }
}

export const telegram = {
  sendMessage: (chatId: number | string, text: string, extra: Record<string, unknown> = {}) =>
    call("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", ...extra }),

  // photo: либо file_id уже загруженного в Telegram файла, либо прямой https URL.
  sendPhoto: (chatId: number | string, photo: string, extra: Record<string, unknown> = {}) =>
    call("sendPhoto", { chat_id: chatId, photo, parse_mode: "HTML", ...extra }),

  editMessageText: (
    chatId: number | string,
    messageId: number,
    text: string,
    extra: Record<string, unknown> = {}
  ) => call("editMessageText", { chat_id: chatId, message_id: messageId, text, parse_mode: "HTML", ...extra }),

  answerCallbackQuery: (callbackQueryId: string, extra: Record<string, unknown> = {}) =>
    call("answerCallbackQuery", { callback_query_id: callbackQueryId, ...extra }),

  answerPreCheckoutQuery: (preCheckoutQueryId: string, ok: boolean, errorMessage?: string) =>
    call("answerPreCheckoutQuery", {
      pre_checkout_query_id: preCheckoutQueryId,
      ok,
      ...(errorMessage ? { error_message: errorMessage } : {}),
    }),

  // Telegram Stars: currency must be "XTR", prices in the smallest unit (whole stars).
  sendInvoice: (chatId: number | string, params: Record<string, unknown>) =>
    call("sendInvoice", { chat_id: chatId, ...params }),

  forwardMessage: (chatId: number | string, fromChatId: number | string, messageId: number) =>
    call("forwardMessage", { chat_id: chatId, from_chat_id: fromChatId, message_id: messageId }),

  setWebhook: (url: string, secretToken?: string) =>
    call("setWebhook", {
      url,
      allowed_updates: ["message", "callback_query", "pre_checkout_query"],
      ...(secretToken ? { secret_token: secretToken } : {}),
    }),

  deleteWebhook: () => call("deleteWebhook", {}),
};
