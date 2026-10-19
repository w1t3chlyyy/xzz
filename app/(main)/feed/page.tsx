"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Sparkles, X, Briefcase, Users, Plus, FileText, SearchX } from "lucide-react";
import { FeedFilter } from "@/components/feed/FeedFilter";
import { OrderCard, type Order } from "@/components/orders/OrderCard";
import { ExecutorCard } from "@/components/feed/ExecutorCard";
import { useApp } from "@/components/providers/AppProvider";
import { getCached, setCached } from "@/lib/cache";
import { getCategoryLabel } from "@/lib/utils";

type ClientTab = "executors" | "orders" | "my_orders";
type BudgetSort = "all" | "high" | "low";

function readBookmarks(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem("1337_bookmarked_orders") || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export default function FeedPage() {
  const { role } = useApp();
  const isClient = role !== "executor";

  const [category, setCategory] = useState("all");
  const [clientTab, setClientTab] = useState<ClientTab>("executors");
  const [budgetSort, setBudgetSort] = useState<BudgetSort>("all");
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [showPromo, setShowPromo] = useState(true);

  const view: ClientTab = isClient ? clientTab : "orders";
  const key = view === "executors" ? "executors" : view === "my_orders" ? "orders:mine" : `orders:${category}`;

  // Кэш → мгновенный показ при возврате на страницу, свежие данные подтягиваются в фоне
  const [data, setData] = useState<any[] | null>(() => getCached<any[]>(key) ?? null);
  const [myCount, setMyCount] = useState<number | null>(() => getCached<any[]>("orders:mine")?.length ?? null);

  useEffect(() => {
    let cancelled = false;
    setData(getCached<any[]>(key) ?? null);

    const url =
      view === "executors"
        ? "/api/executors"
        : view === "my_orders"
        ? "/api/orders?mine=1"
        : `/api/orders${category !== "all" ? `?category=${category}` : ""}`;

    fetch(url, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json) => {
        const list = json.executors ?? json.orders ?? [];
        setCached(key, list);
        if (view === "my_orders") setMyCount(list.length);
        if (!cancelled) setData(list);
      })
      .catch(() => {
        if (!cancelled) setData((prev) => prev ?? []);
      });

    return () => {
      cancelled = true;
    };
  }, [key, view, category]);

  const items = useMemo(() => {
    if (!data) return null;
    let list = [...data];

    if (view === "executors" && category !== "all") {
      const label = getCategoryLabel(category).toLowerCase();
      list = list.filter((e) => (e.executor_profiles?.skills || []).some((s: string) => s.toLowerCase().includes(label)));
    }
    if (view === "orders") {
      if (bookmarkedOnly) {
        const saved = readBookmarks();
        list = list.filter((o) => saved.includes(o.id));
      }
      if (budgetSort !== "all") {
        const val = (o: Order) => o.budget_max ?? o.budget_min ?? 0;
        list.sort((a, b) => (budgetSort === "high" ? val(b) - val(a) : val(a) - val(b)));
      }
    }
    return list;
  }, [data, view, category, bookmarkedOnly, budgetSort]);

  const tabClass = (active: boolean) =>
    `flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
      active ? "bg-white text-violet-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
    }`;

  return (
    <div className="space-y-3.5 pb-24 text-slate-900 font-sans">
      <AnimatePresence>
        {showPromo && (
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
                <h3 className="font-extrabold text-[13.5px] text-slate-900 leading-snug">Фриланс биржа 1337</h3>
                <p className="text-slate-600 text-[11.5px] leading-relaxed font-medium">
                  {isClient
                    ? "Размещайте задачи и выбирайте исполнителей по откликам."
                    : "Откликайтесь на заказы и общайтесь с заказчиками прямо в бирже."}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPromo(false)}
              className="absolute top-3 right-3 w-6 h-6 rounded-full bg-purple-200/50 hover:bg-purple-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {isClient && (
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Кабинет заказчика</div>
              <h2 className="text-base font-extrabold text-slate-900">Найдите исполнителя</h2>
            </div>
            <Link href="/orders/new" className="btn-primary py-2.5 px-4 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-violet shrink-0">
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Создать заказ</span>
            </Link>
          </div>

          <div className="flex p-1 bg-slate-100 rounded-2xl gap-1">
            <button onClick={() => setClientTab("executors")} className={tabClass(clientTab === "executors")}>
              <Users className="w-3.5 h-3.5" />
              <span>Специалисты</span>
            </button>
            <button onClick={() => setClientTab("my_orders")} className={tabClass(clientTab === "my_orders")}>
              <FileText className="w-3.5 h-3.5" />
              <span>Мои заказы{myCount !== null ? ` (${myCount})` : ""}</span>
            </button>
            <button onClick={() => setClientTab("orders")} className={tabClass(clientTab === "orders")}>
              <Briefcase className="w-3.5 h-3.5" />
              <span>Все заказы</span>
            </button>
          </div>
        </div>
      )}

      {view !== "my_orders" && (
        <FeedFilter
          activeCategory={category}
          onChange={setCategory}
          onBookmarkFilter={() => setBookmarkedOnly((v) => !v)}
          isBookmarkedOnly={bookmarkedOnly}
          budgetSort={budgetSort}
          onBudgetSortChange={setBudgetSort}
        />
      )}

      {items === null ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          <span className="text-xs font-semibold">Загрузка...</span>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          view={view}
          bookmarkedOnly={bookmarkedOnly}
        />
      ) : view === "executors" ? (
        <div className="space-y-3">
          {items.map((item) => (
            <ExecutorCard key={item.id} executor={item} />
          ))}
        </div>
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

function EmptyState({ view, bookmarkedOnly }: { view: ClientTab; bookmarkedOnly: boolean }) {
  const cfg =
    view === "my_orders"
      ? { icon: FileText, title: "У вас пока нет заказов", text: "Опубликуйте первое задание, чтобы получать отклики от специалистов." }
      : view === "executors"
      ? { icon: Users, title: "Пока нет специалистов в этой категории", text: "Попробуйте другую категорию или загляните позже." }
      : bookmarkedOnly
      ? { icon: SearchX, title: "Нет сохранённых заказов", text: "Нажмите на закладку в карточке заказа, чтобы сохранить его." }
      : { icon: SearchX, title: "Заказов в этой категории пока нет", text: "Загляните позже или посмотрите другие категории." };
  const Icon = cfg.icon;

  return (
    <div className="bg-white rounded-3xl p-8 text-center space-y-3 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
      <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="font-extrabold text-sm text-slate-900">{cfg.title}</h3>
      <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed font-medium">{cfg.text}</p>
      {view === "my_orders" && (
        <Link href="/orders/new" className="btn-primary py-2.5 px-5 rounded-2xl text-xs font-bold inline-flex items-center gap-1.5 shadow-violet mt-2">
          <Plus className="w-4 h-4" />
          <span>Опубликовать заказ</span>
        </Link>
      )}
    </div>
  );
}
