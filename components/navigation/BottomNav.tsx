"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Inbox, FolderKanban, User, Plus, Briefcase, Users, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/providers/AppProvider";

export function BottomNav() {
  const pathname = usePathname();
  const { role, unread: totalUnread } = useApp();
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

  return (
    <nav className="fixed bottom-[max(env(safe-area-inset-bottom,0px),0.75rem)] left-0 right-0 z-50 px-3 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-full shadow-[0_12px_40px_rgba(124,58,237,0.14)] px-2.5 py-1.5 flex items-center justify-between">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/feed" && pathname.startsWith(item.href));
          const Icon = item.icon;

          if (item.isCenter) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative group flex flex-col items-center justify-center py-0.5 px-1.5 select-none min-w-[62px]"
              >
                <div className="flex flex-col items-center gap-0.5">
                  <motion.div
                    whileTap={{ scale: 0.92 }}
                    className={cn(
                      "w-11 h-8 rounded-full flex items-center justify-center relative shadow-sm transition-all duration-300",
                      isActive
                        ? "bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-violet-500/40 ring-2 ring-violet-300"
                        : "bg-gradient-to-tr from-violet-600/90 to-indigo-600/90 hover:from-violet-600 hover:to-indigo-600 text-white shadow-violet-500/25"
                    )}
                  >
                    <Icon className="w-5 h-5 stroke-[2.2]" />
                    {totalUnread > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 rounded-full bg-rose-500 text-white text-[9.5px] font-black flex items-center justify-center border-2 border-white">
                        {totalUnread > 99 ? "99+" : totalUnread}
                      </span>
                    )}
                  </motion.div>
                  <span className="text-[10px] font-extrabold text-violet-700 tracking-tight">Чаты</span>
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center py-1 px-2.5 rounded-full transition-all duration-200 select-none group min-w-[54px]",
                isActive ? "text-violet-700" : "text-slate-500 hover:text-slate-800"
              )}
            >
              {isActive ? (
                <div className="flex flex-col items-center gap-0.5">
                  <motion.div
                    layoutId="activeNavBubble"
                    className="w-9 h-7 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-violet-700 shadow-xs"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  >
                    <Icon className="w-4 h-4 stroke-[2.4]" />
                  </motion.div>
                  <span className="text-[10px] font-extrabold text-violet-700 mt-0.5 tracking-tight">{item.label}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-0.5 py-0.5">
                  <Icon className="w-5 h-5 text-slate-400 group-hover:text-slate-700 transition-all stroke-[1.8]" />
                  <span className="text-[10px] font-medium text-slate-500 group-hover:text-slate-800 tracking-tight">{item.label}</span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
