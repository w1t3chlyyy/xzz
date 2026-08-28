"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Crown, Zap, Sparkles, Check, Loader2, LogOut } from "lucide-react";
import { getSubscriptionLabel } from "@/lib/utils";

interface UserProfile {
  id: string;
  first_name: string;
  username: string;
  role: string;
  subscription_tier: string;
  subscription_expires_at: string | null;
  responses_today: number;
  created_at: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  icon: React.ReactNode;
  gradient: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    setProfile(data);
    setIsLoading(false);
  }

  async function handleSubscribe(tier: string) {
    setIsPaying(tier);
    try {
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });

      const data = await response.json();
      if (data.payUrl) {
        window.open(data.payUrl, "_blank");
      }
    } catch (error) {
      console.error("Payment error:", error);
    } finally {
      setIsPaying(null);
    }
  }

  const plans: SubscriptionPlan[] = [
    {
      id: "free",
      name: "Free",
      price: 0,
      features: ["3 отклика в день", "Базовый поиск", "Стандартная поддержка"],
      icon: <Zap className="w-6 h-6" />,
      gradient: "from-gray-600 to-gray-500",
    },
    {
      id: "pro",
      name: "Pro",
      price: 990,
      features: ["Безлимитные отклики", "Приоритет в ленте", "Без рекламы", "Расширенная статистика"],
      icon: <Crown className="w-6 h-6" />,
      gradient: "from-violet-600 to-purple-500",
    },
    {
      id: "ai_pro",
      name: "AI Pro",
      price: 1990,
      features: ["Всё из Pro", "AI-черновики откликов", "AI-оценка заказов", "Персональный менеджер"],
      icon: <Sparkles className="w-6 h-6" />,
      gradient: "from-fuchsia-600 to-violet-500",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 text-violet-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Профиль */}
      <div className="card-violet p-6 text-center space-y-3">
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-violet-primary to-violet-accent flex items-center justify-center text-3xl font-bold">
          {profile?.first_name?.[0] || "?"}
        </div>
        <div>
          <h2 className="text-xl font-bold">{profile?.first_name || "Пользователь"}</h2>
          <p className="text-violet-300 text-sm">@{profile?.username}</p>
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className={`
            px-3 py-1 rounded-full text-xs font-bold
            ${profile?.subscription_tier === "free" ? "bg-gray-500/20 text-gray-300" : ""}
            ${profile?.subscription_tier === "pro" ? "bg-violet-500/20 text-violet-accent" : ""}
            ${profile?.subscription_tier === "ai_pro" ? "bg-fuchsia-500/20 text-fuchsia-400" : ""}
          `}>
            {getSubscriptionLabel(profile?.subscription_tier || "free")}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-violet-primary/20 text-violet-accent">
            {profile?.role === "client" ? "Заказчик" : "Исполнитель"}
          </span>
        </div>
        {profile?.subscription_expires_at && (
          <p className="text-xs text-violet-300">
            Подписка до: {new Date(profile.subscription_expires_at).toLocaleDateString("ru-RU")}
          </p>
        )}
        {profile?.subscription_tier === "free" && (
          <p className="text-xs text-violet-300">
            Откликов сегодня: {profile.responses_today}/3
          </p>
        )}
      </div>

      {/* Подписки */}
      <div className="space-y-3">
        <h3 className="font-bold text-lg">Подписки</h3>

        {plans.map((plan) => (
          <motion.div
            key={plan.id}
            whileTap={{ scale: 0.98 }}
            className={`
              card-violet p-4 space-y-3
              ${profile?.subscription_tier === plan.id ? "border-violet-accent shadow-violet" : ""}
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-gradient-to-br ${plan.gradient}`}>
                  {plan.icon}
                </div>
                <div>
                  <h4 className="font-bold">{plan.name}</h4>
                  <p className="text-lg font-bold text-violet-accent">
                    {plan.price > 0 ? `${plan.price.toLocaleString()} ₽/мес` : "Бесплатно"}
                  </p>
                </div>
              </div>
              {profile?.subscription_tier === plan.id && (
                <div className="flex items-center gap-1 text-green-400 text-sm font-medium">
                  <Check className="w-4 h-4" />
                  Активно
                </div>
              )}
            </div>

            <ul className="space-y-1.5">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-violet-200">
                  <div className="w-1 h-1 rounded-full bg-violet-accent" />
                  {feature}
                </li>
              ))}
            </ul>

            {plan.id !== "free" && profile?.subscription_tier !== plan.id && (
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={isPaying === plan.id}
                className="w-full btn-primary"
              >
                {isPaying === plan.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Создаём счёт...
                  </span>
                ) : (
                  "Оформить подписку"
                )}
              </button>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
