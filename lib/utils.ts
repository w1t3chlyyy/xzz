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

// ============================================
// Локальный кэш заказов клиента (для мгновенного отображения в ленте до
// того, как список подтянется из Supabase).
//
// РАНЬШЕ здесь сохранялись записи с id вида "order-169...", сгенерированным
// на клиенте отдельно от настоящего id из Supabase (gen_random_uuid()) —
// из-за этого переход по такой карточке вёл на несуществующую страницу
// заказа ("Заказ не найден"). Это исправлено в app/(main)/orders/new,
// но у пользователей, уже успевших создать заказы ДО фикса, такие битые
// записи остаются в localStorage браузера/Telegram WebView навсегда, пока
// их кто-то не удалит.
//
// getCachedClientOrders() решает это сама: при каждом чтении кэша она
// проверяет, что id — валидный UUID, и молча выбрасывает всё остальное,
// перезаписывая localStorage уже очищенным списком. Ручная чистка кэша
// на телефоне не нужна — самоочистка происходит при первой же загрузке
// ленты после обновления приложения.
// ============================================

const CLIENT_ORDERS_CACHE_KEY = "fiolet_client_orders";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getCachedClientOrders<T extends { id: string }>(): T[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = JSON.parse(localStorage.getItem(CLIENT_ORDERS_CACHE_KEY) || "[]");
    if (!Array.isArray(raw)) return [];

    const valid = raw.filter(
      (o: any) => o && typeof o.id === "string" && UUID_RE.test(o.id)
    ) as T[];

    // Что-то отфильтровали — значит там были заказы с "чужим" локальным id.
    // Перезаписываем кэш очищенным списком, чтобы битые карточки больше не
    // показывались и повторно не засоряли localStorage при каждом чтении.
    if (valid.length !== raw.length) {
      localStorage.setItem(CLIENT_ORDERS_CACHE_KEY, JSON.stringify(valid));
    }

    return valid;
  } catch {
    return [];
  }
}

export function addCachedClientOrder<T extends { id: string }>(order: T): void {
  if (typeof window === "undefined") return;
  const existing = getCachedClientOrders<T>();
  localStorage.setItem(CLIENT_ORDERS_CACHE_KEY, JSON.stringify([order, ...existing]));
}
