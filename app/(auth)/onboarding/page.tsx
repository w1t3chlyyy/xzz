"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Briefcase,
  UserCheck,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Check,
  Loader2,
  Layers,
  Send
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { expandTelegramApp, setTelegramHeaderColor, getTelegramUser, getTelegramInitData, type ExtractedTelegramUser } from "@/lib/telegram/webapp";

export default function OnboardingPage() {
  const [selectedRole, setSelectedRole] = useState<"client" | "executor" | null>(null);
  const [tgUser, setTgUser] = useState<ExtractedTelegramUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    expandTelegramApp();
    setTelegramHeaderColor("#F4F3FA");

    const user = getTelegramUser();
    if (user) {
      setTgUser(user);
    }

    const initData = getTelegramInitData();
    if (initData) {
      fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.role && (data.role === "client" || data.role === "executor")) {
            setSelectedRole(data.role);
            localStorage.setItem("fiolet_role", data.role);
            localStorage.setItem("1337_role", data.role);
          }
        })
        .catch((e) => console.warn("TG auto-auth notice:", e));
    }

    const savedRole = localStorage.getItem("1337_role") || localStorage.getItem("fiolet_role");
    if (savedRole === "client" || savedRole === "executor") {
      setSelectedRole(savedRole as "client" | "executor");
    }
  }, []);

  const handleRoleSelect = async (role: "client" | "executor") => {
    setSelectedRole(role);
    setIsLoading(true);
    localStorage.setItem("fiolet_role", role);
    localStorage.setItem("1337_role", role);

    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from("users")
          .update({
            role,
            first_name: tgUser?.first_name || user.user_metadata?.first_name,
            username: tgUser?.username || user.user_metadata?.username,
          })
          .eq("id", user.id);

        if (role === "executor") {
          await supabase.from("executor_profiles").upsert({
            id: user.id,
            skills: ["Программирование", "Дизайн", "AI"],
            bio: "Специалист по разработке и AI автоматизации.",
            rating: 5.0,
            completed_orders: 0,
          });
        }
      }
    } catch (error) {
      console.warn("Role update fallback:", error);
    } finally {
      setTimeout(() => {
        router.push("/feed");
        router.refresh();
      }, 350);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F3FA] flex flex-col justify-between p-5 max-w-md mx-auto text-slate-900 font-sans selection:bg-purple-200">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center pt-4"
      >
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-extrabold uppercase tracking-wider mb-3 border border-purple-200 shadow-xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Telegram WebApp Биржа</span>
        </div>

        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-2">
          <span>1337</span>
        </h1>
        {tgUser ? (
          <p className="text-violet-700 font-bold text-xs mt-1">
            Привет, {tgUser.displayName}! {tgUser.displayUsername && <span className="text-slate-400 font-medium">({tgUser.displayUsername})</span>}
          </p>
        ) : (
          <p className="text-slate-500 text-xs mt-1.5 max-w-xs mx-auto leading-relaxed">
            Выберите вашу роль, чтобы настроить ленту заказов и персональные инструменты
          </p>
        )}
      </motion.div>

      {/* Role Selection Cards */}
      <div className="space-y-3.5 my-5">
        {/* Executor Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          whileTap={{ scale: 0.985 }}
          onClick={() => !isLoading && handleRoleSelect("executor")}
          className={`cursor-pointer bg-white rounded-3xl p-5 border transition-all relative overflow-hidden ${
            selectedRole === "executor"
              ? "border-violet-600 shadow-[0_4px_25px_rgba(124,58,237,0.12)] ring-2 ring-violet-500/20"
              : "border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:border-violet-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center text-violet-700 shrink-0">
                <UserCheck className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-slate-900">Исполнитель</h3>
                  <span className="badge-violet text-[10px] font-extrabold py-0.5 px-2 rounded-lg">
                    Поиск заказов
                  </span>
                </div>
                <p className="text-slate-500 text-xs mt-0.5 font-medium">
                  Хочу откликаться на проекты и зарабатывать
                </p>
              </div>
            </div>
            {selectedRole === "executor" && (
              <span className="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </span>
            )}
          </div>

          <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap gap-2 text-[11px] font-medium text-slate-600">
            <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-lg">
              <Zap className="w-3 h-3 text-violet-600" />
              AI автоотклики
            </span>
            <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-lg">
              <Send className="w-3 h-3 text-blue-600" />
              Прямой контакт
            </span>
          </div>
        </motion.div>

        {/* Client Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          whileTap={{ scale: 0.985 }}
          onClick={() => !isLoading && handleRoleSelect("client")}
          className={`cursor-pointer bg-white rounded-3xl p-5 border transition-all relative overflow-hidden ${
            selectedRole === "client"
              ? "border-violet-600 shadow-[0_4px_25px_rgba(124,58,237,0.12)] ring-2 ring-violet-500/20"
              : "border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:border-violet-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
                <Briefcase className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-slate-900">Заказчик</h3>
                  <span className="badge-blue text-[10px] font-extrabold py-0.5 px-2 rounded-lg">
                    Публикация
                  </span>
                </div>
                <p className="text-slate-500 text-xs mt-0.5 font-medium">
                  Ищу проверенных специалистов для своих задач
                </p>
              </div>
            </div>
            {selectedRole === "client" && (
              <span className="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </span>
            )}
          </div>

          <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap gap-2 text-[11px] font-medium text-slate-600">
            <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-lg">
              <Layers className="w-3 h-3 text-blue-600" />
              База исполнителей
            </span>
            <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-lg">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Безопасная сделка
            </span>
          </div>
        </motion.div>
      </div>

      {/* Action Footer */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3 pt-2 pb-4"
      >
        <button
          onClick={() => selectedRole && handleRoleSelect(selectedRole)}
          disabled={!selectedRole || isLoading}
          className="w-full btn-primary py-3.5 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-violet disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Настройка профиля...</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span>Продолжить как {selectedRole === "client" ? "Заказчик" : selectedRole === "executor" ? "Исполнитель" : "..."}</span>
              <ArrowRight className="w-4 h-4" />
            </span>
          )}
        </button>

        <p className="text-center text-[11px] text-slate-400 font-medium">
          Вы сможете переключить роль в любое время в профиле
        </p>
      </motion.div>
    </div>
  );
}
