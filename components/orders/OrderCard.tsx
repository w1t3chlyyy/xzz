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
  ReceiptText,
  Briefcase,
  Layers,
  Check
} from "lucide-react";
import { getCategoryLabel, getCategorySublabel, formatDate } from "@/lib/utils";

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

export function OrderCard({ order }: OrderCardProps) {
  const [isSaved, setIsSaved] = useState(false);

  const budgetText =
    order.budget_min && order.budget_max
      ? `${order.budget_min.toLocaleString("ru-RU")} – ${order.budget_max.toLocaleString("ru-RU")} ₽`
      : order.budget_min
      ? `от ${order.budget_min.toLocaleString("ru-RU")} ₽`
      : "не указано";

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "programming":
        return <Laptop className="w-5 h-5 text-sky-600" />;
      case "design":
        return <Palette className="w-5 h-5 text-purple-600" />;
      case "marketing":
        return <TrendingUp className="w-5 h-5 text-emerald-600" />;
      case "copywriting":
        return <PenTool className="w-5 h-5 text-amber-600" />;
      default:
        return <Layers className="w-5 h-5 text-violet-600" />;
    }
  };

  const getCategoryIconBg = (category: string) => {
    switch (category) {
      case "programming":
        return "bg-sky-50 border-sky-100";
      case "design":
        return "bg-purple-50 border-purple-100";
      case "marketing":
        return "bg-emerald-50 border-emerald-100";
      case "copywriting":
        return "bg-amber-50 border-amber-100";
      default:
        return "bg-violet-50 border-violet-100";
    }
  };

  return (
    <Link href={`/orders/${order.id}`} className="block group">
      <motion.div
        whileTap={{ scale: 0.985 }}
        className="bg-white rounded-3xl p-4.5 space-y-3.5 border border-slate-100/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_25px_rgba(124,58,237,0.07)] hover:border-purple-200/70 transition-all duration-200"
      >
        {/* Top Header */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-3 min-w-0">
            {/* Category SVG Icon */}
            <div
              className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 shadow-xs ${getCategoryIconBg(
                order.category
              )}`}
            >
              {getCategoryIcon(order.category)}
            </div>

            {/* Title, Subcategory & Client Info */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-1">
                <span className="font-bold text-[15px] text-slate-900 leading-tight">
                  {getCategoryLabel(order.category)}
                </span>
                <span className="text-slate-700 font-medium text-xs leading-tight">
                  {getCategorySublabel(order.category)}
                </span>
              </div>
              <p className="text-slate-400 text-[11px] font-medium mt-0.5">
                {formatDate(order.created_at)} · @{order.client?.username || "anonymous"}
              </p>
            </div>
          </div>

          {/* Right badges: NEW + Bookmark */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="bg-[#2563EB] text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
              НОВЫЙ
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

        {/* Task Title & Description */}
        <div className="space-y-1">
          {order.title && (
            <h4 className="font-bold text-sm text-slate-900 group-hover:text-violet-700 transition-colors">
              {order.title}
            </h4>
          )}
          <p className="text-slate-800 text-[13px] font-medium leading-relaxed line-clamp-3">
            {order.description}
          </p>
        </div>

        {/* Bottom Tag Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {/* Budget Tag */}
          <div className="badge-yellow text-[11px] font-semibold flex items-center gap-1.5 py-1 px-2.5 rounded-xl">
            <ReceiptText className="w-3.5 h-3.5 text-amber-700" />
            <span>{budgetText}</span>
          </div>

          {/* Deadline / Requirement Tag */}
          <div className="badge-blue text-[11px] font-semibold flex items-center gap-1.5 py-1 px-2.5 rounded-xl">
            <Briefcase className="w-3.5 h-3.5 text-blue-700" />
            <span>не указано</span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

