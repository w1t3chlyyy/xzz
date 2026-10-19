// app/(main)/orders/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Calendar, MessageSquare, CheckCircle, XCircle, Send, Briefcase, Tag, Users, Loader2, Plus,
  Share2, Bookmark, Flag, FileText, Trash2, CheckCheck,
} from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { cn, getCategoryLabel } from "@/lib/utils";
import { openTelegramUrl } from "@/lib/links";
import { SUPPORT_URL } from "@/lib/constants";

interface Order {
  id: string;
  title: string;
  description: string;
  category: string;
  budget_min: number | null;
  budget_max: number | null;
  status: string;
  created_at: string;
  client_id: string;
  client: { id: string; first_name: string };
}

interface Resp {
  id: string;
  executor_id: string;
  message: string;
  budget: number | null;
  days: number | null;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  executor: { id: string; first_name: string };
}

const BOOKMARKS_KEY = "1337_bookmarked_orders";

const ORDER_STATUS: Record<string, { text: string; cls: string }> = {
  active: { text: "В поиске исполнителя", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  in_progress: { text: "В работе", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  completed: { text: "Завершён", cls: "bg-slate-50 text-slate-700 border-slate-200" },
  cancelled: { text: "Отменён", cls: "bg-red-50 text-red-700 border-red-200" },
};

const RESP_STATUS: Record<string, { text: string; cls: string }> = {
  pending: { text: "Ожидает", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  accepted: { text: "Принят", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { text: "Отклонён", cls: "bg-red-50 text-red-700 border-red-200" },
};

function readBookmarks(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

const budgetText = (min: number | null, max: number | null) =>
  min && max ? `${min.toLocaleString("ru-RU")} – ${max.toLocaleString("ru-RU")} ₽` : min ? `от ${min.toLocaleString("ru-RU")} ₽` : "По договорённости";

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { role } = useApp();
  const [order, setOrder] = useState<Order | null>(null);
  const [responses, setResponses] = useState<Resp[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [budget, setBudget] = useState("");
  const [days, setDays] = useState("3");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${params.id}`, { cache: "no-store" });
      if (!res.ok) {
        setNotFound(true);
        return;
      }
      const json = await res.json();
      setOrder(json.order);
      setResponses(json.responses);
      setIsOwner(json.isOwner);
      setBudget((prev) => prev || String(json.order.budget_min || ""));
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void load();
    setBookmarked(readBookmarks().includes(params.id));
  }, [load, params.id]);

  const flash = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 3000);
  };

  const toggleBookmark = () => {
    const saved = readBookmarks();
    const next = bookmarked ? saved.filter((id) => id !== params.id) : [...saved, params.id];
    try {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    setBookmarked(!bookmarked);
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if ((navigator as any).share) await (navigator as any).share({ title: order?.title, url });
      else {
        await navigator.clipboard.writeText(url);
        flash("Ссылка скопирована");
      }
    } catch {
      // отмена шаринга
    }
  };

  const report = () => openTelegramUrl(`${SUPPORT_URL}?text=${encodeURIComponent(`Жалоба на заказ: ${order?.title} (ID: ${params.id})`)}`);

  const decide = async (id: string, status: "accepted" | "rejected") => {
    const res = await fetch(`/api/responses/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) await load();
    else flash((await res.json().catch(() => ({}))).error || "Не удалось обновить отклик");
  };

  const closeOrder = async (status: "completed" | "cancelled") => {
    if (!confirm(status === "completed" ? "Отметить заказ завершённым?" : "Отменить заказ?")) return;
    const res = await fetch(`/api/orders/${params.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (res.ok) await load();
    else flash((await res.json().catch(() => ({}))).error || "Ошибка");
  };

  const deleteOrder = async () => {
    if (!confirm("Удалить заказ вместе с откликами? Это нельзя отменить.")) return;
    const res = await fetch(`/api/orders/${params.id}`, { method: "DELETE" });
    if (res.ok) router.replace("/feed");
    else flash("Не удалось удалить");
  };

  const withdraw = async (id: string) => {
    if (!confirm("Отозвать отклик?")) return;
    const res = await fetch(`/api/responses/${id}`, { method: "DELETE" });
    if (res.ok) await load();
    else flash((await res.json().catch(() => ({}))).error || "Не удалось отозвать");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: order.id, message, budget, days }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Не удалось отправить отклик");
        return;
      }
      setShowForm(false);
      setMessage("");
      flash("Отклик отправлен — заказчик получил уведомление");
      await load();
    } catch {
      setError("Ошибка сети, попробуйте ещё раз");
    } finally {
      setSubmitting(false);
    }
  };

  const openChat = (otherId: string) => router.push(`/chats?user=${otherId}&order=${params.id}`);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
          <Briefcase className="w-8 h-8" />
        </div>
        <h3 className="text-sm font-extrabold">Заказ не найден</h3>
        <p className="text-xs text-slate-500">Возможно, он был удалён</p>
        <Link href="/feed" className="btn-primary py-2.5 px-5 rounded-2xl text-xs font-bold inline-flex shadow-violet">
          Вернуться к заказам
        </Link>
      </div>
    );
  }

  const st = ORDER_STATUS[order.status] || ORDER_STATUS.active;
  const canRespond = !isOwner && role === "executor" && order.status === "active" && responses.length === 0;
  const myResponse = !isOwner ? responses[0] : undefined;
  const isOpen = order.status === "active" || order.status === "in_progress";

  return (
    <div className="space-y-3.5 pb-32 text-slate-900 font-sans">
      <div className="flex items-center justify-between">
        <Link href="/feed" className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:border-violet-300 shadow-xs">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={toggleBookmark} className={cn("p-2.5 rounded-xl border", bookmarked ? "bg-violet-600 border-violet-600 text-white" : "bg-white border-slate-200")}>
            <Bookmark className={cn("w-4 h-4", bookmarked ? "fill-white" : "text-slate-500")} />
          </button>
          <button onClick={share} className="p-2.5 rounded-xl bg-white border border-slate-200">
            <Share2 className="w-4 h-4 text-slate-500" />
          </button>
          {!isOwner && (
            <button onClick={report} className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-rose-300">
              <Flag className="w-4 h-4 text-slate-500" />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-slate-900 text-white text-xs font-bold p-3 rounded-2xl">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.04)] space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-extrabold break-words leading-tight">{order.title}</h1>
            <div className="flex items-center gap-2 mt-2 text-xs flex-wrap">
              <span className={cn("text-[10px] font-bold px-2.5 py-0.5 rounded-full border", st.cls)}>{st.text}</span>
              <span className="flex items-center gap-1 font-semibold text-violet-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
                <Tag className="w-3.5 h-3.5" />
                {getCategoryLabel(order.category)}
              </span>
              <span className="flex items-center gap-1 text-slate-500 font-medium">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(order.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <div className="text-sm font-extrabold text-violet-700">{budgetText(order.budget_min, order.budget_max)}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Бюджет</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-violet-600 text-white font-extrabold flex items-center justify-center text-sm shrink-0">{order.client.first_name[0] || "З"}</div>
            <div className="min-w-0">
              <div className="text-sm font-extrabold truncate">{isOwner ? "Вы (заказчик)" : order.client.first_name}</div>
              <p className="text-xs text-slate-500 font-medium">Общение ведётся в чатах биржи</p>
            </div>
          </div>
          {!isOwner && (
            <button onClick={() => openChat(order.client_id)} className="btn-primary py-2 px-3.5 rounded-xl text-xs font-bold shrink-0 shadow-violet flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>В чат</span>
            </button>
          )}
        </div>

        <div>
          <h2 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <FileText className="w-4 h-4 text-violet-600" />
            Описание задачи
          </h2>
          <div className="bg-slate-50 rounded-2xl p-4 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap border border-slate-100">{order.description}</div>
        </div>

        {isOwner && isOpen && (
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            {order.status === "in_progress" && (
              <button onClick={() => closeOrder("completed")} className="btn-primary py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Завершить заказ</span>
              </button>
            )}
            <button onClick={() => closeOrder("cancelled")} className="py-2 px-3.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50">
              Отменить заказ
            </button>
            <button onClick={deleteOrder} className="py-2 px-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 text-xs font-bold flex items-center gap-1">
              <Trash2 className="w-3.5 h-3.5" />
              <span>Удалить</span>
            </button>
          </div>
        )}
        {isOwner && !isOpen && (
          <button onClick={deleteOrder} className="py-2 px-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 text-xs font-bold flex items-center gap-1">
            <Trash2 className="w-3.5 h-3.5" />
            <span>Удалить</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.04)] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4 text-violet-600" />
            <span>{isOwner ? `Отклики исполнителей (${responses.length})` : "Ваш отклик"}</span>
          </h2>
          {canRespond && (
            <button onClick={() => setShowForm((v) => !v)} className="btn-primary text-xs font-extrabold py-2 px-3.5 rounded-xl flex items-center gap-1.5 shadow-violet">
              <Plus className="w-3.5 h-3.5" />
              <span>Откликнуться</span>
            </button>
          )}
        </div>

        <AnimatePresence>
          {canRespond && showForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={submit}
              className="bg-purple-50/80 border border-purple-200 rounded-3xl p-4 space-y-3 overflow-hidden"
            >
              {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl p-2.5">{error}</div>}
              <div>
                <label className="block text-xs font-bold mb-1">Ваше предложение заказчику *</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="Опыт в подобных задачах, как планируете делать и в какие сроки..."
                  className="w-full p-3.5 rounded-2xl bg-white border border-purple-200 text-xs font-medium focus:border-violet-600 focus:outline-none resize-none leading-relaxed"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Ваша цена (₽) *</label>
                  <input type="number" min={1} value={budget} onChange={(e) => setBudget(e.target.value)} className="w-full p-3 rounded-2xl bg-white border border-purple-200 text-xs font-medium focus:border-violet-600 focus:outline-none" required />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Срок (дней)</label>
                  <input type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} className="w-full p-3 rounded-2xl bg-white border border-purple-200 text-xs font-medium focus:border-violet-600 focus:outline-none" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={submitting || message.trim().length < 10} className="flex-1 btn-primary py-3 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-violet disabled:opacity-50">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Отправить отклик</span>
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-600 text-xs font-bold">
                  Отмена
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {responses.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs font-bold text-slate-800">{isOwner ? "Пока нет откликов" : "Вы ещё не откликались"}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isOwner ? "Исполнители увидят заказ в ленте и пришлют предложения" : role === "executor" ? "Нажмите «Откликнуться», чтобы отправить предложение" : "Откликаться на заказы могут исполнители"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {responses.map((r) => {
              const rs = RESP_STATUS[r.status] || RESP_STATUS.pending;
              return (
                <div key={r.id} className={cn("p-4 rounded-3xl border space-y-3", r.status === "accepted" ? "bg-emerald-50/40 border-emerald-200" : "bg-slate-50/80 border-slate-200/80")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-violet-100 border border-violet-200 flex items-center justify-center text-violet-700 font-extrabold text-sm shrink-0">{r.executor.first_name[0] || "И"}</div>
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold truncate">{isOwner ? r.executor.first_name : "Вы"}</div>
                        <p className="text-[11px] text-slate-400 font-medium">
                          {new Date(r.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          {r.days ? ` · ${r.days} дн.` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {r.budget ? <div className="text-sm font-extrabold text-violet-700">{r.budget.toLocaleString("ru-RU")} ₽</div> : null}
                      <span className={cn("text-[9.5px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider inline-block mt-0.5", rs.cls)}>{rs.text}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-medium bg-white p-3 rounded-2xl border border-slate-100 whitespace-pre-wrap">{r.message}</p>

                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                    {isOwner && (
                      <>
                        <button onClick={() => openChat(r.executor_id)} className="btn-primary py-1.5 px-3 rounded-xl text-[11px] font-bold flex items-center gap-1 shadow-violet">
                          <MessageSquare className="w-3 h-3" />
                          <span>В чат</span>
                        </button>
                        {r.status === "pending" && order.status !== "completed" && order.status !== "cancelled" && (
                          <>
                            <button onClick={() => decide(r.id, "accepted")} title="Принять" className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button onClick={() => decide(r.id, "rejected")} title="Отклонить" className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </>
                    )}
                    {!isOwner && r.status !== "accepted" && (
                      <button onClick={() => withdraw(r.id)} className="py-1.5 px-3 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-white flex items-center gap-1">
                        <Trash2 className="w-3 h-3" />
                        <span>Отозвать</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {canRespond && !showForm && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 z-30 flex items-center justify-between gap-3 max-w-md mx-auto">
          <div className="min-w-0">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Бюджет</div>
            <div className="text-sm font-extrabold text-violet-700 truncate">{budgetText(order.budget_min, order.budget_max)}</div>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary py-2.5 px-5 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 shadow-violet">
            <Plus className="w-4 h-4" />
            <span>Откликнуться</span>
          </button>
        </div>
      )}
    </div>
  );
}
