// lib/admin.ts
"use client";

export interface SupportAgent {
  id: string;
  telegramId?: number | string;
  name: string;
  role: "lead" | "senior" | "agent";
  shiftStatus: "online" | "away" | "offline";
  isActive: boolean;
  assignedTicketsCount: number;
  addedAt: string;
}

export interface SupportTicket {
  id: string;
  chatId?: string;
  userName: string;
  userTelegramId?: number | string;
  orderTitle?: string;
  problemText?: string;
  status: "open" | "in_progress" | "resolved";
  assignedAgentName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ExchangeSettings {
  commissionPercent: number;
  trialDurationDays: number;
  minOrderBudget: number;
  allowManualCards: boolean;
  allowStars: boolean;
  allowCrypto: boolean;
  welcomeNotice: string;
}

const AGENTS_STORAGE_KEY = "1337_support_agents";
const TICKETS_STORAGE_KEY = "1337_support_tickets";
const SETTINGS_STORAGE_KEY = "1337_exchange_settings";
const ADMIN_MODE_KEY = "1337_is_admin_mode";

export const INITIAL_AGENTS: SupportAgent[] = [
  {
    id: "agent-1",
    telegramId: 789456123,
    name: "Константин",
    role: "lead",
    shiftStatus: "online",
    isActive: true,
    assignedTicketsCount: 4,
    addedAt: "2026-10-10",
  },
  {
    id: "agent-2",
    telegramId: 456123789,
    name: "Анна",
    role: "senior",
    shiftStatus: "online",
    isActive: true,
    assignedTicketsCount: 2,
    addedAt: "2026-10-12",
  },
  {
    id: "agent-3",
    telegramId: 123456789,
    name: "Владислав",
    role: "agent",
    shiftStatus: "away",
    isActive: true,
    assignedTicketsCount: 1,
    addedAt: "2026-10-15",
  },
];

export const INITIAL_SETTINGS: ExchangeSettings = {
  commissionPercent: 0,
  trialDurationDays: 5,
  minOrderBudget: 1000,
  allowManualCards: true,
  allowStars: true,
  allowCrypto: true,
  welcomeNotice: "Официальная биржа 1337: безопасные сделки, защита депозита и поддержка 24/7.",
};

export function isUserAdmin(telegramId?: number | string | null): boolean {
  if (typeof window === "undefined") return false;

  // 1. Explicit admin toggle in localStorage for the owner
  const localAdmin = localStorage.getItem(ADMIN_MODE_KEY);
  if (localAdmin === "true") return true;

  // 2. User role in localStorage
  const savedRole = localStorage.getItem("1337_role") || localStorage.getItem("fiolet_role");
  if (savedRole === "admin") return true;

  // 3. Match Telegram ID with ADMIN_TELEGRAM_ID env
  if (telegramId) {
    const rawEnv = process.env.NEXT_PUBLIC_ADMIN_TELEGRAM_ID || "";
    if (rawEnv) {
      const adminIds = rawEnv.split(",").map((s) => s.trim());
      if (adminIds.includes(String(telegramId))) return true;
    }
  }

  return false;
}

export function setAdminMode(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ADMIN_MODE_KEY, enabled ? "true" : "false");
  if (enabled) {
    localStorage.setItem("1337_role", "admin");
  }
}

// ----------------- AGENTS -----------------
export function getSupportAgents(): SupportAgent[] {
  if (typeof window === "undefined") return INITIAL_AGENTS;
  try {
    const raw = localStorage.getItem(AGENTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(INITIAL_AGENTS));
      return INITIAL_AGENTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_AGENTS;
  } catch {
    return INITIAL_AGENTS;
  }
}

export function saveSupportAgents(agents: SupportAgent[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents));
  } catch (err) {
    console.warn("Failed to save support agents:", err);
  }
}

export function addSupportAgent(agent: Omit<SupportAgent, "id" | "addedAt" | "assignedTicketsCount">): SupportAgent {
  const list = getSupportAgents();
  const newAgent: SupportAgent = {
    ...agent,
    id: `agent-${Date.now()}`,
    assignedTicketsCount: 0,
    addedAt: new Date().toISOString().split("T")[0],
  };
  const updated = [newAgent, ...list];
  saveSupportAgents(updated);
  return newAgent;
}

export function removeSupportAgent(id: string): void {
  const list = getSupportAgents();
  const updated = list.filter((a) => a.id !== id);
  saveSupportAgents(updated);
}

export function toggleSupportAgent(id: string): void {
  const list = getSupportAgents();
  const updated = list.map((a) => (a.id === id ? { ...a, isActive: !a.isActive } : a));
  saveSupportAgents(updated);
}

// ----------------- TICKETS -----------------
export function getSupportTickets(): SupportTicket[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TICKETS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveSupportTickets(tickets: SupportTicket[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(tickets));
  } catch (err) {
    console.warn("Failed to save tickets:", err);
  }
}

export function addSupportTicket(ticket: Omit<SupportTicket, "id" | "createdAt" | "status">): SupportTicket {
  const tickets = getSupportTickets();
  const newTicket: SupportTicket = {
    ...ticket,
    id: `ticket-${Date.now()}`,
    status: "open",
    createdAt: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
  };
  const updated = [newTicket, ...tickets];
  saveSupportTickets(updated);
  return newTicket;
}

export function updateTicketStatus(id: string, status: "open" | "in_progress" | "resolved", agentName?: string): void {
  const tickets = getSupportTickets();
  const updated = tickets.map((t) =>
    t.id === id
      ? {
          ...t,
          status,
          assignedAgentName: agentName || t.assignedAgentName,
          updatedAt: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
        }
      : t
  );
  saveSupportTickets(updated);
}

// ----------------- SETTINGS -----------------
export function getExchangeSettings(): ExchangeSettings {
  if (typeof window === "undefined") return INITIAL_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(INITIAL_SETTINGS));
      return INITIAL_SETTINGS;
    }
    return { ...INITIAL_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return INITIAL_SETTINGS;
  }
}

export function saveExchangeSettings(settings: ExchangeSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn("Failed to save settings:", err);
  }
}
