// app/api/admin/route.ts — все админ-операции проверяются на сервере по telegram_id из базы
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { telegram } from "@/lib/telegram/bot-api";
import { resolveWithdrawal } from "@/lib/withdrawals";
import { cleanStr, forbidden, getCurrentUser, isAdminUser, toInt, unauthorized, UUID_RE } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const me = await getCurrentUser();
  if (!me) return { error: unauthorized() };
  if (!isAdminUser(me)) return { error: forbidden() };
  return { me };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const sp = new URL(req.url).searchParams;
  const view = sp.get("view") || "overview";
  const admin = createAdminClient();

  if (view === "overview") {
    const count = async (table: string, filter?: (q: any) => any) => {
      let q: any = admin.from(table).select("*", { count: "exact", head: true });
      if (filter) q = filter(q);
      const { count: c } = await q;
      return c || 0;
    };
    const [users, executors, orders, activeOrders, responses, pendingPayments] = await Promise.all([
      count("users"),
      count("users", (q) => q.eq("role", "executor")),
      count("orders"),
      count("orders", (q) => q.eq("status", "active")),
      count("responses"),
      count("payments", (q) => q.eq("status", "pending")),
    ]);
    const { data: paid } = await admin.from("payments").select("amount, currency").eq("status", "paid");
    const revenue: Record<string, number> = {};
    (paid || []).forEach((p: any) => (revenue[p.currency] = (revenue[p.currency] || 0) + p.amount));
    return NextResponse.json({ stats: { users, executors, orders, activeOrders, responses, pendingPayments, revenue } });
  }

  if (view === "orders") {
    const { data } = await admin
      .from("orders")
      .select("id, title, category, status, budget_min, budget_max, created_at, client:client_id(first_name)")
      .order("created_at", { ascending: false })
      .limit(50);
    return NextResponse.json({
      orders: (data || []).map((o: any) => ({ ...o, client: Array.isArray(o.client) ? o.client[0] : o.client })),
    });
  }

  if (view === "users") {
    const q = cleanStr(sp.get("q"), 40).replace(/[,()%]/g, "");
    let query = admin
      .from("users")
      .select("id, telegram_id, first_name, username, role, subscription_tier, subscription_expires_at, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    if (q) {
      query = /^\d+$/.test(q)
        ? query.eq("telegram_id", Number(q))
        : query.or(`username.ilike.%${q}%,first_name.ilike.%${q}%`);
    }
    const { data } = await query;
    return NextResponse.json({ users: data || [] });
  }

  if (view === "promos") {
    const { data } = await admin.from("promo_codes").select("*").order("created_at", { ascending: false }).limit(50);
    return NextResponse.json({ promos: data || [] });
  }

  if (view === "withdrawals") {
    const { data } = await admin
      .from("withdrawals")
      .select("id, amount, bank, details, status, created_at, user:user_id(first_name, username, telegram_id)")
      .order("created_at", { ascending: false })
      .limit(40);
    return NextResponse.json({
      withdrawals: (data || []).map((w: any) => ({ ...w, user: Array.isArray(w.user) ? w.user[0] : w.user })),
    });
  }

  if (view === "payments") {
    const { data } = await admin
      .from("payments")
      .select("id, amount, currency, method, status, tier, created_at, user:user_id(first_name, username)")
      .order("created_at", { ascending: false })
      .limit(40);
    return NextResponse.json({
      payments: (data || []).map((p: any) => ({ ...p, user: Array.isArray(p.user) ? p.user[0] : p.user })),
    });
  }

  return NextResponse.json({ error: "Неизвестный раздел" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  if (!body?.action) return NextResponse.json({ error: "Нет действия" }, { status: 400 });
  const admin = createAdminClient();

  switch (body.action) {
    case "order_status": {
      if (!UUID_RE.test(body.id || "") || !["active", "in_progress", "completed", "cancelled"].includes(body.status)) {
        return NextResponse.json({ error: "Неверные данные" }, { status: 400 });
      }
      await admin.from("orders").update({ status: body.status, updated_at: new Date().toISOString() }).eq("id", body.id);
      return NextResponse.json({ success: true });
    }

    case "order_delete": {
      if (!UUID_RE.test(body.id || "")) return NextResponse.json({ error: "Неверные данные" }, { status: 400 });
      await admin.from("orders").delete().eq("id", body.id);
      return NextResponse.json({ success: true });
    }

    case "grant": {
      const telegramId = Number(body.telegram_id);
      const days = Math.min(Math.max(toInt(body.days) || 30, 1), 730);
      if (!telegramId) return NextResponse.json({ error: "Укажите Telegram ID" }, { status: 400 });

      const { data: target } = await admin
        .from("users")
        .select("id, subscription_tier, subscription_expires_at")
        .eq("telegram_id", telegramId)
        .maybeSingle();
      if (!target) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });

      const now = Date.now();
      const current = target.subscription_expires_at ? new Date(target.subscription_expires_at).getTime() : 0;
      const base = current > now && target.subscription_tier === "pro" ? current : now;
      const expires = new Date(base + days * 86400000).toISOString();

      await admin.from("users").update({ subscription_tier: "pro", subscription_expires_at: expires }).eq("id", target.id);
      await telegram.sendMessage(telegramId, `🎉 Администратор выдал вам подписку <b>Pro</b> на ${days} дней!`).catch(() => {});
      return NextResponse.json({ success: true, expires });
    }

    case "revoke": {
      const telegramId = Number(body.telegram_id);
      if (!telegramId) return NextResponse.json({ error: "Укажите Telegram ID" }, { status: 400 });
      await admin.from("users").update({ subscription_tier: "free", subscription_expires_at: null }).eq("telegram_id", telegramId);
      return NextResponse.json({ success: true });
    }

    case "credit": {
      const telegramId = Number(body.telegram_id);
      const amount = Math.round(Number(body.amount));
      if (!telegramId || !amount || Math.abs(amount) > 10000000) return NextResponse.json({ error: "Укажите Telegram ID и сумму" }, { status: 400 });
      const { data: target } = await admin.from("users").select("id").eq("telegram_id", telegramId).maybeSingle();
      if (!target) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
      const { data: balance, error } = await admin.rpc("adjust_balance", {
        p_user: target.id,
        p_delta: amount,
        p_reason: cleanStr(body.note, 120) || "admin",
      });
      if (error) return NextResponse.json({ error: error.message.includes("insufficient") ? "Баланс не может быть отрицательным" : "Ошибка" }, { status: 400 });
      if (amount > 0) {
        await telegram.sendMessage(telegramId, `💰 На ваш баланс зачислено <b>${amount.toLocaleString("ru-RU")} ₽</b>.`).catch(() => {});
      }
      return NextResponse.json({ success: true, balance });
    }

    case "withdrawal_resolve": {
      if (!UUID_RE.test(body.id || "")) return NextResponse.json({ error: "Неверные данные" }, { status: 400 });
      const r = await resolveWithdrawal(admin, body.id, !!body.paid, Number(auth.me!.telegram_id));
      if (!r.ok) return NextResponse.json({ error: r.reason === "already_processed" ? "Заявка уже обработана" : "Ошибка" }, { status: 409 });
      return NextResponse.json({ success: true });
    }

    case "promo_create": {
      const code = cleanStr(body.code, 32).toUpperCase();
      if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
        return NextResponse.json({ error: "Код: 3–32 символа, A–Z, 0–9, _ и -" }, { status: 400 });
      }
      const days = Math.min(Math.max(toInt(body.days) || 30, 1), 730);
      const maxUses = toInt(body.max_uses);
      const { error } = await admin
        .from("promo_codes")
        .insert({ code, tier: "pro", duration_days: days, max_uses: maxUses && maxUses > 0 ? maxUses : null, active: true });
      if (error) return NextResponse.json({ error: (error as any).code === "23505" ? "Такой код уже есть" : "Не удалось создать" }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    case "promo_toggle": {
      const code = cleanStr(body.code, 32).toUpperCase();
      await admin.from("promo_codes").update({ active: !!body.active }).eq("code", code);
      return NextResponse.json({ success: true });
    }
  }

  return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
}
