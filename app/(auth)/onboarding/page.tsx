"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  UserCheck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Zap,
  Check,
  Loader2,
  Layers,
  Send,
  Laptop,
  Palette,
  TrendingUp,
  PenTool,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { expandTelegramApp, setTelegramHeaderColor, getTelegramUser, getTelegramInitData, type ExtractedTelegramUser } from "@/lib/telegram/webapp";
import { getCategoryLabel } from "@/lib/utils";

const NICHES = [
  { id: "programming", label: "Программирование", icon: Laptop },
  { id: "design", label: "Дизайн", icon: Palette },
  { id: "marketing", label: "Маркетинг", icon: TrendingUp },
  { id: "copywriting", label: "Копирайтинг", icon: PenTool },
];

export default function HomePage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<"client" | "executor" | null>(null);
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null);
  const [tgUser, setTgUser] = useState<ExtractedTelegramUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    expandTelegramApp();
    setTelegramHeaderColor("#F4F3FA");

    const user = getTelegramUser();
    if (user) setTgUser(user);

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

  const finalizeSelection = async (role: "client" | "executor", niche: string | null) => {
    setIsLoading(true);
    localStorage.setItem("fiolet_role", role);
    localStorage.setItem("1337_role", role);
    if (niche) localStorage.setItem("1337_executor_niche", niche);

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
            skills: niche ? [getCategoryLabel(niche)] : ["Программирование", "Дизайн"],
            bio: "Специалист по разработке и автоматизации.",
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

  const handleContinue = () => {
    if (!selectedRole) return;

    if (selectedRole === "executor" && step === 1) {
      setStep(2);
      return;
    }

    finalizeSelection(selectedRole, selectedRole === "executor" ? selectedNiche : null);
  };

  const canContinue =
    step === 1 ? !!selectedRole : !!selectedNiche;

  return (
    <div className="min-h-screen bg-[#F4F3FA] flex flex-col justify-between p-5 max-w-md mx-auto text-slate-900 font-sans selection:bg-purple-200">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="text-center pt-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-extrabold uppercase tracking-wider mb-3 border border-purple-200 shadow-xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Шаг {step} из {selectedRole === "executor" ? 2 : 1}</span>
        </div>

        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          <span>1337</span>
        </h1>
        {tgUser ? (
          <p className="text-violet-700 font-bold text-xs mt-1">
            Привет, {tgUser.displayName}! {tgUser.displayUsername && <span className="text-slate-400 font-medium">({tgUser.displayUsername})</span>}
          </p>
        ) : (
          <p className="text-slate-500 text-xs mt-1.5 max-w-xs mx-auto leading-relaxed">
            {step === 1 ? "Выберите вашу роль, чтобы настроить ленту заказов" : "Выберите вашу нишу — так вы будете получать релевантные заказы"}
          </p>
        )}
      </motion.div>

      {/* Шаг 1: выбор роли */}
      {step === 1 && (
        <div className="space-y-3.5 my-5">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            whileTap={{ scale: 0.985 }}
            onClick={() => setSelectedRole("executor")}
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
                    <span className="badge-violet text-[10px] font-extrabold py-0.5 px-2 rounded-lg">Поиск заказов</span>
                  </div>
                  <p className="text-slate-500 text-xs mt-0.5 font-medium">Хочу откликаться на проекты и зарабатывать</p>
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
                Быстрые отклики
              </span>
              <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-lg">
                <Send className="w-3 h-3 text-blue-600" />
                Прямой контакт
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            whileTap={{ scale: 0.985 }}
            onClick={() => setSelectedRole("client")}
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
                    <span className="badge-blue text-[10px] font-extrabold py-0.5 px-2 rounded-lg">Публикация</span>
                  </div>
                  <p className="text-slate-500 text-xs mt-0.5 font-medium">Ищу проверенных специалистов для своих задач</p>
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
      )}

      {/* Шаг 2: выбор ниши (только для исполнителя) */}
      {step === 2 && (
        <div className="space-y-3 my-5">
          {NICHES.map((niche, i) => {
            const Icon = niche.icon;
            const isSelected = selectedNiche === niche.id;
            return (
              <motion.button
                key={niche.id}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                whileTap={{ scale: 0.985 }}
                onClick={() => setSelectedNiche(niche.id)}
                className={`w-full cursor-pointer bg-white rounded-2xl p-4 border flex items-center gap-3.5 transition-all text-left ${
                  isSelected
                    ? "border-violet-600 shadow-[0_4px_20px_rgba(124,58,237,0.1)] ring-2 ring-violet-500/20"
                    : "border-slate-100 shadow-xs hover:border-violet-300"
                }`}
              >
                <div className="w-10 h-10 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center text-violet-700 shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="font-bold text-sm text-slate-900 flex-1">{niche.label}</span>
                {isSelected && (
                  <span className="w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Кнопки навигации */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-3 pt-2 pb-4">
        <div className="flex items-center gap-2">
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="w-12 h-12 shrink-0 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:border-violet-300"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleContinue}
            disabled={!canContinue || isLoading}
            className="flex-1 btn-primary py-3.5 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-violet disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Настройка профиля...</span>
              </span>
            ) : step === 1 && selectedRole === "executor" ? (
              <span className="flex items-center gap-1.5">
                <span>Далее: выбор ниши</span>
                <ArrowRight className="w-4 h-4" />
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span>Продолжить как {selectedRole === "client" ? "Заказчик" : "Исполнитель"}</span>
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </button>
        </div>
        <p className="text-center text-[11px] text-slate-400 font-medium">Роль и нишу можно изменить позже в профиле</p>
      </motion.div>
    </div>
  );
}
