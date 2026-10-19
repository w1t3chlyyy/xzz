// app/(main)/admin/page.tsx — админ-панель; доступ проверяется на сервере
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Loader2, Trash2, Check, X } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { getCategoryLabel } from "@/lib/utils";

type Tab = "overview" | "payments" | "withdrawals" | "users" | "orders" | "promos" | "settings" | "broadcast";
const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Обзор" },
  { id: "payments", label: "Платежи" },
  { id: "withdrawals", label: "Выплаты" },
  { id: "users", label: "Люди" },
  { id: "orders", label: "Заказы" },
  { id: "promos", label: "Промокоды" },
  { id: "settings", label: "Настройки" },
  { id: "broadcast", label: "Рассылка" },
];
// вкладки, которые сами управляют своими данными
const SELF_MANAGED: Tab[] = ["settings", "broadcast"];

const card = "bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]";
const input = "w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-violet-500";
const fmtRub = (n: number) => `${Number(n).toLocaleString("ru-RU")} ₽`;

async function api(view: string, extra = "") {
  const res = await fetch(`/api/admin?view=${view}${extra}`, { cache: "no-store" });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

async function act(body: any): Promise<{ ok: boolean; error?: string; data?: any }> {
  const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, error: data.error, data };
}

const PAY_STATUS: Record<string, { text: string; cls: string }> = {
  pending: { text: "Ожидает", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  paid: { text: "Оплачен", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { text: "Отклонён", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  expired: { text: "Истёк", cls: "bg-slate-50 text-slate-500 border-slate-200" },
};

// ---------------- Настройки: приветствие, цена, реквизиты ----------------
function SettingsTab({ flash }: { flash: (t: string) => void }) {
  const [form, setForm] = useState<{ welcome_message: string; welcome_photo: string; pro_price: string; requisites: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("settings")
      .then((j) => setForm({ ...j.settings, pro_price: String(j.settings.pro_price) }))
      .catch(() => flash("Не удалось загрузить настройки"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!form) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-7 h-7 text-violet-600 animate-spin" />
      </div>
    );
  }

  const set = (k: keyof typeof form, v: string) => setForm({ ...form, [k]: v });

  const save = async () => {
    setBusy(true);
    const r = await act({ action: "settings_save", ...form });
    setBusy(false);
    flash(r.ok ? "Настройки сохранены" : r.error || "Ошибка");
  };

  const preview = async () => {
    const r = await act({ action: "preview", text: form.welcome_message, photo: form.welcome_photo });
    flash(r.ok ? "Пример отправлен вам в Telegram" : r.error || "Ошибка");
  };

  return (
    <div className="space-y-3">
      <div className={`${card} space-y-2`}>
        <h4 className="text-xs font-extrabold">Приветствие в /start</h4>
        <textarea className={`${input} resize-none font-mono leading-relaxed`} rows={7} value={form.welcome_message} onChange={(e) => set("welcome_message", e.target.value)} />
        <p className="text-[10px] text-slate-400 leading-relaxed">
          HTML: &lt;b&gt;жирный&lt;/b&gt;, &lt;i&gt;курсив&lt;/i&gt;, &lt;u&gt;подчёркнутый&lt;/u&gt;, &lt;a href=&quot;https://…&quot;&gt;ссылка&lt;/a&gt;, &lt;tg-emoji emoji-id=&quot;ID&quot;&gt;🔥&lt;/tg-emoji&gt;. Переносы строк — как есть.
        </p>
        <input className={input} placeholder="Картинка: ссылка https://… (пусто — без картинки)" value={form.welcome_photo} onChange={(e) => set("welcome_photo", e.target.value)} />
        <button onClick={preview} type="button" className="w-full py-2 rounded-xl border border-violet-200 bg-violet-50 text-violet-700 text-xs font-bold">
          Прислать пример мне в Telegram
        </button>
      </div>

      <div className={`${card} space-y-2`}>
        <h4 className="text-xs font-extrabold">Цена подписки Pro, ₽ / месяц</h4>
        <input className={input} inputMode="numeric" value={form.pro_price} onChange={(e) => set("pro_price", e.target.value.replace(/\D/g, ""))} />
        <p className="text-[10px] text-slate-400">Год считается автоматически со скидкой 20%.</p>
      </div>

      <div className={`${card} space-y-2`}>
        <h4 className="text-xs font-extrabold">Реквизиты для оплаты переводом</h4>
        <textarea className={`${input} resize-none`} rows={4} value={form.requisites} onChange={(e) => set("requisites", e.target.value)} />
      </div>

      <button onClick={save} disabled={busy} className="w-full btn-primary py-3 rounded-2xl text-xs font-extrabold disabled:opacity-50">
        {busy ? "Сохраняем..." : "Сохранить настройки"}
      </button>
    </div>
  );
}

// ---------------- Рассылка ----------------
function BroadcastTab({ flash }: { flash: (t: string) => void }) {
  const [text, setText] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [finished, setFinished] = useState(false);
  const stopRef = useRef(false);

  const preview = async () => {
    const r = await act({ action: "preview", text });
    flash(r.ok ? "Пример отправлен вам в Telegram" : r.error || "Ошибка");
  };

  const start = async () => {
    if (!text.trim()) return;
    if (!confirm("Отправить это сообщение ВСЕМ пользователям бота?")) return;
    stopRef.current = false;
    setRunning(true);
    setFinished(false);
    let offset = 0;
    let sent = 0;
    let failed = 0;
    let total = 0;

    while (!stopRef.current) {
      const r = await act({ action: "broadcast_chunk", text, offset });
      if (!r.ok) {
        flash(r.error || "Ошибка рассылки");
        break;
      }
      sent += r.data.sent;
      failed += r.data.failed;
      total = r.data.total;
      offset = r.data.next;
      setProgress({ sent, failed, total });
      if (r.data.done) {
        setFinished(true);
        break;
      }
      await new Promise((res) => setTimeout(res, 1000));
    }
    setRunning(false);
  };

  return (
    <div className="space-y-3">
      <div className={`${card} space-y-2`}>
        <h4 className="text-xs font-extrabold">Рассылка всем пользователям</h4>
        <textarea className={`${input} resize-none font-mono leading-relaxed`} rows={7} value={text} onChange={(e) => setText(e.target.value)} disabled={running} placeholder="Текст сообщения (HTML: <b>, <i>, <a href>)" />
        <div className="flex gap-2">
          <button onClick={preview} disabled={running || !text.trim()} className="flex-1 py-2.5 rounded-xl border border-violet-200 bg-violet-50 text-violet-700 text-xs font-bold disabled:opacity-50">
            Пример мне
          </button>
          {running ? (
            <button onClick={() => (stopRef.current = true)} className="flex-1 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold">
              Остановить
            </button>
          ) : (
            <button onClick={start} disabled={!text.trim()} className="flex-1 btn-primary py-2.5 rounded-xl text-xs font-bold disabled:opacity-50">
              Отправить всем
            </button>
          )}
        </div>
        <p className="text-[10px] text-slate-400">Не закрывайте страницу, пока идёт отправка. Ошибки — это заблокировавшие бота или не нажимавшие /start.</p>
      </div>

      {progress && (
        <div className={`${card} space-y-1`}>
          <div className="flex items-center gap-2 text-xs font-extrabold">
            {running && <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-600" />}
            <span>{finished ? "Рассылка завершена" : running ? "Идёт отправка..." : "Остановлено"}</span>
          </div>
          <div className="text-xs text-slate-600 font-medium">
            Доставлено: <b>{progress.sent}</b> · Ошибок: <b>{progress.failed}</b> · Всего: <b>{progress.total}</b>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const { isAdmin } = useApp();
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<any>(null);
  const [loadedTab, setLoadedTab] = useState<Tab | null>(null); // для какой вкладки лежат данные в data
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [q, setQ] = useState(""); // что набрано
  const [appliedQ, setAppliedQ] = useState(""); // что реально ищем
  const reqId = useRef(0);

  const [grant, setGrant] = useState({ telegram_id: "", days: "30" });
  const [credit, setCredit] = useState({ telegram_id: "", amount: "", note: "" });
  const [promo, setPromo] = useState({ code: "", days: "30", max_uses: "" });

  const flash = useCallback((text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(null), 3500);
  }, []);

  const load = useCallback(async () => {
    const requested = tab;
    const id = ++reqId.current;
    setLoading(true);
    let json: any = null;
    try {
      json = await api(requested, requested === "users" && appliedQ ? `&q=${encodeURIComponent(appliedQ)}` : "");
    } catch {
      json = null;
    }
    if (id !== reqId.current) return; // устаревший ответ — игнорируем
    setData(json);
    setLoadedTab(requested);
    setLoading(false);
  }, [tab, appliedQ]);

  useEffect(() => {
    if (isAdmin && !SELF_MANAGED.includes(tab)) void load();
  }, [isAdmin, tab, load]);

  const run = async (body: any, okText: string) => {
    const r = await act(body);
    flash(r.ok ? okText : r.error || "Ошибка");
    if (r.ok) await load();
    return r.ok;
  };

  if (!isAdmin) {
    return (
      <div className={`${card} text-center space-y-2`}>
        <h2 className="text-sm font-extrabold">Нет доступа</h2>
        <Link href="/profile" className="text-xs font-bold text-violet-700">← В профиль</Link>
      </div>
    );
  }

  const selfManaged = SELF_MANAGED.includes(tab);
  const waiting = !selfManaged && (loading || loadedTab !== tab);

  return (
    <div className="space-y-4 pb-28 text-slate-900 font-sans">
      <div className="flex items-center justify-between px-1">
        <Link href="/profile" className="text-xs font-bold text-slate-600 flex items-center gap-1.5 py-1 px-2.5 rounded-xl bg-white border border-slate-200/80">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>В профиль</span>
        </Link>
        <span className="badge-violet text-xs font-bold py-1 px-3 rounded-xl flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          Админ-панель
        </span>
      </div>

      <div className="flex p-1 bg-slate-200/80 rounded-2xl gap-1 overflow-x-auto scrollbar-none text-xs font-bold">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`py-2 px-3 rounded-xl whitespace-nowrap ${tab === t.id ? "bg-white text-violet-700 shadow-xs" : "text-slate-600"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {msg && <div className="bg-slate-900 text-white text-xs font-bold p-3 rounded-2xl">{msg}</div>}

      {tab === "settings" && <SettingsTab flash={flash} />}
      {tab === "broadcast" && <BroadcastTab flash={flash} />}

      {!selfManaged &&
        (waiting ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-7 h-7 text-violet-600 animate-spin" />
          </div>
        ) : !data ? (
          <p className="text-center text-xs text-slate-500 py-8">Не удалось загрузить данные</p>
        ) : (
          <>
            {tab === "overview" && (
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  ["Пользователей", data.stats.users],
                  ["Исполнителей", data.stats.executors],
                  ["Заказов", data.stats.orders],
                  ["Активных заказов", data.stats.activeOrders],
                  ["Откликов", data.stats.responses],
                  ["Платежей в ожидании", data.stats.pendingPayments],
                ].map(([label, value]) => (
                  <div key={label as string} className={card}>
                    <div className="text-xl font-extrabold">{value as number}</div>
                    <div className="text-[11px] text-slate-400 font-bold">{label}</div>
                  </div>
                ))}
                <div className={`${card} col-span-2`}>
                  <div className="text-[11px] text-slate-400 font-bold">Оплачено подписок</div>
                  <div className="text-sm font-extrabold">
                    {Object.keys(data.stats.revenue).length ? Object.entries(data.stats.revenue).map(([c, a]) => `${Number(a).toLocaleString("ru-RU")} ${c}`).join(" · ") : "—"}
                  </div>
                </div>
              </div>
            )}

            {tab === "payments" && (
              <div className="space-y-2.5">
                <p className="text-[11px] text-slate-500">Чек по реквизитам приходит администраторам в бота. Подтверждайте или отклоняйте платёж здесь.</p>
                {data.payments.length === 0 && <p className="text-center text-xs text-slate-500 py-8">Платежей пока нет</p>}
                {data.payments.map((p: any) => {
                  const st = PAY_STATUS[p.status] || PAY_STATUS.expired;
                  return (
                    <div key={p.id} className={`${card} space-y-2`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-extrabold">{Number(p.amount).toLocaleString("ru-RU")} {p.currency}</div>
                          <div className="text-[11px] text-slate-500 font-medium truncate">
                            {p.user?.first_name || "—"} {p.user?.username ? `@${p.user.username}` : ""} · {p.method} · {p.duration_days} дн. · {new Date(p.created_at).toLocaleDateString("ru-RU")}
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${st.cls}`}>{st.text}</span>
                      </div>
                      {p.status === "pending" && (
                        <div className="flex gap-2">
                          <button onClick={() => confirm("Подтвердить оплату и выдать подписку?") && run({ action: "payment_confirm", id: p.id }, "Оплата подтверждена")} className="flex-1 btn-primary py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Подтвердить
                          </button>
                          <button onClick={() => confirm("Отклонить платёж?") && run({ action: "payment_reject", id: p.id }, "Платёж отклонён")} className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold flex items-center gap-1">
                            <X className="w-3.5 h-3.5" /> Отклонить
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {tab === "withdrawals" && (
              <div className="space-y-2.5">
                {data.withdrawals.length === 0 && <p className="text-center text-xs text-slate-500 py-8">Заявок пока нет</p>}
                {data.withdrawals.map((w: any) => (
                  <div key={w.id} className={`${card} space-y-2`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-extrabold text-violet-700">{fmtRub(w.amount)}</div>
                        <div className="text-xs font-bold">
                          {w.user?.first_name || "—"} {w.user?.username ? `@${w.user.username}` : ""} <span className="text-slate-400 font-mono">{w.user?.telegram_id}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${w.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-200" : w.status === "paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>
                        {w.status === "pending" ? "Ожидает" : w.status === "paid" ? "Выплачено" : "Отклонено"}
                      </span>
                    </div>
                    <div className="text-xs bg-slate-50 rounded-xl p-2.5 whitespace-pre-wrap break-words">
                      <b>{w.bank}</b>
                      {"\n"}
                      {w.details}
                    </div>
                    {w.status === "pending" && (
                      <div className="flex gap-2">
                        <button onClick={() => run({ action: "withdrawal_resolve", id: w.id, paid: true }, "Отмечено как выплачено")} className="flex-1 btn-primary py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Выплачено
                        </button>
                        <button onClick={() => confirm("Отклонить и вернуть сумму на баланс?") && run({ action: "withdrawal_resolve", id: w.id, paid: false }, "Заявка отклонена")} className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold flex items-center gap-1">
                          <X className="w-3.5 h-3.5" /> Отклонить
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tab === "users" && (
              <div className="space-y-3">
                <form onSubmit={(e) => { e.preventDefault(); setAppliedQ(q.trim()); }} className="flex gap-2">
                  <input className={input} placeholder="Поиск: Telegram ID, имя или @username" value={q} onChange={(e) => setQ(e.target.value)} />
                  <button className="btn-primary px-4 rounded-xl text-xs font-bold">Найти</button>
                </form>

                <div className={`${card} space-y-2`}>
                  <h4 className="text-xs font-extrabold">Выдать подписку Pro</h4>
                  <div className="flex gap-2">
                    <input className={input} placeholder="Telegram ID" value={grant.telegram_id} onChange={(e) => setGrant({ ...grant, telegram_id: e.target.value })} />
                    <input className={`${input} w-20`} placeholder="Дней" value={grant.days} onChange={(e) => setGrant({ ...grant, days: e.target.value })} />
                    <button onClick={() => run({ action: "grant", ...grant }, "Подписка выдана")} className="btn-primary px-3 rounded-xl text-xs font-bold">Выдать</button>
                  </div>
                </div>

                <div className={`${card} space-y-2`}>
                  <h4 className="text-xs font-extrabold">Начислить на баланс исполнителя (₽, минус — списать)</h4>
                  <div className="flex gap-2">
                    <input className={input} placeholder="Telegram ID" value={credit.telegram_id} onChange={(e) => setCredit({ ...credit, telegram_id: e.target.value })} />
                    <input className={`${input} w-24`} placeholder="Сумма" value={credit.amount} onChange={(e) => setCredit({ ...credit, amount: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <input className={input} placeholder="Комментарий (необязательно)" value={credit.note} onChange={(e) => setCredit({ ...credit, note: e.target.value })} />
                    <button onClick={() => run({ action: "credit", ...credit }, "Баланс изменён")} className="btn-primary px-3 rounded-xl text-xs font-bold">ОК</button>
                  </div>
                </div>

                {data.users.map((u: any) => (
                  <div key={u.id} className={`${card} flex items-center justify-between gap-2`}>
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold truncate">{u.first_name || "—"} {u.username ? <span className="text-slate-400 font-medium">@{u.username}</span> : null}</div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        <span className="font-mono">{u.telegram_id}</span> · {u.role || "без роли"} · {u.subscription_tier}
                        {u.subscription_expires_at ? ` до ${new Date(u.subscription_expires_at).toLocaleDateString("ru-RU")}` : ""}
                      </div>
                    </div>
                    {u.subscription_tier !== "free" && (
                      <button onClick={() => confirm("Снять подписку?") && run({ action: "revoke", telegram_id: u.telegram_id }, "Подписка снята")} className="text-[11px] font-bold text-rose-600 shrink-0">Снять Pro</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tab === "orders" && (
              <div className="space-y-2.5">
                {data.orders.map((o: any) => (
                  <div key={o.id} className={`${card} space-y-2`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link href={`/orders/${o.id}`} className="text-sm font-extrabold hover:text-violet-700 block truncate">{o.title}</Link>
                        <div className="text-[11px] text-slate-500 font-medium">{getCategoryLabel(o.category)} · {o.client?.first_name || "—"} · {new Date(o.created_at).toLocaleDateString("ru-RU")}</div>
                      </div>
                      <button onClick={() => confirm("Удалить заказ?") && run({ action: "order_delete", id: o.id }, "Заказ удалён")} className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <select value={o.status} onChange={(e) => run({ action: "order_status", id: o.id, status: e.target.value }, "Статус обновлён")} className={`${input} font-bold`}>
                      <option value="active">В поиске</option>
                      <option value="in_progress">В работе</option>
                      <option value="completed">Завершён</option>
                      <option value="cancelled">Отменён</option>
                    </select>
                  </div>
                ))}
              </div>
            )}

            {tab === "promos" && (
              <div className="space-y-3">
                <div className={`${card} space-y-2`}>
                  <h4 className="text-xs font-extrabold">Новый промокод (Pro)</h4>
                  <div className="flex gap-2">
                    <input className={`${input} uppercase font-mono`} placeholder="Код" value={promo.code} onChange={(e) => setPromo({ ...promo, code: e.target.value })} />
                    <input className={`${input} w-16`} placeholder="Дней" value={promo.days} onChange={(e) => setPromo({ ...promo, days: e.target.value })} />
                    <input className={`${input} w-20`} placeholder="Лимит" value={promo.max_uses} onChange={(e) => setPromo({ ...promo, max_uses: e.target.value })} />
                  </div>
                  <button onClick={async () => (await run({ action: "promo_create", ...promo }, "Промокод создан")) && setPromo({ code: "", days: "30", max_uses: "" })} className="btn-primary w-full py-2.5 rounded-xl text-xs font-bold">Создать</button>
                  <p className="text-[10px] text-slate-400">Лимит пустой — без ограничения. Один пользователь может применить код один раз.</p>
                </div>
                {data.promos.map((p: any) => (
                  <div key={p.code} className={`${card} flex items-center justify-between`}>
                    <div>
                      <div className="font-mono font-bold text-violet-700 text-sm">{p.code}</div>
                      <div className="text-[11px] text-slate-500">+{p.duration_days} дн. · использовано {p.used_count}{p.max_uses ? `/${p.max_uses}` : ""}</div>
                    </div>
                    <button onClick={() => run({ action: "promo_toggle", code: p.code, active: !p.active }, p.active ? "Отключён" : "Включён")} className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border ${p.active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                      {p.active ? "Активен" : "Выключен"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ))}
    </div>
  );
}
