"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, MessageSquare, Clock, CheckCircle, XCircle } from "lucide-react";
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

export default function ResponsesPage() {
  const [responses, setResponses] = useState<MyResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadResponses();
  }, []);

  async function loadResponses() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("responses")
      .select(`
        id, message, status, created_at,
        order:order_id(id, title, category, client:client_id(first_name))
      `)
      .eq("executor_id", user.id)
      .order("created_at", { ascending: false });

    setResponses(data as MyResponse[] || []);
    setIsLoading(false);
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "accepted": return <CheckCircle className="w-5 h-5 text-green-400" />;
      case "rejected": return <XCircle className="w-5 h-5 text-red-400" />;
      default: return <Clock className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "accepted": return "Принят";
      case "rejected": return "Отклонён";
      default: return "На рассмотрении";
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/feed">
          <motion.button whileTap={{ scale: 0.9 }} className="p-2 rounded-xl bg-violet-surface border border-violet-border">
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
        </Link>
        <h1 className="text-2xl font-bold">Мои отклики</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-violet-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : responses.length === 0 ? (
        <div className="text-center py-20 text-violet-300">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Вы ещё не откликались на заказы</p>
          <Link href="/feed" className="text-violet-accent mt-2 inline-block">
            Перейти к заказам →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {responses.map((response) => (
            <Link key={response.id} href={`/orders/${response.order.id}`}>
              <motion.div
                whileTap={{ scale: 0.98 }}
                className="card-violet p-4 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-bold line-clamp-1 flex-1">{response.order.title}</h3>
                  <div className="flex items-center gap-1 ml-2">
                    {getStatusIcon(response.status)}
                  </div>
                </div>
                <p className="text-violet-200 text-sm line-clamp-2">{response.message}</p>
                <div className="flex items-center justify-between text-xs text-violet-300">
                  <span>{response.order.client.first_name}</span>
                  <span className={`
                    px-2 py-0.5 rounded-full
                    ${response.status === "accepted" ? "bg-green-500/20 text-green-400" : ""}
                    ${response.status === "pending" ? "bg-yellow-500/20 text-yellow-400" : ""}
                    ${response.status === "rejected" ? "bg-red-500/20 text-red-400" : ""}
                  `}>
                    {getStatusText(response.status)}
                  </span>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
