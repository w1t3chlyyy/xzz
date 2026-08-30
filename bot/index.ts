// Загружаем переменные окружения из .env / .env.local ЯВНО.
// Next.js делает это сам для приложения, но этот файл запускается
// как отдельный процесс (node/tsx), поэтому без dotenv process.env.* будет пустым —
// и это самая частая причина, почему бот "не реагирует" вообще ни на что.
import "dotenv/config";

import TelegramBot from "node-telegram-bot-api";
import { createClient } from "@supabase/supabase-js";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error(
    "TELEGRAM_BOT_TOKEN не задан. Проверьте .env.local и что процесс бота запускается с загрузкой env (см. package.json -> \"bot\")."
  );
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Список админов: раньше при пустом ADMIN_TELEGRAM_ID получался массив [NaN],
// из-за чего isAdmin() всегда возвращал false — /admin отвечал "нет доступа"
// даже настоящему админу. Теперь пустые/некорректные значения отфильтровываются.
const ADMIN_IDS = (process.env.ADMIN_TELEGRAM_ID || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean)
  .map((id) => parseInt(id, 10))
  .filter((id) => !Number.isNaN(id));

function isAdmin(userId: number): boolean {
  return ADMIN_IDS.includes(userId);
}

async function start() {
  const bot = new TelegramBot(BOT_TOKEN!, { polling: false });

  // Если на этот токен когда-то был установлен webhook (например, при попытке
  // задеплоить бота на Vercel как serverless-функцию), Telegram НЕ будет
  // присылать обновления через long polling — вместо этого polling будет падать
  // с ошибкой 409 Conflict. Явно снимаем webhook перед стартом polling.
  await bot.deleteWebHook();
  await bot.startPolling();

  console.log("🤖 Telegram bot started (polling)");
  console.log("Admin IDs:", ADMIN_IDS.length ? ADMIN_IDS : "не заданы (проверьте ADMIN_TELEGRAM_ID)");

  // Логируем ошибки polling — раньше они были не видны, и бот "молча" не отвечал.
  bot.on("polling_error", (err) => {
    console.error("Polling error:", err.message);
  });

  bot.on("webhook_error", (err) => {
    console.error("Webhook error:", err.message);
  });

  // Команда /start
  bot.onText(/^\/start\b/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    if (!userId) return;

    try {
      const { data: settings } = await supabase
        .from("settings")
        .select("welcome_message")
        .single();

      const welcomeText =
        settings?.welcome_message ||
        `👋 Добро пожаловать в <b>1337</b>!\n\n` +
          `🎯 Фриланс биржа прямо в Telegram\n` +
          `💼 Находите заказы и исполнителей\n\n` +
          `Нажмите кнопку ниже, чтобы открыть приложение:`;

      const keyboard = {
        inline_keyboard: [
          [
            {
              text: "Открыть 1337",
              web_app: { url: process.env.NEXT_PUBLIC_SITE_URL! },
            },
          ],
        ],
      };

      await bot.sendMessage(chatId, welcomeText, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    } catch (err) {
      console.error("Error handling /start:", err);
      await bot.sendMessage(chatId, "⚠️ Не удалось загрузить приветствие, попробуйте позже.");
    }
  });

  // Команда /admin
  bot.onText(/^\/admin\b/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId || !isAdmin(userId)) {
      await bot.sendMessage(chatId, "⛔️ У вас нет доступа к админ-панели.");
      return;
    }

    const keyboard = {
      inline_keyboard: [
        [
          { text: "📊 Статистика", callback_data: "admin_stats" },
          { text: "✏️ Приветствие", callback_data: "admin_welcome" },
        ],
        [
          { text: "💰 Цены", callback_data: "admin_prices" },
          { text: "👥 Пользователи", callback_data: "admin_users" },
        ],
      ],
    };

    await bot.sendMessage(chatId, "🔧 <b>Админ-панель 1337</b>\n\nВыберите действие:", {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  });

  // Обработка callback
  bot.on("callback_query", async (query) => {
    const chatId = query.message?.chat.id;
    const userId = query.from.id;
    const data = query.data;

    if (!chatId || !data) return;

    try {
      // Обработка откликов на заказы (принятие/отказ заказчиком)
      if (data.startsWith("resp_acc:") || data.startsWith("resp_rej:")) {
        const isAccept = data.startsWith("resp_acc:");
        const responseId = data.replace(/^resp_(acc|rej):/, "");

        const { data: response } = await supabase
          .from("responses")
          .select("id, order_id, executor_id, budget, message, status")
          .eq("id", responseId)
          .maybeSingle();

        if (response) {
          const newStatus = isAccept ? "accepted" : "rejected";
          await supabase.from("responses").update({ status: newStatus }).eq("id", responseId);

          const { data: order } = await supabase
            .from("orders")
            .select("id, title, client_id, status")
            .eq("id", response.order_id)
            .maybeSingle();

          if (isAccept && order?.status === "active") {
            await supabase.from("orders").update({ status: "in_progress" }).eq("id", order.id);
          }

          const { data: clientUser } = await supabase
            .from("users")
            .select("id, telegram_id, first_name, username")
            .eq("id", order?.client_id)
            .maybeSingle();

          const { data: execUser } = await supabase
            .from("users")
            .select("id, telegram_id, first_name, username")
            .eq("id", response.executor_id)
            .maybeSingle();

          const execName = execUser?.first_name || "Специалист";
          const execUsername = execUser?.username ? execUser.username.replace(/^@/, "") : "";
          const clientName = clientUser?.first_name || "Заказчик";
          const clientUsername = clientUser?.username ? clientUser.username.replace(/^@/, "") : "";
          const orderTitle = order?.title || "Заказ";
          const budgetText = response.budget ? `${response.budget.toLocaleString("ru-RU")} ₽` : "";
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

          // 1. Редактируем сообщение у заказчика
          if (query.message?.message_id) {
            if (isAccept) {
              const text =
                `✅ <b>Вы приняли отклик от ${execName}!</b>\n\n` +
                `📋 Заказ: <b>«${orderTitle}»</b>\n` +
                (budgetText ? `💰 Согласованный бюджет: <b>${budgetText}</b>\n\n` : `\n`) +
                `🤝 Свяжитесь с исполнителем в Telegram для старта работы.`;

              const keyboard: any[][] = [];
              const row: any[] = [];
              if (execUsername) {
                row.push({ text: `💬 Написать @${execUsername}`, url: `https://t.me/${execUsername}` });
              }
              if (siteUrl && siteUrl.startsWith("https://")) {
                row.push({ text: "📱 Открыть заказ", web_app: { url: `${siteUrl}/orders/${order?.id}` } });
              }
              if (row.length > 0) keyboard.push(row);

              await bot.editMessageText(text, {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: "HTML",
                reply_markup: keyboard.length > 0 ? { inline_keyboard: keyboard } : undefined,
              });
            } else {
              const text =
                `❌ <b>Отклик от ${execName} отклонен.</b>\n\n` +
                `📋 Заказ: <b>«${orderTitle}»</b>\n\n` +
                `Вы можете выбрать другого специалиста из оставшихся откликов.`;

              await bot.editMessageText(text, {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: "HTML",
              });
            }
          }

          // 2. Отправляем уведомление ИСПОЛНИТЕЛЮ в Telegram-бота
          if (execUser?.telegram_id) {
            if (isAccept) {
              const acceptMsg =
                `🎉 <b>Ваш отклик принят заказчиком!</b>\n\n` +
                `Заказчик <b>${clientName}</b> ${clientUsername ? `(@${clientUsername})` : ""} принял ваше предложение по заказу:\n` +
                `📋 <b>«${orderTitle}»</b>\n` +
                (budgetText ? `💰 Согласованный бюджет: <b>${budgetText}</b>\n\n` : `\n`) +
                `🚀 Свяжитесь с заказчиком в Telegram для уточнения деталей и старта работы!`;

              const buttons: any[][] = [];
              const actionRow: any[] = [];
              if (clientUsername) {
                actionRow.push({ text: "💬 Написать заказчику", url: `https://t.me/${clientUsername}` });
              }
              if (siteUrl && siteUrl.startsWith("https://")) {
                actionRow.push({ text: "📱 Открыть заказ", web_app: { url: `${siteUrl}/orders/${order?.id}` } });
              }
              if (actionRow.length > 0) buttons.push(actionRow);

              await bot.sendMessage(execUser.telegram_id, acceptMsg, {
                parse_mode: "HTML",
                reply_markup: buttons.length > 0 ? { inline_keyboard: buttons } : undefined,
              });
            } else {
              const rejectMsg =
                `ℹ️ <b>Статус вашего отклика обновлен</b>\n\n` +
                `Заказчик отклонил ваше предложение по заказу:\n` +
                `📋 <b>«${orderTitle}»</b>\n\n` +
                `💪 Не расстраивайтесь! В ленте 1337 регулярно появляются новые интересные заказы.`;

              const buttons: any[][] = [];
              if (siteUrl && siteUrl.startsWith("https://")) {
                buttons.push([{ text: "📋 Смотреть ленту заказов", web_app: { url: `${siteUrl}/feed` } }]);
              }

              await bot.sendMessage(execUser.telegram_id, rejectMsg, {
                parse_mode: "HTML",
                reply_markup: buttons.length > 0 ? { inline_keyboard: buttons } : undefined,
              });
            }
          }
        }

        await bot.answerCallbackQuery(query.id, {
          text: isAccept ? "✅ Отклик успешно принят!" : "❌ Отклик отклонен",
        });
        return;
      }

      if (!isAdmin(userId)) {
        await bot.answerCallbackQuery(query.id, { text: "Нет доступа" });
        return;
      }
      if (data === "admin_stats") {
        const { count: usersCount } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true });

        const { count: ordersCount } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true });

        const { count: responsesCount } = await supabase
          .from("responses")
          .select("*", { count: "exact", head: true });

        const { data: payments } = await supabase
          .from("payments")
          .select("amount")
          .eq("status", "paid");

        const totalRevenue = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

        const statsText =
          `📊 <b>Статистика 1337</b>\n\n` +
          `👥 Пользователей: <b>${usersCount || 0}</b>\n` +
          `📋 Заказов: <b>${ordersCount || 0}</b>\n` +
          `💬 Откликов: <b>${responsesCount || 0}</b>\n` +
          `💰 Доход: <b>${totalRevenue.toLocaleString()} ₽</b>`;

        await bot.editMessageText(statsText, {
          chat_id: chatId,
          message_id: query.message?.message_id,
          parse_mode: "HTML",
        });
      }

      if (data === "admin_welcome") {
        await bot.sendMessage(
          chatId,
          "✏️ Отправьте новое приветственное сообщение.\n\nТекущее можно посмотреть через /start",
          { parse_mode: "HTML" }
        );

        bot.once("message", async (msg) => {
          if (msg.chat.id !== chatId) return;

          await supabase.from("settings").update({ welcome_message: msg.text }).eq("id", 1);

          await bot.sendMessage(chatId, "✅ Приветственное сообщение обновлено!");
        });
      }

      if (data === "admin_prices") {
        const { data: settings } = await supabase
          .from("settings")
          .select("pro_price")
          .single();

        const pricesText =
          `💰 <b>Текущая цена</b>\n\n` +
          `Pro: <b>${settings?.pro_price || 990} ₽</b>\n\n` +
          `Отправьте новую цену числом.\n` +
          `Пример: <code>990</code>`;

        await bot.sendMessage(chatId, pricesText, { parse_mode: "HTML" });

        bot.once("message", async (msg) => {
          if (msg.chat.id !== chatId) return;

          const price = parseInt(msg.text || "", 10);
          if (!isNaN(price)) {
            await supabase.from("settings").update({ pro_price: price }).eq("id", 1);
            await bot.sendMessage(chatId, "✅ Цена обновлена!");
          } else {
            await bot.sendMessage(chatId, "❌ Неверный формат. Используйте: 990");
          }
        });
      }

      if (data === "admin_users") {
        const { data: users } = await supabase
          .from("users")
          .select("telegram_id, first_name, username, role, subscription_tier, created_at")
          .order("created_at", { ascending: false })
          .limit(10);

        let usersText = `👥 <b>Последние 10 пользователей</b>\n\n`;
        users?.forEach((u, i) => {
          usersText += `${i + 1}. <b>${u.first_name || u.username}</b> — ${u.role || "без роли"} — ${u.subscription_tier}\n`;
        });

        await bot.editMessageText(usersText, {
          chat_id: chatId,
          message_id: query.message?.message_id,
          parse_mode: "HTML",
        });
      }

      await bot.answerCallbackQuery(query.id);
    } catch (err) {
      console.error("Error handling callback_query:", err);
      await bot.answerCallbackQuery(query.id, { text: "Ошибка, попробуйте ещё раз" });
    }
  });
}

start().catch((err) => {
  console.error("Fatal error starting bot:", err);
  process.exit(1);
});
