"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  ReceiptText,
  User,
  Send,
  Loader2,
  Laptop,
  Palette,
  TrendingUp,
  PenTool,
  Layers,
  Bookmark,
  Briefcase,
  ExternalLink,
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
      return <Laptop className="w-4 h-4 text-sky-600" />;
    case "design":
      return <Palette className="w-4 h-4 text-purple-600" />;
    case "marketing":
      return <TrendingUp className="w-4 h-4 text-emerald-600" />;
    case "copywriting":
      return <PenTool className="w-4 h-4 text-amber-600" />;
    default:
      return <Layers className="w-4 h-4 text-violet-600" />;
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
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const supabase = createClient();

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);

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
        setOrder({ ...orderData, client: clientObj || { id: "", first_name: "", username: "" } });
      } else {
        setOrder({
          id: id as string,
          title: "Разработка Telegram бота и Mini App рулетки на звезды",
          description:
            "ищу разработчика который сделает tg бота, mini-app рулетка на звезды, бюджет маленький, выслушаю вашу цену, тз в лс.\n\nТребования:\n- Опыт с Telegram WebApp API и Stars payment\n- Стек: React/Next.js + Node.js",
          category: "programming",
          budget_min: 20000,
          budget_max: 35000,
          status: "active",
          created_at: new Date().toISOString(),
          client: { id: "client-1", first_name: "Иван", username: "client_tg" },
        });
      }

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
            const execObj = Array.isArray(response.executor) ? response.executor[0] : response.executor;
            return { ...response, executor: execObj || { first_name: "", username: "" } };
          })
        );
      }
    } catch {
      // fallback уже обработан выше
    } finally {
      setIsLoading(false);
    }
  }, [id, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
          executor: { first_name: "Вы", username: "me" },
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
      await supabase.from("responses").update({ status: "accepted" }).eq("id", responseId);
      setResponses((prev) => prev.map((r) => (r.id === responseId ? { ...r, status: "accepted" } : r)));
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
      ? `${order.budget_min.toLocaleString("ru-RU")}–${order.budget_max.toLocaleString("ru-RU")} ₽`
      : order.budget_min
      ? `от ${order.budget_min.toLocaleString("ru-RU")} ₽`
      : "по договорённости";

  return (
    <div className="space-y-3 pb-20">
      {/* Навигация */}
      <div className="flex items-center justify-between">
        <Link href="/feed">
          <motion.button
            whileTap={{ scale: 0.92 }}
            className="w-9 h-9 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:border-violet-300 hover:text-violet-700 shadow-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </motion.button>
        </Link>
        <button
          onClick={() => setIsSaved(!isSaved)}
          className={`w-9 h-9 rounded-2xl border flex items-center justify-center shadow-xs transition-colors ${
            isSaved ? "bg-violet-600 text-white border-violet-600" : "bg-white border-slate-200 text-slate-700 hover:border-violet-300"
          }`}
        >
          <Bookmark className="w-4 h-4" />
        </button>
      </div>

      {/* Карточка заказа — компактная */}
      <div className="bg-white rounded-3xl p-4 space-y-3 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${getCategoryIconBg(order.category)}`}>
              {getCategoryIcon(order.category)}
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1 flex-wrap">
                <span className="font-bold text-sm text-slate-900 leading-tight">{getCategoryLabel(order.category)}</span>
                <span className="text-slate-500 font-medium text-[11px]">{getCategorySublabel(order.category)}</span>
              </div>
              <p className="text-slate-400 text-[11px]">{formatDate(order.created_at)}</p>
            </div>
          </div>
          <span className="bg-[#2563EB] text-white font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
            Активен
          </span>
        </div>

        {order.title && <h2 className="font-extrabold text-base text-slate-900 leading-snug">{order.title}</h2>}

        <p className="text-slate-700 text-xs font-medium leading-relaxed whitespace-pre-line max-h-40 overflow-y-auto pr-1">
          {order.description}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <div className="badge-yellow text-[11px] font-semibold flex items-center gap-1 py-1 px-2.5 rounded-xl">
            <ReceiptText className="w-3.5 h-3.5 text-amber-700" />
            <span>{budgetText}</span>
          </div>
          <div className="badge-blue text-[11px] font-semibold flex items-center gap-1 py-1 px-2.5 rounded-xl">
            <Briefcase className="w-3.5 h-3.5 text-blue-700" />
            <span>Telegram WebApp</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-[11px]">
              {order.client.first_name?.[0] || "U"}
            </div>
            <span>{order.client.first_name || `@${order.client.username}`}</span>
          </div>
          {order.client.username && (
            
              href={`https://t.me/${order.client.username}`}
              target="_blank"
              rel="noreferrer"
              className="text-[#2563EB] hover:underline font-semibold flex items-center gap-1"
            >
              <span>@{order.client.username}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Форма отклика — без AI */}
      <div className="bg-white rounded-3xl p-4 space-y-2.5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <h3 className="font-bold text-slate-900 text-xs">Оставить отклик</h3>
        <textarea
          value={responseMessage}
          onChange={(e) => setResponseMessage(e.target.value)}
          placeholder="Напишите ваш отклик на заявку..."
          rows={3}
          className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:bg-white focus:outline-none resize-none text-xs leading-relaxed font-medium transition-all"
        />
        <button
          onClick={handleSubmitResponse}
          disabled={isSubmitting || !responseMessage.trim()}
          className="w-full btn-primary py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          <span>Отправить отклик</span>
        </button>
      </div>

      {/* Список откликов */}
      {responses.length > 0 && (
        <div className="space-y-2 pt-1">
          <h3 className="font-extrabold text-xs text-slate-900 px-1">Отклики ({responses.length})</h3>
          {responses.map((response) => (
            <motion.div
              key={response.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-3 space-y-2 border border-slate-100 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-[11px] font-bold">
                    {response.executor.first_name?.[0] || "U"}
                  </div>
                  <span className="font-bold text-xs text-slate-900">{response.executor.first_name}</span>
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
              <p className="text-slate-800 text-xs font-medium leading-relaxed">{response.message}</p>
              {isOwner && response.status === "pending" && (
                <button onClick={() => handleAcceptResponse(response.id)} className="w-full btn-primary text-xs py-1.5 rounded-xl mt-1">
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
