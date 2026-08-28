"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Plus } from "lucide-react";
import { getCategoryLabel, getCategoryEmoji } from "@/lib/utils";
import Link from "next/link";

const categories = [
  { id: "programming", label: "Программирование", emoji: "💻" },
  { id: "design", label: "Дизайн", emoji: "🎨" },
  { id: "marketing", label: "Маркетинг", emoji: "📈" },
  { id: "copywriting", label: "Копирайтинг", emoji: "✍️" },
];

export default function NewOrderPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !category) return;

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("orders").insert({
        client_id: user.id,
        title,
        description,
        category,
        budget_min: budgetMin ? parseInt(budgetMin) : null,
        budget_max: budgetMax ? parseInt(budgetMax) : null,
        status: "active",
      });

      if (error) throw error;

      router.push("/feed");
      router.refresh();
    } catch (error) {
      console.error("Error creating order:", error);
      alert("Ошибка при создании заказа");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/feed">
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-xl bg-violet-surface border border-violet-border"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
        </Link>
        <h1 className="text-2xl font-bold">Новый заказ</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-violet-200 mb-2">
            Название заказа
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: Разработка сайта на Next.js"
            className="w-full p-3 rounded-xl bg-violet-surface border border-violet-border text-white placeholder-violet-400 focus:border-violet-accent focus:outline-none transition-colors"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-violet-200 mb-2">
            Описание
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Опишите задачу подробно..."
            rows={5}
            className="w-full p-3 rounded-xl bg-violet-surface border border-violet-border text-white placeholder-violet-400 focus:border-violet-accent focus:outline-none transition-colors resize-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-violet-200 mb-2">
            Категория
          </label>
          <div className="grid grid-cols-2 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`
                  p-3 rounded-xl border text-sm font-medium transition-all
                  ${category === cat.id
                    ? "border-violet-accent bg-violet-primary/20 text-violet-accent"
                    : "border-violet-border bg-violet-surface text-violet-200 hover:border-violet-primary/50"
                  }
                `}
              >
                <span className="mr-1">{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-violet-200 mb-2">
            Бюджет (₽)
          </label>
          <div className="flex gap-3">
            <input
              type="number"
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
              placeholder="От"
              className="flex-1 p-3 rounded-xl bg-violet-surface border border-violet-border text-white placeholder-violet-400 focus:border-violet-accent focus:outline-none"
            />
            <input
              type="number"
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
              placeholder="До"
              className="flex-1 p-3 rounded-xl bg-violet-surface border border-violet-border text-white placeholder-violet-400 focus:border-violet-accent focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !title || !description || !category}
          className="w-full btn-primary py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Создаём...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" />
              Создать заказ
            </span>
          )}
        </button>
      </form>
    </div>
  );
}
