"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Briefcase, UserCheck, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { expandTelegramApp, setTelegramHeaderColor } from "@/lib/telegram/webapp";

export default function OnboardingPage() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    expandTelegramApp();
    setTelegramHeaderColor("#1A0B2E");
  }, []);

  const handleRoleSelect = async (role: string) => {
    setSelectedRole(role);
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      const { error } = await supabase
        .from("users")
        .update({ role })
        .eq("id", user.id);

      if (error) throw error;

      // Создаём профиль исполнителя если нужно
      if (role === "executor") {
        await supabase.from("executor_profiles").upsert({
          id: user.id,
          skills: [],
          bio: "",
          rating: 5.0,
          completed_orders: 0,
        });
      }

      router.push("/feed");
      router.refresh();
    } catch (error) {
      console.error("Error selecting role:", error);
      setIsLoading(false);
    }
  };

  const roles = [
    {
      id: "client",
      title: "Заказчик",
      description: "Ищу исполнителей для своих проектов",
      icon: Briefcase,
      gradient: "from-violet-600 to-purple-500",
    },
    {
      id: "executor",
      title: "Исполнитель",
      description: "Хочу находить заказы и зарабатывать",
      icon: UserCheck,
      gradient: "from-fuchsia-600 to-violet-500",
    },
  ];

  return (
    <div className="min-h-screen bg-violet-dark flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="w-8 h-8 text-violet-accent" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-primary to-violet-accent bg-clip-text text-transparent">
            Фиолет
          </h1>
          <Sparkles className="w-8 h-8 text-violet-accent" />
        </div>
        <p className="text-violet-200 text-lg">
          Выберите, кем вы хотите быть
        </p>
      </motion.div>

      <div className="w-full max-w-md space-y-4">
        {roles.map((role, index) => (
          <motion.button
            key={role.id}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.15 }}
            onClick={() => handleRoleSelect(role.id)}
            disabled={isLoading}
            className={`
              w-full p-6 rounded-2xl border transition-all duration-300
              ${selectedRole === role.id 
                ? "border-violet-accent bg-violet-surface shadow-violet-lg" 
                : "border-violet-border bg-violet-surface/50 hover:bg-violet-surface hover:border-violet-primary/60"
              }
              ${isLoading && selectedRole === role.id ? "opacity-70" : ""}
            `}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${role.gradient}`}>
                <role.icon className="w-7 h-7 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold text-white">{role.title}</h3>
                <p className="text-violet-200 text-sm mt-1">{role.description}</p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8 flex items-center gap-2 text-violet-accent"
        >
          <div className="w-5 h-5 border-2 border-violet-accent border-t-transparent rounded-full animate-spin" />
          <span>Сохраняем выбор...</span>
        </motion.div>
      )}
    </div>
  );
}
