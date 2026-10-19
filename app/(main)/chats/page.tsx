"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Search, MoreVertical, Send, ShieldCheck, Headphones, FileText, Sparkles, X, CreditCard,
  MessageCircle, Check, CheckCheck, Loader2, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/providers/AppProvider";
import { getCached, setCached } from "@/lib/cache";
import { openTelegramUrl } from "@/lib/links";
import { SUPPORT_URL } from "@/lib/constants";

interface ChatItem {
  id: string;
  order_id: string | null;
  order_title: string | null;
  unread: number;
  last_message_text: string | null;
  last_message_at: string;
  other: { id: string; first_name: string; avatar_url: string | null; role: string | null };
}

interface Deal {
  title: string;
  amount: number;
  days: number;
  description?: string;
  status: "pending" | "accepted" | "rejected" | "completed";
  proposer_id: string;
  client_id: string;
}

interface Msg {
  id: string;
  sender_id: string | null;
  type: "text" | "deal" | "system";
  text: string | null;
  deal: Deal | null;
  created_at: string;
}

interface ChatMeta {
  id: string;
  order_id: string | null;
  order_title: string | null;
  other: ChatItem["other"];
}

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
const listTime = (iso: string) => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? timeOf(iso)
    : d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
};

const DEAL_STATUS: Record<Deal["status"], { text: string; cls: string }> = {
  pending: { text: "На согласовании", cls: "bg-purple-50 text-violet-700 border-purple-200" },
  accepted: { text: "В работе", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  rejected: { text: "Отклонено", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  completed: { text: "Завершена", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

function Avatar({ name, url, size = 12 }: { name: string; url: string | null; size?: number }) {
  const cls = `w-${size} h-${size} rounded-2xl shrink-0`;
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name} className={`${cls} object-cover border border-slate-200`} />
  ) : (
    <div className={`${cls} bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-extrabold flex items-center justify-center text-sm shadow-sm`}>
      {name[0] || "U"}
    </div>
  );
}

function ChatsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, refresh } = useApp();
  const me = user.id;

  const [list, setList] = useState<ChatItem[] | null>(() => getCached<ChatItem[]>("chats") ?? null);
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [meta, setMeta] = useState<ChatMeta | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dealOpen, setDealOpen] = useState(false);
  const [dealForm, setDealForm] = useState({ title: "", amount: "", days: "5", description: "" });
  const [dealError, setDealError] = useState<string | null>(null);
  const [dealBusy, setDealBusy] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Msg[]>([]);
  messagesRef.current = messages;
  const handledParams = useRef<string>("");

  const loadList = useCallback(async () => {
    try {
      const res = await fetch("/api/chats", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      setCached("chats", json.chats);
      setList(json.chats);
    } catch {
      setList((p) => p ?? []);
    }
  }, []);

  // Открытие чата по параметрам: ?chatId=... или ?user=<id>&order=<id>
  useEffect(() => {
    const key = searchParams.toString();
    if (!key || handledParams.current === key) return;
    handledParams.current = key;

    const chatId = searchParams.get("chatId");
    const otherUser = searchParams.get("user");
    const orderId = searchParams.get("order");

    if (chatId) {
      setActiveId(chatId);
      router.replace("/chats");
    } else if (otherUser) {
      setLoadingChat(true);
      fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ other_user_id: otherUser, order_id: orderId }),
      })
        .then(async (r) => ({ ok: r.ok, json: await r.json() }))
        .then(({ ok, json }) => {
          if (ok) setActiveId(json.chat_id);
          else setOpenError(json.error || "Не удалось открыть чат");
        })
        .catch(() => setOpenError("Ошибка сети"))
        .finally(() => {
          setLoadingChat(false);
          router.replace("/chats");
        });
    }
  }, [searchParams, router]);

  // Список диалогов
  useEffect(() => {
    if (activeId) return;
    void loadList();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void loadList();
    }, 10000);
    return () => clearInterval(t);
  }, [activeId, loadList]);

  // Открытый диалог: первичная загрузка + опрос новых сообщений
  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    setMeta(null);
    setMessages([]);
    setLoadingChat(true);

    fetch(`/api/chats/${activeId}`, { cache: "no-store" })
      .then(async (r) => ({ ok: r.ok, json: await r.json() }))
      .then(({ ok, json }) => {
        if (cancelled) return;
        if (!ok) {
          setOpenError(json.error || "Чат не найден");
          setActiveId(null);
          return;
        }
        setMeta(json.chat);
        setMessages(json.messages);
        void refresh();
      })
      .catch(() => !cancelled && setOpenError("Ошибка сети"))
      .finally(() => !cancelled && setLoadingChat(false));

    const poll = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      const real = messagesRef.current.filter((m) => !m.id.startsWith("tmp-"));
      const last = real[real.length - 1];
      const url = last ? `/api/chats/${activeId}?after=${encodeURIComponent(last.created_at)}` : `/api/chats/${activeId}`;
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (json.messages?.length) {
          setMessages((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            return [...prev, ...json.messages.filter((m: Msg) => !ids.has(m.id))];
          });
        }
      } catch {
        // следующий тик
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [activeId, refresh]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, activeId]);

  const post = async (body: any) => {
    const res = await fetch(`/api/chats/${activeId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Ошибка");
    return json;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || sending) return;

    const tmp: Msg = { id: `tmp-${Date.now()}`, sender_id: me, type: "text", text: value, deal: null, created_at: new Date().toISOString() };
    setMessages((p) => [...p, tmp]);
    setText("");
    setSending(true);
    try {
      const { message } = await post({ action: "send", text: value });
      setMessages((p) => p.map((m) => (m.id === tmp.id ? message : m)));
    } catch (err: any) {
      setMessages((p) => p.filter((m) => m.id !== tmp.id));
      setText(value);
      setOpenError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleProposeDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    setDealBusy(true);
    setDealError(null);
    try {
      const { message } = await post({
        action: "deal_propose",
        title: dealForm.title,
        amount: dealForm.amount,
        days: dealForm.days,
        description: dealForm.description,
      });
      setMessages((p) => [...p, message]);
      setDealOpen(false);
      setDealForm({ title: "", amount: "", days: "5", description: "" });
    } catch (err: any) {
      setDealError(err.message);
    } finally {
      setDealBusy(false);
    }
  };

  const handleDealDecision = async (messageId: string, decision: "accept" | "reject" | "complete") => {
    try {
      const json = await post({ action: "deal_decision", message_id: messageId, decision });
      setMessages((p) => {
        const updated = p.map((m) => (m.id === messageId ? { ...m, deal: json.deal } : m));
        return json.system && !updated.some((m) => m.id === json.system.id) ? [...updated, json.system] : updated;
      });
    } catch (err: any) {
      setOpenError(err.message);
    }
  };

  const handleSupport = () => {
    setMenuOpen(false);
    fetch("/api/support/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: activeId, problemText: "Запрос поддержки из чата" }),
    }).catch(() => {});
    openTelegramUrl(SUPPORT_URL);
  };

  const closeChat = () => {
    setActiveId(null);
    setMenuOpen(false);
    void refresh();
  };

  const filtered = (list || []).filter(
    (c) =>
      c.other.first_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.order_title || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="pb-24 text-slate-900 font-sans">
      {openError && (
        <div className="mb-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl p-3 flex items-center justify-between gap-2">
          <span>{openError}</span>
          <button onClick={() => setOpenError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {!activeId ? (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between pt-1 px-1">
            <div>
              <h1 className="text-xl font-extrabold flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-violet-600 stroke-[2.3]" />
                <span>Чаты</span>
              </h1>
              <p className="text-slate-500 text-xs font-medium mt-0.5">Диалоги с заказчиками и исполнителями</p>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по имени или задаче..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200/80 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:border-violet-500"
            />
          </div>

          {loadingChat || list === null ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-violet-600 mx-auto">
                <MessageCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-extrabold">Диалогов пока нет</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">Откройте заказ или профиль специалиста и нажмите «В чат».</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((c) => (
                <motion.div
                  key={c.id}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => setActiveId(c.id)}
                  className="cursor-pointer bg-white rounded-3xl p-3.5 border border-slate-100/90 shadow-[0_3px_18px_rgba(0,0,0,0.03)] hover:border-violet-300 transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={c.other.first_name} url={c.other.avatar_url} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-extrabold text-sm truncate">{c.other.first_name}</h3>
                        {c.other.role && (
                          <span className="text-[10px] font-bold text-violet-700 bg-purple-50 px-1.5 rounded border border-purple-100 shrink-0">
                            {c.other.role === "executor" ? "Специалист" : "Заказчик"}
                          </span>
                        )}
                      </div>
                      {c.order_title && <p className="text-[11px] font-semibold text-violet-600 truncate mt-0.5">{c.order_title}</p>}
                      <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{c.last_message_text}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] font-bold text-slate-400">{listTime(c.last_message_at)}</span>
                    {c.unread > 0 ? (
                      <span className="min-w-5 h-5 px-1 rounded-full bg-violet-600 text-white text-[10px] font-extrabold flex items-center justify-center">{c.unread}</span>
                    ) : (
                      <CheckCheck className="w-3.5 h-3.5 text-violet-300" />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col h-[calc(100dvh-140px)] max-h-[820px] bg-white rounded-3xl border border-slate-200/90 shadow-[0_6px_30px_rgba(0,0,0,0.05)] overflow-hidden relative">
          <div className="p-3 bg-white border-b border-slate-100 flex items-center justify-between gap-2.5 z-20 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <button onClick={closeChat} className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-violet-50 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0">
                <ArrowLeft className="w-4 h-4" />
              </button>
              {meta && <Avatar name={meta.other.first_name} url={meta.other.avatar_url} size={10} />}
              <div className="min-w-0">
                <h2 className="font-extrabold text-sm truncate">{meta?.other.first_name || "..."}</h2>
                {meta?.order_title && (
                  <Link href={`/orders/${meta.order_id}`} className="text-[11px] font-semibold text-violet-600 truncate flex items-center gap-1">
                    <span className="truncate max-w-[170px]">{meta.order_title}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </Link>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 relative">
              <button onClick={() => setDealOpen(true)} className="btn-primary py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1 shadow-violet">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Сделка</span>
              </button>
              <button onClick={() => setMenuOpen((v) => !v)} className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-violet-50 text-slate-600 border border-slate-200 flex items-center justify-center">
                <MoreVertical className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    className="absolute right-0 top-11 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl p-1.5 z-50 text-xs font-semibold"
                  >
                    <button onClick={handleSupport} className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-violet-50 text-left font-bold text-violet-700">
                      <Headphones className="w-4 h-4" />
                      <span>Поддержка / пожаловаться</span>
                    </button>
                    {meta?.order_id && (
                      <Link href={`/orders/${meta.order_id}`} className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 text-slate-700">
                        <FileText className="w-4 h-4 text-violet-600" />
                        <span>Открыть заказ</span>
                      </Link>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAF9FD]" onClick={() => setMenuOpen(false)}>
            {loadingChat && messages.length === 0 && (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 text-violet-600 animate-spin" />
              </div>
            )}
            {!loadingChat && messages.length === 0 && (
              <p className="text-center text-xs text-slate-400 font-medium py-10">Напишите первое сообщение</p>
            )}

            {messages.map((msg) => {
              const mine = msg.sender_id === me;

              if (msg.type === "system") {
                return (
                  <div key={msg.id} className="flex justify-center my-2">
                    <div className="bg-white border border-purple-200/80 text-violet-900 text-[11.5px] font-bold py-1.5 px-3.5 rounded-full max-w-xs text-center">{msg.text}</div>
                  </div>
                );
              }

              if (msg.type === "deal" && msg.deal) {
                const d = msg.deal;
                const st = DEAL_STATUS[d.status];
                return (
                  <div key={msg.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div className="bg-white rounded-3xl border-2 border-purple-200 shadow-md p-4 max-w-xs sm:max-w-sm space-y-3">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-purple-100 text-violet-700 flex items-center justify-center shrink-0">
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] font-extrabold uppercase tracking-wider text-violet-700">Предложение сделки</div>
                            <div className="text-xs font-extrabold truncate">{d.title}</div>
                          </div>
                        </div>
                        <span className={cn("text-[10px] font-extrabold px-2 py-0.5 rounded-full border shrink-0", st.cls)}>{st.text}</span>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-2xl space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Сумма:</span>
                          <span className="font-extrabold text-violet-700 text-sm">{d.amount.toLocaleString("ru-RU")} ₽</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Срок:</span>
                          <span className="font-bold">{d.days} дн.</span>
                        </div>
                        {d.description && <div className="pt-1 text-[11px] text-slate-600 font-medium border-t border-slate-200/60 mt-1 whitespace-pre-wrap">{d.description}</div>}
                      </div>

                      {d.status === "pending" && d.proposer_id !== me && (
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleDealDecision(msg.id, "accept")} className="flex-1 btn-primary py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Принять</span>
                          </button>
                          <button onClick={() => handleDealDecision(msg.id, "reject")} className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold">
                            Отклонить
                          </button>
                        </div>
                      )}
                      {d.status === "accepted" && d.client_id === me && (
                        <button onClick={() => handleDealDecision(msg.id, "complete")} className="w-full btn-primary py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Работа выполнена</span>
                        </button>
                      )}
                      <span className="text-[9.5px] text-slate-400 font-semibold block text-right">{timeOf(msg.created_at)}</span>
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
                  <div className={cn("max-w-[85%] rounded-3xl px-3.5 py-2.5 space-y-1", mine ? "bg-violet-600 text-white rounded-br-sm" : "bg-white text-slate-900 border border-slate-200/80 rounded-bl-sm")}>
                    <p className="text-xs leading-relaxed font-medium whitespace-pre-wrap break-words">{msg.text}</p>
                    <div className={cn("text-[9.5px] font-semibold text-right", mine ? "text-purple-200" : "text-slate-400")}>{timeOf(msg.created_at)}</div>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          <form onSubmit={handleSend} className="p-2.5 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={2000}
              placeholder="Напишите сообщение..."
              className="flex-1 py-2.5 px-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:border-violet-500 focus:bg-white"
            />
            <button type="submit" disabled={!text.trim() || sending} className="w-10 h-10 rounded-xl btn-primary flex items-center justify-center text-white shrink-0 shadow-violet disabled:opacity-40">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      <AnimatePresence>
        {dealOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold">Предложить сделку</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Фиксация условий в чате</p>
                </div>
                <button onClick={() => setDealOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleProposeDeal} className="space-y-3">
                <input
                  type="text"
                  value={dealForm.title}
                  onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })}
                  placeholder="Что нужно сделать *"
                  className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-violet-500"
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={1}
                    value={dealForm.amount}
                    onChange={(e) => setDealForm({ ...dealForm, amount: e.target.value })}
                    placeholder="Сумма, ₽ *"
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-violet-500"
                    required
                  />
                  <input
                    type="number"
                    min={1}
                    value={dealForm.days}
                    onChange={(e) => setDealForm({ ...dealForm, days: e.target.value })}
                    placeholder="Срок, дней"
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-violet-500"
                  />
                </div>
                <textarea
                  value={dealForm.description}
                  onChange={(e) => setDealForm({ ...dealForm, description: e.target.value })}
                  rows={3}
                  placeholder="Ключевые результаты и условия"
                  className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium resize-none focus:outline-none focus:border-violet-500"
                />
                {dealError && <p className="text-xs font-bold text-rose-600">{dealError}</p>}
                <button type="submit" disabled={dealBusy} className="w-full btn-primary py-3 rounded-2xl text-xs font-extrabold shadow-violet disabled:opacity-50">
                  {dealBusy ? "Отправляем..." : "Отправить предложение"}
                </button>
              </form>
            </motion.div>
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
          <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
        </div>
      }
    >
      <ChatsContent />
    </Suspense>
  );
}
