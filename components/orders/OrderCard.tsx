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
  Clock,
  MessageSquare,
} from "lucide-react";
import { getCategoryLabel } from "@/lib/utils";

export interface Order {
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

interface OrderCardProps {
  order: Order;
}

const CATEGORY_META: Record<string, { icon: React.ElementType; bg: string; text: string }> = {
  programming: { icon: Laptop, bg: "bg-violet-50 text-violet-700 border-violet-200/60", text: "text-violet-700" },
  design: { icon: Palette, bg: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200/60", text: "text-fuchsia-700" },
  marketing: { icon: TrendingUp, bg: "bg-emerald-50 text-emerald-700 border-emerald-200/60", text: "text-emerald-700" },
  copywriting: { icon: PenTool, bg: "bg-amber-50 text-amber-700 border-amber-200/60", text: "text-amber-700" },
};

const DEFAULT_META = {
  icon: Layers,
  bg: "bg-violet-50 text-violet-700 border-violet-200/60",
  text: "text-violet-700",
};

const BOOKMARKS_KEY = "1337_bookmarked_orders";

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const datePart = d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  const timePart = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  return `${datePart}, ${timePart}`;
}

function pluralizeResponses(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${count} откликов`;
  if (mod10 === 1) return `${count} отклик`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} отклика`;
  return `${count} откликов`;
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
  const CategoryIcon = meta.icon;

  useEffect(() => {
    const bookmarks = readBookmarks();
    setIsSaved(bookmarks.includes(order.id));
  }, [order.id]);

  const toggleSaved = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const saved = readBookmarks();
    let next: string[];
    if (isSaved) {
      next = saved.filter((id) => id !== order.id);
    } else {
      next = [...saved, order.id];
    }
    try {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
    } catch (err) {
      console.warn("Bookmark save failed", err);
    }
    setIsSaved(!isSaved);
  };

  const handleCardClick = () => {
    router.push(`/orders/${order.id}`);
  };

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      router.push(`/orders/${order.id}`);
    }
  };

  let budgetText = "По договоренности";
  if (order.budget_min && order.budget_max) {
    budgetText = `${order.budget_min.toLocaleString("ru-RU")} – ${order.budget_max.toLocaleString("ru-RU")} ₽`;
  } else if (order.budget_min) {
    budgetText = `от ${order.budget_min.toLocaleString("ru-RU")} ₽`;
  }

  const rawUsername = (order.client?.username || "").replace(/^@/, "");
  const displayUsername = rawUsername ? `@${rawUsername}` : "@заказчик";

  const isInProgress = order.status === "in_progress";
  const pendingCount = order.pending_responses_count ?? 0;

  const tgMessage = `Здравствуйте! Заинтересовал ваш заказ "${order.title}" на бирже 1337, хочу обсудить детали.`;
  const tgUrl = rawUsername ? `https://t.me/${rawUsername}?text=${encodeURIComponent(tgMessage)}` : null;

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      whileTap={{ scale: 0.985 }}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="bg-white rounded-3xl border border-slate-100/90 shadow-[0_4px_22px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_32px_rgba(124,58,237,0.09)] hover:border-purple-200/80 transition-all duration-200 p-5 sm:p-5.5 cursor-pointer group outline-none space-y-3"
    >
      {/* 1. Header Line: Category + Status + Pending Responses Count + Bookmark */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Category Chip */}
          <span className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-lg border ${meta.bg}`}>
            <CategoryIcon className="w-3 h-3" />
            <span>{getCategoryLabel(order.category)}</span>
          </span>

          {/* Status Badge: Active vs In Progress */}
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

          {/* Pending Responses Count Badge */}
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-violet-800 bg-purple-50/90 px-2 py-0.5 rounded-lg border border-purple-100">
            <MessageSquare className="w-3 h-3 text-violet-600" />
            <span>{pluralizeResponses(pendingCount)}</span>
          </span>
        </div>

        {/* Bookmark Button */}
        <button
          type="button"
          onClick={toggleSaved}
          className="p-1 -mr-1 text-slate-300 hover:text-violet-600 transition-colors shrink-0"
          title="Сохранить заказ"
        >
          <Bookmark className={isSaved ? "w-4 h-4 text-violet-600 fill-violet-600" : "w-4 h-4"} />
        </button>
      </div>

      {/* 2. Compact Title & Description */}
      <div className="space-y-1.5">
        <h4 className="font-extrabold text-[14.5px] text-slate-900 leading-snug group-hover:text-violet-700 transition-colors line-clamp-2">
          {order.title || "Задание без названия"}
        </h4>
        <p className="text-slate-500 text-xs font-medium leading-relaxed line-clamp-2">
          {order.description}
        </p>
      </div>

      {/* 3. Footer Line: Budget & Author / Direct Action with breathing room to edges */}
      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
        <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/70 text-slate-900 font-extrabold text-xs px-2.5 py-1 rounded-xl">
          <Wallet className="w-3.5 h-3.5 text-violet-600" />
          <span>{budgetText}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            {formatDateTime(order.created_at)} • {displayUsername}
          </span>

          {tgUrl && !isInProgress && (
            <a
              href={tgUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="btn-primary py-1.5 px-3 rounded-xl text-[11px] font-bold flex items-center gap-1 shadow-violet transition-transform active:scale-95"
            >
              <Send className="w-3 h-3" />
              <span>Написать</span>
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}
