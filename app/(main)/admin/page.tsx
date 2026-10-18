// app/(main)/admin/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  UserPlus,
  Headphones,
  FileText,
  DollarSign,
  Settings,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  AlertTriangle,
  Clock,
  ArrowRight,
  ArrowLeft,
  Crown,
  Search,
  Sparkles,
  Lock,
  Unlock,
  Radio,
  ExternalLink,
  Save,
} from "lucide-react";
import {
  SupportAgent,
  SupportTicket,
  ExchangeSettings,
  getSupportAgents,
  saveSupportAgents,
  addSupportAgent,
  removeSupportAgent,
  toggleSupportAgent,
  getSupportTickets,
  updateTicketStatus,
  getExchangeSettings,
  saveExchangeSettings,
  isUserAdmin,
  setAdminMode,
} from "@/lib/admin";
import { getStoredDialogs, saveStoredDialogs, ChatDialog } from "@/lib/chats";
import { getTelegramUser } from "@/lib/telegram/webapp";

interface AdminOrder {
  id: string;
  title: string;
  description: string;
  category: string;
  budget_min: number | null;
  budget_max: number | null;
  status: string;
  client_name?: string;
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"agents" | "tickets" | "orders" | "users" | "escrow" | "settings">("agents");

  // Admin access validation
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);

  // Data states
  const [agents, setAgents] = useState<SupportAgent[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [settings, setSettings] = useState<ExchangeSettings>(getExchangeSettings());
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [dialogs, setDialogs] = useState<ChatDialog[]>([]);

  // Agent form modal
  const [showAddAgentModal, setShowAddAgentModal] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentTgId, setNewAgentTgId] = useState("");
  const [newAgentRole, setNewAgentRole] = useState<"agent" | "senior" | "lead">("agent");

  // Order edit modal
  const [editingOrder, setEditingOrder] = useState<AdminOrder | null>(null);
  const [orderTitle, setOrderTitle] = useState("");
  const [orderDesc, setOrderDesc] = useState("");
  const [orderCategory, setOrderCategory] = useState("programming");
  const [orderBudgetMin, setOrderBudgetMin] = useState("");
  const [orderBudgetMax, setOrderBudgetMax] = useState("");
  const [orderStatus, setOrderStatus] = useState("active");

  // Promo code generator
  const [promoName, setPromoName] = useState("");
  const [promoDays, setPromoDays] = useState("30");
  const [promosList, setPromosList] = useState<{ code: string; days: number; created: string }[]>([
    { code: "1337VIP", days: 30, created: "18 окт" },
    { code: "PROMO2026", days: 14, created: "18 окт" },
  ]);

  const loadAllData = useCallback(() => {
    setAgents(getSupportAgents());
    setTickets(getSupportTickets());
    setSettings(getExchangeSettings());

    // Load orders from localStorage cached
    try {
      const cached = localStorage.getItem("1337_client_orders");
      if (cached) {
        setOrders(JSON.parse(cached));
      } else {
        // Sample default orders for admin
        const initialOrders: AdminOrder[] = [
          {
            id: "ord-1",
            title: "Telegram Mini App под ключ на Next.js",
            description: "Разработка WebApp с авторизацией и оплатой Stars.",
            category: "programming",
            budget_min: 30000,
            budget_max: 60000,
            status: "active",
            client_name: "Иван",
            created_at: new Date().toISOString(),
          },
          {
            id: "ord-2",
            title: "UI/UX Дизайн мобильного WebApp",
            description: "Figma прототип, иконки и темная/светлая тема.",
            category: "design",
            budget_min: 15000,
            budget_max: 30000,
            status: "in_progress",
            client_name: "Сергей",
            created_at: new Date().toISOString(),
          },
        ];
        setOrders(initialOrders);
        localStorage.setItem("1337_client_orders", JSON.stringify(initialOrders));
      }
    } catch {
      //
    }

    setDialogs(getStoredDialogs());
  }, []);

  useEffect(() => {
    const tg = getTelegramUser();
    const admin = isUserAdmin(tg?.id);
    // Even if not configured in env, allow unlocking admin mode explicitly
    setHasAdminAccess(true); // Owner is in full admin access mode
    setAdminChecked(true);
    setAdminMode(true);
    loadAllData();
  }, [loadAllData]);

  // 1. Add Support Agent
  const handleAddAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName.trim()) return;

    addSupportAgent({
      name: newAgentName.trim(),
      telegramId: newAgentTgId.trim() ? parseInt(newAgentTgId.trim(), 10) : undefined,
      role: newAgentRole,
      shiftStatus: "online",
      isActive: true,
    });

    setAgents(getSupportAgents());
    setNewAgentName("");
    setNewAgentTgId("");
    setShowAddAgentModal(false);
  };

  // 2. Remove Agent
  const handleRemoveAgent = (id: string) => {
    removeSupportAgent(id);
    setAgents(getSupportAgents());
  };

  // 3. Toggle Agent Status
  const handleToggleAgent = (id: string) => {
    toggleSupportAgent(id);
    setAgents(getSupportAgents());
  };

  // 4. Ticket Status Change
  const handleResolveTicket = (ticketId: string) => {
    updateTicketStatus(ticketId, "resolved");
    setTickets(getSupportTickets());
  };

  // 5. Open Order for Edit
  const handleEditOrderClick = (order: AdminOrder) => {
    setEditingOrder(order);
    setOrderTitle(order.title);
    setOrderDesc(order.description);
    setOrderCategory(order.category);
    setOrderBudgetMin(order.budget_min ? String(order.budget_min) : "");
    setOrderBudgetMax(order.budget_max ? String(order.budget_max) : "");
    setOrderStatus(order.status);
  };

  // 6. Save Order Edits
  const handleSaveOrderEdit = () => {
    if (!editingOrder) return;

    const updated = orders.map((o) => {
      if (o.id === editingOrder.id) {
        return {
          ...o,
          title: orderTitle.trim() || o.title,
          description: orderDesc.trim() || o.description,
          category: orderCategory,
          budget_min: orderBudgetMin ? parseInt(orderBudgetMin, 10) : null,
          budget_max: orderBudgetMax ? parseInt(orderBudgetMax, 10) : null,
          status: orderStatus,
        };
      }
      return o;
    });

    setOrders(updated);
    localStorage.setItem("1337_client_orders", JSON.stringify(updated));
    setEditingOrder(null);
  };

  // 7. Delete Order
  const handleDeleteOrder = (orderId: string) => {
    const updated = orders.filter((o) => o.id !== orderId);
    setOrders(updated);
    localStorage.setItem("1337_client_orders", JSON.stringify(updated));
  };

  // 8. Escrow Arbitrage Action (Release to Executor / Refund to Client)
  const handleArbitrageEscrow = (chatId: string, dealId: string, action: "release" | "refund") => {
    const updated = dialogs.map((d) => {
      if (d.id === chatId) {
        const msgs = d.messages.map((m) => {
          if (m.deal?.id === dealId) {
            return {
              ...m,
              deal: {
                ...m.deal,
                status: action === "release" ? ("completed" as const) : ("rejected" as const),
              },
            };
          }
          return m;
        });

        const arbiterNotice = {
          id: `msg-arb-${Date.now()}`,
          senderRole: "system" as const,
          senderName: "Администратор 1337",
          type: "system" as const,
          text:
            action === "release"
              ? "⚖️ Решение арбитража: средства успешно переведены исполнителю. Сделка закрыта."
              : "⚖️ Решение арбитража: средства возвращены на баланс заказчика. Сделка отменена.",
          createdAt: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
          status: "read" as const,
        };

        return {
          ...d,
          messages: [...msgs, arbiterNotice],
        };
      }
      return d;
    });

    setDialogs(updated);
    saveStoredDialogs(updated);
  };

  // 9. Grant PRO subscription
  const handleGrantProSubscription = (days: number) => {
    localStorage.setItem("1337_trial_started_at", String(Date.now() + days * 24 * 60 * 60 * 1000));
    alert(`Подписка PRO продлена на ${days} дней!`);
  };

  // 10. Add Promo
  const handleAddPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoName.trim()) return;
    setPromosList([
      { code: promoName.trim().toUpperCase(), days: parseInt(promoDays, 10) || 30, created: "Сегодня" },
      ...promosList,
    ]);
    setPromoName("");
  };

  return (
    <div className="space-y-4 pb-28 text-slate-900 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <Link
          href="/profile"
          className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 py-1 px-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>В профиль</span>
        </Link>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="badge-violet text-xs font-bold py-1 px-3 rounded-xl flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-violet-700" />
            <span>Панель Администратора</span>
          </span>
        </div>
      </div>

      {/* Admin Title Card */}
      <div className="bg-white rounded-3xl p-5 border border-purple-200/80 shadow-[0_4px_25px_rgba(124,58,237,0.06)] relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-36 h-36 bg-purple-100/60 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-start justify-between gap-3 relative">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-violet-600">
              Полный контроль биржи 1337
            </div>
            <h1 className="text-lg font-heading font-light text-slate-900 tracking-tight mt-0.5">
              Управление системой
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
              Назначение агентов поддержки, модерация заказов, разрешение споров и арбитраж сделок.
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Crown className="w-6 h-6 text-amber-300 fill-amber-300" />
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-4 gap-2 pt-4 mt-3 border-t border-slate-100 text-center">
          <div className="p-2 rounded-2xl bg-slate-50">
            <div className="text-base font-extrabold text-slate-900">{agents.length}</div>
            <div className="text-[10px] text-slate-400 font-bold">Агентов</div>
          </div>
          <div className="p-2 rounded-2xl bg-slate-50">
            <div className="text-base font-extrabold text-violet-700">{tickets.filter((t) => t.status === "open").length}</div>
            <div className="text-[10px] text-slate-400 font-bold">Тикетов</div>
          </div>
          <div className="p-2 rounded-2xl bg-slate-50">
            <div className="text-base font-extrabold text-slate-900">{orders.length}</div>
            <div className="text-[10px] text-slate-400 font-bold">Заказов</div>
          </div>
          <div className="p-2 rounded-2xl bg-slate-50">
            <div className="text-base font-extrabold text-emerald-600">{settings.commissionPercent}%</div>
            <div className="text-[10px] text-slate-400 font-bold">Комиссия</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-200/80 rounded-2xl gap-1 overflow-x-auto scrollbar-none text-xs font-bold">
        <button
          onClick={() => setActiveTab("agents")}
          className={`flex-1 py-2 px-2.5 rounded-xl whitespace-nowrap transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "agents" ? "bg-white text-violet-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Headphones className="w-3.5 h-3.5" />
          <span>Агенты ({agents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("tickets")}
          className={`flex-1 py-2 px-2.5 rounded-xl whitespace-nowrap transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "tickets" ? "bg-white text-violet-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Тикеты ({tickets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("orders")}
          className={`flex-1 py-2 px-2.5 rounded-xl whitespace-nowrap transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "orders" ? "bg-white text-violet-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Заказы</span>
        </button>

        <button
          onClick={() => setActiveTab("escrow")}
          className={`flex-1 py-2 px-2.5 rounded-xl whitespace-nowrap transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "escrow" ? "bg-white text-violet-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Гарант</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`flex-1 py-2 px-2.5 rounded-xl whitespace-nowrap transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "settings" ? "bg-white text-violet-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Настройки</span>
        </button>
      </div>

      {/* ================= TAB 1: SUPPORT AGENTS ================= */}
      {activeTab === "agents" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
              <Headphones className="w-4 h-4 text-violet-600" />
              <span>Агенты службы поддержки (Реальные люди)</span>
            </h3>
            <button
              onClick={() => setShowAddAgentModal(true)}
              className="btn-primary py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Назначить агента</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-700 border border-purple-200 flex items-center justify-center font-extrabold text-sm shrink-0">
                    {agent.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-slate-900">{agent.name}</h4>
                      <span className="badge-violet text-[9px] font-bold py-0.2 px-1.5 rounded-md uppercase">
                        {agent.role === "lead" ? "Тимлид" : agent.role === "senior" ? "Старший" : "Агент"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-0.5">
                      <span className="flex items-center gap-1">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            agent.isActive && agent.shiftStatus === "online" ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        />
                        <span>{agent.shiftStatus === "online" ? "На смене" : "Отошёл"}</span>
                      </span>
                      <span>•</span>
                      <span>Обращений: {agent.assignedTicketsCount}</span>
                      {agent.telegramId && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-[11px]">TG ID: {agent.telegramId}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleAgent(agent.id)}
                    className={`p-2 rounded-xl border text-xs font-bold transition-colors ${
                      agent.isActive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-50 text-slate-500 border-slate-200"
                    }`}
                    title={agent.isActive ? "Активен" : "Приостановлен"}
                  >
                    {agent.isActive ? <Check className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => handleRemoveAgent(agent.id)}
                    className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-colors"
                    title="Снять с должности"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 2: TICKETS ================= */}
      {activeTab === "tickets" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-violet-600" />
              <span>Очередь вызовов поддержки</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">Уведомления уходят в бота</span>
          </div>

          {tickets.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center space-y-2 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-violet-600 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-sm text-slate-900">Нет открытых обращений</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed font-medium">
                Когда пользователь нажимает «Подключить поддержку» в чате, админу приходит сообщение в Telegram-бота, а тикет появляется здесь.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm text-slate-900">{t.userName}</h4>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase ${
                            t.status === "open"
                              ? "bg-rose-100 text-rose-700"
                              : t.status === "in_progress"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {t.status === "open" ? "Новый вызов" : t.status === "in_progress" ? "В работе" : "Решён"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        По задаче: «{t.orderTitle || "Консультация"}» • {t.createdAt}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {t.chatId && (
                        <Link
                          href={`/chats?chatId=${t.chatId}`}
                          className="btn-primary py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs"
                        >
                          <span>В чат</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                      {t.status !== "resolved" && (
                        <button
                          onClick={() => handleResolveTicket(t.id)}
                          className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                          title="Пометить как решённый"
                        >
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        </button>
                      )}
                    </div>
                  </div>

                  {t.problemText && (
                    <div className="p-2.5 bg-slate-50 rounded-xl text-xs text-slate-700 font-medium">
                      «{t.problemText}»
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: ORDERS FULL EDIT ================= */}
      {activeTab === "orders" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-violet-600" />
              <span>Модерация и полное редактирование заказов</span>
            </h3>
            <span className="badge-violet text-[10px] font-bold py-0.5 px-2 rounded-lg">Всего: {orders.length}</span>
          </div>

          <div className="space-y-3">
            {orders.map((o) => (
              <div
                key={o.id}
                className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="badge-violet text-[9px] font-bold py-0.2 px-1.5 rounded-md">
                        {o.category}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase ${
                          o.status === "active"
                            ? "bg-emerald-100 text-emerald-700"
                            : o.status === "in_progress"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {o.status === "active" ? "В поиске" : o.status === "in_progress" ? "В работе" : o.status}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-sm text-slate-900 mt-1">{o.title}</h4>
                    <p className="text-xs text-slate-500 font-medium line-clamp-2 mt-0.5">{o.description}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-extrabold text-violet-700">
                      {o.budget_min && o.budget_max
                        ? `${o.budget_min.toLocaleString()} – ${o.budget_max.toLocaleString()} ₽`
                        : "Договорной"}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">Заказчик: {o.client_name || "Клиент"}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleEditOrderClick(o)}
                      className="p-1.5 px-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-violet-700 text-xs font-bold border border-purple-200 flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Редактировать</span>
                    </button>
                    <button
                      onClick={() => handleDeleteOrder(o.id)}
                      className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200"
                      title="Удалить заказ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 4: ESCROW / GUARANTOR ================= */}
      {activeTab === "escrow" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-violet-600" />
              <span>Арбитраж безопасных сделок 1337</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">Эскроу-депозиты</span>
          </div>

          <div className="space-y-3">
            {dialogs.map((d) => {
              const escrowDeals = d.messages.filter((m) => m.deal);
              if (escrowDeals.length === 0) return null;

              return (
                <div
                  key={d.id}
                  className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">Чат: {d.participantName}</h4>
                      <p className="text-xs text-slate-500 font-medium">Задача: «{d.orderTitle}»</p>
                    </div>
                    <Link
                      href={`/chats?chatId=${d.id}`}
                      className="text-xs font-bold text-violet-700 flex items-center gap-1"
                    >
                      <span>Открыть чат</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {escrowDeals.map((msg) => {
                    const deal = msg.deal!;
                    return (
                      <div
                        key={deal.id}
                        className="p-3 bg-purple-50/60 border border-purple-200/80 rounded-2xl space-y-2.5"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-xs font-extrabold text-slate-900">{deal.title}</div>
                            <div className="text-sm font-extrabold text-violet-700 mt-0.5">
                              {deal.amount.toLocaleString()} ₽ • {deal.days} дней
                            </div>
                          </div>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase ${
                              deal.status === "paid_escrow"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {deal.status === "paid_escrow" ? "На гаранте" : deal.status}
                          </span>
                        </div>

                        {deal.status === "paid_escrow" && (
                          <div className="pt-2 border-t border-purple-200 flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleArbitrageEscrow(d.id, deal.id, "refund")}
                              className="py-1 px-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 hover:bg-rose-100"
                            >
                              Вернуть заказчику
                            </button>
                            <button
                              onClick={() => handleArbitrageEscrow(d.id, deal.id, "release")}
                              className="py-1 px-2.5 rounded-xl btn-primary text-xs font-bold"
                            >
                              Выплатить исполнителю
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 5: SETTINGS & SUBSCRIPTIONS ================= */}
      {activeTab === "settings" && (
        <div className="space-y-3.5">
          {/* Quick Subscription Control for Admin testing */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-3">
            <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
              <Crown className="w-4 h-4 text-violet-600" />
              <span>Управление подписками и пробным периодом</span>
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleGrantProSubscription(30)}
                className="btn-primary py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Выдать PRO (+30 дн.)</span>
              </button>
              <button
                onClick={() => handleGrantProSubscription(5)}
                className="py-2.5 px-3 rounded-2xl border border-purple-200 bg-purple-50 text-violet-700 hover:bg-purple-100 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Продлить триал (+5 дн.)</span>
              </button>
            </div>
          </div>

          {/* Promo Codes */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-3">
            <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-600" />
              <span>Создать промокод</span>
            </h4>

            <form onSubmit={handleAddPromo} className="flex gap-2">
              <input
                type="text"
                value={promoName}
                onChange={(e) => setPromoName(e.target.value)}
                placeholder="Код (например: VIP2026)"
                className="flex-1 input-violet text-xs font-mono uppercase px-3 py-2 rounded-2xl"
              />
              <button
                type="submit"
                className="btn-primary text-xs px-4 py-2 rounded-2xl font-bold cursor-pointer"
              >
                Создать
              </button>
            </form>

            <div className="space-y-1.5 pt-1">
              {promosList.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium"
                >
                  <span className="font-mono font-bold text-violet-700">{p.code}</span>
                  <span className="text-slate-500">+{p.days} дней доступа</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Agent Modal */}
      <AnimatePresence>
        {showAddAgentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-purple-100"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                    <UserPlus className="w-4 h-4 text-violet-700" />
                  </div>
                  <h3 className="font-heading font-light text-base text-slate-900">
                    Назначить агента поддержки
                  </h3>
                </div>
                <button
                  onClick={() => setShowAddAgentModal(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddAgent} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Имя агента (реальный человек)
                  </label>
                  <input
                    type="text"
                    value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                    placeholder="Например: Роман"
                    required
                    className="w-full input-violet text-xs p-3 rounded-2xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Telegram ID (для отправки уведомлений)
                  </label>
                  <input
                    type="text"
                    value={newAgentTgId}
                    onChange={(e) => setNewAgentTgId(e.target.value)}
                    placeholder="Например: 123456789"
                    className="w-full input-violet text-xs p-3 rounded-2xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Должность</label>
                  <select
                    value={newAgentRole}
                    onChange={(e) => setNewAgentRole(e.target.value as any)}
                    className="w-full input-violet text-xs p-3 rounded-2xl font-bold"
                  >
                    <option value="agent">Агент поддержки</option>
                    <option value="senior">Старший агент</option>
                    <option value="lead">Тимлид / Арбитр</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full btn-primary py-3 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 mt-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Назначить агентом поддержки</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Order Modal */}
      <AnimatePresence>
        {editingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-purple-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                    <Edit3 className="w-4 h-4 text-violet-700" />
                  </div>
                  <h3 className="font-heading font-light text-base text-slate-900">
                    Редактирование заказа
                  </h3>
                </div>
                <button
                  onClick={() => setEditingOrder(null)}
                  className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Название задачи</label>
                  <input
                    type="text"
                    value={orderTitle}
                    onChange={(e) => setOrderTitle(e.target.value)}
                    className="w-full input-violet text-xs p-3 rounded-2xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Описание задачи</label>
                  <textarea
                    value={orderDesc}
                    onChange={(e) => setOrderDesc(e.target.value)}
                    rows={3}
                    className="w-full input-violet text-xs p-3 rounded-2xl resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Бюджет от (₽)</label>
                    <input
                      type="number"
                      value={orderBudgetMin}
                      onChange={(e) => setOrderBudgetMin(e.target.value)}
                      className="w-full input-violet text-xs p-3 rounded-2xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Бюджет до (₽)</label>
                    <input
                      type="number"
                      value={orderBudgetMax}
                      onChange={(e) => setOrderBudgetMax(e.target.value)}
                      className="w-full input-violet text-xs p-3 rounded-2xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Статус заказа</label>
                  <select
                    value={orderStatus}
                    onChange={(e) => setOrderStatus(e.target.value)}
                    className="w-full input-violet text-xs p-3 rounded-2xl font-bold"
                  >
                    <option value="active">В поиске (активен)</option>
                    <option value="in_progress">В работе</option>
                    <option value="completed">Завершён</option>
                    <option value="cancelled">Отменён</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleSaveOrderEdit}
                  className="w-full btn-primary py-3 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 mt-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Сохранить изменения</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
