"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useSubscription } from "@/lib/useSubscription";
import {
  ArrowLeft,
  ReceiptText,
  Clock,
  User,
  MessageCircle,
  Wand2,
  Send,
  Loader2,
  Laptop,
  Palette,
  TrendingUp,
  PenTool,
  Layers,
  Sparkles,
  Bookmark,
  Briefcase,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Crown,
  ArrowRight
} from "lucide-react";
import { getCategoryLabel, getCategorySublabel, formatDate } from "@/lib/utils";
import Link from "next/link";

interface OrderDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  budget_min: number | null;
  budget_max: number | null;
  status: string;
  created_at: string;
  client: {
    id: string;
    first_name: string;
    username: string;
  };
}

interface Response {
  id: string;
  message: string;
  ai_draft: string | null;
  status: string;
  created_at: string;
  executor: {
    first_name: string;
    username: string;
  };
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "programming":
      return <Laptop className="w-5 h-5 text-sky-600" />;
    case "design":
      return <Palette className="w-5 h-5 text-purple-600" />;
    case "marketing":
      return <TrendingUp className="w-5 h-5 text-emerald-600" />;
    case "copywriting":
      return <PenTool className="w-5 h-5 text-amber-600" />;
    default:
      return <Layers className="w-5 h-5 text-violet-600" />;
  }
};

const getCategoryIconBg = (category: string) => {
  switch (category) {
    case "programming":
      return "bg-sky-50 border-sky-100";
    case "design":
      return "bg-purple-50 border-purple-100";
    case "marketing":
      return "bg-emerald-50 border-emerald-100";
    case "copywriting":
      return "bg-amber-50 border-amber-100";
    default:
      return "bg-violet-50 border-violet-100";
  }
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [userRole, setUserRole] = useState<string | null>("executor");
  const [userId, setUserId] = useState<string | null>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const supabase = createClient();

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();
        if (userData?.role) setUserRole(userData.role);
      }

      // Загружаем заказ
      const { data: orderData } = await supabase
        .from("orders")
        .select(`
          id, title, description, category, budget_min, budget_max, status, created_at,
          client:client_id(id, first_name, username)
        `)
        .eq("id", id)
        .single();

      if (orderData) {
        const clientObj = Array.isArray((orderData as any).client)
          ? (orderData as any).client[0]
          : (orderData as any).client;

        setOrder({
          ...orderData,
          client: clientObj || { id: "", first_name: "", username: "" },
        });
      } else {
        // Mock fallback for demo
        setOrder({
          id: id as string,
          title: "Разработка Telegram бота и Mini App рулетки на звезды",
          description: "ищу разработчика который сделает tg бота, mini-app рулетка на звезды, бюджет маленький, выслушаю вашу цену, тз в лс.\n\nТребования:\n- Опыт с Telegram WebApp API и Stars payment\n- Стек: React/Next.js + Node.js\n- Красивая анимация прокрутки рулетки",
          category: "programming",
          budget_min: 20000,
          budget_max: 35000,
          status: "active",
          created_at: new Date().toISOString(),
          client: {
            id: "client-1",
            first_name: "Иван",
            username: "client_tg",
          },
        });
      }

      // Загружаем отклики
      const { data: responsesData } = await supabase
        .from("responses")
        .select(`
          id, message, ai_draft, status, created_at,
          executor:executor_id(first_name, username)
        `)
        .eq("order_id", id)
        .order("created_at", { ascending: false });

      if (responsesData && responsesData.length > 0) {
        setResponses(
          responsesData.map((response: any) => {
            const execObj = Array.isArray(response.executor)
              ? response.executor[0]
              : response.executor;
            return {
              ...response,
              executor: execObj || { first_name: "", username: "" },
            };
          })
        );
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, [id, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleGenerateAI() {
    if (!order) return;
    setIsGeneratingAI(true);

    try {
      const response = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderTitle: order.title || order.description.slice(0, 50),
          orderDescription: order.description,
          category: order.category,
        }),
      });

      const data = await response.json();
      if (data.draft) {
        setResponseMessage(data.draft);
      } else {
        setResponseMessage(
          `Здравствуйте, ${order.client.first_name || "заказчик"}! Готов реализовать ваш проект по Telegram Mini App. Имею готовый опыт разработки WebApp с анимациями и Stars API. Сделаю быстро и качественно. Давайте обсудим ТЗ!`
        );
      }
    } catch {
      setResponseMessage(
        `Здравствуйте, ${order.client.first_name || "заказчик"}! Готов качественно разработать Telegram Mini App и подключить Stars. Напишите в ЛС для обсуждения ТЗ.`
      );
    } finally {
      setIsGeneratingAI(false);
    }
  }

  async function handleSubmitResponse() {
    if (!responseMessage.trim()) return;

    setIsSubmitting(true);
    try {
      if (userId) {
        await supabase.from("responses").insert({
          order_id: id as string,
          executor_id: userId,
          message: responseMessage,
          status: "pending",
        });
      }

      setResponses((prev) => [
        {
          id: `res-${Date.now()}`,
          message: responseMessage,
          ai_draft: null,
          status: "pending",
          created_at: new Date().toISOString(),
          executor: {
            first_name: "Вы",
            username: "me",
          },
        },
        ...prev,
      ]);

      setResponseMessage("");
    } catch (error) {
      console.error("Error submitting response:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAcceptResponse(responseId: string) {
    try {
      await supabase
        .from("responses")
        .update({ status: "accepted" })
        .eq("id", responseId);

      setResponses((prev) =>
        prev.map((r) => (r.id === responseId ? { ...r, status: "accepted" } : r))
      );
    } catch (error) {
      console.error("Error accepting response:", error);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 space-y-3">
        <p className="font-bold text-slate-800">Заказ не найден</p>
        <Link href="/feed" className="btn-primary inline-flex text-xs px-4 py-2">
          Вернуться в ленту
        </Link>
      </div>
    );
  }

  const isOwner = userId === order.client.id;
  const budgetText =
    order.budget_min && order.budget_max
      ? `${order.budget_min.toLocaleString("ru-RU")} – ${order.budget_max.toLocaleString("ru-RU")} ₽`
      : order.budget_min
      ? `от ${order.budget_min.toLocaleString("ru-RU")} ₽`
      : "по договоренности";

  return (
    <div className="space-y-4 pb-20">
      {/* Top Navigation */}
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
            onClick={() => setIsSaved(!isSaved)}
            className={`w-10 h-10 rounded-2xl border flex items-center justify-center shadow-xs transition-colors ${
              isSaved
                ? "bg-violet-600 text-white border-violet-600 shadow-violet"
                : "bg-white border-slate-200 text-slate-700 hover:border-violet-300"
            }`}
          >
            <Bookmark className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Order Card */}
      <div className="bg-white rounded-3xl p-5 space-y-4 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        {/* Category Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-xs ${getCategoryIconBg(
                order.category
              )}`}
            >
              {getCategoryIcon(order.category)}
            </div>

            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-base text-slate-900 leading-tight">
                  {getCategoryLabel(order.category)}
                </span>
                <span className="text-slate-700 font-medium text-xs">
                  {getCategorySublabel(order.category)}
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                {formatDate(order.created_at)}
              </p>
            </div>
          </div>

          <span className="bg-[#2563EB] text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
            АКТИВЕН
          </span>
        </div>

        {/* Title & Description */}
        <div className="space-y-2 pt-1">
          {order.title && (
            <h2 className="font-extrabold text-lg text-slate-900 leading-snug">
              {order.title}
            </h2>
          )}
          <p className="text-slate-800 text-sm font-medium leading-relaxed whitespace-pre-line">
            {order.description}
          </p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <div className="badge-yellow text-xs font-semibold flex items-center gap-1.5 py-1.5 px-3 rounded-xl">
            <ReceiptText className="w-4 h-4 text-amber-700" />
            <span>{budgetText}</span>
          </div>

          <div className="badge-blue text-xs font-semibold flex items-center gap-1.5 py-1.5 px-3 rounded-xl">
            <Briefcase className="w-4 h-4 text-blue-700" />
            <span>Telegram WebApp</span>
          </div>
        </div>

        {/* Client Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xs">
              {order.client.first_name?.[0] || "U"}
            </div>
            <span>{order.client.first_name || `@${order.client.username}`}</span>
          </div>

          {order.client.username && (
            <a
              href={`https://t.me/${order.client.username}`}
              target="_blank"
              rel="noreferrer"
              className="text-[#2563EB] hover:underline font-semibold flex items-center gap-1"
            >
              <span>@{order.client.username}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* AI Draft & Response Section */}
      <div className="bg-white rounded-3xl p-5 space-y-3.5 border border-purple-100 shadow-[0_4px_20px_rgba(124,58,237,0.03)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Отклик на заявку с поддержкой AI
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
            Умный черновик
          </span>
        </div>

        <textarea
          value={responseMessage}
          onChange={(e) => setResponseMessage(e.target.value)}
          placeholder="Напишите ваш отклик или сгенерируйте продающий ответ с помощью AI..."
          rows={4}
          className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:bg-white focus:outline-none resize-none text-xs leading-relaxed font-medium transition-all"
        />

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleGenerateAI}
            disabled={isGeneratingAI}
            className="flex-1 px-3.5 py-2.5 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/80 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
          >
            {isGeneratingAI ? (
              <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
            ) : (
              <Wand2 className="w-4 h-4 text-purple-600" />
            )}
            <span>AI Черновик</span>
          </button>

          <button
            onClick={handleSubmitResponse}
            disabled={isSubmitting || !responseMessage.trim()}
            className="flex-[2] btn-primary py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>Отправить отклик</span>
          </button>
        </div>
      </div>

      {/* Responses List */}
      {responses.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="font-extrabold text-sm text-slate-900 px-1">
            Отклики ({responses.length})
          </h3>

          {responses.map((response) => (
            <motion.div
              key={response.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-4 space-y-2.5 border border-slate-100 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                    {response.executor.first_name?.[0] || "U"}
                  </div>
                  <span className="font-bold text-xs text-slate-900">
                    {response.executor.first_name}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    response.status === "accepted"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "badge-yellow"
                  }`}
                >
                  {response.status === "accepted" ? "Принят" : "На рассмотрении"}
                </span>
              </div>

              <p className="text-slate-800 text-xs font-medium leading-relaxed">
                {response.message}
              </p>

              {isOwner && response.status === "pending" && (
                <button
                  onClick={() => handleAcceptResponse(response.id)}
                  className="w-full btn-primary text-xs py-2 rounded-xl mt-2"
                >
                  Выбрать исполнителем
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

