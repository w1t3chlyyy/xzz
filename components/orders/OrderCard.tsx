"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, Wallet, User } from "lucide-react";
import { getCategoryLabel, getCategoryEmoji, formatDate } from "@/lib/utils";

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
  const budgetText = order.budget_min && order.budget_max
    ? `${order.budget_min.toLocaleString()} - ${order.budget_max.toLocaleString()} ₽`
    : order.budget_min
    ? `от ${order.budget_min.toLocaleString()} ₽`
    : "Договорная";

  return (
    <Link href={`/orders/${order.id}`}>
      <motion.div
        whileTap={{ scale: 0.98 }}
        className="card-violet p-4 space-y-3"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getCategoryEmoji(order.category)}</span>
            <span className="text-xs font-medium text-violet-accent bg-violet-primary/20 px-2 py-0.5 rounded-full">
              {getCategoryLabel(order.category)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-violet-300 text-xs">
            <Clock className="w-3 h-3" />
            {formatDate(order.created_at)}
          </div>
        </div>

        <h3 className="font-bold text-lg leading-tight">{order.title}</h3>
        <p className="text-violet-200 text-sm line-clamp-2">{order.description}</p>

        <div className="flex items-center justify-between pt-2 border-t border-violet-border">
          <div className="flex items-center gap-1.5 text-sm text-violet-300">
            <User className="w-4 h-4" />
            <span>{order.client.first_name || `@${order.client.username}`}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-green-400">
            <Wallet className="w-4 h-4" />
            <span>{budgetText}</span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
