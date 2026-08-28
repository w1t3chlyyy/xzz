"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { FeedFilter } from "@/components/feed/FeedFilter";
import { OrderCard } from "@/components/orders/OrderCard";
import { ExecutorCard } from "@/components/feed/ExecutorCard";
import { Loader2 } from "lucide-react";

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
  };
}

export default function FeedPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [items, setItems] = useState<(Order | Executor)[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadUserRole();
  }, []);

  useEffect(() => {
    if (userRole) {
      loadItems();
    }
  }, [userRole, activeCategory]);

  async function loadUserRole() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      setUserRole(data?.role || null);
    }
  }

  async function loadItems() {
    setIsLoading(true);

    if (userRole === "client") {
      // Клиент видит исполнителей
      let query = supabase
        .from("users")
        .select(`
          id, first_name, username, avatar_url,
          executor_profiles(skills, bio, rating, completed_orders)
        `)
        .eq("role", "executor");

      if (activeCategory !== "all") {
        query = query.contains("executor_profiles.skills", [activeCategory]);
      }

      const { data, error } = await query;
      if (!error) {
        const executors: Executor[] = (data || []).map((item) => ({
          id: item.id,
          first_name: item.first_name || "",
          username: item.username || "",
          avatar_url: item.avatar_url || null,
          executor_profiles: item.executor_profiles[0] || {
            skills: [],
            bio: "",
            rating: 0,
            completed_orders: 0,
          },
        }));
        setItems(executors);
      }
    } else {
      // Исполнитель видит заказы
      let query = supabase
        .from("orders")
        .select(`
          id, title, description, category, budget_min, budget_max, created_at,
          client:client_id(first_name, username)
        `)
        .eq("status", "active");

      if (activeCategory !== "all") {
        query = query.eq("category", activeCategory);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (!error) {
        const orders: Order[] = (data || []).map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          category: item.category,
          budget_min: item.budget_min,
          budget_max: item.budget_max,
          created_at: item.created_at,
          client: item.client[0] || { first_name: "", username: "" },
        }));
        setItems(orders);
      }
    }

    setIsLoading(false);
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">
          {userRole === "client" ? "Исполнители" : "Заказы"}
        </h1>
      </div>

      <FeedFilter activeCategory={activeCategory} onChange={setActiveCategory} />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-violet-accent animate-spin" />
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <motion.div className="space-y-3">
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                {userRole === "client" ? (
                  <ExecutorCard executor={item as Executor} />
                ) : (
                  <OrderCard order={item as Order} />
                )}
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {!isLoading && items.length === 0 && (
        <div className="text-center py-20 text-violet-300">
          <p>Ничего не найдено</p>
          <p className="text-sm mt-1">Попробуйте изменить фильтр</p>
        </div>
      )}
    </div>
  );
}
