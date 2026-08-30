"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { FeedFilter } from "@/components/feed/FeedFilter";
import { OrderCard } from "@/components/orders/OrderCard";
import { ExecutorCard } from "@/components/feed/ExecutorCard";
import { getCachedClientOrders } from "@/lib/utils";
import {
  Loader2,
  Sparkles,
  X,
  ArrowRight,
  Briefcase,
  Users,
  Plus,
  FileText,
  Clock,
  MessageSquare,
  SearchX,
} from "lucide-react";
import Link from "next/link";

interface Order {
  id: string;
  title: string;
  description: string;
  category: string;
  budget_min: number | null;
  budget_max: number | null;
  status?: string;
  pending_responses_count?: number;
  total_responses_count?: number;
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

export default function FeedPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [items, setItems] = useState<(Order | Executor)[]>([]);
  const [userRole, setUserRole] = useState<string>("client");
  const [clientTab, setClientTab] = useState<"executors" | "orders" | "my_orders">("executors");
  const [isLoading, setIsLoading] = useState(true);
  // Роль определяется асинхронно (сначала localStorage, потом уточняется на
  // сервере). Раньше loadItems() запускался сразу с ролью по умолчанию
  // ("client"), и на долю секунды в items успевали попасть объекты-
  // специалисты, которые затем рендерились через <OrderCard> (если реальная
  // роль — executor) — категория/дата были пустыми, а клик по такой
  // "заготовке" вёл на /orders/<id_пользователя>, которого не существует.
  // Флаг ниже не даёт loadItems запуститься, пока роль не определена точно.
  const [isRoleResolved, setIsRoleResolved] = useState(false);
  const [showPromoBanner, setShowPromoBanner] = useState(true);
  const [isBookmarkedOnly, setIsBookmarkedOnly] = useState(false);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const supabase = createClient();

  const loadUserRole = useCallback(async () => {
    try {
      const savedRole = localStorage.getItem("1337_role") || localStorage.getItem("fiolet_role") || "client";
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
          localStorage.setItem("1337_role", data.role);
          localStorage.setItem("fiolet_role", data.role);
        }
      }
    } catch {
      // Default fallback
    } finally {
      setIsRoleResolved(true);
    }
  }, [supabase]);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    // Сразу очищаем items — чтобы во время загрузки ни при каких условиях
    // не показать (и не дать кликнуть на) данные предыдущего типа/роли.
    setItems([]);

    try {
      // Локальный кэш заказов клиента
      const localCached = getCachedClientOrders<Order>();
      setMyOrders(localCached);

      // Если вкладка "Мои заказы" у клиента — подгружаем свежие данные с сервера
      if (userRole === "client" && clientTab === "my_orders") {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: serverMyOrders } = await supabase
              .from("orders")
              .select(`
                id, title, description, category, budget_min, budget_max, status, created_at,
                client:client_id(first_name, username),
                responses:responses(id, status)
              `)
              .eq("client_id", user.id)
              .order("created_at", { ascending: false });

            if (serverMyOrders && serverMyOrders.length > 0) {
              const formattedMyOrders = serverMyOrders.map((item: any) => {
                const responsesList = Array.isArray(item.responses) ? item.responses : [];
                const pendingCount = responsesList.filter((r: any) => r && (r.status === "pending" || !r.status)).length;
                return {
                  id: item.id,
                  title: item.title,
                  description: item.description,
                  category: item.category,
                  budget_min: item.budget_min,
                  budget_max: item.budget_max,
                  status: item.status || "active",
                  pending_responses_count: pendingCount,
                  total_responses_count: responsesList.length,
                  created_at: item.created_at,
                  client: item.client || { first_name: "", username: "" },
                };
              });
              setMyOrders(formattedMyOrders);
            }
          }
        } catch (myErr) {
          console.warn("Failed to load server my orders:", myErr);
        }
      }

      if (userRole === "client" && clientTab === "executors") {
        let query = supabase
          .from("users")
          .select(`
            id, first_name, username, avatar_url,
            executor_profiles(skills, bio, rating, completed_orders)
          `)
          .eq("role", "executor");

        const { data, error } = await query;
        const executors: Executor[] = !error && data
          ? data.map((item: any) => {
              const profile = Array.isArray(item.executor_profiles)
                ? item.executor_profiles[0]
                : item.executor_profiles;

              return {
                id: item.id,
                first_name: item.first_name || "",
                username: item.username || "",
                avatar_url: item.avatar_url || null,
                executor_profiles: profile || {
                  skills: [],
                  bio: "",
                  rating: 5.0,
                  completed_orders: 0,
                },
              };
            })
          : [];

        const filtered =
          activeCategory === "all"
            ? executors
            : executors.filter((e) =>
                e.executor_profiles.skills.some((s) => s.toLowerCase().includes(activeCategory.toLowerCase()))
              );

        setItems(filtered);
      } else {
        // Feed of Orders - fetch via server route with response counts or Supabase fallback
        let remoteOrders: Order[] = [];
        try {
          const res = await fetch(`/api/orders${activeCategory !== "all" ? `?category=${activeCategory}` : ""}`);
          if (res.ok) {
            const apiData = await res.json();
            if (Array.isArray(apiData.orders)) {
              remoteOrders = apiData.orders;
            }
          }
        } catch (apiErr) {
          console.warn("API /api/orders failed in feed, falling back to direct query:", apiErr);
        }

        if (remoteOrders.length === 0) {
          let query = supabase
            .from("orders")
            .select(`
              id, title, description, category, budget_min, budget_max, status, created_at,
              client:client_id(first_name, username),
              responses:responses(id, status)
            `)
            .in("status", ["active", "in_progress"]);

          if (activeCategory !== "all") {
            query = query.eq("category", activeCategory);
          }

          const { data, error } = await query.order("created_at", { ascending: false });
          if (!error && data) {
            remoteOrders = data.map((item: any) => {
              const clientData = Array.isArray(item.client) ? item.client[0] : item.client;
              const responsesList = Array.isArray(item.responses) ? item.responses : [];
              const pendingCount = responsesList.filter((r: any) => r && (r.status === "pending" || !r.status)).length;
              return {
                id: item.id,
                title: item.title,
                description: item.description,
                category: item.category,
                budget_min: item.budget_min,
                budget_max: item.budget_max,
                status: item.status || "active",
                pending_responses_count: pendingCount,
                total_responses_count: responsesList.length,
                created_at: item.created_at,
                client: clientData || { first_name: "", username: "" },
              };
            });
          }
        }

        // Локально созданные заказы (ещё не пришли из Supabase) добавляем сверху.
        const localIds = new Set(localCached.map((o) => o.id));
        const combined = [...localCached, ...remoteOrders.filter((o) => !localIds.has(o.id))];
        const filtered =
          activeCategory === "all" ? combined : combined.filter((o) => o.category === activeCategory);
        setItems(filtered);
      }
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [userRole, clientTab, activeCategory, supabase]);

  useEffect(() => {
    loadUserRole();
  }, [loadUserRole]);

  useEffect(() => {
    // Ждём, пока роль будет точно определена — иначе первый запрос уйдёт
    // с ролью по умолчанию и результат может на мгновение не совпасть
    // с тем, что реально нужно рендерить (см. комментарий у isRoleResolved).
    if (!isRoleResolved) return;
    loadItems();
  }, [isRoleResolved, loadItems]);

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
                <h3 className="font-extrabold text-[13.5px] text-slate-900 leading-snug">
                  Фриланс биржа 1337
                </h3>
                <p className="text-slate-600 text-[11.5px] leading-relaxed font-medium">
                  {isClient
                    ? "Размещайте задачи и нанимайте проверенных специалистов напрямую в Telegram."
                    : "Неограниченные отклики и прямой контакт с заказчиками в Telegram."}
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
                Опубликуйте ваше первое задание, чтобы получать отклики от специалистов.
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
            myOrders.map((order) => {
              const isInProgress = order.status === "in_progress";
              const pendingCount = order.pending_responses_count ?? 0;
              return (
                <div
                  key={order.id}
                  className="bg-white rounded-3xl p-5 sm:p-5.5 space-y-3 border border-slate-100/90 shadow-[0_4px_22px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_32px_rgba(124,58,237,0.09)] hover:border-purple-200/80 transition-all duration-200"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isInProgress ? (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold text-amber-800 bg-amber-50/90 px-2 py-0.5 rounded-lg border border-amber-200/80">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>В работе</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold text-emerald-800 bg-emerald-50/90 px-2 py-0.5 rounded-lg border border-emerald-200/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>В поиске</span>
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-violet-800 bg-purple-50/90 px-2 py-0.5 rounded-lg border border-purple-100">
                        <MessageSquare className="w-3 h-3 text-violet-600" />
                        <span>
                          {pendingCount === 1
                            ? "1 отклик"
                            : pendingCount >= 2 && pendingCount <= 4
                            ? `${pendingCount} отклика`
                            : `${pendingCount} откликов`}
                        </span>
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-extrabold text-slate-900 bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded-xl">
                        {order.budget_min && order.budget_max
                          ? `${order.budget_min.toLocaleString()} – ${order.budget_max.toLocaleString()} ₽`
                          : order.budget_min
                          ? `от ${order.budget_min.toLocaleString()} ₽`
                          : "По договоренности"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-extrabold text-slate-900 text-sm sm:text-[15px] leading-snug">
                      {order.title || "Задание без названия"}
                    </h3>
                    <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed font-medium">
                      {order.description}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{new Date(order.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</span>
                    </div>

                    <Link
                      href={`/orders/${order.id}`}
                      className="btn-primary py-1.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-violet transition-transform active:scale-95"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Отклики ({order.total_responses_count ?? pendingCount})</span>
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : isClient && clientTab === "executors" ? (
        /* Specialists list */
        items.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Пока нет специалистов в этой категории"
            description="Попробуйте выбрать другую категорию или загляните позже — исполнители появляются по мере регистрации."
          />
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <ExecutorCard key={item.id} executor={item as Executor} />
            ))}
          </div>
        )
      ) : /* Orders list (for executor or client in 'orders' tab) */
      items.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Заказов в этой категории пока нет"
          description="Загляните позже или посмотрите заказы в других категориях."
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <OrderCard key={item.id} order={item as Order} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-3xl p-8 text-center space-y-3 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
      <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="font-extrabold text-sm text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed font-medium">{description}</p>
    </div>
  );
}
