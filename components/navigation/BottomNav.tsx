"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Inbox,
  FolderKanban,
  User,
  Plus,
  Briefcase,
  Users,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getStoredDialogs } from "@/lib/chats";

export function BottomNav() {
  const pathname = usePathname();
  const [role, setRole] = useState<string>("executor");
  const [totalUnread, setTotalUnread] = useState<number>(1);

  useEffect(() => {
    const updateRole = () => {
      const savedRole = localStorage.getItem("1337_role") || localStorage.getItem("fiolet_role") || "client";
      setRole(savedRole);
    };

    const updateUnread = () => {
      try {
        const dialogs = getStoredDialogs();
        const unread = dialogs.reduce((acc, d) => acc + (d.unreadCount || 0), 0);
        setTotalUnread(unread);
      } catch {
        setTotalUnread(1);
      }
    };

    updateRole();
    updateUnread();
    window.addEventListener("storage", updateRole);
    return () => window.removeEventListener("storage", updateRole);
  }, [pathname]);

  const isExecutor = role === "executor";

  // 5 items with "Чаты" exactly in the center (index 2), highlighted in vivid purple
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
    <nav className="fixed bottom-3 left-0 right-0 z-50 px-3 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-full shadow-[0_12px_40px_rgba(124,58,237,0.14)] px-2.5 py-1.5 flex items-center justify-between">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/feed" && pathname.startsWith(`${item.href}`));
          const Icon = item.icon;

          // Special Center Button (Выделен фиолетовым)
          if (item.isCenter) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative -top-3 group flex flex-col items-center select-none"
              >
                <motion.div
                  whileTap={{ scale: 0.92 }}
                  whileHover={{ scale: 1.05 }}
                  className={cn(
                    "w-13 h-13 rounded-full flex items-center justify-center relative shadow-lg transition-all duration-300",
                    isActive
                      ? "bg-gradient-to-tr from-violet-600 via-purple-600 to-indigo-600 text-white shadow-violet-500/50 ring-4 ring-purple-100"
                      : "bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-violet-500/35 hover:shadow-violet-500/50"
                  )}
                >
                  <Icon className="w-6 h-6 stroke-[2.2]" />
                  {totalUnread > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center border-2 border-white shadow-xs">
                      {totalUnread}
                    </span>
                  )}
                </motion.div>
                <span className="text-[10px] font-extrabold text-violet-700 tracking-tight mt-0.5">
                  Чаты
                </span>
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
                  <span className="text-[10px] font-extrabold text-violet-700 mt-0.5 tracking-tight">
                    {item.label}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-0.5 py-0.5">
                  <Icon className="w-5 h-5 text-slate-400 group-hover:text-slate-700 group-hover:scale-105 transition-all stroke-[1.8]" />
                  <span className="text-[10px] font-medium text-slate-500 group-hover:text-slate-800 transition-colors tracking-tight">
                    {item.label}
                  </span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
