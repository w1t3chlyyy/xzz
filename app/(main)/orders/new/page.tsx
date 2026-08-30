// app/(main)/orders/new/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { getTelegramUser } from "@/lib/telegram/webapp";
import { addCachedClientOrder } from "@/lib/utils";
import {
  ArrowLeft,
  Plus,
  Laptop,
  Palette,
  TrendingUp,
  PenTool,
  Check,
  Briefcase,
  Layers,
  Clock,
  DollarSign,
  Send,
  HelpCircle,
  FileText,
  Zap,
  ArrowRight,
  UserCheck,
  Sparkles,
  Info
} from "lucide-react";
import Link from "next/link";

const categories = [
  { id: "programming", label: "Программирование", icon: Laptop },
  { id: "design", label: "Дизайн", icon: Palette },
  { id: "marketing", label: "Маркетинг", icon: TrendingUp },
  { id: "copywriting", label: "Копирайтинг", icon: PenTool },
];

const QUICK_TEMPLATES = [
  {
    title: "Telegram Mini App",
    category: "programming",
    prompt: "Нужен Telegram Mini App под ключ на Next.js / TypeScript с авторизацией через Telegram, подключением TON кошелька и базой данных Supabase.",
    budgetMin: 30000,
    budgetMax: 60000,
  },
  {
    title: "Telegram-бот с AI",
    category: "programming",
    prompt: "Разработка Telegram-бота на Python (aiogram 3) с интеграцией Gemini AI API, системой подписок и приемом платежей через Telegram Stars.",
    budgetMin: 20000,
    budgetMax: 45000,
  },
  {
    title: "UI/UX Дизайн в Figma",
    category: "design",
    prompt: "Отрисовать дизайн мобильного приложения и Telegram WebApp в Figma: 6-8 экранов, светлая и темная темы, адаптивная сетка и готовая дизайн-система.",
    budgetMin: 25000,
    budgetMax: 45000,
  },
  {
    title: "Парсер / Скрипт автоматизации",
    category: "programming",
    prompt: "Написать быстрый скрипт для сбора данных и мониторинга каналов Telegram с выгрузкой в Google Таблицы и уведомлениями в закрытый чат.",
    budgetMin: 15000,
    budgetMax: 28000,
  },
];

export default function NewOrderPage() {
  const [role, setRole] = useState<string>("client");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("programming");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [contactUsername, setContactUsername] = useState("");
  const [contactName, setContactName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const savedRole = localStorage.getItem("1337_role") || localStorage.getItem("fiolet_role") || "client";
    setRole(savedRole);
    if (savedRole === "executor") {
      return;
    }

    // 1. Извлекаем данные из Telegram WebApp
    const tgUser = getTelegramUser();
    if (tgUser) {
      if (tgUser.username) {
        setContactUsername(tgUser.username.replace(/^@/, ""));
      }
      if (tgUser.displayName) {
        setContactName(tgUser.displayName);
      }
    }

    // 2. Дополнительно подтягиваем из базы Supabase
    async function fetchUserProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from("users")
            .select("first_name, username")
            .eq("id", user.id)
            .single();
          if (data) {
            if (data.username) {
              setContactUsername((prev) => prev || data.username.replace(/^@/, ""));
            }
            if (data.first_name) {
              setContactName((prev) => prev || data.first_name);
            }
          }
        }
      } catch (e) {
        console.warn("Could not fetch user profile:", e);
      }
    }

    fetchUserProfile();
  }, [router, supabase]);

  const handleApplyTemplate = (tmpl: typeof QUICK_TEMPLATES[0]) => {
    setTitle(tmpl.title);
    setDescription(tmpl.prompt);
    setCategory(tmpl.category);
    setBudgetMin(tmpl.budgetMin.toString());
    setBudgetMax(tmpl.budgetMax.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !category) return;

    setIsLoading(true);

    try {
      const tgUser = getTelegramUser();
      const finalTitle = title.trim() || description.slice(0, 50).split("\n")[0];
      const finalUsername = contactUsername.trim().replace(/^@/, "") || tgUser?.username?.replace(/^@/, "") || "";
      const finalName = contactName.trim() || tgUser?.displayName || "Заказчик";

      const { data: { user } } = await supabase.auth.getUser();

      let insertedId: string | null = null;

      // 1. Создаем заказ через серверный API роут для надежности и обновления контактов
      try {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: finalTitle,
            description,
            category,
            budget_min: budgetMin ? parseInt(budgetMin) : null,
            budget_max: budgetMax ? parseInt(budgetMax) : null,
            client_id: user?.id || null,
            contact_username: finalUsername,
            contact_name: finalName,
            telegram_id: tgUser?.id || null,
          }),
        });

        if (res.ok) {
          const resData = await res.json();
          insertedId = resData.order?.id || null;
        }
      } catch (apiErr) {
        console.warn("API /api/orders failed, falling back to direct insert:", apiErr);
      }

      // 2. Фолбек на прямую вставку, если API не ответил
      if (!insertedId && user) {
        try {
          await supabase
            .from("users")
            .update({
              username: finalUsername || null,
              first_name: finalName,
              updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);
        } catch (uErr) {
          console.warn("Failed to sync contact to users table:", uErr);
        }

        const { data: inserted, error: insertError } = await supabase
          .from("orders")
          .insert({
            client_id: user.id,
            title: finalTitle,
            description,
            category,
            budget_min: budgetMin ? parseInt(budgetMin) : null,
            budget_max: budgetMax ? parseInt(budgetMax) : null,
            status: "active",
          })
          .select("id")
          .single();

        if (insertError) {
          console.error("Error inserting order directly:", insertError);
        } else {
          insertedId = inserted?.id ?? null;
        }
      }

      // 3. Сохраняем в локальный кэш для мгновенного отображения с заполненным контактом
      if (insertedId) {
        const newLocalOrder = {
          id: insertedId,
          title: finalTitle,
          description,
          category,
          budget_min: budgetMin ? parseInt(budgetMin) : 25000,
          budget_max: budgetMax ? parseInt(budgetMax) : 45000,
          created_at: new Date().toISOString(),
          client: {
            first_name: finalName,
            username: finalUsername || "client",
          },
        };
        addCachedClientOrder(newLocalOrder);
      }

      router.push("/feed");
      router.refresh();
    } catch (error) {
      console.error("Error creating order:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Если роль — исполнитель: отдельный экран
  if (role === "executor") {
    return (
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-center space-y-4 my-8">
        <div className="w-14 h-14 rounded-2xl bg-purple-100 border border-purple-200 text-violet-700 flex items-center justify-center mx-auto">
          <Briefcase className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-slate-900">
            Создание заказов доступно заказчикам
          </h2>
          <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
            Вы вошли как исполнитель. Для поиска работы перейдите в ленту заказов или заполните портфолио в профиле.
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <Link href="/feed" className="btn-primary py-3 px-5 rounded-2xl text-xs font-bold inline-flex items-center justify-center gap-2 shadow-violet">
            <span>Смотреть заказы в ленте</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/portfolio" className="py-2.5 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors">
            Перейти в Моё портфолио
          </Link>
        </div>
      </div>
    );
  }

  // Экран публикации для заказчика
  return (
    <div className="space-y-4 pb-28 text-slate-900 font-sans">
      {/* Top Header */}
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
              <span>Опубликовать заказ</span>
              <span className="badge-violet text-[10px] font-bold py-0.5 px-2 rounded-lg">Заказчик</span>
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Исполнители увидят заказ и начнут откликаться
            </p>
          </div>
        </div>
      </div>

      {/* Быстрые шаблоны заданий */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-violet-600" />
            Быстрые шаблоны заданий
          </span>
          <span className="text-[10px] text-slate-400 font-medium">в 1 клик</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_TEMPLATES.map((tmpl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyTemplate(tmpl)}
              className="p-2.5 rounded-2xl bg-slate-50 hover:bg-purple-50/80 border border-slate-200/80 hover:border-purple-300 text-left transition-all group"
            >
              <div className="text-[11.5px] font-bold text-slate-900 group-hover:text-violet-700 transition-colors">
                {tmpl.title}
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                {tmpl.budgetMin.toLocaleString()} – {tmpl.budgetMax.toLocaleString()} ₽
              </div>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Category Picker */}
        <div className="bg-white rounded-3xl p-5 space-y-3 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
            Категория задания
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2.5 transition-all text-left ${
                    isSelected
                      ? "border-violet-600 bg-violet-50 text-violet-700 shadow-xs ring-1 ring-violet-500/30"
                      : "border-slate-200 bg-slate-50/60 text-slate-700 hover:border-violet-300"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "bg-violet-600 text-white"
                        : "bg-white border border-slate-200 text-slate-600"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="truncate">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Task Details */}
        <div className="bg-white rounded-3xl p-5 space-y-3.5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5">
              Краткий заголовок задачи
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Разработка Telegram Mini App рулетки"
              className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-violet-600 focus:bg-white focus:outline-none text-xs font-medium transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5">
              Подробное ТЗ и требования *
            </label>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опишите задачу, стек, требования, сроки и ссылки..."
              rows={6}
              className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-violet-600 focus:bg-white focus:outline-none text-xs leading-relaxed font-medium transition-all resize-none"
              required
            />
          </div>

          {/* Budget & Timeline */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5">
                Бюджет от (₽)
              </label>
              <input
                type="number"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                placeholder="20 000"
                className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-violet-600 focus:bg-white focus:outline-none text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5">
                Бюджет до (₽)
              </label>
              <input
                type="number"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                placeholder="50 000"
                className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-violet-600 focus:bg-white focus:outline-none text-xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* БЛОК КОНТАКТОВ ДЛЯ СВЯЗИ */}
        <div className="bg-white rounded-3xl p-5 space-y-3.5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-violet-600" />
              <span>Контакты для связи (Telegram)</span>
            </label>
            <span className="text-[10px] font-bold text-violet-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
              Видно исполнителям
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            По этим данным исполнители смогут сразу написать вам в Telegram или отправить отклик в боте.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Ваш Telegram Username
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">@</span>
                <input
                  type="text"
                  value={contactUsername}
                  onChange={(e) => setContactUsername(e.target.value.replace(/^@/, ""))}
                  placeholder="username"
                  className="w-full pl-8 pr-3.5 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-violet-600 focus:bg-white focus:outline-none text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Ваше имя или никнейм
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Например: Александр"
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-violet-600 focus:bg-white focus:outline-none text-xs font-medium"
              />
            </div>
          </div>

          {contactUsername ? (
            <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-2xl flex items-center gap-2 text-xs text-violet-800">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Кнопка прямой связи в задании: <b>t.me/{contactUsername.replace(/^@/, "")}</b>
              </span>
            </div>
          ) : (
            <div className="p-3 bg-amber-50/80 border border-amber-200/70 rounded-2xl flex items-center gap-2 text-xs text-amber-800">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Укажите ваш @username в Telegram, чтобы специалисты могли написать вам напрямую.</span>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !description}
          className="w-full btn-primary py-3.5 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-violet disabled:opacity-50"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
              <span>Публикация...</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              <span>Опубликовать заказ на 1337</span>
            </span>
          )}
        </button>
      </form>
    </div>
  );
}
