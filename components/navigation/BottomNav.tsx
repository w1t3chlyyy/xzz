"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Inbox, FolderKanban, User, Plus, Briefcase, Users, MessageCircle, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/providers/AppProvider";

export function BottomNav() {
  const pathname = usePathname();
  const { role, unread: totalUnread, user } = useApp();
  const isExecutor = role === "executor";

  const navItems = isExecutor
    ? [
        { href: "/feed", label: "Заявки", icon: Inbox, isCenter: false },
        { href: "/responses", label: "Отклики", icon: FolderKanban, isCenter: false },
        { href: "/chats", label: "Чаты", icon: MessageCircle, isCenter: true },
        { href: "/portfolio", label: "Резюме", icon: Briefcase, isCenter: false },
        { href: "/profile", label: "Профиль", icon: User, isCenter: false },
      ]
    : [
        { href: "/feed", label: "Специалисты", icon: Users, isCenter: false },
        { href: "/responses", label: "Заказы", icon: FolderKanban, isCenter: false },
        { href: "/chats", label: "Чаты", icon: MessageCircle, isCenter: true },
        { href: "/orders/new", label: "Создать", icon: Plus, isCenter: false },
        { href: "/profile", label: "Профиль", icon: User, isCenter: false },
      ];

  const active = (href: string) => pathname === href || (href !== "/feed" && pathname.startsWith(href));

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    try { localStorage.removeItem("1337_me"); } catch {}
    window.location.href = "/";
  };

  return (
    <>
      {/* Десктоп: боковая панель */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-white border-r border-slate-200/80 p-5 z-40">
        <Link href="/" className="font-heading text-2xl tracking-tight mb-8 px-1">1337</Link>
        <nav className="space-y-1.5 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-bold transition-colors", active(item.href) ? "bg-purple-100 text-violet-700" : "text-slate-600 hover:bg-slate-50")}>
                <Icon className="w-[18px] h-[18px]" />
                <span className="flex-1">{item.label}</span>
                {item.isCenter && totalUnread > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">{totalUnread > 99 ? "99+" : totalUnread}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-100 pt-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-700 text-white font-bold text-sm flex items-center justify-center">{(user.first_name || "U")[0]}</div>
          <div className="flex-1 min-w-0 text-xs font-extrabold truncate">{user.first_name || "Пользователь"}</div>
          <button onClick={logout} title="Выйти" className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50"><LogOut className="w-4 h-4" /></button>
        </div>
      </aside>

      {/* Мобильные: нижнее меню */}
      <nav className="lg:hidden fixed bottom-[max(env(safe-area-inset-bottom,0px),0.75rem)] left-0 right-0 z-50 px-3 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-full shadow-[0_12px_40px_rgba(124,58,237,0.14)] px-2.5 py-1.5 flex items-center justify-between">
          {navItems.map((item) => {
            const Icon = item.icon;
            const on = active(item.href);
            if (item.isCenter) {
              return (
                <Link key={item.href} href={item.href} className="flex flex-col items-center py-0.5 px-1.5 min-w-[62px]">
                  <motion.div whileTap={{ scale: 0.92 }} className={cn("w-11 h-8 rounded-full flex items-center justify-center relative text-white bg-gradient-to-tr from-violet-600 to-indigo-600", on && "ring-2 ring-violet-300")}>
                    <Icon className="w-5 h-5 stroke-[2.2]" />
                    {totalUnread > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9.5px] font-black flex items-center justify-center border-2 border-white">{totalUnread > 99 ? "99+" : totalUnread}</span>}
                  </motion.div>
                  <span className="text-[10px] font-extrabold text-violet-700 mt-0.5">Чаты</span>
                </Link>
              );
            }
            return (
              <Link key={item.href} href={item.href} className={cn("flex flex-col items-center py-1 px-2.5 min-w-[54px]", on ? "text-violet-700" : "text-slate-500")}>
                <div className={cn("w-9 h-7 rounded-full flex items-center justify-center", on && "bg-purple-100 border border-purple-200")}>
                  <Icon className="w-[18px] h-[18px]" />
                </div>
                <span className={cn("text-[10px] mt-0.5", on ? "font-extrabold" : "font-medium")}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
