"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { getTelegramUser, type ExtractedTelegramUser } from "@/lib/telegram/webapp";
import { useSubscription } from "@/lib/useSubscription";
import {
  Crown,
  Zap,
  Check,
  Loader2,
  User,
  ShieldCheck,
  CreditCard,
  Sliders,
  Settings,
  ArrowRight,
  Clock,
  Briefcase,
  Plus,
  FileText,
  Users,
  Flame,
  AlertTriangle,
  Gift
} from "lucide-react";
import { getSubscriptionLabel } from "@/lib/utils";

interface UserProfile {
  id: string;
  first_name: string;
  username: string;
  avatar_url?: string | null;
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
  icon: React.ElementType;
  popular?: boolean;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tgUser, setTgUser] = useState<ExtractedTelegramUser | null>(null);
  const [role, setRole] = useState<string>("client");
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState<string | null>(null);
  const supabase = createClient();
  const sub = useSubscription();

  const loadProfile = useCallback(async () => {
    try {
      const savedRole = localStorage.getItem("1337_role") || localStorage.getItem("fiolet_role") || "client";
      setRole(savedRole);

      // Extract Telegram user info from Telegram WebApp
      const extractedTg = getTelegramUser();
      if (extractedTg) {
        setTgUser(extractedTg);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();
        if (data) {
          // If Telegram user data is available, update Supabase user if needed
          if (extractedTg && (!data.first_name || !data.username)) {
            await supabase
              .from("users")
              .update({
                first_name: extractedTg.first_name,
                username: extractedTg.username || data.username,
                avatar_url: extractedTg.photo_url || data.avatar_url,
              })
              .eq("id", user.id);
            data.first_name = extractedTg.first_name;
            data.username = extractedTg.username || data.username;
            data.avatar_url = extractedTg.photo_url || data.avatar_url;
          }

          setProfile(data);
          if (data.role) setRole(data.role);
        }
      } else {
        // Fallback using real extracted Telegram profile if available
        setProfile({
          id: extractedTg?.id ? String(extractedTg.id) : "demo-user",
          first_name: extractedTg?.displayName || (savedRole === "client" ? "Иван" : "Алексей"),
          username: extractedTg?.username || (savedRole === "client" ? "ivan_client" : "alex_dev"),
          avatar_url: extractedTg?.photo_url || null,
          role: savedRole,
          subscription_tier: "free",
          subscription_expires_at: null,
          responses_today: 1,
          created_at: new Date().toISOString(),
        });
      }
    } catch {
      const savedRole = localStorage.getItem("1337_role") || localStorage.getItem("fiolet_role") || "client";
      const extractedTg = getTelegramUser();
      setProfile({
        id: extractedTg?.id ? String(extractedTg.id) : "demo-user",
        first_name: extractedTg?.displayName || (savedRole === "client" ? "Иван" : "Алексей"),
        username: extractedTg?.username || (savedRole === "client" ? "ivan_client" : "alex_dev"),
        avatar_url: extractedTg?.photo_url || null,
        role: savedRole,
        subscription_tier: "free",
        subscription_expires_at: null,
        responses_today: 1,
        created_at: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleToggleRole = () => {
    const newRole = role === "client" ? "executor" : "client";
    setRole(newRole);
    localStorage.setItem("fiolet_role", newRole);
    localStorage.setItem("1337_role", newRole);
    if (profile) {
      setProfile({ ...profile, role: newRole });
    }
  };

  const router = useRouter();

  async function handleSubscribe(tier: string) {
    if (tier === "free") return;
    router.push(`/subscribe?tier=${tier}`);
  }

  const plans: SubscriptionPlan[] = [
    {
      id: "free",
      name: "Free",
      price: 0,
      features: ["Базовые возможности биржи 1337", "Уведомления в Telegram", "Стандартная поддержка"],
      icon: Zap,
    },
    {
      id: "pro",
      name: "Pro Тариф",
      price: 990,
      features: [
        "Безлимитный доступ",
        "Приоритетное размещение в ленте",
        "Мгновенные Telegram-уведомления",
        "Прямой контакт без ограничений",
      ],
      icon: Crown,
      popular: true,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
      </div>
    );
  }

  const isClient = role === "client";
  const displayName = profile?.first_name || tgUser?.displayName || "Пользователь";
  const displayUsername = (profile?.username || tgUser?.username || "").replace(/^@/, "");
  const avatarUrl = profile?.avatar_url || tgUser?.photo_url;

  return (
    <div className="space-y-4 pb-24 text-slate-900 font-sans">
      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl p-5 text-center space-y-3.5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <div className="relative inline-block">
          {avatarUrl ? (
            <div className="w-20 h-20 mx-auto rounded-3xl overflow-hidden shadow-sm border-2 border-violet-100 relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-extrabold shadow-sm">
              {displayName?.[0] || displayUsername?.[0] || "U"}
            </div>
          )}
          <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-emerald-500 border-3 border-white flex items-center justify-center shadow-xs">
            <Check className="w-3 h-3 text-white stroke-[3]" />
          </span>
        </div>

        <div>
          <div className="flex items-center justify-center gap-1.5">
            <h2 className="text-lg font-extrabold text-slate-900">
              {displayName}
            </h2>
            <ShieldCheck className="w-4 h-4 text-violet-600" />
          </div>
          {displayUsername ? (
            <p className="text-slate-400 text-xs mt-0.5 font-medium">@{displayUsername}</p>
          ) : (
            <p className="text-slate-400 text-xs mt-0.5 font-medium">Telegram профиль подтвержден</p>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 pt-1">
          <span className="badge-violet text-xs font-bold py-1 px-3 rounded-xl">
            {sub.isPaid
              ? "Pro Тариф"
              : sub.isTrialActive
              ? "5 дней бесплатно"
              : "Пробный период истёк"}
          </span>
          <button
            onClick={handleToggleRole}
            className="badge-blue text-xs font-bold py-1 px-3 rounded-xl hover:opacity-80 transition-opacity flex items-center gap-1 cursor-pointer"
          >
            <span>{isClient ? "Заказчик" : "Исполнитель"}</span>
            <Sliders className="w-3 h-3 text-blue-700" />
          </button>
        </div>

        {sub.isPaid ? (
          <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl p-2.5 text-xs font-bold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-emerald-600" />
              Подписка активна ({sub.timeLeft.days} дн.)
            </span>
            <Link
              href="/subscribe"
              className="text-emerald-800 font-extrabold underline text-[11px]"
            >
              Управление
            </Link>
          </div>
        ) : sub.isTrialActive ? (
          <div className="bg-purple-50 text-violet-700 border border-purple-200 rounded-2xl p-2.5 text-xs font-bold flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-mono">
              <Clock className="w-3.5 h-3.5 text-violet-600" />
              Пробный период: {sub.timeLeft.formatted}
            </span>
            <Link
              href="/subscribe"
              className="text-violet-900 font-extrabold underline text-[11px]"
            >
              Продлить
            </Link>
          </div>
        ) : (
          <div className="bg-rose-50 text-rose-700 border border-rose-200 rounded-2xl p-2.5 text-xs font-bold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              Период 5 дней истёк
            </span>
            <Link
              href="/subscribe"
              className="text-rose-900 font-extrabold underline text-[11px]"
            >
              Выбрать тариф
            </Link>
          </div>
        )}

        {/* Role-Specific Shortcuts */}
        {isClient ? (
          <Link
            href="/orders/new"
            className="w-full bg-purple-50/80 hover:bg-purple-100/80 border border-purple-200/80 rounded-2xl p-3 flex items-center justify-between transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-xs">
                <Plus className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-extrabold text-slate-900">
                  Опубликовать заказ
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  Сформулировать задачу и получить отклики
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-violet-700 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        ) : (
          <Link
            href="/portfolio"
            className="w-full bg-purple-50/80 hover:bg-purple-100/80 border border-purple-200/80 rounded-2xl p-3 flex items-center justify-between transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-xs">
                <Briefcase className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  <span>Портфолио и Резюме</span>
                  <span className="badge-violet text-[9px] font-bold py-0.2 px-1.5 rounded-md">
                    PRO
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  Кейсы, стек и ставка специалиста
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-violet-700 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}
      </div>

      {/* Subscription Plans */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-sm text-slate-900 px-1 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-violet-600" />
          Тарифные планы 1337
        </h3>

        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = profile?.subscription_tier === plan.id;
          return (
            <motion.div
              key={plan.id}
              whileTap={{ scale: 0.99 }}
              className={`bg-white rounded-3xl p-5 space-y-3.5 border transition-all ${
                plan.popular
                  ? "border-purple-300 shadow-[0_4px_25px_rgba(124,58,237,0.08)] ring-1 ring-purple-200"
                  : "border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      plan.popular
                        ? "bg-purple-100 text-purple-700 border border-purple-200"
                        : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-slate-900">{plan.name}</h4>
                      {plan.popular && (
                        <span className="bg-[#2563EB] text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Хит
                        </span>
                      )}
                    </div>
                    <p className="text-base font-extrabold text-violet-700 mt-0.5">
                      {plan.price > 0
                        ? `${plan.price.toLocaleString("ru-RU")} ₽/мес`
                        : "Бесплатно"}
                    </p>
                  </div>
                </div>

                {isCurrent && (
                  <span className="badge-yellow text-[11px] font-bold py-1 px-2.5 rounded-xl flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-amber-700" />
                    Активен
                  </span>
                )}
              </div>

              <ul className="space-y-2 pt-1 border-t border-slate-100">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs font-medium text-slate-700">
                    <div className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.id !== "free" && !isCurrent && (
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isPaying === plan.id}
                  className="w-full btn-primary text-xs py-3 rounded-2xl flex items-center justify-center gap-2 mt-2"
                >
                  {isPaying === plan.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Создаём счёт...
                    </span>
                  ) : (
                    <>
                      <span>Подключить {plan.name}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
