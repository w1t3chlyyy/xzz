// lib/telegram/notifications.ts
import { telegram } from "@/lib/telegram/bot-api";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

function escapeHtml(text: string): string {
  return (text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://1337-app.vercel.app";
}

/**
 * Уведомление заказчику в Telegram-бота о новом отклике на его заказ
 */
export async function notifyClientNewResponse(
  supabase: AdminClient,
  params: {
    responseId: string;
    orderId: string;
    executorId?: string;
    executorName?: string;
    executorUsername?: string;
    budget: number;
    days?: number | string;
    message: string;
  }
) {
  try {
    // 1. Получаем данные заказа и заказчика
    const { data: order } = await supabase
      .from("orders")
      .select("id, title, budget_min, budget_max, client_id")
      .eq("id", params.orderId)
      .maybeSingle();

    if (!order) {
      console.warn("notifyClientNewResponse: order not found", params.orderId);
      return { ok: false, error: "order_not_found" };
    }

    const { data: clientUser } = await supabase
      .from("users")
      .select("id, telegram_id, first_name, username")
      .eq("id", order.client_id)
      .maybeSingle();

    if (!clientUser || !clientUser.telegram_id) {
      console.warn("notifyClientNewResponse: client has no telegram_id", order.client_id);
      return { ok: false, error: "client_no_telegram_id" };
    }

    // 2. Получаем данные исполнителя (если не переданы полные)
    let executorName = params.executorName || "Специалист";
    let executorUsername = params.executorUsername ? params.executorUsername.replace(/^@/, "") : "";

    if ((!executorName || !executorUsername) && params.executorId) {
      const { data: execUser } = await supabase
        .from("users")
        .select("first_name, username")
        .eq("id", params.executorId)
        .maybeSingle();

      if (execUser) {
        if (!params.executorName && execUser.first_name) executorName = execUser.first_name;
        if (!params.executorUsername && execUser.username) executorUsername = execUser.username.replace(/^@/, "");
      }
    }

    const siteUrl = getSiteUrl();
    const orderTitle = order.title || "Заказ";
    const budgetFormatted = params.budget ? params.budget.toLocaleString("ru-RU") : "По договоренности";
    const daysFormatted = params.days ? `${params.days} дн.` : "По согласованию";
    const userMention = executorUsername ? `@${executorUsername}` : executorName;

    const notificationText =
      `📬 <b>Новый отклик на ваш заказ!</b>\n\n` +
      `📋 Заказ: <b>«${escapeHtml(orderTitle)}»</b>\n` +
      `👤 Специалист: <b>${escapeHtml(executorName)}</b> (${userMention})\n` +
      `💰 Предложенная цена: <b>${budgetFormatted} ₽</b>\n` +
      `⏱ Срок выполнения: <b>${daysFormatted}</b>\n\n` +
      `💬 <b>Сообщение от исполнителя:</b>\n` +
      `<i>«${escapeHtml(params.message)}»</i>\n\n` +
      `Выберите действие ниже:`;

    // Инлайн-кнопки прямо в Telegram-боте
    const inlineKeyboard: any[][] = [
      [
        { text: "✅ Принять отклик", callback_data: `resp_acc:${params.responseId}` },
        { text: "❌ Отклонить", callback_data: `resp_rej:${params.responseId}` },
      ],
    ];

    const bottomRow: any[] = [];
    if (executorUsername) {
      bottomRow.push({
        text: "💬 Написать в TG",
        url: `https://t.me/${executorUsername}?text=${encodeURIComponent(
          `Здравствуйте! Я по поводу вашего отклика на заказ "${orderTitle}" в 1337.`
        )}`,
      });
    }

    if (siteUrl && siteUrl.startsWith("https://")) {
      bottomRow.push({
        text: "📱 Открыть в 1337",
        web_app: { url: `${siteUrl}/orders/${order.id}` },
      });
    }

    if (bottomRow.length > 0) {
      inlineKeyboard.push(bottomRow);
    }

    const result = await telegram.sendMessage(clientUser.telegram_id, notificationText, {
      reply_markup: { inline_keyboard: inlineKeyboard },
    });

    return { ok: true, result };
  } catch (err) {
    console.error("notifyClientNewResponse error:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Уведомление исполнителю в Telegram-бота о принятии или отказе по его отклику
 */
export async function notifyExecutorResponseStatus(
  supabase: AdminClient,
  params: {
    responseId: string;
    status: "accepted" | "rejected";
    reviewerTelegramId?: number;
  }
) {
  try {
    // 1. Получаем отклик, связанный заказ и исполнителя
    const { data: response } = await supabase
      .from("responses")
      .select("id, order_id, executor_id, budget, message, status")
      .eq("id", params.responseId)
      .maybeSingle();

    if (!response) {
      console.warn("notifyExecutorResponseStatus: response not found", params.responseId);
      return { ok: false, error: "response_not_found" };
    }

    // Обновляем статус в базе
    await supabase
      .from("responses")
      .update({ status: params.status })
      .eq("id", params.responseId);

    // Получаем данные заказа
    const { data: order } = await supabase
      .from("orders")
      .select("id, title, client_id, status")
      .eq("id", response.order_id)
      .maybeSingle();

    if (!order) {
      return { ok: false, error: "order_not_found" };
    }

    // Если принят — обновляем статус заказа на in_progress (если был active)
    if (params.status === "accepted" && order.status === "active") {
      await supabase
        .from("orders")
        .update({ status: "in_progress", updated_at: new Date().toISOString() })
        .eq("id", order.id);
    }

    // Получаем данные заказчика
    const { data: clientUser } = await supabase
      .from("users")
      .select("id, telegram_id, first_name, username")
      .eq("id", order.client_id)
      .maybeSingle();

    // Получаем данные исполнителя
    const { data: execUser } = await supabase
      .from("users")
      .select("id, telegram_id, first_name, username")
      .eq("id", response.executor_id)
      .maybeSingle();

    const siteUrl = getSiteUrl();
    const orderTitle = order.title || "Заказ";
    const budgetFormatted = response.budget ? response.budget.toLocaleString("ru-RU") : "";
    const clientName = clientUser?.first_name || "Заказчик";
    const clientUsername = clientUser?.username ? clientUser.username.replace(/^@/, "") : "";
    const clientMention = clientUsername ? `@${clientUsername}` : clientName;

    // 2. Если у исполнителя есть telegram_id — отправляем сообщение в бота
    if (execUser?.telegram_id) {
      if (params.status === "accepted") {
        const acceptText =
          `🎉 <b>Ваш отклик принят заказчиком!</b>\n\n` +
          `Заказчик <b>${escapeHtml(clientName)}</b> (${clientMention}) выбрал вас исполнителем по заказу:\n` +
          `📋 <b>«${escapeHtml(orderTitle)}»</b>\n` +
          (budgetFormatted ? `💰 Согласованный бюджет: <b>${budgetFormatted} ₽</b>\n\n` : `\n`) +
          `🚀 Свяжитесь с заказчиком в Telegram для уточнения всех деталей и начала работы!`;

        const buttons: any[][] = [];
        const actionRow: any[] = [];

        if (clientUsername) {
          actionRow.push({
            text: "💬 Написать заказчику",
            url: `https://t.me/${clientUsername}?text=${encodeURIComponent(
              `Здравствуйте, ${clientName}! Вы приняли мой отклик по заказу "${orderTitle}" в 1337. Готов приступать к работе!`
            )}`,
          });
        }

        if (siteUrl && siteUrl.startsWith("https://")) {
          actionRow.push({
            text: "📱 Открыть заказ",
            web_app: { url: `${siteUrl}/orders/${order.id}` },
          });
        }

        if (actionRow.length > 0) buttons.push(actionRow);

        await telegram.sendMessage(execUser.telegram_id, acceptText, {
          reply_markup: buttons.length > 0 ? { inline_keyboard: buttons } : undefined,
        });
      } else {
        // rejected
        const rejectText =
          `ℹ️ <b>Статус вашего отклика обновлен</b>\n\n` +
          `Заказчик отклонил ваше предложение по заказу:\n` +
          `📋 <b>«${escapeHtml(orderTitle)}»</b>\n\n` +
          `💪 Не расстраивайтесь! В ленте 1337 регулярно появляются новые интересные заказы. Попробуйте предложить решение другим заказчикам.`;

        const buttons: any[][] = [];
        if (siteUrl && siteUrl.startsWith("https://")) {
          buttons.push([
            {
              text: "📋 Смотреть ленту заказов",
              web_app: { url: `${siteUrl}/feed` },
            },
          ]);
        }

        await telegram.sendMessage(execUser.telegram_id, rejectText, {
          reply_markup: buttons.length > 0 ? { inline_keyboard: buttons } : undefined,
        });
      }
    }

    return {
      ok: true,
      order,
      response,
      clientUser,
      execUser,
    };
  } catch (err) {
    console.error("notifyExecutorResponseStatus error:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
