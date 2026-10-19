// Регистрация и выбор роли прямо в боте, затем выбор: сайт или Mini App
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseUrl, getSupabaseAnonKey } from "@/lib/supabase/config";
import { telegram } from "@/lib/telegram/bot-api";
import { signSiteToken } from "@/lib/siteToken";

type Admin = ReturnType<typeof createAdminClient>;
type From = { id: number; first_name?: string; last_name?: string; username?: string };

const APP_URL = process.env.TELEGRAM_MINI_APP_URL || "https://t.me/F1337Bot/app";
const NICHES: [string, string][] = [
  ["programming", "Программирование"],
  ["design", "Дизайн"],
  ["marketing", "Маркетинг"],
  ["copywriting", "Копирайтинг"],
];

function openKeyboard(tgId: number) {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const rows: any[][] = [];
  if (site.startsWith("https://")) rows.push([{ text: "Открыть сайт", url: `${site}/api/auth/token?t=${signSiteToken(tgId)}` }]);
  rows.push([{ text: "Остаться в Mini App", url: APP_URL }]);
  return { inline_keyboard: rows };
}

async function ensureUser(admin: Admin, from: From, patch: Record<string, unknown>): Promise<string | null> {
  const { data: ex } = await admin.from("users").select("id").eq("telegram_id", from.id).maybeSingle();
  let id: string | undefined = ex?.id;
  if (!id) {
    const email = `tg${from.id}@1337.app`;
    const password = crypto.createHmac("sha256", process.env.TELEGRAM_BOT_TOKEN || "").update(String(from.id)).digest("hex");
    const { data: created } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    id = created?.user?.id;
    if (!id) {
      const anon = createClient(getSupabaseUrl(), getSupabaseAnonKey(), { auth: { persistSession: false } });
      id = (await anon.auth.signInWithPassword({ email, password })).data.user?.id;
    }
    if (!id) return null;
  }
  await admin.from("users").upsert(
    {
      id,
      telegram_id: from.id,
      username: from.username || null,
      first_name: from.first_name || null,
      last_name: from.last_name || null,
      updated_at: new Date().toISOString(),
      ...patch,
    },
    { onConflict: "id" }
  );
  return id;
}

async function getRole(admin: Admin, tgId: number) {
  return (await admin.from("users").select("role").eq("telegram_id", tgId).maybeSingle()).data?.role as string | null | undefined;
}

export async function startOnboarding(chatId: number, from: From, admin: Admin) {
  if (await getRole(admin, from.id)) {
    await telegram.sendMessage(chatId, "Где продолжить работу?", { reply_markup: openKeyboard(from.id) });
    return;
  }
  await telegram.sendMessage(chatId, "<b>Регистрация.</b> Кем вы будете на бирже?", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Исполнитель — ищу заказы", callback_data: "ob_role:executor" }],
        [{ text: "Заказчик — ищу исполнителей", callback_data: "ob_role:client" }],
      ],
    },
  });
}

export async function handleOnboardingCallback(cq: any, admin: Admin): Promise<boolean> {
  const data: string = cq.data || "";
  if (!data.startsWith("ob_")) return false;
  const chatId = cq.message?.chat.id;
  const messageId = cq.message?.message_id;
  const from: From = cq.from;
  const edit = (text: string, markup?: unknown) =>
    chatId && messageId ? telegram.editMessageText(chatId, messageId, text, markup ? { reply_markup: markup } : {}) : Promise.resolve();

  if (await getRole(admin, from.id)) {
    await edit("Вы уже зарегистрированы. Где продолжить работу?", openKeyboard(from.id));
  } else if (data === "ob_role:executor") {
    await edit("Выберите основное направление:", {
      inline_keyboard: NICHES.map(([id, label]) => [{ text: label, callback_data: `ob_niche:${id}` }]),
    });
  } else if (data === "ob_role:client" || data.startsWith("ob_niche:")) {
    const niche = NICHES.find(([id]) => `ob_niche:${id}` === data);
    const role = niche ? "executor" : "client";
    const id = await ensureUser(admin, from, { role });
    if (!id) {
      await edit("Не удалось завершить регистрацию. Нажмите /start и попробуйте ещё раз.");
    } else {
      if (niche) await admin.from("executor_profiles").upsert({ id, skills: [niche[1]] });
      await edit(`Готово, вы зарегистрированы как ${role === "client" ? "заказчик" : "исполнитель"}. Где продолжить работу?`, openKeyboard(from.id));
    }
  }
  await telegram.answerCallbackQuery(cq.id);
  return true;
}
