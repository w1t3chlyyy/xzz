"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MessageSquare, Calendar, ChevronRight, Loader2, Wallet } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { getCached, setCached } from "@/lib/cache";

type Filter = "all" | "pending" | "accepted" | "rejected";

const STATUS: Record<string, { text: string; cls: string }> = {
  pending: { text: "На рассмотрении", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  accepted: { text: "Принят", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { text: "Отклонён", cls: "bg-red-50 text-red-700 border-red-200" },
};

export default function ResponsesPage() {
  const router = useRouter();
  const { role } = useApp();
  const as = role === "executor" ? "executor" : "client";
  const cacheKey = `responses:${as}`;

  const [responses, setResponses] = useState<any[] | null>(() => getCached<any[]>(cacheKey) ?? null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    let cancelled = false;
    setResponses(getCached<any[]>(cacheKey) ?? null);
    fetch(`/api/responses?as=${as}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => {
        setCached(cacheKey, j.responses || []);
        if (!cancelled) setResponses(j.responses || []);
      })
      .catch(() => !cancelled && setResponses((p) => p ?? []));
    return () => {
      cancelled = true;
    };
  }, [as, cacheKey]);

  const filtered = useMemo(() => (responses || []).filter((r) => filter === "all" || r.status === filter), [responses, filter]);

  const openChat = (r: any) => {
    const other = as === "client" ? r.executor_id : r.order?.client_id;
    if (other) router.push(`/chats?user=${other}&order=${r.order_id}`);
  };

  return (
    <div className="space-y-4 pb-24 text-slate-900 font-sans">
      <div>
        <h1 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-violet-600" />
          <span>{as === "client" ? "Отклики на ваши заказы" : "Ваши отклики"}</span>
          {responses && <span className="badge-violet text-[10px] font-bold py-0.5 px-2 rounded-lg">{responses.length}</span>}
        </h1>
      </div>

      <div className="flex gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
        {(["all", "pending", "accepted", "rejected"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filter === tab ? "bg-violet-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            {tab === "all" ? "Все" : tab === "pending" ? "На рассмотрении" : tab === "accepted" ? "Принятые" : "Отклонённые"}
          </button>
        ))}
      </div>

      {responses === null ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-purple-100 border border-purple-200 text-violet-700 flex items-center justify-center mx-auto">
            <MessageSquare className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-extrabold">Нет откликов</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {as === "client" ? "На ваши заказы пока никто не откликнулся." : "Вы ещё не откликались на заказы."}
          </p>
          {as === "executor" && (
            <Link href="/feed" className="btn-primary py-2.5 px-5 rounded-2xl text-xs font-bold inline-flex items-center gap-2 shadow-violet">
              <span>Найти заказы</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const st = STATUS[r.status] || STATUS.pending;
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_4px_15px_rgba(0,0,0,0.02)] space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/orders/${r.order_id}`} className="text-xs font-extrabold text-slate-900 hover:text-violet-700">
                    {r.order?.title || "Заказ"}
                  </Link>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${st.cls}`}>{st.text}</span>
                </div>

                <p className="text-xs text-slate-600 font-medium leading-relaxed p-2.5 bg-slate-50 rounded-xl border border-slate-100 line-clamp-4">{r.message}</p>

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    {r.budget ? (
                      <span className="flex items-center gap-1 font-bold text-violet-700">
                        <Wallet className="w-3.5 h-3.5" />
                        {Number(r.budget).toLocaleString("ru-RU")} ₽
                      </span>
                    ) : null}
                    <span className="flex items-center gap-1 font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(r.created_at).toLocaleDateString("ru-RU")}
                    </span>
                    {as === "client" && <span className="font-bold text-violet-600">{r.executor?.first_name || "Исполнитель"}</span>}
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => openChat(r)} className="btn-primary py-1.5 px-3 rounded-xl text-[11px] font-bold flex items-center gap-1 shadow-violet">
                      <MessageSquare className="w-3 h-3" />
                      <span>В чат</span>
                    </button>
                    <Link href={`/orders/${r.order_id}`} className="text-[10.5px] font-bold text-violet-600 hover:underline flex items-center">
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
