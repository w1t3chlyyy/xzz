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

export function getCategorySublabel(category: string): string {
  const sublabels: Record<string, string> = {
    programming: "· Telegram-боты и Mini Apps",
    design: "· UI/UX, баннеры и айдентика",
    marketing: "· Трафик, SMM и реклама",
    copywriting: "· Тексты, сценарии и посты",
  };
  return sublabels[category] || "";
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
