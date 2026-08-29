"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { FeedFilter } from "@/components/feed/FeedFilter";
import { OrderCard } from "@/components/orders/OrderCard";
import { ExecutorCard } from "@/components/feed/ExecutorCard";
import {
  Loader2,
  Sparkles,
  X,
  Bot,
  SlidersHorizontal,
  ArrowRight,
  Briefcase,
  UserCheck,
  Users,
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  MessageSquare
} from "lucide-react";
import Link from "next/link";

interface Order {
  id: string;
  title: string;
  description: string;
  category: string;
  budget_min: number | null;
  budget_max: number | null;
  created_at: string;
  client: {
    first_name: string;
    username: string;
  };
}

interface Executor {
  id: string;
  first_name: string;
  username: string;
  avatar_url: string | null;
  executor_profiles: {
    skills: string[];
    bio: string;
    rating: number;
    completed_orders: number;
    hourly_rate?: number;
    min_project_budget?: number;
  };
}

const DEFAULT_ORDERS: Order[] = [
  {
    id: "demo-1",
    title: "Telegram Mini App рулетка на звезды",
    description: "ищу разработчика который сделает tg бота, mini-app рулетка на звезды, бюджет маленький, выслушаю вашу цену, тз в лс",
    category: "programming",
    budget_min: null,
    budget_max: null,
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    client: {
      first_name: "Иван",
      username: "yebanny_tg",
    },
  },
  {
    id: "demo-2",
    title: "Дизайн Telegram Mini App для криптобиржи",
    description: "Требуется отрисовать 4-5 ключевых экранов в Figma в светлой и фиолетовой гамме. Готовый UI кит и компоненты приветствуются.",
    category: "design",
    budget_min: 25000,
    budget_max: 40000,
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    client: {
      first_name: "Артур",
      username: "artur_design",
    },
  },
  {
    id: "demo-3",
    title: "Интеграция CryptoBot и автовыплаты в бота",
    description: "Нужен Node.js / Python разработчик для подключения Crypto Pay API и обработки webhook уведомлений о пополнении баланса.",
    category: "programming",
    budget_min: 18000,
    budget_max: null,
    created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    client: {
      first_name: "Михаил",
      username: "mikhail_dev",
    },
  },
  {
    id: "demo-4",
    title: "Настройка таргета в Telegram Ads",
    description: "Запуск рекламы на каналы по теме фриланса и AI-сервисов. Бюджет на тесты выделен, оплата за результат (CPA/CPL).",
    category: "marketing",
    budget_min: 30000,
    budget_max: 60000,
    created_at: new Date(Date.now() - 1000 * 60 * 720).toISOString(),
    client: {
      first_name: "Елена",
      username: "elena_ads",
    },
  },
];

const DEFAULT_EXECUTORS: Executor[] = [
  {
    id: "demo-exec-1",
    first_name: "Алексей Смирнов",
    username: "alex_1337_dev",
    avatar_url: null,
    executor_profiles: {
      skills: ["Telegram Mini Apps", "Next.js", "TypeScript", "TON"],
      bio: "Fullstack-разработчик. Создаю быстрые и масштабируемые веб-приложения и Telegram WebApp с AI и платежами.",
      rating: 5.0,
      completed_orders: 24,
      hourly_rate: 2200,
    },
  },
  {
    id: "demo-exec-2",
    first_name: "Виктория К.",
    username: "vika_ui_ux",
    avatar_url: null,
    executor_profiles: {
      skills: ["UI/UX Дизайн", "Figma", "Айдентика", "Design Systems"],
      bio: "Продуктовый дизайнер. Фокус на мобильных интерфейсах и Telegram Mini Apps с безупречной типографикой.",
      rating: 4.9,
      completed_orders: 31,
      hourly_rate: 1800,
    },
  },
  {
    id: "demo-exec-3",
    first_name: "Дмитрий Орлов",
    username: "dmitry_bots",
    avatar_url: null,
    executor_profiles: {
      skills: ["Python", "aiogram 3", "PostgreSQL", "Gemini AI"],
      bio: "Разработка высоконагруженных ботов, парсеров и AI-ассистентов с автоматизацией бизнес-процессов.",
      rating: 5.0,
      completed_orders: 18,
      hourly_rate: 2000,
    },
  },
  {
    id: "demo-exec-4",
    first_name: "Мария Т.",
    username: "maria_ton_dev",
    avatar_url: null,
    executor_profiles: {
      skills: ["TON Connect", "Smart Contracts", "Web3", "React"],
      bio: "Web3 интеграции, подключение кошельков Tonkeeper, смарт-контракты Tact/FunC и мини-игры.",
      rating: 4.9,
      completed_orders: 14,
      hourly_rate: 2500,
    },
  },
];

export default function FeedPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [items, setItems] = useState<(Order | Executor)[]>([]);
  const [userRole, setUserRole] = useState<string>("client");
  const [clientTab, setClientTab] = useState<"executors" | "orders" | "my_orders">("executors");
  const [isLoading, setIsLoading] = useState(true);
  const [showPromoBanner, setShowPromoBanner] = useState(true);
  const [isBookmarkedOnly, setIsBookmarkedOnly] = useState(false);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const supabase = createClient();

  const loadUserRole = useCallback(async () => {
    try {
      const savedRole = localStorage.getItem("fiolet_role") || "client";
      setUserRole(savedRole);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();
        if (data?.role) {
          setUserRole(data.role);
          localStorage.setItem("fiolet_role", data.role);
        }
      }
    } catch {
      // Default fallback
    }
  }, [supabase]);

  const loadItems = useCallback(async () => {
    setIsLoading(true);

    try {
      // Load local created orders for client
      const localCached = JSON.parse(localStorage.getItem("fiolet_client_orders") || "[]");
      setMyOrders(localCached);

      if (userRole === "client" && clientTab === "executors") {
        let query = supabase
          .from("users")
          .select(`
            id, first_name, username, avatar_url,
            executor_profiles(skills, bio, rating, completed_orders)
          `)
          .eq("role", "executor");

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          const executors: Executor[] = data.map((item: any) => {
            const profile = Array.isArray(item.executor_profiles)
              ? item.executor_profiles[0]
              : item.executor_profiles;

            return {
              id: item.id,
              first_name: item.first_name || "",
              username: item.username || "",
              avatar_url: item.avatar_url || null,
              executor_profiles: profile || {
                skills: ["Разработка", "Telegram Mini Apps"],
                bio: "",
                rating: 5.0,
                completed_orders: 0,
              },
            };
          });

          // Filter by category if needed
          let filtered = executors;
          if (activeCategory !== "all") {
            filtered = executors.filter((e) =>
              e.executor_profiles.skills.some((s) =>
                s.toLowerCase().includes(activeCategory.toLowerCase())
              )
            );
          }
          setItems(filtered.length > 0 ? filtered : DEFAULT_EXECUTORS);
        } else {
          let filtered = DEFAULT_EXECUTORS;
          if (activeCategory !== "all") {
            const catMap: Record<string, string> = {
              programming: "Telegram Mini Apps",
              design: "UI/UX",
              marketing: "Маркетинг",
              copywriting: "Копирайтинг",
            };
            const match = catMap[activeCategory];
            if (match) {
              filtered = DEFAULT_EXECUTORS.filter((e) =>
                e.executor_profiles.skills.some((s) => s.includes(match))
              );
            }
          }
          setItems(filtered.length > 0 ? filtered : DEFAULT_EXECUTORS);
        }
      } else {
        // Feed of Orders
        let query = supabase
          .from("orders")
          .select(`
            id, title, description, category, budget_min, budget_max, created_at,
            client:client_id(first_name, username)
          `)
          .eq("status", "active");

        if (activeCategory !== "all") {
          query = query.eq("category", activeCategory);
        }

        const { data, error } = await query.order("created_at", { ascending: false });
        if (!error && data && data.length > 0) {
          const orders: Order[] = data.map((item: any) => {
            const clientData = Array.isArray(item.client) ? item.client[0] : item.client;
            return {
              id: item.id,
              title: item.title,
              description: item.description,
              category: item.category,
              budget_min: item.budget_min,
              budget_max: item.budget_max,
              created_at: item.created_at,
              client: clientData || { first_name: "", username: "" },
            };
          });
          setItems(orders);
        } else {
          const combined = [...localCached, ...DEFAULT_ORDERS];
          const filtered =
            activeCategory === "all"
              ? combined
              : combined.filter((o) => o.category === activeCategory);
          setItems(filtered);
        }
      }
    } catch {
      setItems(userRole === "client" && clientTab === "executors" ? DEFAULT_EXECUTORS : DEFAULT_ORDERS);
    } finally {
      setIsLoading(false);
    }
  }, [userRole, clientTab, activeCategory, supabase]);

  useEffect(() => {
    loadUserRole();
  }, [loadUserRole]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const isClient = userRole === "client";

  return (
    <div className="space-y-3.5 pb-24 text-slate-900 font-sans">
      {/* 1. Top Promo Banner */}
      <AnimatePresence>
        {showPromoBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="bg-[#EDE9FE] border border-purple-200/80 rounded-3xl p-3.5 relative shadow-xs"
          >
            <div className="flex items-start gap-3 pr-6">
              <div className="w-10 h-10 rounded-2xl bg-purple-200/70 border border-purple-300/60 flex items-center justify-center text-purple-700 shrink-0 mt-0.5">
                <Sparkles className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="space-y-0.5">
                <h3 className="font-extrabold text-[13.5px] text-slate-900 leading-snug flex items-center gap-1.5">
                  <span>Фриланс биржа 1337</span>
                  <span className="badge-violet text-[9px] font-bold py-0.2 px-1.5 rounded-md">PRO</span>
                </h3>
                <p className="text-slate-600 text-[11.5px] leading-relaxed font-medium">
                  {isClient
                    ? "Размещайте задачи с AI-генерацией ТЗ и нанимайте проверенных профи."
                    : "Безлимитные отклики, AI-составитель заявок и мгновенные уведомления в TG."}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowPromoBanner(false)}
              className="absolute top-3 right-3 w-6 h-6 rounded-full bg-purple-200/50 hover:bg-purple-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Client Hero Action Bar */}
      {isClient && (
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Кабинет заказчика
              </div>
              <h2 className="text-base font-extrabold text-slate-900">
                Найдите исполнителя за 15 минут
              </h2>
            </div>
            <Link
              href="/orders/new"
              className="btn-primary py-2.5 px-4 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-violet shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Создать заказ</span>
            </Link>
          </div>

          {/* Segmented Switch for Client */}
          <div className="flex p-1 bg-slate-100 rounded-2xl gap-1">
            <button
              onClick={() => setClientTab("executors")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                clientTab === "executors"
                  ? "bg-white text-violet-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Специалисты</span>
            </button>
            <button
              onClick={() => setClientTab("my_orders")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                clientTab === "my_orders"
                  ? "bg-white text-violet-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Мои заказы ({myOrders.length})</span>
            </button>
            <button
              onClick={() => setClientTab("orders")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                clientTab === "orders"
                  ? "bg-white text-violet-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Все заказы</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Category Filter Bar (Only when browsing specialists or orders) */}
      {(!isClient || clientTab !== "my_orders") && (
        <FeedFilter
          activeCategory={activeCategory}
          onChange={setActiveCategory}
          onBookmarkFilter={() => setIsBookmarkedOnly(!isBookmarkedOnly)}
          isBookmarkedOnly={isBookmarkedOnly}
        />
      )}

      {/* 4. Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          <span className="text-xs font-semibold">Загрузка каталога 1337...</span>
        </div>
      ) : isClient && clientTab === "my_orders" ? (
        /* Client's own posted orders */
        <div className="space-y-3">
          {myOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center space-y-3 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-violet-700 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-900">
                У вас пока нет активных заказов
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed font-medium">
                Опубликуйте ваше первое задание с помощью AI-помощника, чтобы получать отклики от специалистов.
              </p>
              <Link
                href="/orders/new"
                className="btn-primary py-2.5 px-5 rounded-2xl text-xs font-bold inline-flex items-center gap-1.5 shadow-violet mt-2"
              >
                <Plus className="w-4 h-4" />
                <span>Опубликовать заказ</span>
              </Link>
            </div>
          ) : (
            myOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-3xl p-4.5 space-y-3 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="badge-blue text-[10px] font-bold py-0.5 px-2 rounded-lg">
                      Активно на бирже
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-sm mt-1">
                      {order.title || "Задание без названия"}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-slate-900">
                      {order.budget_min ? `${order.budget_min.toLocaleString()} ₽` : "По договоренности"}
                    </span>
                  </div>
                </div>

                <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed font-medium">
                  {order.description}
                </p>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Только что</span>
                  </div>

                  <Link
                    href="/responses"
                    className="btn-primary py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1 shadow-violet"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Отклики кандидатов</span>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      ) : isClient && clientTab === "executors" ? (
        /* Specialists list */
        <div className="space-y-3">
          {items.map((item) => (
            <ExecutorCard key={item.id} executor={item as Executor} />
          ))}
        </div>
      ) : (
        /* Orders list (for executor or client in 'orders' tab) */
        <div className="space-y-3">
          {items.map((item) => (
            <OrderCard key={item.id} order={item as Order} />
          ))}
        </div>
      )}
    </div>
  );
}
