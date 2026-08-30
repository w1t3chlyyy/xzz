"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tag,
  SlidersHorizontal,
  Maximize2,
  Bookmark,
  ChevronDown,
  Sparkles,
  Laptop,
  Palette,
  TrendingUp,
  PenTool,
  Check,
  Filter
} from "lucide-react";
import { cn } from "@/lib/utils";

const categories = [
  { id: "all", label: "Все категории", icon: Sparkles },
  { id: "programming", label: "Программирование", icon: Laptop },
  { id: "design", label: "Дизайн", icon: Palette },
  { id: "marketing", label: "Маркетинг", icon: TrendingUp },
  { id: "copywriting", label: "Копирайтинг", icon: PenTool },
];

interface FeedFilterProps {
  activeCategory: string;
  onChange: (category: string) => void;
  onBookmarkFilter?: () => void;
  isBookmarkedOnly?: boolean;
}

export function FeedFilter({
  activeCategory,
  onChange,
  onBookmarkFilter,
  isBookmarkedOnly,
}: FeedFilterProps) {
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [budgetSort, setBudgetSort] = useState<"all" | "high" | "low">("all");

  const currentCategory = categories.find((c) => c.id === activeCategory) || categories[0];

  return (
    <div className="space-y-2.5">
      {/* Top Filter Buttons Bar matching screenshot */}
      <div className="flex items-center gap-2">
        {/* Category Pill Dropdown — раньше в неактивном состоянии был синий,
            теперь везде фиолетовая палитра */}
        <button
          onClick={() => setIsCategoryOpen(!isCategoryOpen)}
          className={cn(
            "flex-1 flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 shadow-xs select-none",
            activeCategory !== "all"
              ? "bg-violet-100 text-violet-800 border border-violet-300 shadow-violet"
              : "bg-violet-50 text-violet-700 border border-violet-200 hover:border-violet-400"
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <Tag className="w-4 h-4 shrink-0 text-violet-600" />
            <span className="truncate">
              {activeCategory === "all" ? "Категории..." : currentCategory.label}
            </span>
          </div>
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 ml-1 transition-transform text-violet-600",
              isCategoryOpen && "rotate-180"
            )}
          />
        </button>

        {/* Filters Dropdown */}
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-800 hover:border-violet-300 text-xs font-bold shadow-xs select-none transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4 text-slate-700" />
          <span>Фильтр</span>
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 text-slate-500 transition-transform",
              isFilterOpen && "rotate-180"
            )}
          />
        </button>

        {/* Expand / View Button */}
        <button
          onClick={() => {}}
          title="Развернуть"
          className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:border-violet-300 hover:text-violet-700 shadow-xs transition-colors shrink-0"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Bookmarks Button */}
        <button
          onClick={onBookmarkFilter}
          title="Сохраненные"
          className={cn(
            "w-10 h-10 rounded-2xl border flex items-center justify-center shadow-xs transition-colors shrink-0",
            isBookmarkedOnly
              ? "bg-violet-600 text-white border-violet-600 shadow-violet"
              : "bg-white border-slate-200 text-slate-700 hover:border-violet-300 hover:text-violet-700"
          )}
        >
          <Bookmark className="w-4 h-4" />
        </button>
      </div>

      {/* Category Dropdown Menu */}
      <AnimatePresence>
        {isCategoryOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -6 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -6 }}
            className="overflow-hidden bg-white border border-purple-100 rounded-2xl p-2 shadow-lg shadow-purple-500/5 space-y-1"
          >
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    onChange(cat.id);
                    setIsCategoryOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors",
                    isSelected
                      ? "bg-violet-50 text-violet-700 font-bold"
                      : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={cn("w-4 h-4", isSelected ? "text-violet-600" : "text-slate-500")} />
                    <span>{cat.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-violet-600" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Options Menu */}
      <AnimatePresence>
        {isFilterOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -6 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -6 }}
            className="overflow-hidden bg-white border border-slate-200 rounded-2xl p-3 shadow-lg space-y-2 text-xs"
          >
            <div className="font-bold text-slate-900">Сортировка по бюджету:</div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setBudgetSort("all");
                  setIsFilterOpen(false);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-xl border text-xs font-semibold",
                  budgetSort === "all" ? "bg-violet-600 text-white border-violet-600" : "bg-slate-50 border-slate-200 text-slate-700"
                )}
              >
                Все
              </button>
              <button
                onClick={() => {
                  setBudgetSort("high");
                  setIsFilterOpen(false);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-xl border text-xs font-semibold",
                  budgetSort === "high" ? "bg-violet-600 text-white border-violet-600" : "bg-slate-50 border-slate-200 text-slate-700"
                )}
              >
                По убыванию
              </button>
              <button
                onClick={() => {
                  setBudgetSort("low");
                  setIsFilterOpen(false);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-xl border text-xs font-semibold",
                  budgetSort === "low" ? "bg-violet-600 text-white border-violet-600" : "bg-slate-50 border-slate-200 text-slate-700"
                )}
              >
                По возрастанию
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Category Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onChange(cat.id)}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 select-none",
                isActive
                  ? "bg-violet-600 text-white shadow-xs shadow-violet-500/20"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-violet-300 hover:text-slate-900"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
