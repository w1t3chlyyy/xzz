import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("ru-RU").format(price);
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    programming: "Программирование",
    design: "Дизайн",
    marketing: "Маркетинг",
    copywriting: "Копирайтинг",
  };
  return labels[category] || category;
}

export function getCategoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    programming: "💻",
    design: "🎨",
    marketing: "📈",
    copywriting: "✍️",
  };
  return emojis[category] || "📋";
}

export function getSubscriptionLabel(tier: string): string {
  const labels: Record<string, string> = {
    free: "Free",
    pro: "Pro",
    ai_pro: "AI Pro",
  };
  return labels[tier] || tier;
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    client: "Заказчик",
    executor: "Исполнитель",
  };
  return labels[role] || role;
}
