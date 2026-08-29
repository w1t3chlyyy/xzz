// app/api/telegram/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { telegram } from "@/lib/telegram/bot-api";
import { createAdminClient } from "@/lib/supabase/admin";

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

const TIER_LABEL: Record<string, string> = { pro: "Pro", ai_pro: "AI Pro" };

export async function GET() {
  return NextResponse.json({ ok: true, message: "Telegram webhook is alive" });
}

export async function POST(req: NextRequest) {
  // Telegram подписывает запросы заголовком secret_token, если он был указан
  // при вызове setWebhook. Без этой проверки любой в интернете мог бы слать
  // сюда поддельные апдейты (в том числе поддельные "successful_payment").
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
      // Обязательно ответить в течение 10 секунд, иначе платёж Stars отменится.
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

  // 1. Успешная оплата Telegram Stars
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

  // 2. Фото = вероятный чек об оплате по реквизитам
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

  // 3. /start
  if (/^\/start\b/.test(text)) {
    const { data: settings } = await supabase.from("settings").select("welcome_message").single();
    const welcomeText =
      settings?.welcome_message ||
      `👋 Добро пожаловать в <b>1337</b>!\n\n🎯 Фриланс биржа прямо в Telegram\n💼 Находите заказы и исполнителей\n⚡️ AI-помощник для откликов`;

    await telegram.sendMessage(chatId, welcomeText, {
      reply_markup: {
        inline_keyboard: [[{ text: "🚀 Открыть 1337", web_app: { url: process.env.NEXT_PUBLIC_SITE_URL } }]],
      },
    });
    return;
  }

  // Всё, что ниже — только для админов
  if (!userId || !isAdmin(userId)) return;

  // 4. /admin — меню
  if (/^\/admin\b/.test(text)) {
    await telegram.sendMessage(
      chatId,
      "🔧 <b>Админ-панель 1337</b>\n\n" +
        "Команды:\n" +
        "<code>/setwelcome текст</code> — приветствие в /start\n" +
        "<code>/setprices 990 1990</code> — цены Pro / AI Pro (₽)\n" +
        "<code>/setrequisites текст</code> — реквизиты для оплаты переводом\n",
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

  // 5. /setwelcome <текст>
  if (/^\/setwelcome\b/.test(text)) {
    const value = text.replace(/^\/setwelcome\b/, "").trim();
    if (!value) {
      await telegram.sendMessage(chatId, "Использование: /setwelcome текст приветствия");
      return;
    }
    await supabase.from("settings").update({ welcome_message: value }).eq("id", 1);
    await telegram.sendMessage(chatId, "✅ Приветствие обновлено.");
    return;
  }

  // 6. /setprices <pro> <ai_pro>
  if (/^\/setprices\b/.test(text)) {
    const parts = text.replace(/^\/setprices\b/, "").trim().split(/\s+/).map(Number);
    if (parts.length !== 2 || parts.some((p) => Number.isNaN(p))) {
      await telegram.sendMessage(chatId, "Использование: /setprices 990 1990");
      return;
    }
    await supabase.from("settings").update({ pro_price: parts[0], ai_pro_price: parts[1] }).eq("id", 1);
    await telegram.sendMessage(chatId, "✅ Цены обновлены.");
    return;
  }

  // 7. /setrequisites <текст>
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
}

async function handleCallback(cq: any, supabase: AdminClient) {
  const chatId = cq.message?.chat.id;
  const messageId = cq.message?.message_id;
  const userId: number = cq.from.id;
  const data: string = cq.data || "";

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

// Общая точка выдачи подписки внутри этого файла — используется и админом
// (ручное подтверждение), и обработчиком successful_payment для Stars.
// ВАЖНО: это единственное место в файле, где subscription_tier/expires_at
// меняются, и вызывается оно только из серверного кода с service_role.
// Функция намеренно НЕ экспортируется: route.ts в App Router разрешает
// экспортировать только GET/POST/... — любой другой export ломает сборку
// ("is not a valid Route export field"). Логика для CryptoBot-вебхука
// продублирована в app/api/payments/webhook/route.ts самостоятельно.
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

