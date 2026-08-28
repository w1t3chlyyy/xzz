"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Wallet, Clock, User, MessageCircle, Wand2, Send, Loader2 } from "lucide-react";
import { getCategoryLabel, getCategoryEmoji, formatDate } from "@/lib/utils";
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

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    setUserRole(userData?.role || null);

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
      setOrder({
        ...orderData,
        client: orderData.client[0] || { id: "", first_name: "", username: "" },
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

    setResponses((responsesData || []).map((response) => ({
      ...response,
      executor: response.executor[0] || { first_name: "", username: "" },
    })));
    setIsLoading(false);
  }

  async function handleGenerateAI() {
    if (!order) return;
    setIsGeneratingAI(true);

    try {
      const response = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderTitle: order.title,
          orderDescription: order.description,
          category: order.category,
        }),
      });

      const data = await response.json();
      if (data.draft) {
        setResponseMessage(data.draft);
      }
    } catch (error) {
      console.error("AI generation error:", error);
    } finally {
      setIsGeneratingAI(false);
    }
  }

  async function handleSubmitResponse() {
    if (!responseMessage.trim() || !userId) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("responses").insert({
        order_id: id as string,
        executor_id: userId,
        message: responseMessage,
        status: "pending",
      });

      if (error) throw error;

      setResponseMessage("");
      loadData();
    } catch (error) {
      console.error("Error submitting response:", error);
      alert("Ошибка при отправке отклика");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAcceptResponse(responseId: string) {
    try {
      const { error } = await supabase
        .from("responses")
        .update({ status: "accepted" })
        .eq("id", responseId);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error("Error accepting response:", error);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 text-violet-accent animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-4 text-center">
        <p className="text-violet-300">Заказ не найден</p>
      </div>
    );
  }

  const isOwner = userId === order.client.id;
  const budgetText = order.budget_min && order.budget_max
    ? `${order.budget_min.toLocaleString()} - ${order.budget_max.toLocaleString()} ₽`
    : order.budget_min
    ? `от ${order.budget_min.toLocaleString()} ₽`
    : "Договорная";

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/feed">
          <motion.button whileTap={{ scale: 0.9 }} className="p-2 rounded-xl bg-violet-surface border border-violet-border">
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
        </Link>
        <h1 className="text-xl font-bold">Заказ</h1>
      </div>

      {/* Карточка заказа */}
      <div className="card-violet p-4 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getCategoryEmoji(order.category)}</span>
          <span className="text-xs font-medium text-violet-accent bg-violet-primary/20 px-2 py-0.5 rounded-full">
            {getCategoryLabel(order.category)}
          </span>
        </div>

        <h2 className="text-xl font-bold">{order.title}</h2>
        <p className="text-violet-200 whitespace-pre-wrap">{order.description}</p>

        <div className="flex items-center justify-between pt-3 border-t border-violet-border">
          <div className="flex items-center gap-1.5 text-sm text-violet-300">
            <User className="w-4 h-4" />
            <span>{order.client.first_name || `@${order.client.username}`}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-green-400">
            <Wallet className="w-4 h-4" />
            <span>{budgetText}</span>
          </div>
        </div>
      </div>

      {/* Форма отклика для исполнителя */}
      {userRole === "executor" && !isOwner && (
        <div className="card-violet p-4 space-y-3">
          <h3 className="font-bold flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-violet-accent" />
            Откликнуться на заказ
          </h3>

          <textarea
            value={responseMessage}
            onChange={(e) => setResponseMessage(e.target.value)}
            placeholder="Напишите, почему вы подходите для этого заказа..."
            rows={4}
            className="w-full p-3 rounded-xl bg-violet-dark border border-violet-border text-white placeholder-violet-400 focus:border-violet-accent focus:outline-none resize-none"
          />

          <div className="flex gap-2">
            <button
              onClick={handleGenerateAI}
              disabled={isGeneratingAI}
              className="flex-1 btn-outline flex items-center justify-center gap-2 text-sm"
            >
              {isGeneratingAI ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              AI черновик
            </button>
            <button
              onClick={handleSubmitResponse}
              disabled={isSubmitting || !responseMessage.trim()}
              className="flex-[2] btn-primary flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Отправить отклик
            </button>
          </div>
        </div>
      )}

      {/* Отклики */}
      {responses.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-lg">
            {isOwner ? "Отклики" : "Мои отклики"} ({responses.length})
          </h3>

          {responses.map((response) => (
            <motion.div
              key={response.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card-violet p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-violet-primary/30 flex items-center justify-center text-sm font-bold">
                    {response.executor.first_name?.[0] || "?"}
                  </div>
                  <span className="font-medium">{response.executor.first_name}</span>
                </div>
                <span className={`
                  text-xs px-2 py-0.5 rounded-full
                  ${response.status === "accepted" ? "bg-green-500/20 text-green-400" : ""}
                  ${response.status === "pending" ? "bg-yellow-500/20 text-yellow-400" : ""}
                  ${response.status === "rejected" ? "bg-red-500/20 text-red-400" : ""}
                `}>
                  {response.status === "accepted" ? "Принят" : response.status === "pending" ? "На рассмотрении" : "Отклонён"}
                </span>
              </div>

              <p className="text-violet-200 text-sm">{response.message}</p>

              {response.ai_draft && (
                <div className="bg-violet-primary/10 rounded-lg p-2 text-xs text-violet-300">
                  <span className="font-medium text-violet-accent">AI черновик:</span> {response.ai_draft}
                </div>
              )}

              {isOwner && response.status === "pending" && (
                <button
                  onClick={() => handleAcceptResponse(response.id)}
                  className="w-full btn-primary text-sm py-2"
                >
                  Принять исполнителя
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
