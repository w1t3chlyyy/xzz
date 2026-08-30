// app/(main)/orders/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { getTelegramUser } from "@/lib/telegram/webapp";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  User,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Eye,
  Briefcase,
  Tag,
  Users,
  Star,
  ShieldCheck,
  Zap,
  Award,
  Loader2,
  Plus,
  Heart,
  Share2,
  Bookmark,
  Flag,
  FileText,
} from "lucide-react";
import Link from "next/link";

interface Order {
  id: string;
  title: string;
  description: string;
  category: string;
  budget_min: number;
  budget_max: number;
  status: string;
  created_at: string;
  client_id: string;
  client: {
    first_name: string;
    username: string;
    rating?: number;
    avatar?: string;
  };
  responses_count?: number;
  is_favorited?: boolean;
}

interface Response {
  id: string;
  message: string;
  budget: number;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  executor: {
    first_name: string;
    username: string;
    rating?: number;
  };
}

const BOOKMARKS_KEY = "1337_bookmarked_orders";
const SUPPORT_URL = "https://t.me/F1337H";

function readBookmarks(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClient();
  const [order, setOrder] = useState<Order | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("client");
  const [user, setUser] = useState<any>(null);
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseMessage, setResponseMessage] = useState("");
  const [responseBudget, setResponseBudget] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [responseActionError, setResponseActionError] = useState<string | null>(null);

  const loadUser = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);
  }, [supabase]);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    try {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(
          `
          *,
          client:client_id (
            first_name,
            username
          )
        `
        )
        .eq("id", params.id)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

      const { data: responsesData, error: responsesError } = await supabase
        .from("responses")
        .select(
          `
          *,
          executor:executor_id (
            first_name,
            username
          )
        `
        )
        .eq("order_id", params.id)
        .order("created_at", { ascending: false });

      if (responsesError) throw responsesError;
      setResponses(responsesData || []);
    } catch (error) {
      console.error("Error loading order:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase, params.id]);

  useEffect(() => {
    const savedRole = localStorage.getItem("1337_role") || localStorage.getItem("fiolet_role") || "client";
    setRole(savedRole);
    loadOrder();
    loadUser();
    setIsBookmarked(readBookmarks().includes(params.id));
  }, [loadOrder, loadUser, params.id]);

  const handleToggleBookmark = () => {
    const saved = readBookmarks();
    const next = isBookmarked ? saved.filter((id) => id !== params.id) : [...saved, params.id];
    try {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn("Bookmark save failed:", e);
    }
    setIsBookmarked(!isBookmarked);
  };

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const shareApi = typeof navigator !== "undefined" ? (navigator as any).share : null;

    if (shareApi) {
      try {
        await shareApi({ title: order?.title || "Заказ на бирже 1337", url });
        return;
      } catch (e) {
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch (e) {
      console.warn("Clipboard write failed:", e);
    }
  };

  const handleReport = () => {
    const reportText = "Жалоба на заказ: " + (order?.title || "без названия") + " (ID: " + params.id + ")";
    const url = SUPPORT_URL + "?text=" + encodeURIComponent(reportText);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleUpdateResponseStatus = async (responseId: string, status: "accepted" | "rejected") => {
    setResponseActionError(null);
    const previous = responses;
    setResponses((prev) => prev.map((r) => (r.id === responseId ? { ...r, status } : r)));

    try {
      const { error } = await supabase.from("responses").update({ status }).eq("id", responseId);
      if (error) throw error;
    } catch (error) {
      console.error("Error updating response status:", error);
      setResponses(previous);
      setResponseActionError("Не удалось обновить статус отклика, попробуйте ещё раз");
    }
  };

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !order) return;
    if (!responseMessage.trim()) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const { error } = await supabase.from("responses").insert({
        order_id: order.id,
        executor_id: user.id,
        message: responseMessage,
        budget: parseInt(responseBudget) || order.budget_min || 0,
        status: "pending",
      });

      if (error) throw error;

      await loadOrder();
      setShowResponseForm(false);
      setResponseMessage("");
      setResponseBudget("");
    } catch (error: any) {
      console.error("Error submitting response:", error);
      setSubmitError(error?.message || "Не удалось отправить отклик, попробуйте ещё раз");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "closed":
        return "bg-slate-50 text-slate-700 border-slate-200";
      case "cancelled":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-amber-50 text-amber-700 border-amber-200";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Активный";
      case "closed":
        return "Закрыт";
      case "cancelled":
        return "Отменен";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center mx-auto">
          <Briefcase className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">Заказ не найден</h3>
          <p className="text-xs text-slate-500 mt-1">Возможно, он был удален или перемещен</p>
        </div>
        <Link href="/feed" className="btn-primary py-2.5 px-5 rounded-2xl text-xs font-bold inline-flex items-center gap-2 shadow-violet">
          <span>Вернуться к заказам</span>
        </Link>
      </div>
    );
  }

  const clientUsername = (order.client?.username || "").replace(/^@/, "");
  const clientTgMessage = "Здравствуйте! Пишу по поводу заказа " + order.title + " на бирже 1337.";
  const clientTgUrl = clientUsername
    ? "https://t.me/" + clientUsername + "?text=" + encodeURIComponent(clientTgMessage)
    : null;

  return (
    <div className="space-y-3 pb-20">
      <div className="flex items-center justify-between">
        <Link href="/feed">
          <motion.button
            whileTap={{ scale: 0.92 }}
            className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:border-violet-300 hover:text-violet-700 shadow-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </motion.button>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleBookmark}
            title="Сохранить заказ"
            className={cn(
              "p-2 rounded-xl border transition-colors",
              isBookmarked ? "bg-violet-600 border-violet-600 text-white" : "bg-white border-slate-200 hover:border-violet-300"
            )}
          >
            <Bookmark className={cn("w-4 h-4", isBookmarked ? "fill-white" : "text-slate-500")} />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={handleShare}
              title="Поделиться"
              className="p-2 rounded-xl bg-white border border-slate-200 hover:border-violet-300 transition-colors"
            >
              <Share2 className="w-4 h-4 text-slate-500" />
            </button>

            <AnimatePresence>
              {shareCopied ? (
                <motion.span
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-full right-0 mt-1.5 text-[10px] font-bold text-white bg-slate-900 px-2 py-1 rounded-lg whitespace-nowrap z-10"
                >
                  Ссылка скопирована
                </motion.span>
              ) : null}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={handleReport}
            title="Пожаловаться"
            className="p-2 rounded-xl bg-white border border-slate-200 hover:border-rose-300 transition-colors"
          >
            <Flag className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.04)] space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-extrabold text-slate-900 break-words">{order.title}</h1>
              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0", getStatusColor(order.status))}>
                {getStatusText(order.status)}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" />
                <span>{order.category}</span>
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{new Date(order.created_at).toLocaleDateString("ru-RU")}</span>
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-sm font-extrabold text-violet-700">
              {order.budget_min?.toLocaleString()} - {order.budget_max?.toLocaleString()} ₽
            </div>
            <div className="text-[10px] text-slate-400 font-medium">Бюджет</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center text-violet-700 font-bold shrink-0">
            {order.client?.first_name?.[0] || "А"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold text-slate-900 truncate">{order.client?.first_name || "Заказчик"}</span>
              {order.client?.rating ? (
                <span className="flex items-center gap-0.5 text-xs shrink-0">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="font-bold text-slate-900">{order.client.rating}</span>
                </span>
              ) : null}
            </div>
            <p className="text-xs text-slate-400 font-medium truncate">@{order.client?.username || "client"}</p>
          </div>

          {clientTgUrl ? (
            
              href={clientTgUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-violet-600 bg-white px-3 py-1.5 rounded-xl border border-violet-200 hover:bg-violet-50 transition-colors flex items-center gap-1 shrink-0"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Написать</span>
            </a>
          ) : (
            <span className="text-[10.5px] font-medium text-slate-400 shrink-0 max-w-[110px] text-right leading-tight">
              Username не указан
            </span>
          )}
        </div>

        <div>
          <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <FileText className="w-4 h-4 text-violet-600" />
            Описание задачи
          </h2>
          <div className="bg-slate-50 rounded-2xl p-3.5 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap border border-slate-100 max-h-72 overflow-y-auto">
            {order.description || "Описание отсутствует"}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2">
          <div className="text-center p-2.5 rounded-xl bg-purple-50 border border-purple-100">
            <div className="text-xs font-extrabold text-violet-700">{responses.length}</div>
            <div className="text-[10px] text-slate-500 font-medium">Откликов</div>
          </div>
          <div className="text-center p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
            <div className="text-xs font-extrabold text-emerald-700">
              {responses.filter((r) => r.status === "accepted").length}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">Принято</div>
          </div>
          <div className="text-center p-2.5 rounded-xl bg-amber-50 border border-amber-100">
            <div className="text-xs font-extrabold text-amber-700">
              {responses.filter((r) => r.status === "pending").length}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">Ожидают</div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.04)] space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-violet-600" />
              Отклики ({responses.length})
            </h2>
            <p className="text-slate-400 text-[11px] font-medium mt-0.5">Исполнители, заинтересованные в задаче</p>
          </div>

          {role === "executor" && order.status === "active" ? (
            <button
              onClick={() => setShowResponseForm(!showResponseForm)}
              className="btn-primary text-xs font-extrabold py-2 px-3 rounded-xl flex items-center gap-1 shadow-violet"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Откликнуться</span>
            </button>
          ) : null}
        </div>

        {responseActionError ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl p-2.5">
            {responseActionError}
          </div>
        ) : null}

        <AnimatePresence>
          {showResponseForm ? (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleSubmitResponse}
              className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4 space-y-3 overflow-hidden"
            >
              {submitError ? (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl p-2.5">
                  {submitError}
                </div>
              ) : null}

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Ваше предложение *</label>
                <textarea
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  placeholder="Опишите, как вы можете помочь, ваш опыт и подход..."
                  rows={3}
                  className="w-full p-3 rounded-xl bg-white border border-purple-200 text-slate-900 text-xs font-medium focus:border-violet-600 focus:outline-none resize-none leading-relaxed"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Ваш бюджет (₽)</label>
                <input
                  type="number"
                  value={responseBudget}
                  onChange={(e) => setResponseBudget(e.target.value)}
                  placeholder={order.budget_min?.toString() || "0"}
                  className="w-full p-2.5 rounded-xl bg-white border border-purple-200 text-slate-900 text-xs font-medium focus:border-violet-600 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Рекомендуемый бюджет: {order.budget_min?.toLocaleString()} - {order.budget_max?.toLocaleString()} ₽
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 btn-primary py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-violet disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Отправить отклик</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowResponseForm(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Отмена
                </button>
              </div>
            </motion.form>
          ) : null}
        </AnimatePresence>

        <div className="space-y-3">
          {responses.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-2">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-500 font-medium">Пока нет откликов</p>
              {role === "executor" ? (
                <p className="text-[11px] text-slate-400 mt-0.5">Станьте первым, кто откликнется!</p>
              ) : null}
            </div>
          ) : (
            responses.map((response, index) => (
              <motion.div
                key={response.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center text-violet-700 font-bold text-sm shrink-0">
                      {response.executor?.first_name?.[0] || "И"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-extrabold text-slate-900 truncate">
                          {response.executor?.first_name || "Исполнитель"}
                        </span>
                        {response.executor?.rating ? (
                          <span className="flex items-center gap-0.5 text-[11px] shrink-0">
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            <span className="font-bold text-slate-900">{response.executor.rating}</span>
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium truncate">
                        @{response.executor?.username || "executor"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-extrabold text-violet-700">{response.budget?.toLocaleString()} ₽</div>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                        response.status === "accepted"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : response.status === "rejected"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      )}
                    >
                      {response.status === "accepted" ? "Принят" : response.status === "rejected" ? "Отклонен" : "На рассмотрении"}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-medium">{response.message}</p>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="text-[10px] text-slate-400 font-medium">
                    {new Date(response.created_at).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>

                  {role === "client" && response.status === "pending" ? (
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateResponseStatus(response.id, "accepted")}
                        className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                        title="Принять"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateResponseStatus(response.id, "rejected")}
                        className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 transition-colors"
                        title="Отклонить"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ) : null}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
