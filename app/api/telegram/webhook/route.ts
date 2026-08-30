// app/api/telegram/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { telegram } from "@/lib/telegram/bot-api";
import { createAdminClient } from "@/lib/supabase/admin";
import { telegramEntitiesToHtml, stripCommandWithEntities, type TelegramMessageEntity } from "@/lib/telegram/entities";
import { notifyExecutorResponseStatus } from "@/lib/telegram/notifications";

type AdminClient = ReturnType<typeof createAdminClient>;

const ADMIN_IDS = (process.env.ADMIN_TELEGRAM_ID || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map(Number)
  .filter((n) => !Number.isNaN(n));

function isAdmin(userId: number): boolean {
  return ADMIN_IDS.includes(userId);
}

const TIER_LABEL: Record<string, string> = { pro: "Pro" };

// ⬇️ Ссылки на канал, поддержку и Mini App
const CHANNEL_URL = "https://t.me/F1337C";      // ← замените на ваш канал
const SUPPORT_URL = "https://t.me/F1337H";  // ← замените на ваш support-аккаунт
const MINI_APP_DIRECT_URL = "https://t.me/F1337Bot/app";

export async function GET() {
  return NextResponse.json({ ok: true, message: "Telegram webhook is alive" });
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (process.env.TELEGRAM_WEBHOOK_SECRET && secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const update = await req.json().catch(() => null);
  if (!update) return NextResponse.json({ ok: true });

  const supabase = createAdminClient();

  try {
    if (update.message) {
      await handleMessage(update.message, supabase);
    } else if (update.callback_query) {
      await handleCallback(update.callback_query, supabase);
    } else if (update.pre_checkout_query) {
      await telegram.answerPreCheckoutQuery(update.pre_checkout_query.id, true);
    }
  } catch (err) {
    console.error("Telegram webhook handling error:", err);
  }

  return NextResponse.json({ ok: true });
}

async function handleMessage(msg: any, supabase: AdminClient) {
  const chatId = msg.chat.id;
  const userId: number | undefined = msg.from?.id;
  const text: string = msg.text || "";
  const caption: string = msg.caption || "";

  if (msg.successful_payment) {
    let payload: { paymentId?: string } = {};
    try {
      payload = JSON.parse(msg.successful_payment.invoice_payload || "{}");
    } catch {
      /* ignore */
    }
    if (payload.paymentId) {
      await confirmPayment(supabase, payload.paymentId);
      await telegram.sendMessage(chatId, "✅ Оплата Stars получена! Подписка активирована.");
    }
    return;
  }

  if (msg.photo && userId && isAdmin(userId) && /^\/setwelcome\b/.test(caption)) {
    await handleSetWelcomePhoto(msg, supabase);
    return;
  }

  if (msg.photo && userId) {
    const { data: pending } = await supabase
      .from("payments")
      .select("id, tier, amount, currency")
      .eq("telegram_id", userId)
      .eq("method", "bank")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pending) {
      const fileId = msg.photo[msg.photo.length - 1].file_id;
      await supabase.from("payments").update({ proof_file_id: fileId }).eq("id", pending.id);

      await telegram.sendMessage(chatId, "🧾 Чек получен, ожидайте подтверждения от администратора.");

      for (const adminId of ADMIN_IDS) {
        await telegram.forwardMessage(adminId, chatId, msg.message_id);
        await telegram.sendMessage(
          adminId,
          `Заявка на оплату <b>${TIER_LABEL[pending.tier] || pending.tier}</b>\n` +
            `Сумма: ${pending.amount} ${pending.currency}\n` +
            `От: tg${userId}\n` +
            `Payment ID: <code>${pending.id}</code>`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "✅ Подтвердить", callback_data: `confirm:${pending.id}` },
                  { text: "❌ Отклонить", callback_data: `reject:${pending.id}` },
                ],
              ],
            },
          }
        );
      }
    }
    return;
  }

  if (!text) return;

  if (/^\/start\b/.test(text)) {
    await sendWelcome(chatId, supabase);
    return;
  }

  if (!userId || !isAdmin(userId)) return;

  if (/^\/admin\b/.test(text)) {
    await telegram.sendMessage(
      chatId,
      "🔧 <b>Админ-панель 1337</b>\n\n" +
        "Команды:\n" +
        "<code>/setwelcome текст</code> — текст приветствия в /start. Можно использовать жирный/курсив/эмодзи (в т.ч. премиум) — просто наберите их в самом сообщении с командой.\n" +
        "Отправьте <b>фото с подписью</b> <code>/setwelcome текст</code> — чтобы приветствие показывалось с картинкой.\n" +
        "<code>/removewelcomephoto</code> — убрать фото из приветствия (текст останется).\n" +
        "<code>/setprices 990</code> — цена подписки Pro (₽)\n" +
        "<code>/setrequisites текст</code> — реквизиты для оплаты переводом\n" +
        "<code>/grant telegram_id дни</code> — вручную выдать/продлить подписку Pro\n" +
        "<code>/revoke telegram_id</code> — досрочно снять подписку\n" +
        "<code>/broadcast текст</code> — рассылка всем пользователям бота\n",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📊 Статистика", callback_data: "admin_stats" }],
            [{ text: "🧾 Заявки на оплату", callback_data: "admin_pending" }],
            [{ text: "👥 Пользователи", callback_data: "admin_users" }],
          ],
        },
      }
    );
    return;
  }

  if (/^\/setwelcome\b/.test(text)) {
    const { text: value, entities } = stripCommandWithEntities(text, msg.entities as TelegramMessageEntity[] | undefined);

    if (!value.trim()) {
      await telegram.sendMessage(
        chatId,
        "Использование: <code>/setwelcome текст приветствия</code>\n" +
          "Форматирование и премиум-эмодзи можно вставлять прямо в это сообщение.\n" +
          "Чтобы добавить картинку — отправьте фото с такой же подписью вместо обычного сообщения."
      );
      return;
    }

    const html = telegramEntitiesToHtml(value, entities);

    await supabase
      .from("settings")
      .update({ welcome_message: html, welcome_photo_file_id: null })
      .eq("id", 1);

    await telegram.sendMessage(chatId, "✅ Приветствие обновлено (текст, без фото).");
    return;
  }

  if (/^\/removewelcomephoto\b/.test(text)) {
    await supabase.from("settings").update({ welcome_photo_file_id: null }).eq("id", 1);
    await telegram.sendMessage(chatId, "✅ Фото приветствия убрано.");
    return;
  }

  if (/^\/setprices\b/.test(text)) {
    const value = Number(text.replace(/^\/setprices\b/, "").trim());
    if (Number.isNaN(value)) {
      await telegram.sendMessage(chatId, "Использование: /setprices 990");
      return;
    }
    await supabase.from("settings").update({ pro_price: value }).eq("id", 1);
    await telegram.sendMessage(chatId, "✅ Цена обновлена.");
    return;
  }

  if (/^\/setrequisites\b/.test(text)) {
    const value = text.replace(/^\/setrequisites\b/, "").trim();
    if (!value) {
      await telegram.sendMessage(chatId, "Использование: /setrequisites текст с банковскими реквизитами");
      return;
    }
    await supabase
      .from("payment_requisites")
      .update({ details: value, updated_at: new Date().toISOString() })
      .eq("id", 1);
    await telegram.sendMessage(chatId, "✅ Реквизиты обновлены.");
    return;
  }

  if (/^\/grant\b/.test(text)) {
    const parts = text.trim().split(/\s+/).slice(1);
    const targetId = Number(parts[0]);
    const days = Number(parts[1]) || 30;

    if (!targetId || Number.isNaN(targetId)) {
      await telegram.sendMessage(
        chatId,
        "Использование: <code>/grant telegram_id дни</code>\nПример: <code>/grant 123456789 30</code>"
      );
      return;
    }

    const { data: targetUser } = await supabase
      .from("users")
      .select("id, subscription_tier, subscription_expires_at")
      .eq("telegram_id", targetId)
      .maybeSingle();

    if (!targetUser) {
      await telegram.sendMessage(chatId, `❌ Пользователь с telegram_id ${targetId} не найден в базе.`);
      return;
    }

    const now = Date.now();
    const currentExpiry = targetUser.subscription_expires_at
      ? new Date(targetUser.subscription_expires_at).getTime()
      : 0;
    const sameTierStillActive = currentExpiry > now && targetUser.subscription_tier === "pro";
    const base = sameTierStillActive ? currentExpiry : now;
    const newExpiry = new Date(base + days * 86400000).toISOString();

    await supabase
      .from("users")
      .update({ subscription_tier: "pro", subscription_expires_at: newExpiry })
      .eq("id", targetUser.id);

    await telegram.sendMessage(
      chatId,
      `✅ Подписка Pro выдана tg${targetId} на ${days} дн. (до ${new Date(newExpiry).toLocaleDateString("ru-RU")}).`
    );

    await telegram
      .sendMessage(targetId, `🎉 Администратор выдал вам подписку <b>Pro</b> на ${days} дней!`)
      .catch(() => {});
    return;
  }

  if (/^\/revoke\b/.test(text)) {
    const parts = text.trim().split(/\s+/).slice(1);
    const targetId = Number(parts[0]);

    if (!targetId || Number.isNaN(targetId)) {
      await telegram.sendMessage(chatId, "Использование: <code>/revoke telegram_id</code>");
      return;
    }

    const { data: targetUser } = await supabase
      .from("users")
      .select("id")
      .eq("telegram_id", targetId)
      .maybeSingle();

    if (!targetUser) {
      await telegram.sendMessage(chatId, `❌ Пользователь с telegram_id ${targetId} не найден.`);
      return;
    }

    await supabase
      .from("users")
      .update({ subscription_tier: "free", subscription_expires_at: null })
      .eq("id", targetUser.id);

    await telegram.sendMessage(chatId, `✅ Подписка tg${targetId} снята.`);
    return;
  }

  if (/^\/broadcast\b/.test(text)) {
    const { text: value, entities } = stripCommandWithEntities(
      text,
      msg.entities as TelegramMessageEntity[] | undefined
    );

    if (!value.trim()) {
      await telegram.sendMessage(
        chatId,
        "Использование: <code>/broadcast текст сообщения</code>\n" +
          "Форматирование и эмодзи можно вставлять прямо в это сообщение.\n" +
          "Сообщение уйдёт всем пользователям, у которых есть telegram_id в базе."
      );
      return;
    }

    const html = telegramEntitiesToHtml(value, entities);

    const { data: allUsers } = await supabase
      .from("users")
      .select("telegram_id")
      .not("telegram_id", "is", null);

    const targets = (allUsers || []).map((u) => u.telegram_id).filter(Boolean) as number[];

    if (targets.length === 0) {
      await telegram.sendMessage(chatId, "В базе нет пользователей с telegram_id — рассылать некому.");
      return;
    }

    await telegram.sendMessage(chatId, `📣 Рассылка начата: ${targets.length} получателей...`);

    let sent = 0;
    let failed = 0;

    const BATCH_SIZE = 20;
    const DELAY_MS = 1000;

    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
      const batch = targets.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(batch.map((id) => telegram.sendMessage(id, html)));
      results.forEach((r) => (r.status === "fulfilled" ? sent++ : failed++));

      if (i + BATCH_SIZE < targets.length) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    }

    await telegram.sendMessage(
      chatId,
      `✅ Рассылка завершена.\nДоставлено: <b>${sent}</b>\nОшибок: <b>${failed}</b>` +
        (failed > 0
          ? "\n\n<i>Ошибки обычно означают, что пользователь заблокировал бота или ни разу не писал ему /start.</i>"
          : "")
    );
    return;
  }
}

async function handleSetWelcomePhoto(msg: any, supabase: AdminClient) {
  const chatId = msg.chat.id;
  const caption: string = msg.caption || "";

  const { text: value, entities } = stripCommandWithEntities(
    caption,
    msg.caption_entities as TelegramMessageEntity[] | undefined
  );

  if (!value.trim()) {
    await telegram.sendMessage(
      chatId,
      "Подпись к фото должна содержать текст приветствия после команды.\n" +
        "Пример подписи: <code>/setwelcome Добро пожаловать в 1337! 🎉</code>"
    );
    return;
  }

  const fileId = msg.photo[msg.photo.length - 1].file_id;
  const html = telegramEntitiesToHtml(value, entities);

  await supabase
    .from("settings")
    .update({ welcome_message: html, welcome_photo_file_id: fileId })
    .eq("id", 1);

  await telegram.sendMessage(chatId, "✅ Приветствие обновлено (текст + фото).");
}

async function sendWelcome(chatId: number | string, supabase: AdminClient) {
  const { data: settings } = await supabase
    .from("settings")
    .select("welcome_message, welcome_photo_file_id")
    .single();

  const welcomeText =
    settings?.welcome_message ||
    `👋 Добро пожаловать в <b>1337</b>!\n\n🎯 Фриланс биржа прямо в Telegram\n💼 Находите заказы и исполнителей`;

  // ⬇️ Кнопки теперь используют константы, объявленные вверху файла
  const keyboard = {
    inline_keyboard: [
      [{ text: "Открыть биржу", url: MINI_APP_DIRECT_URL }],
      [
        { text: "Канал новостей", url: CHANNEL_URL },
        { text: "Поддержка", url: SUPPORT_URL },
      ],
    ],
  };

  if (settings?.welcome_photo_file_id) {
    const result: any = await telegram.sendPhoto(chatId, settings.welcome_photo_file_id, {
      caption: welcomeText,
      reply_markup: keyboard,
    });

    if (result?.ok) return;

    console.warn(
      "sendWelcome: invalid welcome_photo_file_id, clearing and falling back to text:",
      result?.description
    );
    await supabase.from("settings").update({ welcome_photo_file_id: null }).eq("id", 1);
  }

  await telegram.sendMessage(chatId, welcomeText, { reply_markup: keyboard });
}

async function handleCallback(cq: any, supabase: AdminClient) {
  const chatId = cq.message?.chat.id;
  const messageId = cq.message?.message_id;
  const userId: number = cq.from.id;
  const data: string = cq.data || "";

  // 1. Обработка откликов на заказы (принятие/отказ заказчиком прямо в боте)
  if (data.startsWith("resp_acc:") || data.startsWith("resp_rej:")) {
    const isAccept = data.startsWith("resp_acc:");
    const responseId = data.replace(/^resp_(acc|rej):/, "");

    const result = await notifyExecutorResponseStatus(supabase, {
      responseId,
      status: isAccept ? "accepted" : "rejected",
      reviewerTelegramId: userId,
    });

    if (result.ok && chatId && messageId) {
      const execName = result.execUser?.first_name || "Специалист";
      const execUsername = result.execUser?.username ? result.execUser.username.replace(/^@/, "") : "";
      const orderTitle = result.order?.title || "Заказ";
      const budgetText = result.response?.budget ? `${result.response.budget.toLocaleString("ru-RU")} ₽` : "";
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

      if (isAccept) {
        const text =
          `✅ <b>Вы приняли отклик от ${execName}!</b>\n\n` +
          `📋 Заказ: <b>«${orderTitle}»</b>\n` +
          (budgetText ? `💰 Согласованный бюджет: <b>${budgetText}</b>\n\n` : `\n`) +
          `🤝 Свяжитесь с исполнителем в Telegram для старта работы.`;

        const keyboard: any[][] = [];
        const row: any[] = [];
        if (execUsername) {
          row.push({
            text: `💬 Написать @${execUsername}`,
            url: `https://t.me/${execUsername}`,
          });
        }
        if (siteUrl && siteUrl.startsWith("https://")) {
          row.push({
            text: "📱 Открыть заказ",
            web_app: { url: `${siteUrl}/orders/${result.order?.id}` },
          });
        }
        if (row.length > 0) keyboard.push(row);

        await telegram.editMessageText(chatId, messageId, text, {
          reply_markup: keyboard.length > 0 ? { inline_keyboard: keyboard } : undefined,
        });
      } else {
        const text =
          `❌ <b>Отклик от ${execName} отклонен.</b>\n\n` +
          `📋 Заказ: <b>«${orderTitle}»</b>\n\n` +
          `Вы можете выбрать другого специалиста из оставшихся откликов.`;

        await telegram.editMessageText(chatId, messageId, text);
      }
    }

    await telegram.answerCallbackQuery(cq.id, {
      text: isAccept ? "✅ Отклик успешно принят!" : "❌ Отклик отклонен",
    });
    return;
  }

  // 2. Админские действия
  if (!isAdmin(userId)) {
    await telegram.answerCallbackQuery(cq.id, { text: "Нет доступа" });
    return;
  }

  if (data === "admin_stats") {
    const [{ count: usersCount }, { count: ordersCount }, { count: responsesCount }, { data: payments }] =
      await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("responses").select("*", { count: "exact", head: true }),
        supabase.from("payments").select("amount, currency").eq("status", "paid"),
      ]);

    const revenueByCurrency: Record<string, number> = {};
    (payments || []).forEach((p) => {
      revenueByCurrency[p.currency] = (revenueByCurrency[p.currency] || 0) + p.amount;
    });
    const revenueText =
      Object.entries(revenueByCurrency)
        .map(([cur, amt]) => `${amt.toLocaleString()} ${cur}`)
        .join(", ") || "0";

    await telegram.editMessageText(
      chatId,
      messageId,
      `📊 <b>Статистика 1337</b>\n\n` +
        `👥 Пользователей: <b>${usersCount || 0}</b>\n` +
        `📋 Заказов: <b>${ordersCount || 0}</b>\n` +
        `💬 Откликов: <b>${responsesCount || 0}</b>\n` +
        `💰 Оплачено: <b>${revenueText}</b>`
    );
  }

  if (data === "admin_pending") {
    const { data: pendingPayments } = await supabase
      .from("payments")
      .select("id, tier, amount, currency, method, telegram_id, created_at")
      .eq("status", "pending")
      .in("method", ["bank", "crypto"])
      .order("created_at", { ascending: false })
      .limit(10);

    if (!pendingPayments || pendingPayments.length === 0) {
      await telegram.editMessageText(chatId, messageId, "🧾 Заявок на подтверждение сейчас нет.");
    } else {
      const rows = pendingPayments.map((p) => [
        { text: `✅ ${p.tier} tg${p.telegram_id}`, callback_data: `confirm:${p.id}` },
        { text: "❌", callback_data: `reject:${p.id}` },
      ]);
      const list = pendingPayments
        .map(
          (p) =>
            `• <b>${TIER_LABEL[p.tier] || p.tier}</b> — ${p.amount} ${p.currency} (${p.method}) от tg${p.telegram_id}`
        )
        .join("\n");
      await telegram.editMessageText(chatId, messageId, `🧾 <b>Заявки на оплату</b>\n\n${list}`, {
        reply_markup: { inline_keyboard: rows },
      });
    }
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
    await telegram.editMessageText(chatId, messageId, usersText);
  }

  if (data.startsWith("confirm:")) {
    const paymentId = data.split(":")[1];
    await confirmPayment(supabase, paymentId, userId);
    await telegram.editMessageText(chatId, messageId, "✅ Оплата подтверждена, подписка выдана.");
  }

  if (data.startsWith("reject:")) {
    const paymentId = data.split(":")[1];
    await rejectPayment(supabase, paymentId, userId);
    await telegram.editMessageText(chatId, messageId, "❌ Оплата отклонена.");
  }

  await telegram.answerCallbackQuery(cq.id);
}

async function confirmPayment(supabase: AdminClient, paymentId: string, adminId?: number) {
  const { data: payment } = await supabase.from("payments").select("*").eq("id", paymentId).single();
  if (!payment || payment.status === "paid") return;

  const { data: userRow } = await supabase
    .from("users")
    .select("subscription_tier, subscription_expires_at, telegram_id")
    .eq("id", payment.user_id)
    .single();

  const now = Date.now();
  const currentExpiry = userRow?.subscription_expires_at ? new Date(userRow.subscription_expires_at).getTime() : 0;
  const sameTierStillActive = currentExpiry > now && userRow?.subscription_tier === payment.tier;
  const base = sameTierStillActive ? currentExpiry : now;
  const newExpiry = new Date(base + (payment.duration_days || 30) * 86400000).toISOString();

  await supabase
    .from("payments")
    .update({ status: "paid", paid_at: new Date().toISOString(), reviewed_by: adminId ?? null, reviewed_at: new Date().toISOString() })
    .eq("id", paymentId);

  await supabase
    .from("users")
    .update({ subscription_tier: payment.tier, subscription_expires_at: newExpiry })
    .eq("id", payment.user_id);

  if (userRow?.telegram_id) {
    await telegram.sendMessage(
      userRow.telegram_id,
      `✅ Оплата подтверждена! Тариф <b>${TIER_LABEL[payment.tier] || payment.tier}</b> активирован.`
    );
  }
}

async function rejectPayment(supabase: AdminClient, paymentId: string, adminId?: number) {
  const { data: payment } = await supabase.from("payments").select("*").eq("id", paymentId).single();
  if (!payment || payment.status === "paid") return;

  await supabase
    .from("payments")
    .update({ status: "rejected", reviewed_by: adminId ?? null, reviewed_at: new Date().toISOString() })
    .eq("id", paymentId);

  const { data: userRow } = await supabase.from("users").select("telegram_id").eq("id", payment.user_id).single();
  if (userRow?.telegram_id) {
    await telegram.sendMessage(userRow.telegram_id, "❌ Оплата не подтверждена. Если это ошибка — напишите в поддержку.");
  }
}
