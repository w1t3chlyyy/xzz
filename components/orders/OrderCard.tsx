// components/orders/OrderCard.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Laptop,
  Palette,
  TrendingUp,
  PenTool,
  Bookmark,
  Wallet,
  Layers,
  Send,
} from "lucide-react";
import { getCategoryLabel } from "@/lib/utils";

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

interface OrderCardProps {
  order: Order;
}

const CATEGORY_META: Record<string, { icon: React.ElementType; bg: string; text: string }> = {
  programming: { icon: Laptop, bg: "bg-violet-100", text: "text-violet-700" },
  design: { icon: Palette, bg: "bg-fuchsia-100", text: "text-fuchsia-700" },
  marketing: { icon: TrendingUp, bg: "bg-emerald-100", text: "text-emerald-700" },
  copywriting: { icon: PenTool, bg: "bg-amber-100", text: "text-amber-700" },
};

const DEFAULT_META = { icon: Layers, bg: "bg-violet-100", text: "text-violet-700" };

// Общий ключ закладок — тот же, что читает/пишет страница заказа
// (app/(main)/orders/[id]/page.tsx), чтобы состояние "сохранено" было
// одинаковым и в ленте, и на самой странице заказа.
const BOOKMARKS_KEY = "1337_bookmarked_orders";

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const datePart = d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  const timePart = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  return `${datePart}, ${timePart}`;
}

function readBookmarks(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export function OrderCard({ order }: OrderCardProps) {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(false);
  const meta = CATEGORY_META[order.category] || DEFAULT_META;
  const Icon = meta.icon;

  useEffect(() => {
    setIsSaved(readBookmarks().includes(order.id));
  }, [order.id]);

  const toggleSaved = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const saved = readBookmarks();
    const next = isSaved ? saved.filter((id) => id !== order.id) : [...saved, order.id];
    try {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
    } catch {
      // localStorage недоступен — просто не сохраняем между сессиями
    }
    setIsSaved(!isSaved);
  };

  const budgetText =
    order.budget_min && order.budget_max
      ? `${order.budget_min.toLocaleString("ru-RU")} – ${order.budget_max.toLocaleString("ru-RU")} ₽`
      : order.budget_min
      ? `от ${order.budget_min.toLocaleString("ru-RU")} ₽`
      : "не указан";

  const rawUsername = order.client?.username?.replace(/^@/, "") || "";
  const displayUsername = rawUsername ? `@${rawUsername}` : "@anonymous";

  // Прямой контакт с заказчиком в Telegram — по аналогии с ExecutorCard.
  // Если у заказчика нет username, Telegram-диплинк по id не работает,
  // поэтому в этом случае кнопку не показываем.
  const tgUrl = rawUsername
    ? `https://t.me/${rawUsername}?text=${encodeURIComponent(
        `Здравствуйте! Заинтересовал ваш заказ «${order.title}» на бирже 1337, хочу обсудить детали.`
      )}`
    : null;

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/orders/${order.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(`/orders/${order.id}`);
      }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_14px_34px_rgba(124,58,237,0.12)] hover:border-purple-200/70 hover:-translate-y-0.5 transition-all duration-300 p-4.5 space-y-2.5 cursor-pointer group outline-none"
    >
      {/* Header: иконка + реальное название заказа + категория/дата */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`w-11 h-11 rounded-full ${meta.bg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-5 h-5 ${meta.text}`} strokeWidth={2.2} />
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="font-extrabold text-[13.5px] text-slate-900 leading-snug line-clamp-2 group-hover:text-violet-700 transition-colors">
              {order.title || "Задание без названия"}
            </h4>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${meta.bg} ${meta.text}`}>
                {getCategoryLabel(order.category)}
              </span>
              <span className="text-[10.5px] text-slate-400 font-medium truncate">
                {formatDateTime(order.created_at)} · {displayUsername}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="bg-violet-600 text-white font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
            Новый
          </span>
          <button
            type="button"
            onClick={toggleSaved}
            className="p-1 text-slate-400 hover:text-violet-600 transition-colors"
            title={isSaved ? "Убрать из сохранённых" : "Сохранить заказ"}
          >
            <Bookmark className={`w-4 h-4 transition-colors ${isSaved ? "text-violet-600 fill-violet-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Description — 2 строки вместо 3, чтобы карточка не растягивалась */}
      <p className="text-slate-600 text-[12.5px] font-medium leading-relaxed line-clamp-2">
        {order.description}
      </p>

      {/* Footer: бюджет + прямой контакт с заказчиком. flex-wrap — чтобы
          на узких экранах бюджет и кнопка не вылезали за карточку. */}
      <div className="pt-2 border-t border-slate-100 flex items-center flex-wrap justify-between gap-2">
        <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200/80 text-amber-800 font-bold text-[11px] px-2.5 py-1 rounded-xl shrink-0">
          <Wallet className="w-3.5 h-3.5 text-amber-600" />
          <span>{budgetText}</span>
        </span>

        {tgUrl ? (
          
            href={tgUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="btn-primary py-2 px-3 rounded-xl text-[11px] font-bold flex items-center gap-1.5 shadow-violet shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Написать</span>
          </a>
        ) : (
          <span className="text-[10.5px] text-slate-400 font-medium shrink-0">
            Username не указан
          </span>
        )}
      </div>
    </motion.div>
  );
}
