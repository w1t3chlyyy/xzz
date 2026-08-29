"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Laptop,
  Palette,
  TrendingUp,
  PenTool,
  Bookmark,
  Wallet,
  Layers,
  Clock,
} from "lucide-react";
import { getCategoryLabel, getCategorySublabel } from "@/lib/utils";

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

const CATEGORY_META: Record<
  string,
  { icon: React.ElementType; gradient: string; text: string; ring: string }
> = {
  programming: {
    icon: Laptop,
    gradient: "from-sky-500 to-blue-600",
    text: "text-sky-700",
    ring: "ring-sky-500/15",
  },
  design: {
    icon: Palette,
    gradient: "from-fuchsia-500 to-purple-600",
    text: "text-purple-700",
    ring: "ring-purple-500/15",
  },
  marketing: {
    icon: TrendingUp,
    gradient: "from-emerald-500 to-teal-600",
    text: "text-emerald-700",
    ring: "ring-emerald-500/15",
  },
  copywriting: {
    icon: PenTool,
    gradient: "from-amber-500 to-orange-600",
    text: "text-amber-700",
    ring: "ring-amber-500/15",
  },
};

const DEFAULT_META = {
  icon: Layers,
  gradient: "from-violet-500 to-indigo-600",
  text: "text-violet-700",
  ring: "ring-violet-500/15",
};

function getRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} дн назад`;
  return new Date(dateStr).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function OrderCard({ order }: OrderCardProps) {
  const [isSaved, setIsSaved] = useState(false);
  const meta = CATEGORY_META[order.category] || DEFAULT_META;
  const Icon = meta.icon;

  const budgetText =
    order.budget_min && order.budget_max
      ? `${order.budget_min.toLocaleString("ru-RU")} – ${order.budget_max.toLocaleString("ru-RU")} ₽`
      : order.budget_min
      ? `от ${order.budget_min.toLocaleString("ru-RU")} ₽`
      : "по договорённости";

  const clientInitial = (order.client?.first_name || order.client?.username || "?")[0]?.toUpperCase();

  return (
    <Link href={`/orders/${order.id}`} className="block group">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="relative overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_14px_34px_rgba(124,58,237,0.12)] hover:border-purple-200/70 hover:-translate-y-0.5 transition-all duration-300"
      >
        {/* Colored top accent tied to category */}
        <div className={`h-1 w-full bg-gradient-to-r ${meta.gradient}`} />

        <div className="p-4.5 space-y-3.5">
          {/* Header */}
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center shrink-0 shadow-md ring-4 ${meta.ring}`}
              >
                <Icon className="w-5 h-5 text-white" strokeWidth={2.2} />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <span className={`font-extrabold text-[13px] uppercase tracking-wide ${meta.text}`}>
                    {getCategoryLabel(order.category)}
                  </span>
                  <span className="text-slate-400 font-medium text-[11px] leading-tight">
                    {getCategorySublabel(order.category)}
                  </span>
                </div>
                <h4 className="font-extrabold text-[15px] text-slate-900 leading-snug mt-0.5 group-hover:text-violet-700 transition-colors line-clamp-1">
                  {order.title || "Задание без названия"}
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="bg-[#2563EB] text-white font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                Новый
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsSaved(!isSaved);
                }}
                className="p-1 text-slate-400 hover:text-violet-600 transition-colors"
              >
                <Bookmark
                  className={`w-4 h-4 transition-colors ${
                    isSaved ? "text-violet-600 fill-violet-600" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Description */}
          <p className="text-slate-600 text-[13px] font-medium leading-relaxed line-clamp-2 pl-[3.4rem]">
            {order.description}
          </p>

          {/* Footer: budget + client + time */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 pl-[3.4rem]">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 text-[10px] font-extrabold shrink-0">
                {clientInitial}
              </div>
              <span className="text-[11px] text-slate-500 font-medium truncate">
                @{order.client?.username || "anonymous"}
              </span>
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium shrink-0">
                <Clock className="w-3 h-3" />
                {getRelativeTime(order.created_at)}
              </span>
            </div>

            <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/80 text-amber-800 font-extrabold text-[12px] px-2.5 py-1.5 rounded-xl shrink-0">
              <Wallet className="w-3.5 h-3.5 text-amber-600" />
              <span>{budgetText}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
