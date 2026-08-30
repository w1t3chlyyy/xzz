// app/(main)/orders/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { getTelegramUser } from "@/lib/telegram/webapp";
import { cn, getCategoryLabel, getCachedClientOrders } from "@/lib/utils";
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
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Trash2
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
  order_id?: string;
  executor_id?: string;
  message: string;
  budget: number;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  executor: {
    first_name: string;
    username: string;
    rating?: number;
    avatar?: string;
  };
}

const BOOKMARKS_KEY = "1337_bookmarked_orders";
const SUPPORT_URL = "https://t.me/F1337H";

const AI_RESPONSE_TEMPLATES = [
  {
    title: "⚡️ Быстрый старт",
    text: "Здравствуйте! Готов приступить к выполнению задания сегодня. Имею более 3 лет опыта по данному направлению. Сделаю качественно и в срок.",
  },
  {
    title: "🎯 Подробный стек",
    text: "Приветствую! Ознакомился с вашим ТЗ — задача понятна. Предлагаю современное решение со всеми требованиями. Готов обсудить детали в Telegram.",
  },
  {
    title: "💼 Есть кейсы",
    text: "Добрый день! Уже реализовывал похожие проекты, кейсы и отзывы есть в моем профиле. Предлагаю списаться в TG для уточнения деталей.",
  },
];

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
  const [tgUser, setTgUser] = useState<any>(null);

  // Response Form State
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseMessage, setResponseMessage] = useState("");
  const [responseBudget, setResponseBudget] = useState("");
  const [responseDays, setResponseDays] = useState("3");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Interaction State
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [contactCopied, setContactCopied] = useState(false);
  const [responseActionError, setResponseActionError] = useState<string | null>(null);

  const loadUser = useCallback(async () => {
    try {
      const extractedTg = getTelegramUser();
      if (extractedTg) {
        setTgUser(extractedTg);
      }
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (e) {
      console.warn("Error getting user:", e);
    }
  }, [supabase]);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Пытаемся загрузить из Supabase
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

      if (orderError || !orderData) {
        // Проверяем fallback в локальном кэше
        const cached = getCachedClientOrders<Order>();
        const localFound = cached.find((o) => o.id === params.id);
        if (localFound) {
          setOrder(localFound);
        } else {
          setOrder(null);
        }
      } else {
        setOrder(orderData);
      }

      // 2. Загружаем отклики из Supabase
      const { data: responsesData } = await supabase
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

      // Объединяем с локально сохраненными откликами (для мгновенности)
      let localResponses: Response[] = [];
      try {
        const localKey = "1337_order_responses_" + params.id;
        const saved = JSON.parse(localStorage.getItem(localKey) || "[]");
        if (Array.isArray(saved)) {
          localResponses = saved;
        }
      } catch (e) {
        console.warn("Could not read local responses", e);
      }

      const merged = [...(responsesData || [])];
      // Добавляем локальные, которых нет в Supabase
      for (const lr of localResponses) {
        if (!merged.some((m) => m.id === lr.id)) {
          merged.push(lr);
        }
      }

      setResponses(merged);
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

  // Устанавливаем рекомендованный бюджет по умолчанию
  useEffect(() => {
    if (order && !responseBudget) {
      setResponseBudget(order.budget_min ? order.budget_min.toString() : "25000");
    }
  }, [order, responseBudget]);

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

  const handleCopyContact = (username: string) => {
    const clean = username.replace(/^@/, "");
    if (!clean) return;
    try {
      navigator.clipboard.writeText("@" + clean);
      setContactCopied(true);
      setTimeout(() => setContactCopied(false), 2000);
    } catch (e) {
      console.warn("Copy contact failed:", e);
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
      // Если это локальный отклик, обновляем в localStorage
      try {
        const localKey = "1337_order_responses_" + params.id;
        const saved: Response[] = JSON.parse(localStorage.getItem(localKey) || "[]");
        const updated = saved.map((r) => (r.id === responseId ? { ...r, status } : r));
        localStorage.setItem(localKey, JSON.stringify(updated));
      } catch (e) {
        setResponses(previous);
        setResponseActionError("Не удалось обновить статус отклика");
      }
    }
  };

  const handleDeleteMyResponse = async (responseId: string) => {
    try {
      await supabase.from("responses").delete().eq("id", responseId);
      // Чистим локальный кэш
      const localKey = "1337_order_responses_" + params.id;
      const saved: Response[] = JSON.parse(localStorage.getItem(localKey) || "[]");
      const filtered = saved.filter((r) => r.id !== responseId);
      localStorage.setItem(localKey, JSON.stringify(filtered));

      setResponses((prev) => prev.filter((r) => r.id !== responseId));
    } catch (e) {
      console.error("Error deleting response:", e);
    }
  };

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    if (!responseMessage.trim()) {
      setSubmitError("Пожалуйста, напишите ваше предложение или подход к задаче");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const tg = tgUser || getTelegramUser();
      const currentExecutorName = tg?.displayName || "Исполнитель";
      const currentExecutorUsername = tg?.username?.replace(/^@/, "") || "executor";
      const budgetNum = parseInt(responseBudget) || order.budget_min || 25000;

      let insertedResponse: Response | null = null;

      if (user) {
        // Убеждаемся, что в users есть контактные данные исполнителя
        try {
          await supabase
            .from("users")
            .update({
              username: currentExecutorUsername,
              first_name: currentExecutorName,
              updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);
        } catch (uErr) {
          console.warn("Could not sync executor profile:", uErr);
        }

        const { data, error } = await supabase
          .from("responses")
          .insert({
            order_id: order.id,
            executor_id: user.id,
            message: responseMessage.trim(),
            budget: budgetNum,
            status: "pending",
          })
          .select("id, created_at")
          .single();

        if (!error && data) {
          insertedResponse = {
            id: data.id,
            order_id: order.id,
            executor_id: user.id,
            message: responseMessage.trim(),
            budget: budgetNum,
            status: "pending",
            created_at: data.created_at || new Date().toISOString(),
            executor: {
              first_name: currentExecutorName,
              username: currentExecutorUsername,
              rating: 5.0,
            },
          };
        }
      }

      // Если не авторизован или офлайн, формируем локальный отклик
      if (!insertedResponse) {
        insertedResponse = {
          id: "resp-" + Date.now(),
          order_id: order.id,
          executor_id: user?.id || "local-executor",
          message: responseMessage.trim(),
          budget: budgetNum,
          status: "pending",
          created_at: new Date().toISOString(),
          executor: {
            first_name: currentExecutorName,
            username: currentExecutorUsername,
            rating: 5.0,
          },
        };
      }

      // Сохраняем в локальный кэш
      try {
        const localKey = "1337_order_responses_" + params.id;
        const saved: Response[] = JSON.parse(localStorage.getItem(localKey) || "[]");
        localStorage.setItem(localKey, JSON.stringify([insertedResponse, ...saved]));

        // Также сохраняем в общий список моих откликов для страницы /responses
        const allMyKey = "1337_my_all_responses";
        const myAll: any[] = JSON.parse(localStorage.getItem(allMyKey) || "[]");
        const orderSummary = {
          ...insertedResponse,
          order: {
            title: order.title,
            category: order.category,
          },
        };
        localStorage.setItem(allMyKey, JSON.stringify([orderSummary, ...myAll]));
      } catch (lErr) {
        console.warn("Failed to write to localStorage:", lErr);
      }

      // Добавляем в стейт
      setResponses((prev) => [insertedResponse!, ...prev]);
      setSubmitSuccess(true);
      setShowResponseForm(false);
      setResponseMessage("");

      setTimeout(() => {
        setSubmitSuccess(false);
      }, 4000);
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
        return "Активный заказ";
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

  // Контактные данные заказчика
  const clientUsername = (order.client?.username || "").replace(/^@/, "");
  const clientDisplayName = order.client?.first_name || "Заказчик";
  const clientTgMessage = `Здравствуйте! Пишу по поводу заказа "${order.title}" на бирже 1337. Хочу обсудить детали!`;
  const clientTgUrl = clientUsername
    ? `https://t.me/${clientUsername}?text=${encodeURIComponent(clientTgMessage)}`
    : null;

  // Проверка: откликнулся ли уже текущий пользователь?
  const currentTgUsername = (tgUser?.username || "").replace(/^@/, "");
  const myResponse = responses.find(
    (r) =>
      (user?.id && r.executor_id === user.id) ||
      (currentTgUsername && r.executor?.username === currentTgUsername)
  );

  const isOwner = user?.id && order.client_id === user.id;

  return (
    <div className="space-y-3.5 pb-28 text-slate-900 font-sans">
      {/* Top Header Navigation */}
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
              "p-2.5 rounded-xl border transition-colors",
              isBookmarked ? "bg-violet-600 border-violet-600 text-white" : "bg-white border-slate-200 hover:border-violet-300"
            )}
          >
            <Bookmark className={cn("w-4 h-4", isBookmarked ? "fill-white" : "text-slate-500")} />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={handleShare}
              title="Поделиться ссылкой"
              className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-violet-300 transition-colors"
            >
              <Share2 className="w-4 h-4 text-slate-500" />
            </button>

            <AnimatePresence>
              {shareCopied ? (
                <motion.span
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-full right-0 mt-1.5 text-[10px] font-bold text-white bg-slate-900 px-2.5 py-1 rounded-lg whitespace-nowrap z-10 shadow-lg"
                >
                  Ссылка скопирована!
                </motion.span>
              ) : null}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={handleReport}
            title="Пожаловаться"
            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-rose-300 transition-colors"
          >
            <Flag className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Toast: Успешный отклик */}
      <AnimatePresence>
        {submitSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-emerald-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-5 h-5 text-emerald-200 shrink-0" />
              <div>
                <div className="text-xs font-extrabold">Отклик успешно отправлен!</div>
                <div className="text-[11px] text-emerald-100">Заказчик получит уведомление и сможет написать вам в Telegram.</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Order Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.04)] space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-extrabold text-slate-900 break-words leading-tight">{order.title}</h1>
              <span className={cn("text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0", getStatusColor(order.status))}>
                {getStatusText(order.status)}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1 font-semibold text-violet-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
                <Tag className="w-3.5 h-3.5" />
                <span>{getCategoryLabel(order.category)}</span>
              </span>
              <span className="flex items-center gap-1 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{new Date(order.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</span>
              </span>
            </div>
          </div>

          <div className="text-right shrink-0 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <div className="text-sm font-extrabold text-violet-700">
              {order.budget_min?.toLocaleString()} - {order.budget_max?.toLocaleString()} ₽
            </div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Бюджет задачи</div>
          </div>
        </div>

        {/* Client Profile & Primary "Write" Action */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50/70 via-violet-50/50 to-slate-50 border border-purple-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-violet-600 text-white font-extrabold flex items-center justify-center text-base shadow-xs shrink-0">
              {clientDisplayName[0] || "З"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-extrabold text-slate-900 truncate">{clientDisplayName}</span>
                <span className="badge-violet text-[9px] font-bold px-1.5 py-0.2 rounded">Заказчик</span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs text-slate-500 font-bold truncate">
                  {clientUsername ? `@${clientUsername}` : "Telegram профиль"}
                </span>
                {clientUsername && (
                  <button
                    type="button"
                    onClick={() => handleCopyContact(clientUsername)}
                    title="Скопировать username"
                    className="p-1 text-slate-400 hover:text-violet-600 transition-colors"
                  >
                    {contactCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Action: Write to Client in Telegram */}
          {clientTgUrl ? (
            <a
              href={clientTgUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-violet shrink-0 transition-transform active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Написать заказчику</span>
            </a>
          ) : (
            <div className="text-[11px] font-bold text-slate-400 bg-white/80 px-3 py-1.5 rounded-xl border border-slate-200">
              Контакт скрыт в Telegram
            </div>
          )}
        </div>

        {/* Task Description */}
        <div>
          <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <FileText className="w-4 h-4 text-violet-600" />
            Техническое задание и требования
          </h2>
          <div className="bg-slate-50 rounded-2xl p-4 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap border border-slate-100">
            {order.description || "Описание задачи отсутствует."}
          </div>
        </div>

        {/* Order Stats */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="text-center p-2.5 rounded-2xl bg-purple-50/80 border border-purple-100">
            <div className="text-sm font-extrabold text-violet-700">{responses.length}</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Откликов</div>
          </div>
          <div className="text-center p-2.5 rounded-2xl bg-emerald-50/80 border border-emerald-100">
            <div className="text-sm font-extrabold text-emerald-700">
              {responses.filter((r) => r.status === "accepted").length}
            </div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Принято</div>
          </div>
          <div className="text-center p-2.5 rounded-2xl bg-amber-50/80 border border-amber-100">
            <div className="text-sm font-extrabold text-amber-700">
              {responses.filter((r) => r.status === "pending").length}
            </div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">В ожидании</div>
          </div>
        </div>
      </motion.div>

      {/* User's existing response banner (If already responded) */}
      {myResponse && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-purple-50/90 border border-purple-200 rounded-3xl p-4.5 space-y-3 shadow-xs"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-slate-900">Ваш отклик на этот заказ</h3>
                <p className="text-[11px] text-slate-500 font-medium">Отправлен {new Date(myResponse.created_at).toLocaleDateString("ru-RU")}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border",
                  myResponse.status === "accepted"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : myResponse.status === "rejected"
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                )}
              >
                {myResponse.status === "accepted"
                  ? "Принят заказчиком"
                  : myResponse.status === "rejected"
                  ? "Отклонен"
                  : "Ожидает рассмотрения"}
              </span>

              <button
                type="button"
                onClick={() => handleDeleteMyResponse(myResponse.id)}
                title="Отозвать отклик"
                className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3 border border-purple-100 text-xs text-slate-700 leading-relaxed font-medium">
            {myResponse.message}
          </div>

          <div className="flex items-center justify-between text-xs pt-0.5">
            <span className="font-extrabold text-violet-700">
              Предложенная стоимость: {myResponse.budget.toLocaleString()} ₽
            </span>
            {clientTgUrl && (
              <a
                href={clientTgUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-violet-600 hover:underline inline-flex items-center gap-1"
              >
                <span>Написать заказчику в TG</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </motion.div>
      )}

      {/* Responses Section & Submit Form */}
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
              Отклики исполнителей ({responses.length})
            </h2>
            <p className="text-slate-400 text-[11px] font-medium mt-0.5">Специалисты, готовые выполнить эту задачу</p>
          </div>

          {!myResponse && order.status === "active" && (
            <button
              onClick={() => setShowResponseForm(!showResponseForm)}
              className="btn-primary text-xs font-extrabold py-2 px-3.5 rounded-xl flex items-center gap-1.5 shadow-violet"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Откликнуться</span>
            </button>
          )}
        </div>

        {responseActionError ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl p-2.5">
            {responseActionError}
          </div>
        ) : null}

        {/* Response Form */}
        <AnimatePresence>
          {showResponseForm && !myResponse ? (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleSubmitResponse}
              className="bg-purple-50/80 border border-purple-200 rounded-3xl p-4.5 space-y-3.5 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                  Отклик на задание
                </h3>
                <span className="text-[10px] text-slate-500 font-bold bg-white px-2 py-0.5 rounded-lg border border-purple-100">
                  Контакты из профиля
                </span>
              </div>

              {submitError ? (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl p-2.5">
                  {submitError}
                </div>
              ) : null}

              {/* Quick AI Templates */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>Быстрые шаблоны отклика:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  {AI_RESPONSE_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setResponseMessage(tmpl.text)}
                      className="p-2 text-left rounded-xl bg-white hover:bg-violet-50 border border-purple-100 hover:border-violet-300 text-[10.5px] font-medium text-slate-700 transition-colors"
                    >
                      <div className="font-bold text-violet-700 mb-0.5">{tmpl.title}</div>
                      <div className="line-clamp-2 text-slate-500">{tmpl.text}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Ваше предложение заказчику *
                </label>
                <textarea
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  placeholder="Опишите, какой у вас опыт в подобных задачах, как планируете реализовывать и в какие сроки..."
                  rows={4}
                  className="w-full p-3.5 rounded-2xl bg-white border border-purple-200 text-slate-900 text-xs font-medium focus:border-violet-600 focus:outline-none resize-none leading-relaxed"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Ваша цена (₽) *</label>
                  <input
                    type="number"
                    value={responseBudget}
                    onChange={(e) => setResponseBudget(e.target.value)}
                    placeholder={order.budget_min?.toString() || "25000"}
                    className="w-full p-3 rounded-2xl bg-white border border-purple-200 text-slate-900 text-xs font-medium focus:border-violet-600 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Срок выполнения (дней)</label>
                  <input
                    type="number"
                    value={responseDays}
                    onChange={(e) => setResponseDays(e.target.value)}
                    placeholder="3"
                    className="w-full p-3 rounded-2xl bg-white border border-purple-200 text-slate-900 text-xs font-medium focus:border-violet-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-white rounded-2xl border border-purple-100 flex items-center justify-between text-[11px] text-slate-600">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-violet-600" />
                  <span>
                    Ваш контакт: <b>@{currentTgUsername || "executor_tg"}</b>
                  </span>
                </div>
                <span className="text-slate-400 font-medium">Подтянут из профиля</span>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={submitting || !responseMessage.trim()}
                  className="flex-1 btn-primary py-3 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-violet disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Отправить отклик заказчику</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowResponseForm(false)}
                  className="px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Отмена
                </button>
              </div>
            </motion.form>
          ) : null}
        </AnimatePresence>

        {/* Responses Feed */}
        <div className="space-y-3">
          {responses.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 text-violet-500 flex items-center justify-center mx-auto mb-2.5">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-800">Пока нет откликов</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Будьте первым исполнителем, отправившим предложение!</p>
            </div>
          ) : (
            responses.map((resp, index) => {
              const execUsername = (resp.executor?.username || "").replace(/^@/, "");
              const execDisplayName = resp.executor?.first_name || "Исполнитель";
              const execTgMsg = `Здравствуйте, ${execDisplayName}! Пишу по поводу вашего отклика на заказ "${order.title}" на бирже 1337.`;
              const execTgUrl = execUsername ? `https://t.me/${execUsername}?text=${encodeURIComponent(execTgMsg)}` : null;

              return (
                <motion.div
                  key={resp.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className={cn(
                    "p-4 rounded-3xl border space-y-3 transition-all",
                    resp.status === "accepted"
                      ? "bg-emerald-50/40 border-emerald-200"
                      : "bg-slate-50/80 border-slate-200/80 hover:border-purple-200"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-violet-100 border border-violet-200 flex items-center justify-center text-violet-700 font-extrabold text-sm shrink-0">
                        {execDisplayName[0] || "И"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-extrabold text-slate-900 truncate">{execDisplayName}</span>
                          {resp.executor?.rating ? (
                            <span className="flex items-center gap-0.5 text-[11px] shrink-0 bg-amber-50 px-1.5 py-0.2 rounded-md border border-amber-200">
                              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                              <span className="font-bold text-slate-900">{resp.executor.rating}</span>
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium truncate">
                          @{execUsername || "anonymous"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold text-violet-700">{resp.budget?.toLocaleString()} ₽</div>
                      <span
                        className={cn(
                          "text-[9.5px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider inline-block mt-0.5",
                          resp.status === "accepted"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : resp.status === "rejected"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        )}
                      >
                        {resp.status === "accepted" ? "Принят" : resp.status === "rejected" ? "Отклонен" : "Ожидает"}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-medium bg-white p-3 rounded-2xl border border-slate-100">
                    {resp.message}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 flex-wrap gap-2">
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(resp.created_at).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {/* Button to write to executor in Telegram */}
                      {execTgUrl && (
                        <a
                          href={execTgUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary py-1.5 px-3 rounded-xl text-[11px] font-bold flex items-center gap-1 shadow-violet"
                        >
                          <Send className="w-3 h-3" />
                          <span>Написать в TG</span>
                        </a>
                      )}

                      {/* Client actions for this response */}
                      {(isOwner || role === "client") && resp.status === "pending" && (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateResponseStatus(resp.id, "accepted")}
                            className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                            title="Принять отклик"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateResponseStatus(resp.id, "rejected")}
                            className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors"
                            title="Отклонить отклик"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </motion.div>

      {/* Floating Bottom Bar for Quick Action */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 z-30 flex items-center justify-between gap-3 max-w-md mx-auto">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Бюджет задачи</div>
          <div className="text-sm font-extrabold text-violet-700 truncate">
            {order.budget_min?.toLocaleString()} – {order.budget_max?.toLocaleString()} ₽
          </div>
        </div>

        <div className="flex items-center gap-2">
          {clientTgUrl && (
            <a
              href={clientTgUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2.5 rounded-2xl bg-purple-50 text-violet-700 border border-purple-200 hover:bg-purple-100 text-xs font-extrabold flex items-center gap-1.5 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Написать</span>
            </a>
          )}

          {!myResponse && order.status === "active" ? (
            <button
              onClick={() => {
                setShowResponseForm(true);
                window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
              }}
              className="btn-primary py-2.5 px-4 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 shadow-violet"
            >
              <Plus className="w-4 h-4" />
              <span>Откликнуться</span>
            </button>
          ) : myResponse ? (
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-2xl border border-emerald-200 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>Вы откликнулись</span>
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
