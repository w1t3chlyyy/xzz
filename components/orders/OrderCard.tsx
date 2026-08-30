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
  Settings2,
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

// Раньше у каждой категории был свой цвет (в т.ч. синий для "programming").
// По запросу — единая фиолетовая палитра для всех категорий, синего нигде
// не остаётся.
const CATEGORY_META: Record<string, { icon: React.ElementType; bg: string; text: string }> = {
  programming: { icon: Laptop, bg: "bg-violet-100", text: "text-violet-700" },
  design: { icon: Palette, bg: "bg-fuchsia-100", text: "text-fuchsia-700" },
  marketing: { icon: TrendingUp, bg: "bg-emerald-100", text: "text-emerald-700" },
  copywriting: { icon: PenTool, bg: "bg-amber-100", text: "text-amber-700" },
};

const DEFAULT_META = { icon: Layers, bg: "bg-violet-100", text: "text-violet-700" };

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const datePart = d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  const timePart = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  return `${datePart}, ${timePart}`;
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
      : "не указано";

  const username = order.client?.username ? `@${order.client.username}` : "@anonymous";

  return (
    <Link href={`/orders/${order.id}`} className="block group">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_14px_34px_rgba(124,58,237,0.12)] hover:border-purple-200/70 hover:-translate-y-0.5 transition-all duration-300 p-4.5 space-y-3"
      >
        {/* Header: круглая иконка + категория/подкатегория + дата/автор */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-11 h-11 rounded-full ${meta.bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-5 h-5 ${meta.text}`} strokeWidth={2.2} />
            </div>

            <div className="min-w-0">
              <h4 className="font-extrabold text-[14px] text-slate-900 leading-snug group-hover:text-violet-700 transition-colors">
                {getCategoryLabel(order.category)}
              </h4>
              <span className="text-slate-400 font-medium text-[11.5px] leading-tight block">
                {getCategorySublabel(order.category)}
              </span>
              <div className="text-[11px] text-slate-400 font-medium mt-1 truncate">
                {formatDateTime(order.created_at)} · {username}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="bg-violet-600 text-white font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
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
                className={`w-4 h-4 transition-colors ${isSaved ? "text-violet-600 fill-violet-600" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Description */}
        <p className="text-slate-700 text-[13px] font-medium leading-relaxed line-clamp-3">
          {order.description}
        </p>

        {/* Footer: две плашки — бюджет и формат */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200/80 text-amber-800 font-bold text-[11px] px-2.5 py-1 rounded-xl">
            <Wallet className="w-3.5 h-3.5 text-amber-600" />
            <span>{budgetText}</span>
          </span>
          <span className="inline-flex items-center gap-1 bg-violet-50 border border-violet-200/80 text-violet-800 font-bold text-[11px] px-2.5 py-1 rounded-xl">
            <Settings2 className="w-3.5 h-3.5 text-violet-600" />
            <span>Формат: не указано</span>
          </span>
        </div>
      </motion.div>
    </Link>
  );
}
