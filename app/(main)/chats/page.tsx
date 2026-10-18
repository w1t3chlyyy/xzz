"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Search,
  MoreVertical,
  Send,
  Mic,
  Image as ImageIcon,
  Smile,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Check,
  CheckCheck,
  Play,
  Pause,
  AlertTriangle,
  Headphones,
  FileText,
  Lock,
  Unlock,
  Sparkles,
  DollarSign,
  Plus,
  X,
  CreditCard,
  MessageCircle,
  Flag,
  Trash2,
  Clock,
  Radio,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ChatDialog,
  ChatMessage,
  DealInfo,
  getStoredDialogs,
  saveStoredDialogs,
  getOrCreateDialog,
} from "@/lib/chats";
import { addSupportTicket, getSupportAgents, isUserAdmin } from "@/lib/admin";
import { getTelegramUser } from "@/lib/telegram/webapp";

const QUICK_EMOJIS = ["👍", "❤️", "🔥", "🎉", "🚀", "🤝", "👏", "😊", "⚡️", "💼", "👌", "💯"];

const SAMPLE_MEDIA = [
  {
    title: "Макет интерфейса (Figma)",
    url: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=80",
    type: "image" as const,
  },
  {
    title: "Обзор функционала WebApp",
    url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80",
    type: "image" as const,
  },
  {
    title: "Архитектура базы данных",
    url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80",
    type: "image" as const,
  },
];

function ChatsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Role: client or executor
  const [currentRole, setCurrentRole] = useState<"client" | "executor">("client");
  const [dialogs, setDialogs] = useState<ChatDialog[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Messenger message inputs
  const [inputText, setInputText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showThreeDotsMenu, setShowThreeDotsMenu] = useState(false);

  // Voice message simulation
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Watermark selection state for executor media
  const [watermarkChoiceMedia, setWatermarkChoiceMedia] = useState<{ url: string; type: "image" | "video" } | null>(null);
  const [showWatermarkWarningModal, setShowWatermarkWarningModal] = useState(false);

  // Deal creation & payment states
  const [showDealModal, setShowDealModal] = useState(false);
  const [dealTitle, setDealTitle] = useState("");
  const [dealAmount, setDealAmount] = useState("");
  const [dealDays, setDealDays] = useState("5");
  const [dealDescription, setDealDescription] = useState("");

  // Payment confirmation & celebration modal
  const [paymentPendingDeal, setPaymentPendingDeal] = useState<DealInfo | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationDealTitle, setCelebrationDealTitle] = useState("");

  // Support & Escrow info modals
  const [showEscrowInfoModal, setShowEscrowInfoModal] = useState(false);
  const [supportConnected, setSupportConnected] = useState(false);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Initial Load and Role Determination
  useEffect(() => {
    const savedRole = (localStorage.getItem("1337_role") || localStorage.getItem("fiolet_role") || "client") as
      | "client"
      | "executor";
    setCurrentRole(savedRole);

    const loadedDialogs = getStoredDialogs();
    setDialogs(loadedDialogs);

    // Check if query params ask to open a specific chat or user
    const chatIdParam = searchParams.get("chatId");
    const nameParam = searchParams.get("name") || searchParams.get("clientName");
    const orderTitleParam = searchParams.get("orderTitle");

    if (chatIdParam) {
      const found = loadedDialogs.find((d) => d.id === chatIdParam);
      if (found) {
        setActiveChatId(found.id);
        return;
      }
    }

    if (nameParam) {
      // Find or create dialog with this person (ONLY name used!)
      const targetRole = savedRole === "client" ? "executor" : "client";
      const dialog = getOrCreateDialog({
        participantName: nameParam,
        participantRole: targetRole,
        orderTitle: orderTitleParam || "Обсуждение проекта",
      });
      setDialogs(getStoredDialogs());
      setActiveChatId(dialog.id);
    }
  }, [searchParams]);

  // Scroll to bottom on active chat or new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChatId, dialogs]);

  // Voice recording timer
  useEffect(() => {
    if (isRecordingVoice) {
      setRecordingSeconds(0);
      voiceTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    }
    return () => {
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    };
  }, [isRecordingVoice]);

  const activeDialog = dialogs.find((d) => d.id === activeChatId) || null;

  // Filtered dialogs for search
  const filteredDialogs = dialogs.filter(
    (d) =>
      d.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.orderTitle && d.orderTitle.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    // Mark as read
    const updated = dialogs.map((d) => (d.id === chatId ? { ...d, unreadCount: 0 } : d));
    setDialogs(updated);
    saveStoredDialogs(updated);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeDialog) return;

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderRole: currentRole,
      senderName: currentRole === "client" ? "Заказчик" : "Исполнитель",
      type: "text",
      text: inputText.trim(),
      createdAt: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      status: "sent",
    };

    const updatedDialogs = dialogs.map((d) => {
      if (d.id === activeDialog.id) {
        return {
          ...d,
          lastMessageTime: newMessage.createdAt,
          messages: [...d.messages, newMessage],
        };
      }
      return d;
    });

    setDialogs(updatedDialogs);
    saveStoredDialogs(updatedDialogs);
    setInputText("");
    setShowEmojiPicker(false);
  };

  // Send Voice Message
  const handleStopAndSendVoice = () => {
    if (!activeDialog) return;
    setIsRecordingVoice(false);

    const durationMin = Math.floor(recordingSeconds / 60);
    const durationSec = recordingSeconds % 60;
    const durationFormatted = `${durationMin}:${durationSec < 10 ? "0" : ""}${durationSec}`;

    const newVoice: ChatMessage = {
      id: `msg-voice-${Date.now()}`,
      senderRole: currentRole,
      senderName: currentRole === "client" ? "Заказчик" : "Исполнитель",
      type: "voice",
      voiceDuration: durationFormatted || "0:06",
      text: "Голосовое сообщение",
      createdAt: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      status: "sent",
    };

    const updated = dialogs.map((d) => {
      if (d.id === activeDialog.id) {
        return {
          ...d,
          lastMessageTime: newVoice.createdAt,
          messages: [...d.messages, newVoice],
        };
      }
      return d;
    });

    setDialogs(updated);
    saveStoredDialogs(updated);
  };

  // Executor Media Sending with 1337 Watermark Rule
  const handleSelectMediaForSend = (media: { url: string; type: "image" | "video" }) => {
    setShowMediaPicker(false);
    if (currentRole === "executor") {
      // By default, executor sends with watermark. We show the option dialog to verify
      setWatermarkChoiceMedia(media);
    } else {
      // Client sends directly
      sendMediaMessage(media.url, media.type, false);
    }
  };

  const sendMediaMessage = (url: string, type: "image" | "video", isWatermarked: boolean) => {
    if (!activeDialog) return;

    const newMediaMsg: ChatMessage = {
      id: `msg-media-${Date.now()}`,
      senderRole: currentRole,
      senderName: currentRole === "client" ? "Заказчик" : "Исполнитель",
      type: type,
      mediaUrl: url,
      mediaType: type,
      isWatermarked: isWatermarked,
      text: isWatermarked
        ? "🔒 Черновик с водяным знаком 1337. Оригинал доступен после оплаты безопасной сделки."
        : "Материал проекта без водяного знака",
      createdAt: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      status: "sent",
    };

    const updated = dialogs.map((d) => {
      if (d.id === activeDialog.id) {
        return {
          ...d,
          lastMessageTime: newMediaMsg.createdAt,
          messages: [...d.messages, newMediaMsg],
        };
      }
      return d;
    });

    setDialogs(updated);
    saveStoredDialogs(updated);
    setWatermarkChoiceMedia(null);
    setShowWatermarkWarningModal(false);
  };

  // Client creates a Deal ("Оформить заказ / сделку")
  const handleCreateDealSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealTitle.trim() || !dealAmount.trim() || !activeDialog) return;

    const amountNum = parseInt(dealAmount.replace(/\D/g, "")) || 30000;

    const newDeal: DealInfo = {
      id: `deal-${Date.now()}`,
      title: dealTitle.trim(),
      amount: amountNum,
      days: parseInt(dealDays) || 5,
      description: dealDescription.trim(),
      status: "pending_approval",
      createdAt: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
    };

    const dealMessage: ChatMessage = {
      id: `msg-deal-${Date.now()}`,
      senderRole: "client",
      senderName: "Заказчик",
      type: "deal",
      createdAt: newDeal.createdAt,
      status: "sent",
      deal: newDeal,
    };

    const updated = dialogs.map((d) => {
      if (d.id === activeDialog.id) {
        return {
          ...d,
          orderTitle: newDeal.title,
          lastMessageTime: dealMessage.createdAt,
          messages: [...d.messages, dealMessage],
        };
      }
      return d;
    });

    setDialogs(updated);
    saveStoredDialogs(updated);
    setShowDealModal(false);
    setDealTitle("");
    setDealAmount("");
    setDealDescription("");
  };

  // Executor approves or rejects the deal
  const handleExecutorDealDecision = (messageId: string, approve: boolean) => {
    if (!activeDialog) return;

    const updated = dialogs.map((d) => {
      if (d.id === activeDialog.id) {
        const msgs = d.messages.map((m) => {
          if (m.id === messageId && m.deal) {
            return {
              ...m,
              deal: {
                ...m.deal,
                status: (approve ? "waiting_payment" : "rejected") as DealInfo["status"],
              },
            };
          }
          return m;
        });

        // Add automatic system notification in chat
        const notificationMsg: ChatMessage = {
          id: `msg-sys-${Date.now()}`,
          senderRole: "system",
          senderName: "1337 Гарант",
          type: "system",
          text: approve
            ? `✅ Исполнитель одобрил условия сделки! Заказчику доступна кнопка оплаты для холдирования средств в безопасной сделке 1337.`
            : `❌ Исполнитель отклонил текущие условия сделки. Вы можете обсудить правки в чате и предложить новые параметры.`,
          createdAt: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
          status: "read",
        };

        return {
          ...d,
          messages: [...msgs, notificationMsg],
        };
      }
      return d;
    });

    setDialogs(updated);
    saveStoredDialogs(updated);
  };

  // Client confirms payment (Escrow Hold)
  const handleConfirmPayment = () => {
    if (!paymentPendingDeal || !activeDialog) return;

    const dealTitle = paymentPendingDeal.title;
    const dealAmount = paymentPendingDeal.amount;

    // Update deal to paid_escrow
    const updated = dialogs.map((d) => {
      if (d.id === activeDialog.id) {
        const msgs = d.messages.map((m) => {
          if (m.deal?.id === paymentPendingDeal.id) {
            return {
              ...m,
              deal: {
                ...m.deal,
                status: "paid_escrow" as const,
                paidAt: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
              },
            };
          }
          return m;
        });

        // Add payment success celebration message in chat
        const successMessage: ChatMessage = {
          id: `msg-paid-${Date.now()}`,
          senderRole: "system",
          senderName: "1337 Гарант",
          type: "deal_paid",
          text: `🎉 Заказ успешно оплачен! Средства ${dealAmount.toLocaleString()} ₽ зарезервированы на гарантийном депозите биржи 1337. Исполнитель приступил к выполнению работы.`,
          createdAt: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
          status: "read",
        };

        return {
          ...d,
          messages: [...msgs, successMessage],
        };
      }
      return d;
    });

    setDialogs(updated);
    saveStoredDialogs(updated);
    setPaymentPendingDeal(null);
    setCelebrationDealTitle(dealTitle);
    setShowCelebration(true);

    setTimeout(() => {
      setShowCelebration(false);
    }, 4500);
  };

  // Connect Support operator into the chat (Real human agent & admin notification)
  const handleConnectSupport = async () => {
    if (!activeDialog) return;
    setShowThreeDotsMenu(false);
    setSupportConnected(true);

    const tg = getTelegramUser();
    const currentUserName = tg?.displayName || (currentRole === "client" ? "Заказчик" : "Исполнитель");
    const activeAgents = getSupportAgents().filter((a) => a.isActive);
    const assignedAgent = activeAgents[0]?.name || "Константин";

    // 1. Send live alert to admin in Telegram bot
    try {
      await fetch("/api/support/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: activeDialog.id,
          userName: currentUserName,
          orderTitle: activeDialog.orderTitle || "Консультация",
          userTelegramId: tg?.id || null,
          problemText: "Запрос подключения агента поддержки в диалог",
        }),
      });
    } catch (e) {
      console.warn("Failed to notify admin via bot API:", e);
    }

    // 2. Record ticket for Support Agents & Admin panel
    addSupportTicket({
      chatId: activeDialog.id,
      userName: currentUserName,
      userTelegramId: tg?.id || undefined,
      orderTitle: activeDialog.orderTitle || "Консультация",
      problemText: "Запрос подключения агента поддержки в диалог",
      assignedAgentName: assignedAgent,
    });

    // 3. Post system message to the chat
    const supportJoinMsg: ChatMessage = {
      id: `msg-sup-join-${Date.now()}`,
      senderRole: "system",
      senderName: "1337 Служба Заботы",
      type: "system",
      text: `🎧 Запрос передан дежурному агенту поддержки (${assignedAgent}). Администратор уведомлен в Telegram-боте. Реальный специалист службы заботы 1337 скоро подключится к диалогу.`,
      createdAt: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      status: "read",
    };

    const updated = dialogs.map((d) => {
      if (d.id === activeDialog.id) {
        return {
          ...d,
          messages: [...d.messages, supportJoinMsg],
        };
      }
      return d;
    });

    setDialogs(updated);
    saveStoredDialogs(updated);
  };

  // Clear chat messages
  const handleClearHistory = () => {
    if (!activeDialog) return;
    setShowThreeDotsMenu(false);

    const cleared: ChatMessage = {
      id: `msg-cleared-${Date.now()}`,
      senderRole: "system",
      senderName: "1337",
      type: "system",
      text: "История сообщений очищена. Безопасный чат 1337 активен.",
      createdAt: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      status: "read",
    };

    const updated = dialogs.map((d) => {
      if (d.id === activeDialog.id) {
        return {
          ...d,
          messages: [cleared],
        };
      }
      return d;
    });

    setDialogs(updated);
    saveStoredDialogs(updated);
  };

  return (
    <div className="pb-24 text-slate-900 font-sans">
      {/* 1. CHAT LIST VIEW (When no active chat is selected or back pressed) */}
      {!activeDialog ? (
        <div className="space-y-3.5">
          {/* Header */}
          <div className="flex items-center justify-between pt-1 px-1">
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-violet-600 stroke-[2.3]" />
                <span>Чаты</span>
                <span className="badge-violet text-[11px] font-bold py-0.5 px-2 rounded-lg">
                  {dialogs.length}
                </span>
              </h1>
              <p className="text-slate-500 text-xs font-medium mt-0.5">
                Официальные безопасные диалоги биржи 1337
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200/80 px-2.5 py-1 rounded-xl text-xs font-bold text-violet-700">
              <ShieldCheck className="w-3.5 h-3.5 text-violet-600" />
              <span>Эскроу защита</span>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по имени или задаче..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200/80 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-violet-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Dialogs List */}
          <div className="space-y-2">
            {filteredDialogs.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center space-y-2 shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-violet-600 mx-auto">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">Диалогов пока нет</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Выберите специалиста в ленте или откликнитесь на заказ, чтобы начать общение
                </p>
              </div>
            ) : (
              filteredDialogs.map((dialog) => {
                const lastMsg = dialog.messages[dialog.messages.length - 1];
                let previewText = "Нет сообщений";
                if (lastMsg) {
                  if (lastMsg.type === "voice") previewText = "🎤 Голосовое сообщение";
                  else if (lastMsg.type === "image") previewText = "📷 Фотография / макет";
                  else if (lastMsg.type === "deal") previewText = `💳 Предложение сделки: ${lastMsg.deal?.amount.toLocaleString()} ₽`;
                  else if (lastMsg.type === "deal_paid") previewText = "🎉 Заказ оплачен на эскроу";
                  else previewText = lastMsg.text || "";
                }

                return (
                  <motion.div
                    key={dialog.id}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => handleSelectChat(dialog.id)}
                    className="cursor-pointer bg-white rounded-3xl p-3.5 border border-slate-100/90 shadow-[0_3px_18px_rgba(0,0,0,0.03)] hover:border-violet-300 hover:shadow-violet-500/10 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar with online dot */}
                      <div className="relative shrink-0">
                        {dialog.participantAvatar ? (
                          <div className="w-12 h-12 rounded-2xl overflow-hidden border border-slate-200">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={dialog.participantAvatar}
                              alt={dialog.participantName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-extrabold flex items-center justify-center text-base shadow-sm">
                            {dialog.participantName[0] || "U"}
                          </div>
                        )}
                        {dialog.isOnline && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-400/40" />
                        )}
                      </div>

                      {/* Name & Preview - NO USERNAME DISPLAYED */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-violet-700 transition-colors truncate">
                            {dialog.participantName}
                          </h3>
                          <span className="text-[10px] font-bold text-violet-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-100 shrink-0">
                            {dialog.participantRole === "executor" ? "Специалист" : "Заказчик"}
                          </span>
                        </div>

                        {dialog.orderTitle && (
                          <p className="text-[11px] font-semibold text-violet-600 truncate mt-0.5">
                            {dialog.orderTitle}
                          </p>
                        )}

                        <p className="text-xs text-slate-500 font-medium truncate mt-0.5 line-clamp-1">
                          {previewText}
                        </p>
                      </div>
                    </div>

                    {/* Meta: time & unread badge */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] font-bold text-slate-400">
                        {dialog.lastMessageTime}
                      </span>
                      {dialog.unreadCount > 0 ? (
                        <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                          {dialog.unreadCount}
                        </span>
                      ) : (
                        <CheckCheck className="w-3.5 h-3.5 text-violet-400" />
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* 2. ACTIVE CHAT ROOM VIEW */
        <div className="flex flex-col h-[calc(100vh-120px)] max-h-[820px] bg-white rounded-3xl border border-slate-200/90 shadow-[0_6px_30px_rgba(0,0,0,0.05)] overflow-hidden relative">
          {/* Top Messenger Bar */}
          <div className="p-3 bg-white/95 backdrop-blur-md border-b border-slate-100 flex items-center justify-between gap-2.5 z-20 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setActiveChatId(null)}
                className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-violet-50 text-slate-700 hover:text-violet-700 border border-slate-200 flex items-center justify-center transition-colors shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              {/* Avatar with online pulse */}
              <div className="relative shrink-0">
                {activeDialog.participantAvatar ? (
                  <div className="w-10 h-10 rounded-2xl overflow-hidden border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeDialog.participantAvatar}
                      alt={activeDialog.participantName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-extrabold flex items-center justify-center text-sm shadow-xs">
                    {activeDialog.participantName[0] || "U"}
                  </div>
                )}
                {activeDialog.isOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-400/40" />
                )}
              </div>

              {/* Interlocutor Name & Status (NO USERNAME) */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="font-extrabold text-sm text-slate-900 truncate">
                    {activeDialog.participantName}
                  </h2>
                  <ShieldCheck className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    в сети
                  </span>
                  {activeDialog.orderTitle && (
                    <span className="text-slate-400 truncate max-w-[150px]">
                      • {activeDialog.orderTitle}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Action Icons: Deal button + 3 Dots Menu */}
            <div className="flex items-center gap-1.5 shrink-0 relative">
              {/* Client has direct action to create/propose deal */}
              {currentRole === "client" && (
                <button
                  type="button"
                  onClick={() => setShowDealModal(true)}
                  className="btn-primary py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1 shadow-violet shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Сделка</span>
                </button>
              )}

              {/* 3 Dots Menu Trigger */}
              <button
                type="button"
                onClick={() => setShowThreeDotsMenu(!showThreeDotsMenu)}
                className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-violet-50 text-slate-600 hover:text-violet-700 border border-slate-200 flex items-center justify-center transition-colors"
                title="Опции чата"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* 3 Dots Dropdown Menu */}
              <AnimatePresence>
                {showThreeDotsMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    className="absolute right-0 top-11 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl p-1.5 z-50 text-xs font-semibold text-slate-700 space-y-0.5"
                  >
                    <button
                      type="button"
                      onClick={handleConnectSupport}
                      className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-violet-50 hover:text-violet-700 text-left transition-colors font-bold text-violet-700"
                    >
                      <Headphones className="w-4 h-4" />
                      <span>Подключить поддержку</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowThreeDotsMenu(false);
                        setShowEscrowInfoModal(true);
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 text-left transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Безопасная сделка (Escrow)</span>
                    </button>

                    {currentRole === "client" && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowThreeDotsMenu(false);
                          setShowDealModal(true);
                        }}
                        className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 text-left transition-colors"
                      >
                        <FileText className="w-4 h-4 text-violet-600" />
                        <span>Оформить заказ</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleClearHistory}
                      className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 text-left transition-colors text-slate-500"
                    >
                      <Trash2 className="w-4 h-4 text-slate-400" />
                      <span>Очистить переписку</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowThreeDotsMenu(false);
                        alert("Жалоба передана модераторам 1337. Чат проверяется.");
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-rose-50 text-rose-600 text-left transition-colors"
                    >
                      <Flag className="w-4 h-4" />
                      <span>Пожаловаться</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Escrow Status Banner on Top of Chat */}
          <div className="bg-purple-50/80 border-b border-purple-100/80 px-3.5 py-1.5 flex items-center justify-between text-[11px] font-bold text-violet-800 shrink-0">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-violet-600 shrink-0" />
              <span>Диалог защищен биржей 1337</span>
            </div>
            <span className="text-[10px] text-slate-500 font-semibold">Контакты скрыты</span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#FAF9FD]">
            {activeDialog.messages.map((msg) => {
              const isMine =
                (currentRole === "client" && msg.senderRole === "client") ||
                (currentRole === "executor" && msg.senderRole === "executor");

              // 1. System Notification Message
              if (msg.type === "system") {
                return (
                  <div key={msg.id} className="flex justify-center my-2">
                    <div className="bg-white/95 border border-purple-200/80 text-violet-900 text-[11.5px] font-bold py-1.5 px-3.5 rounded-full shadow-2xs max-w-xs text-center flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                      <span>{msg.text}</span>
                    </div>
                  </div>
                );
              }

              // 2. Deal Paid Celebration Banner Message
              if (msg.type === "deal_paid") {
                return (
                  <div key={msg.id} className="flex justify-center my-3">
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-4 shadow-lg max-w-sm text-center space-y-1.5 border border-emerald-400/30"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center mx-auto text-white">
                        <Sparkles className="w-5 h-5 text-amber-300" />
                      </div>
                      <div className="text-xs font-extrabold">{msg.text}</div>
                      <div className="text-[10px] text-emerald-100 font-semibold">
                        Деньги заморожены на гарантийном счете биржи 1337
                      </div>
                    </motion.div>
                  </div>
                );
              }

              // 3. Support Message
              if (msg.senderRole === "support") {
                return (
                  <div key={msg.id} className="flex items-start gap-2 max-w-[85%]">
                    <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      🎧
                    </div>
                    <div className="bg-white border-2 border-violet-200 rounded-2xl rounded-tl-sm p-3 shadow-sm space-y-1">
                      <div className="flex items-center gap-1.5 text-[10.5px] font-extrabold text-violet-700">
                        <span>Служба заботы 1337</span>
                        <span className="badge-violet text-[9px] font-bold px-1.5 py-0.2 rounded">Официально</span>
                      </div>
                      <p className="text-xs text-slate-800 leading-relaxed font-medium">{msg.text}</p>
                      <span className="text-[9.5px] text-slate-400 font-semibold block text-right">
                        {msg.createdAt}
                      </span>
                    </div>
                  </div>
                );
              }

              // 4. Interactive Deal Card in Chat
              if (msg.type === "deal" && msg.deal) {
                const deal = msg.deal;
                const isPaid = deal.status === "paid_escrow";
                const isWaitingPayment = deal.status === "waiting_payment";
                const isPendingApproval = deal.status === "pending_approval";
                const isRejected = deal.status === "rejected";

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      isMine ? "justify-end" : "justify-start"
                    )}
                  >
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-white rounded-3xl border-2 border-purple-200 shadow-md p-4 max-w-xs sm:max-w-sm space-y-3"
                    >
                      {/* Deal Header */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-8 h-8 rounded-xl bg-purple-100 text-violet-700 flex items-center justify-center">
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-[10px] font-extrabold uppercase tracking-wider text-violet-700">
                              Безопасная сделка
                            </div>
                            <div className="text-xs font-extrabold text-slate-900">
                              {deal.title}
                            </div>
                          </div>
                        </div>

                        <span
                          className={cn(
                            "text-[10px] font-extrabold px-2 py-0.5 rounded-full border shrink-0",
                            isPaid
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : isWaitingPayment
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : isRejected
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-purple-50 text-violet-700 border-purple-200"
                          )}
                        >
                          {isPaid
                            ? "✅ Оплачено"
                            : isWaitingPayment
                            ? "Ожидает оплаты"
                            : isRejected
                            ? "Отклонено"
                            : "На согласовании"}
                        </span>
                      </div>

                      {/* Deal Details */}
                      <div className="bg-slate-50 p-2.5 rounded-2xl space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Сумма гонорара:</span>
                          <span className="font-extrabold text-slate-900 text-sm text-violet-700">
                            {deal.amount.toLocaleString()} ₽
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Срок выполнения:</span>
                          <span className="font-bold text-slate-800">{deal.days} дней</span>
                        </div>
                        {deal.description && (
                          <div className="pt-1 text-[11px] text-slate-600 font-medium border-t border-slate-200/60 mt-1">
                            {deal.description}
                          </div>
                        )}
                      </div>

                      {/* ACTION BUTTONS ACCORDING TO ROLES */}
                      {/* 1. Executor Approves or Rejects */}
                      {currentRole === "executor" && isPendingApproval && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleExecutorDealDecision(msg.id, true)}
                            className="flex-1 btn-primary py-2 rounded-xl text-xs font-extrabold shadow-violet flex items-center justify-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Принять сделку</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExecutorDealDecision(msg.id, false)}
                            className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors"
                          >
                            Отклонить
                          </button>
                        </div>
                      )}

                      {/* 2. Client Pays the Escrow Deposit */}
                      {currentRole === "client" && isWaitingPayment && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => setPaymentPendingDeal(deal)}
                            className="w-full btn-primary py-2.5 rounded-xl text-xs font-extrabold shadow-violet flex items-center justify-center gap-1.5 animate-pulse"
                          >
                            <CreditCard className="w-4 h-4" />
                            <span>Оплатить {deal.amount.toLocaleString()} ₽ (Гарант 1337)</span>
                          </button>
                        </div>
                      )}

                      {/* 3. Deal already Paid */}
                      {isPaid && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2 rounded-xl text-[11px] font-bold text-center flex items-center justify-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>Средства заморожены на гаранте 1337</span>
                        </div>
                      )}

                      <span className="text-[9.5px] text-slate-400 font-semibold block text-right">
                        {deal.createdAt}
                      </span>
                    </motion.div>
                  </div>
                );
              }

              // 5. Standard Text / Voice / Media Bubble
              return (
                <div
                  key={msg.id}
                  className={cn("flex flex-col", isMine ? "items-end" : "items-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-3xl p-3.5 shadow-2xs space-y-1.5 relative",
                      isMine
                        ? "bg-violet-600 text-white rounded-br-sm"
                        : "bg-white text-slate-900 border border-slate-200/80 rounded-bl-sm"
                    )}
                  >
                    {/* Voice Message Bubble */}
                    {msg.type === "voice" && (
                      <div className="flex items-center gap-3 py-1 min-w-[200px]">
                        <button
                          type="button"
                          onClick={() =>
                            setPlayingVoiceId(playingVoiceId === msg.id ? null : msg.id)
                          }
                          className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95",
                            isMine ? "bg-white text-violet-700" : "bg-violet-600 text-white"
                          )}
                        >
                          {playingVoiceId === msg.id ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>

                        <div className="flex-1 space-y-1">
                          {/* Animated Voice Waveform Bars */}
                          <div className="flex items-center gap-0.5 h-6">
                            {[4, 9, 14, 8, 18, 12, 16, 7, 13, 10, 15, 6, 12, 17, 8, 11].map(
                              (barHeight, idx) => (
                                <div
                                  key={idx}
                                  className={cn(
                                    "w-1 rounded-full transition-all",
                                    isMine ? "bg-white/80" : "bg-violet-500",
                                    playingVoiceId === msg.id ? "animate-pulse" : "opacity-70"
                                  )}
                                  style={{ height: `${barHeight}px` }}
                                />
                              )
                            )}
                          </div>
                          <div
                            className={cn(
                              "text-[10px] font-bold flex items-center justify-between",
                              isMine ? "text-purple-200" : "text-slate-400"
                            )}
                          >
                            <span>{msg.voiceDuration || "0:15"}</span>
                            <span>Голосовое</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Media Image / Video with Watermark Protection for Executor */}
                    {msg.mediaUrl && (
                      <div className="space-y-1.5">
                        <div
                          className="relative rounded-2xl overflow-hidden cursor-pointer group"
                          onClick={() => setSelectedPhotoPreview(msg.mediaUrl || null)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={msg.mediaUrl}
                            alt="Медиа проекта"
                            className={cn(
                              "w-full max-h-60 object-cover rounded-2xl transition-transform group-hover:scale-102",
                              msg.isWatermarked && "select-none pointer-events-none"
                            )}
                          />

                          {/* REPEATING WATERMARK OVERLAY WHEN IS_WATERMARKED */}
                          {msg.isWatermarked && (
                            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] flex flex-col justify-between p-3 select-none pointer-events-none">
                              {/* Top Watermark Badge */}
                              <div className="flex items-center justify-between">
                                <span className="bg-black/80 text-white font-extrabold text-[9.5px] px-2 py-0.5 rounded-md flex items-center gap-1 border border-white/20">
                                  <Lock className="w-3 h-3 text-amber-400" />
                                  <span>1337 PROTECTED</span>
                                </span>
                                <span className="text-[9px] text-white/90 font-bold bg-violet-600/90 px-1.5 py-0.5 rounded">
                                  ЧЕРНОВИК
                                </span>
                              </div>

                              {/* Diagonal Embossed Text across Image */}
                              <div className="text-center transform -rotate-12 select-none">
                                <div className="text-white/60 font-black text-xl tracking-widest drop-shadow-md">
                                  1337 FREELANCE
                                </div>
                                <div className="text-white/40 font-bold text-[10px] tracking-wider">
                                  ЗАЩИТА СДЕЛКИ • НЕ ОПЛАЧЕНО
                                </div>
                              </div>

                              {/* Bottom Watermark Notice */}
                              <div className="bg-black/70 rounded-lg p-1 text-[9px] text-white/90 text-center font-bold">
                                Оригинал доступен после оплаты через безопасную сделку
                              </div>
                            </div>
                          )}
                        </div>

                        {msg.text && (
                          <p
                            className={cn(
                              "text-xs leading-relaxed font-medium pt-1",
                              isMine ? "text-white" : "text-slate-800"
                            )}
                          >
                            {msg.text}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Standard Text Message */}
                    {msg.type === "text" && (
                      <p
                        className={cn(
                          "text-xs leading-relaxed font-medium whitespace-pre-wrap break-words",
                          isMine ? "text-white" : "text-slate-800"
                        )}
                      >
                        {msg.text}
                      </p>
                    )}

                    {/* Footer: Time & Read ticks */}
                    <div
                      className={cn(
                        "flex items-center justify-end gap-1 text-[9.5px] font-semibold pt-0.5",
                        isMine ? "text-purple-200" : "text-slate-400"
                      )}
                    >
                      <span>{msg.createdAt}</span>
                      {isMine && <CheckCheck className="w-3 h-3 text-purple-200" />}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Emoji Popover */}
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="p-2.5 bg-white border-t border-slate-200 flex flex-wrap gap-1.5 shrink-0"
              >
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setInputText((prev) => prev + emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-base transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Media Picker Popover */}
          <AnimatePresence>
            {showMediaPicker && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="p-3 bg-white border-t border-slate-200 space-y-2 shrink-0"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-violet-600" />
                    <span>Выберите файл или макет для отправки</span>
                  </span>
                  <button
                    onClick={() => setShowMediaPicker(false)}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {SAMPLE_MEDIA.map((m, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectMediaForSend(m)}
                      className="group text-left space-y-1 p-1 rounded-xl hover:bg-violet-50 transition-colors"
                    >
                      <div className="w-full h-16 rounded-xl overflow-hidden border border-slate-200 group-hover:border-violet-400">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={m.url} alt={m.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="text-[10px] font-bold text-slate-700 truncate">{m.title}</div>
                    </button>
                  ))}
                </div>

                {currentRole === "executor" && (
                  <div className="text-[10.5px] font-bold text-violet-700 bg-purple-50 p-2 rounded-xl flex items-center gap-1.5 border border-purple-100">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Файлы отправляются с водяным знаком 1337 для защиты вашего гонорара</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messenger Bottom Input Bar */}
          <div className="p-2.5 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0">
            {/* If voice recording is in progress */}
            {isRecordingVoice ? (
              <div className="flex-1 flex items-center justify-between bg-rose-50 border border-rose-200 rounded-2xl px-3 py-2 text-rose-700">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span>Идет запись... {recordingSeconds}с</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRecordingVoice(false)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleStopAndSendVoice}
                    className="btn-primary py-1 px-3 rounded-xl text-xs font-bold shadow-xs"
                  >
                    Отправить
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Media Picker Button */}
                <button
                  type="button"
                  onClick={() => setShowMediaPicker(!showMediaPicker)}
                  className="w-9 h-9 rounded-xl text-slate-400 hover:text-violet-600 hover:bg-violet-50 flex items-center justify-center transition-colors shrink-0"
                  title="Прикрепить файл / фото"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>

                {/* Emoji Button */}
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="w-9 h-9 rounded-xl text-slate-400 hover:text-violet-600 hover:bg-violet-50 flex items-center justify-center transition-colors shrink-0"
                  title="Эмодзи"
                >
                  <Smile className="w-4 h-4" />
                </button>

                {/* Text input form */}
                <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Напишите сообщение..."
                    className="w-full py-2 px-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-violet-500 focus:bg-white transition-all"
                  />

                  {inputText.trim() ? (
                    <button
                      type="submit"
                      className="w-9 h-9 rounded-xl btn-primary flex items-center justify-center text-white shrink-0 shadow-violet"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsRecordingVoice(true)}
                      className="w-9 h-9 rounded-xl bg-purple-50 hover:bg-purple-100 text-violet-700 border border-purple-200 flex items-center justify-center shrink-0 transition-colors"
                      title="Записать голосовое"
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  )}
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* 3. EXECUTOR WATERMARK CHOICE MODAL */}
      <AnimatePresence>
        {watermarkChoiceMedia && !showWatermarkWarningModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200"
            >
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-violet-700 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">Защита материалов 1337</h3>
                <p className="text-xs text-slate-500">
                  Как отправить файл заказчику? Биржа рекомендует защиту водяным знаком.
                </p>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() =>
                    sendMediaMessage(watermarkChoiceMedia.url, watermarkChoiceMedia.type, true)
                  }
                  className="w-full btn-primary py-3 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-violet"
                >
                  <Lock className="w-4 h-4" />
                  <span>С водяным знаком 1337 (Безопасно)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowWatermarkWarningModal(true)}
                  className="w-full py-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Отправить без водяного знака
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. WARNING MODAL: REMOVING WATERMARK BEFORE PAYMENT */}
      <AnimatePresence>
        {showWatermarkWarningModal && watermarkChoiceMedia && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-3.5 shadow-2xl border border-rose-200"
            >
              <div className="flex items-center gap-2.5 text-rose-600">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900">Внимание! Риск неоплаты</h3>
                  <p className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">
                    Безопасность сделки
                  </p>
                </div>
              </div>

              <div className="bg-rose-50 border border-rose-200/80 p-3 rounded-2xl text-xs text-rose-900 leading-relaxed font-medium">
                Передача исходных файлов и макетов без водяного знака до внесения оплаты заказчиком
                в эскроу 1337 несет риск кражи работы. Биржа 1337 не сможет гарантировать выплату
                гонорара при отправке оригинала без защиты.
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    sendMediaMessage(watermarkChoiceMedia.url, watermarkChoiceMedia.type, false)
                  }
                  className="w-full py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-sm transition-colors"
                >
                  Я понимаю риски, отправить без защиты
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sendMediaMessage(watermarkChoiceMedia.url, watermarkChoiceMedia.type, true);
                  }}
                  className="w-full btn-primary py-2.5 rounded-2xl text-xs font-extrabold shadow-violet"
                >
                  Оставить водяной знак 1337
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. CLIENT DEAL CREATION MODAL */}
      <AnimatePresence>
        {showDealModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-violet-700 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Оформить сделку</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Безопасная сделка 1337
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDealModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateDealSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Название услуги / задачи *
                  </label>
                  <input
                    type="text"
                    value={dealTitle}
                    onChange={(e) => setDealTitle(e.target.value)}
                    placeholder="Например: Разработка Telegram Mini App"
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-violet-500 focus:bg-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Сумма сделки (₽) *
                    </label>
                    <input
                      type="number"
                      value={dealAmount}
                      onChange={(e) => setDealAmount(e.target.value)}
                      placeholder="45 000"
                      className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-violet-500 focus:bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Срок (дней)
                    </label>
                    <input
                      type="number"
                      value={dealDays}
                      onChange={(e) => setDealDays(e.target.value)}
                      placeholder="5"
                      className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-violet-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Краткое описание требований
                  </label>
                  <textarea
                    value={dealDescription}
                    onChange={(e) => setDealDescription(e.target.value)}
                    placeholder="Укажите ключевые результаты, которые должен предоставить специалист..."
                    rows={3}
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-violet-500 focus:bg-white resize-none"
                  />
                </div>

                <div className="p-2.5 rounded-2xl bg-purple-50 text-violet-800 text-[11px] font-bold border border-purple-100 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-violet-600 shrink-0" />
                  <span>После подтверждения исполнителем вам придет кнопка на оплату</span>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 btn-primary py-3 rounded-2xl text-xs font-extrabold shadow-violet"
                  >
                    Отправить предложение
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDealModal(false)}
                    className="px-4 py-3 rounded-2xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. PAYMENT MODAL STUB (CLIENT CONFIRMS ESCROW DEPOSIT) */}
      <AnimatePresence>
        {paymentPendingDeal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200"
            >
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-violet-700 flex items-center justify-center mx-auto shadow-sm">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Оплата безопасной сделки 1337
                </h3>
                <p className="text-xs text-slate-500">
                  Средства холдируются на гарантийном счете биржи
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Задача:</span>
                  <span className="font-extrabold text-slate-900 text-right truncate max-w-[170px]">
                    {paymentPendingDeal.title}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">К оплате:</span>
                  <span className="font-black text-violet-700 text-base">
                    {paymentPendingDeal.amount.toLocaleString()} ₽
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500 font-medium">Комиссия биржи:</span>
                  <span className="font-bold text-emerald-600">0 ₽ (Бесплатно)</span>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-2xl text-[11px] font-bold text-emerald-800 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Исполнитель получит деньги ТОЛЬКО после того, как вы примете готовую работу без замечаний.
                </span>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  className="w-full btn-primary py-3 rounded-2xl text-xs font-extrabold shadow-violet flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-4 h-4" />
                  <span>Подтвердить оплату {paymentPendingDeal.amount.toLocaleString()} ₽</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentPendingDeal(null)}
                  className="w-full py-2.5 rounded-2xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Вернуться в чат
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. GORGEOUS CELEBRATION ANIMATION POPUP */}
      <AnimatePresence>
        {showCelebration && (
          <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border-2 border-emerald-400 text-center space-y-3 pointer-events-auto max-w-xs relative overflow-hidden"
            >
              {/* Confetti particles */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(16)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ y: -20, opacity: 1, x: 0 }}
                    animate={{
                      y: 200,
                      x: (i % 2 === 0 ? 1 : -1) * (i * 12),
                      opacity: 0,
                      rotate: i * 45,
                    }}
                    transition={{ duration: 2.2, ease: "easeOut" }}
                    className={cn(
                      "w-2.5 h-2.5 rounded-full absolute top-0",
                      i % 4 === 0
                        ? "bg-violet-500"
                        : i % 4 === 1
                        ? "bg-emerald-500"
                        : i % 4 === 2
                        ? "bg-amber-400"
                        : "bg-fuchsia-500"
                    )}
                    style={{ left: `${(i / 16) * 100}%` }}
                  />
                ))}
              </div>

              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900">Сделка успешно оплачена!</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Средства переведены на гарантийный депозитарий 1337. Исполнитель получил уведомление.
                </p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold py-2 px-3 rounded-2xl">
                Гарантия возврата средств 100%
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. ESCROW INFO MODAL */}
      <AnimatePresence>
        {showEscrowInfoModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-3.5 shadow-2xl border border-slate-200"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-violet-600" />
                  <h3 className="text-sm font-extrabold text-slate-900">Безопасная сделка 1337</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEscrowInfoModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed font-medium">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-purple-100 text-violet-700 font-bold flex items-center justify-center shrink-0">
                    1
                  </div>
                  <p>Заказчик предлагает условия и резервирует сумму на гарантийном счете.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-purple-100 text-violet-700 font-bold flex items-center justify-center shrink-0">
                    2
                  </div>
                  <p>Исполнитель выполняет работу, защищая черновики водяным знаком 1337.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-purple-100 text-violet-700 font-bold flex items-center justify-center shrink-0">
                    3
                  </div>
                  <p>После проверки заказчик подтверждает результат — деньги переводятся исполнителю.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowEscrowInfoModal(false)}
                className="w-full btn-primary py-2.5 rounded-2xl text-xs font-extrabold shadow-violet"
              >
                Понятно
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 9. PHOTO FULL PREVIEW LIGHTBOX */}
      <AnimatePresence>
        {selectedPhotoPreview && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setSelectedPhotoPreview(null)}
          >
            <div className="relative max-w-lg w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedPhotoPreview}
                alt="Просмотр"
                className="w-full max-h-[85vh] object-contain rounded-2xl"
              />
              <button
                type="button"
                onClick={() => setSelectedPhotoPreview(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ChatsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
        </div>
      }
    >
      <ChatsContent />
    </Suspense>
  );
}
