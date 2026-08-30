"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { getTelegramUser } from "@/lib/telegram/webapp";
import {
  ArrowLeft,
  MessageSquare,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  User,
  Calendar,
  ChevronRight,
  Star,
  Send,
  Bot,
  Sparkles,
  Loader2,
  ExternalLink
} from "lucide-react";
import Link from "next/link";

interface Response {
  id: string;
  order_id: string;
  executor_id?: string;
  message: string;
  budget: number;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  executor?: {
    first_name: string;
    username: string;
    rating?: number;
  };
  order?: {
    title: string;
    category: string;
  };
}

export default function ResponsesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");
  const [role, setRole] = useState<string>("client");

  const loadResponses = useCallback(async () => {
    setLoading(true);
    try {
      const savedRole = localStorage.getItem("1337_role") || localStorage.getItem("fiolet_role") || "client";
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let fetchedData: Response[] = [];

      if (user) {
        if (savedRole === "client") {
          // Для заказчика: сначала получаем его заказы
          const { data: myOrders } = await supabase.from("orders").select("id").eq("client_id", user.id);
          const orderIds = (myOrders || []).map((o) => o.id);

          if (orderIds.length > 0) {
            const { data } = await supabase
              .from("responses")
              .select(
                `
                *,
                executor:executor_id (
                  first_name,
                  username,
                  rating
                ),
                order:order_id (
                  title,
                  category
                )
              `
              )
              .in("order_id", orderIds)
              .order("created_at", { ascending: false });

            fetchedData = data || [];
          }
        } else {
          // Для исполнителя: получаем его отклики
          const { data } = await supabase
            .from("responses")
            .select(
              `
              *,
              executor:executor_id (
                first_name,
                username,
                rating
              ),
              order:order_id (
                title,
                category
              )
            `
            )
            .eq("executor_id", user.id)
            .order("created_at", { ascending: false });

          fetchedData = data || [];
        }
      }

      // Подмешиваем локально сохраненные отклики
      let localResponses: any[] = [];
      try {
        const localKey = "1337_my_all_responses";
        const saved = JSON.parse(localStorage.getItem(localKey) || "[]");
        if (Array.isArray(saved)) {
          localResponses = saved;
        }
      } catch (e) {
        console.warn("Failed to parse local responses:", e);
      }

      const merged = [...fetchedData];
      for (const lr of localResponses) {
        if (!merged.some((m) => m.id === lr.id)) {
          merged.push(lr);
        }
      }

      setResponses(merged);
    } catch (error) {
      console.error("Error loading responses:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const savedRole = localStorage.getItem("1337_role") || localStorage.getItem("fiolet_role") || "client";
    setRole(savedRole);
    loadResponses();
  }, [loadResponses]);

  const getStatusText = (status: string) => {
    switch (status) {
      case "accepted":
        return "Принят";
      case "rejected":
        return "Отклонен";
      default:
        return "На рассмотрении";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "rejected":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-amber-50 text-amber-700 border-amber-200";
    }
  };

  const filteredResponses = responses.filter((r) => (filter === "all" ? true : r.status === filter));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 text-slate-900 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={role === "client" ? "/feed" : "/portfolio"}>
            <motion.button
              whileTap={{ scale: 0.92 }}
              className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:border-violet-300 hover:text-violet-700 shadow-xs transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </motion.button>
          </Link>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-violet-600" />
              <span>Отклики</span>
              <span className="badge-violet text-[10px] font-bold py-0.5 px-2 rounded-lg">{responses.length}</span>
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">
              {role === "client" ? "Отклики специалистов на ваши задания" : "Ваши предложения по заказам"}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
        {(["all", "pending", "accepted", "rejected"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filter === tab ? "bg-violet-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            {tab === "all" && "Все"}
            {tab === "pending" && "На рассмотрении"}
            {tab === "accepted" && "Принятые"}
            {tab === "rejected" && "Отклоненные"}
          </button>
        ))}
      </div>

      {/* Responses List */}
      {filteredResponses.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-purple-100 border border-purple-200 text-violet-700 flex items-center justify-center mx-auto">
            <MessageSquare className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Нет откликов</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              {role === "client" ? "На ваши заказы пока никто не откликнулся" : "Вы еще не откликались ни на один заказ"}
            </p>
          </div>
          {role === "executor" && (
            <Link
              href="/feed"
              className="btn-primary py-2.5 px-5 rounded-2xl text-xs font-bold inline-flex items-center gap-2 shadow-violet"
            >
              <span>Найти заказы в ленте</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredResponses.map((response) => {
            const execUsername = (response.executor?.username || "").replace(/^@/, "");
            const tgUrl = execUsername ? `https://t.me/${execUsername}` : null;

            return (
              <motion.div
                key={response.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl p-4.5 border border-slate-100 shadow-[0_4px_15px_rgba(0,0,0,0.02)] hover:border-violet-200 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/orders/${response.order_id}`}
                        className="text-xs font-extrabold text-slate-900 hover:text-violet-700 transition-colors"
                      >
                        {response.order?.title || (role === "client" ? response.executor?.first_name : "Задание")}
                      </Link>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(response.status)}`}>
                        {getStatusText(response.status)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 font-medium leading-relaxed mt-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      {response.message}
                    </p>

                    <div className="flex items-center gap-4 mt-2.5 text-[11px] text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1 font-bold text-violet-700">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>{response.budget.toLocaleString()} ₽</span>
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(response.created_at).toLocaleDateString("ru-RU")}</span>
                      </span>
                      {response.executor?.username && (
                        <span className="font-bold text-slate-600">@{response.executor.username}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {tgUrl && (
                      <a
                        href={tgUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary py-1.5 px-3 rounded-xl text-[11px] font-bold flex items-center gap-1 shadow-violet"
                      >
                        <Send className="w-3 h-3" />
                        <span>В Telegram</span>
                      </a>
                    )}
                    <Link
                      href={`/orders/${response.order_id}`}
                      className="text-[10.5px] font-bold text-violet-600 hover:underline flex items-center gap-0.5"
                    >
                      <span>К заказу</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
