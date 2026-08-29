"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  User,
  Send,
  Star,
  ShieldCheck,
  Plus,
  Users,
  Check,
  Sparkles
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface MyResponse {
  id: string;
  message: string;
  status: string;
  created_at: string;
  order: {
    id: string;
    title: string;
    category: string;
    client: {
      first_name: string;
    };
  };
}

interface ClientCandidate {
  id: string;
  orderId: string;
  orderTitle: string;
  executorName: string;
  executorUsername: string;
  rating: number;
  completedOrders: number;
  skills: string[];
  message: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
}

export default function ResponsesPage() {
  const [role, setRole] = useState<string>("client");
  const [responses, setResponses] = useState<MyResponse[]>([]);
  const [candidates, setCandidates] = useState<ClientCandidate[]>([]);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "accepted" | "rejected">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const supabase = createClient();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const savedRole = localStorage.getItem("1337_role") || localStorage.getItem("fiolet_role") || "client";
      setRole(savedRole);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setCandidates([]);
        setResponses([]);
        return;
      }

      if (savedRole === "client") {
        // Реальные отклики специалистов на заказы этого заказчика
        const { data, error } = await supabase
          .from("responses")
          .select(`
            id, message, status, created_at,
            order:order_id!inner(id, title, client_id),
            executor:executor_id(id, first_name, username, executor_profiles(skills, rating, completed_orders))
          `)
          .eq("order.client_id", user.id)
          .order("created_at", { ascending: false });

        if (!error && data) {
          const mapped: ClientCandidate[] = data.map((r: any) => {
            const orderObj = Array.isArray(r.order) ? r.order[0] : r.order;
            const execObj = Array.isArray(r.executor) ? r.executor[0] : r.executor;
            const profileObj = Array.isArray(execObj?.executor_profiles)
              ? execObj.executor_profiles[0]
              : execObj?.executor_profiles;

            return {
              id: r.id,
              orderId: orderObj?.id || "",
              orderTitle: orderObj?.title || "Задание",
              executorName: execObj?.first_name || execObj?.username || "Исполнитель",
              executorUsername: execObj?.username || "",
              rating: profileObj?.rating ?? 5.0,
              completedOrders: profileObj?.completed_orders ?? 0,
              skills: profileObj?.skills ?? [],
              message: r.message,
              status: r.status,
              created_at: r.created_at,
            };
          });
          setCandidates(mapped);
        } else {
          setCandidates([]);
        }
      } else {
        const { data } = await supabase
          .from("responses")
          .select(`
            id, message, status, created_at,
            order:order_id(id, title, category, client:client_id(first_name))
          `)
          .eq("executor_id", user.id)
          .order("created_at", { ascending: false });

        if (data) {
          setResponses(
            data.map((response: any) => {
              const orderObj = Array.isArray(response.order) ? response.order[0] : response.order;
              const clientObj = Array.isArray(orderObj?.client) ? orderObj.client[0] : orderObj?.client;
              return {
                ...response,
                order: {
                  ...orderObj,
                  client: clientObj || { first_name: "" },
                },
              };
            })
          );
        }
      }
    } catch (e) {
      console.warn("Responses load error:", e);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateCandidateStatus = async (candidateId: string, newStatus: "accepted" | "rejected") => {
    const previous = candidates;
    const candidate = candidates.find((c) => c.id === candidateId);
    setCandidates((prev) => prev.map((c) => (c.id === candidateId ? { ...c, status: newStatus } : c)));

    try {
      const { error } = await supabase
        .from("responses")
        .update({ status: newStatus })
        .eq("id", candidateId);

      if (error) throw error;

      setActionNotice(
        newStatus === "accepted"
          ? `Исполнитель ${candidate?.executorName} принят в проект! Напишите ему в Telegram.`
          : "Отклик отклонен."
      );
    } catch (e) {
      console.warn("Failed to update response status:", e);
      setCandidates(previous);
      setActionNotice("Не удалось обновить статус. Попробуйте ещё раз.");
    }

    setTimeout(() => setActionNotice(null), 4000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return (
          <span className="badge-blue text-[10px] font-bold py-0.5 px-2 rounded-lg flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-blue-700" />
            Принят в работу
          </span>
        );
      case "rejected":
        return (
          <span className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold py-0.5 px-2 rounded-lg flex items-center gap-1">
            <XCircle className="w-3 h-3 text-red-600" />
            Отклонён
          </span>
        );
      default:
        return (
          <span className="badge-yellow text-[10px] font-bold py-0.5 px-2 rounded-lg flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-700" />
            Новый отклик
          </span>
        );
    }
  };

  const isClient = role === "client";
  const filteredCandidates =
    filterStatus === "all" ? candidates : candidates.filter((c) => c.status === filterStatus);

  return (
    <div className="space-y-4 pb-24 text-slate-900 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/feed">
            <motion.button
              whileTap={{ scale: 0.92 }}
              className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:border-violet-300 hover:text-violet-700 shadow-xs transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </motion.button>
          </Link>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <span>{isClient ? "CRM Кандидатов" : "Мои отклики"}</span>
              <span className="badge-violet text-[10px] font-bold py-0.5 px-2 rounded-lg">1337</span>
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">
              {isClient ? "Отклики специалистов на ваши заказы" : "Статус ваших заявок на бирже"}
            </p>
          </div>
        </div>

        {isClient && (
          <Link
            href="/orders/new"
            className="btn-primary py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1 shadow-violet shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Новый заказ</span>
          </Link>
        )}
      </div>

      <AnimatePresence>
        {actionNotice && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 rounded-2xl bg-purple-100 border border-purple-200 text-purple-900 text-xs font-bold flex items-center gap-2 shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-violet-700 shrink-0" />
            <span>{actionNotice}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {isClient && (
        <div className="flex p-1 bg-slate-100 rounded-2xl gap-1">
          <button
            onClick={() => setFilterStatus("all")}
            className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all ${
              filterStatus === "all" ? "bg-white text-violet-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Все ({candidates.length})
          </button>
          <button
            onClick={() => setFilterStatus("pending")}
            className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all ${
              filterStatus === "pending" ? "bg-white text-violet-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Новые ({candidates.filter((c) => c.status === "pending").length})
          </button>
          <button
            onClick={() => setFilterStatus("accepted")}
            className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all ${
              filterStatus === "accepted" ? "bg-white text-violet-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Принятые ({candidates.filter((c) => c.status === "accepted").length})
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
        </div>
      ) : isClient ? (
        filteredCandidates.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 space-y-3 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-violet-700">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">В этой вкладке пока пусто</h3>
              <p className="text-slate-500 text-xs mt-1 max-w-xs mx-auto leading-relaxed">
                Опубликуйте новое задание, чтобы получать отклики от специалистов.
              </p>
            </div>
            <Link
              href="/orders/new"
              className="btn-primary inline-flex items-center gap-1.5 text-xs py-2.5 px-4 rounded-xl shadow-violet mt-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Создать задание</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredCandidates.map((candidate) => {
              const tgUrl = `https://t.me/${candidate.executorUsername.replace("@", "")}?text=${encodeURIComponent(
                `Здравствуйте, ${candidate.executorName}! Рассмотрел ваш отклик на задание "${candidate.orderTitle}" на бирже 1337. Давайте обсудим детали сотрудничества.`
              )}`;

              return (
                <motion.div
                  key={candidate.id}
                  className="bg-white rounded-3xl p-4.5 space-y-3.5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:border-purple-200/80 transition-all"
                >
                  <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                        Отклик на задание
                      </span>
                      <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{candidate.orderTitle}</h4>
                    </div>
                    {getStatusBadge(candidate.status)}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-base shadow-sm shrink-0">
                      {candidate.executorName[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-extrabold text-sm text-slate-900">{candidate.executorName}</h3>
                        <ShieldCheck className="w-4 h-4 text-violet-600 shrink-0" />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs">
                        <div className="badge-yellow text-[10px] font-bold py-0.2 px-1.5 rounded-md flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-600 fill-amber-500" />
                          <span>{candidate.rating.toFixed(1)}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium">{candidate.completedOrders} заказов</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/70 text-xs text-slate-700 leading-relaxed font-medium">
                    {candidate.message}
                  </div>

                  {candidate.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {candidate.skills.map((skill) => (
                        <span key={skill} className="badge-violet text-[10px] font-bold py-0.5 px-2 rounded-lg">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    
                      href={tgUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-violet"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Написать в TG</span>
                    </a>

                    <div className="flex items-center gap-1.5">
                      {candidate.status !== "accepted" && (
                        <button
                          onClick={() => handleUpdateCandidateStatus(candidate.id, "accepted")}
                          className="py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Принять</span>
                        </button>
                      )}
                      {candidate.status !== "rejected" && (
                        <button
                          onClick={() => handleUpdateCandidateStatus(candidate.id, "rejected")}
                          className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-slate-600 border border-slate-200 text-xs font-bold transition-colors"
                        >
                          Отклонить
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      ) : responses.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 space-y-3 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-900">Вы пока не откликались</h3>
            <p className="text-slate-500 text-xs mt-0.5 font-medium">В ленте 1337 регулярно появляются новые проекты</p>
          </div>
          <Link
            href="/feed"
            className="btn-primary inline-flex items-center gap-1.5 text-xs py-2.5 px-4 rounded-xl shadow-violet"
          >
            <span>Найти заказы</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {responses.map((response) => (
            <Link key={response.id} href={`/orders/${response.order.id}`} className="block">
              <motion.div
                whileTap={{ scale: 0.985 }}
                className="bg-white rounded-3xl p-4.5 space-y-3 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:border-purple-200 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-sm text-slate-900 line-clamp-1 flex-1">
                    {response.order.title || "Задание"}
                  </h3>
                  {getStatusBadge(response.status)}
                </div>
                <p className="text-slate-700 text-xs font-medium line-clamp-2 leading-relaxed">{response.message}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1 text-slate-600 font-medium">
                    <User className="w-3.5 h-3.5 text-violet-600" />
                    <span>{response.order.client.first_name || "Заказчик"}</span>
                  </div>
                  <span>{formatDate(response.created_at)}</span>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
