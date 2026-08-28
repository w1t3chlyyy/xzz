"use client";

import { motion } from "framer-motion";
import { cn, getCategoryLabel, getCategoryEmoji } from "@/lib/utils";

const categories = [
  { id: "all", label: "Все", emoji: "🔥" },
  { id: "programming", label: "Программирование", emoji: "💻" },
  { id: "design", label: "Дизайн", emoji: "🎨" },
  { id: "marketing", label: "Маркетинг", emoji: "📈" },
  { id: "copywriting", label: "Копирайтинг", emoji: "✍️" },
];

interface FeedFilterProps {
  activeCategory: string;
  onChange: (category: string) => void;
}

export function FeedFilter({ activeCategory, onChange }: FeedFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
            activeCategory === cat.id
              ? "bg-violet-primary text-white shadow-violet"
              : "bg-violet-surface border border-violet-border text-violet-200 hover:border-violet-primary/50"
          )}
        >
          <span>{cat.emoji}</span>
          <span>{cat.label}</span>
        </button>
      ))}
    </div>
  );
}
