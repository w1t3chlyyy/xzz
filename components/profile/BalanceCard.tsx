"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, ArrowUpRight, X, Loader2, Landmark } from "lucide-react";
import { MIN_WITHDRAWAL } from "@/lib/constants";

interface Withdrawal {
  id: string;
  amount: number;
  bank: string;
  status: "pending" | "paid" | "rejected";
  created_at: string;
}

const STATUS = {
  pending: { text: "В обработке", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  paid: { text: "Выплачено", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { text: "Отклонено", cls: "bg-rose-50 text-rose-700 border-rose-200" },
};

export function BalanceCard() {
  const [balance, setBalance] = useState<number | null>(null);
  const [history, setHistory] = useState<Withdrawal[]>([]);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [bank, setBank] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const load = () =>
    fetch("/api/withdrawals", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => {
        setBalance(j.balance);
        setHistory(j.withdrawals);
      })
      .catch(() => setBalance((b) => b ?? 0));

  useEffect(() => {
    void load();
  }, []);

  const canWithdraw = (balance ?? 0) >= MIN_WITHDRAWAL;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, bank, details }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Не удалось отправить заявку");
        return;
      }
      setDone(true);
      setAmount("");
      setDetails("");
      await load();
    } catch {
      setError("Ошибка сети, попробуйте ещё раз");
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setOpen(false);
    setDone(false);
    setError(null);
  };

  return (
    <>
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Баланс</div>
              <div className="text-xl font-extrabold text-slate-900">
                {balance === null ? <Loader2 className="w-5 h-5 animate-spin text-violet-600" /> : `${balance.toLocaleString("ru-RU")} ₽`}
              </div>
            </div>
          </div>
          <button
            onClick={() => setOpen(true)}
            disabled={!canWithdraw}
            className="btn-primary py-2.5 px-4 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 shadow-violet disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Вывести</span>
          </button>
        </div>

        {!canWithdraw && <p className="text-[11px] text-slate-500 font-medium">Вывод доступен от {MIN_WITHDRAWAL} ₽.</p>}

        {history.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            {history.slice(0, 5).map((w) => {
              const st = STATUS[w.status];
              return (
                <div key={w.id} className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-extrabold text-slate-900">{w.amount.toLocaleString("ru-RU")} ₽</span>
                    <span className="text-slate-400 font-medium"> · {w.bank} · {new Date(w.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.cls}`}>{st.text}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold">Вывод средств</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Доступно {(balance ?? 0).toLocaleString("ru-RU")} ₽</p>
                  </div>
                </div>
                <button onClick={close} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {done ? (
                <div className="text-center space-y-3 py-2">
                  <p className="text-sm font-extrabold text-slate-900">Заявка отправлена</p>
                  <p className="text-xs text-slate-500 leading-relaxed">Администратор получил заявку и переведёт деньги на указанные реквизиты. Мы напишем вам в Telegram.</p>
                  <button onClick={close} className="w-full btn-primary py-3 rounded-2xl text-xs font-extrabold">Готово</button>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold mb-1">Сумма, ₽ (от {MIN_WITHDRAWAL}) *</label>
                    <input type="number" min={MIN_WITHDRAWAL} max={balance ?? 0} value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-violet-500" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Банк *</label>
                    <input type="text" value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Например: Сбербанк" maxLength={60} className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-violet-500" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Реквизиты *</label>
                    <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} maxLength={300} placeholder="Номер карты или телефон для СБП, ФИО получателя" className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium resize-none focus:outline-none focus:border-violet-500" required />
                  </div>
                  {error && <p className="text-xs font-bold text-rose-600">{error}</p>}
                  <button type="submit" disabled={busy} className="w-full btn-primary py-3 rounded-2xl text-xs font-extrabold shadow-violet disabled:opacity-50">
                    {busy ? "Отправляем..." : "Отправить заявку"}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
