import TelegramBot from "node-telegram-bot-api";
import { createClient } from "@supabase/supabase-js";

// ВРЕМЕННО для диагностики — удалить после проверки
console.log(
  "BOT TOKEN fingerprint:",
  process.env.TELEGRAM_BOT_TOKEN?.length,
  process.env.TELEGRAM_BOT_TOKEN?.slice(0, 6)
);

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: true });
// ...остальной код без изменений
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_IDS = (process.env.ADMIN_TELEGRAM_ID || "").split(",").map(id => parseInt(id.trim()));

function isAdmin(userId: number): boolean {
  return ADMIN_IDS.includes(userId);
}

// Команда /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  if (!userId) return;

  // Получаем приветствие из настроек
  const { data: settings } = await supabase
    .from("settings")
    .select("welcome_message")
    .single();

  const welcomeText = settings?.welcome_message || 
    `👋 Добро пожаловать в <b>1337</b>!\n\n` +
    `🎯 Фриланс биржа прямо в Telegram\n` +
    `💼 Находите заказы и исполнителей\n` +
    `⚡️ AI-помощник для откликов\n\n` +
    `Нажмите кнопку ниже, чтобы открыть приложение:`;

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: "🚀 Открыть 1337",
          web_app: { url: process.env.NEXT_PUBLIC_SITE_URL! },
        },
      ],
    ],
  };

  bot.sendMessage(chatId, welcomeText, {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
});

// Команда /admin
bot.onText(/\/admin/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  if (!userId || !isAdmin(userId)) {
    bot.sendMessage(chatId, "⛔️ У вас нет доступа к админ-панели.");
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

  bot.sendMessage(chatId, "🔧 <b>Админ-панель 1337</b>\n\nВыберите действие:", {
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

  if (!isAdmin(userId)) {
    bot.answerCallbackQuery(query.id, { text: "Нет доступа" });
    return;
  }

  if (data === "admin_stats") {
    // Статистика
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

    bot.editMessageText(statsText, {
      chat_id: chatId,
      message_id: query.message?.message_id,
      parse_mode: "HTML",
    });
  }

  if (data === "admin_welcome") {
    bot.sendMessage(chatId, 
      "✏️ Отправьте новое приветственное сообщение.\n\n" +
      "Текущее можно посмотреть через /start",
      { parse_mode: "HTML" }
    );

    // Устанавливаем состояние ожидания
    bot.once("message", async (msg) => {
      if (msg.chat.id !== chatId) return;

      await supabase
        .from("settings")
        .update({ welcome_message: msg.text })
        .eq("id", 1);

      bot.sendMessage(chatId, "✅ Приветственное сообщение обновлено!");
    });
  }

  if (data === "admin_prices") {
    const { data: settings } = await supabase
      .from("settings")
      .select("pro_price, ai_pro_price")
      .single();

    const pricesText = 
      `💰 <b>Текущие цены</b>\n\n` +
      `Pro: <b>${settings?.pro_price || 990} ₽</b>\n` +
      `AI Pro: <b>${settings?.ai_pro_price || 1990} ₽</b>\n\n` +
      `Отправьте новые цены в формате: PRO AI_PRO\n` +
      `Пример: <code>990 1990</code>`;

    bot.sendMessage(chatId, pricesText, { parse_mode: "HTML" });

    bot.once("message", async (msg) => {
      if (msg.chat.id !== chatId) return;

      const prices = msg.text?.split(" ").map(p => parseInt(p));
      if (prices && prices.length === 2 && prices.every(p => !isNaN(p))) {
        await supabase
          .from("settings")
          .update({ pro_price: prices[0], ai_pro_price: prices[1] })
          .eq("id", 1);

        bot.sendMessage(chatId, "✅ Цены обновлены!");
      } else {
        bot.sendMessage(chatId, "❌ Неверный формат. Используйте: 990 1990");
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

    bot.editMessageText(usersText, {
      chat_id: chatId,
      message_id: query.message?.message_id,
      parse_mode: "HTML",
    });
  }

  bot.answerCallbackQuery(query.id);
});

console.log("🤖 Telegram bot started");
