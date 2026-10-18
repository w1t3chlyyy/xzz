// lib/chats.ts
"use client";

export interface DealInfo {
  id: string;
  title: string;
  amount: number;
  days: number;
  description?: string;
  status: "pending_approval" | "waiting_payment" | "paid_escrow" | "rejected" | "completed";
  createdAt: string;
  paidAt?: string;
}

export interface ChatMessage {
  id: string;
  senderRole: "client" | "executor" | "support" | "system";
  senderName: string;
  type: "text" | "voice" | "image" | "video" | "deal" | "deal_paid" | "system";
  text?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  isWatermarked?: boolean; // Executor media sent with 1337 protection
  voiceDuration?: string; // e.g. "0:14"
  createdAt: string;
  status: "sent" | "delivered" | "read";
  deal?: DealInfo;
}

export interface ChatDialog {
  id: string;
  participantName: string; // ONLY real name, NO username
  participantRole: "client" | "executor";
  participantAvatar?: string;
  specialty?: string;
  orderId?: string;
  orderTitle?: string;
  isOnline: boolean;
  unreadCount: number;
  lastMessageTime: string;
  messages: ChatMessage[];
}

const CHATS_STORAGE_KEY = "1337_active_chats_v1";

const INITIAL_DIALOGS: ChatDialog[] = [
  {
    id: "chat-1",
    participantName: "Алексей",
    participantRole: "executor",
    participantAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    specialty: "Telegram Mini Apps & React",
    orderTitle: "Telegram Mini App под ключ",
    isOnline: true,
    unreadCount: 1,
    lastMessageTime: "14:20",
    messages: [
      {
        id: "m-1",
        senderRole: "client",
        senderName: "Иван",
        type: "text",
        text: "Здравствуйте! Увидел ваше резюме в ленте. Нужна разработка Telegram Mini App для нашего сервиса.",
        createdAt: "13:45",
        status: "read",
      },
      {
        id: "m-2",
        senderRole: "executor",
        senderName: "Алексей",
        type: "text",
        text: "Добрый день! Да, специализируюсь на WebApp и ботах. Расскажите подробнее про функционал и стек.",
        createdAt: "13:50",
        status: "read",
      },
      {
        id: "m-3",
        senderRole: "executor",
        senderName: "Алексей",
        type: "voice",
        voiceDuration: "0:22",
        text: "Голосовое сообщение с описанием архитектуры",
        createdAt: "13:52",
        status: "read",
      },
      {
        id: "m-4",
        senderRole: "executor",
        senderName: "Алексей",
        type: "image",
        mediaUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80",
        mediaType: "image",
        isWatermarked: true,
        text: "Вот черновой вариант UI дашборда для вашего приложения",
        createdAt: "14:15",
        status: "read",
      },
      {
        id: "m-5",
        senderRole: "executor",
        senderName: "Алексей",
        type: "text",
        text: "Черновик отправлен с водяным знаком биржи 1337 для защиты сделки. Готов зафиксировать условия!",
        createdAt: "14:20",
        status: "read",
      },
    ],
  },
  {
    id: "chat-2",
    participantName: "Дмитрий",
    participantRole: "client",
    participantAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    specialty: "Заказчик проекта",
    orderTitle: "Telegram-бот с Gemini AI",
    isOnline: true,
    unreadCount: 0,
    lastMessageTime: "Вчера",
    messages: [
      {
        id: "m-201",
        senderRole: "client",
        senderName: "Дмитрий",
        type: "text",
        text: "Приветствую! Готовы взяться за бота с интеграцией нейросети?",
        createdAt: "Вчера 18:02",
        status: "read",
      },
      {
        id: "m-202",
        senderRole: "executor",
        senderName: "Михаил",
        type: "text",
        text: "Здравствуйте! Да, недавно собирал похожий кейс с автоответами и базой на Supabase.",
        createdAt: "Вчера 18:10",
        status: "read",
      },
      {
        id: "m-203",
        senderRole: "client",
        senderName: "Дмитрий",
        type: "deal",
        createdAt: "Вчера 18:30",
        status: "read",
        deal: {
          id: "deal-201",
          title: "Разработка AI-бота на Python с интеграцией Gemini",
          amount: 35000,
          days: 5,
          description: "Бот для автоматической обработки клиентских заявок и записи в Google Таблицу.",
          status: "paid_escrow",
          createdAt: "Вчера 18:30",
          paidAt: "Вчера 19:00",
        },
      },
      {
        id: "m-204",
        senderRole: "system",
        senderName: "1337 Гарант",
        type: "deal_paid",
        text: "🎉 Заказ успешно оплачен! Средства 35 000 ₽ зарезервированы на гарантийном депозите биржи 1337. Исполнитель приступил к разработке.",
        createdAt: "Вчера 19:00",
        status: "read",
      },
    ],
  },
  {
    id: "chat-3",
    participantName: "Елена",
    participantRole: "executor",
    participantAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    specialty: "UI/UX Дизайнер Figma",
    orderTitle: "Дизайн мобильного WebApp",
    isOnline: false,
    unreadCount: 0,
    lastMessageTime: "2 дня назад",
    messages: [
      {
        id: "m-301",
        senderRole: "client",
        senderName: "Иван",
        type: "text",
        text: "Добрый день, Елена! Подскажите, свободна ли для нового проекта?",
        createdAt: "16 окт, 11:15",
        status: "read",
      },
      {
        id: "m-302",
        senderRole: "executor",
        senderName: "Елена",
        type: "text",
        text: "Здравствуйте! Да, со следующего понедельника открыта к новым задачам. Присылайте ТЗ!",
        createdAt: "16 окт, 11:42",
        status: "read",
      },
    ],
  },
];

export function getStoredDialogs(): ChatDialog[] {
  if (typeof window === "undefined") return INITIAL_DIALOGS;
  try {
    const raw = localStorage.getItem(CHATS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(INITIAL_DIALOGS));
      return INITIAL_DIALOGS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_DIALOGS;
  } catch (err) {
    console.warn("Error loading stored chats:", err);
    return INITIAL_DIALOGS;
  }
}

export function saveStoredDialogs(dialogs: ChatDialog[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(dialogs));
  } catch (err) {
    console.warn("Error saving stored chats:", err);
  }
}

export function getOrCreateDialog(params: {
  id?: string;
  participantName: string;
  participantRole: "client" | "executor";
  orderTitle?: string;
  specialty?: string;
}): ChatDialog {
  const dialogs = getStoredDialogs();
  
  // Try to find existing dialog by name or orderTitle
  const existing = dialogs.find(
    (d) =>
      (params.id && d.id === params.id) ||
      (d.participantName === params.participantName && (!params.orderTitle || d.orderTitle === params.orderTitle))
  );

  if (existing) {
    return existing;
  }

  // Create new dialog
  const newDialog: ChatDialog = {
    id: params.id || `chat-${Date.now()}`,
    participantName: params.participantName,
    participantRole: params.participantRole,
    participantAvatar: undefined,
    specialty: params.specialty || (params.participantRole === "executor" ? "Специалист 1337" : "Заказчик"),
    orderTitle: params.orderTitle || "Диалог по заказу",
    isOnline: true,
    unreadCount: 0,
    lastMessageTime: "Сейчас",
    messages: [
      {
        id: `m-${Date.now()}`,
        senderRole: "system",
        senderName: "1337",
        type: "system",
        text: "Безопасный диалог начат. Все контакты скрыты, общение и оплата ведутся только внутри биржи 1337.",
        createdAt: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
        status: "read",
      },
    ],
  };

  const updated = [newDialog, ...dialogs];
  saveStoredDialogs(updated);
  return newDialog;
}
