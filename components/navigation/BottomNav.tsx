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
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const [role, setRole] = useState<string>("executor");

  useEffect(() => {
    const updateRole = () => {
      const savedRole = localStorage.getItem("1337_role") || localStorage.getItem("fiolet_role") || "client";
      setRole(savedRole);
    };

    updateRole();
    window.addEventListener("storage", updateRole);
    return () => window.removeEventListener("storage", updateRole);
  }, [pathname]);

  const isExecutor = role === "executor";

  const navItems = isExecutor
    ? [
        { href: "/feed", label: "Заявки", icon: Inbox },
        { href: "/responses", label: "CRM", icon: FolderKanban },
        { href: "/portfolio", label: "Резюме", icon: Briefcase },
        { href: "/profile", label: "Профиль", icon: User },
      ]
    : [
        { href: "/feed", label: "Специалисты", icon: Users },
        { href: "/responses", label: "Отклики", icon: FolderKanban },
        { href: "/orders/new", label: "Создать", icon: Plus },
        { href: "/profile", label: "Профиль", icon: User },
      ];

  return (
    <nav className="fixed bottom-3 left-0 right-0 z-50 px-4 pointer-events-none">
      <div className="max-w-sm mx-auto pointer-events-auto bg-white/95 backdrop-blur-2xl border border-slate-200/80 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.12)] px-3 py-2 flex items-center justify-between">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/feed" && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center py-1 px-3 rounded-full transition-all duration-200 select-none group",
                isActive ? "text-violet-700" : "text-slate-500 hover:text-slate-800"
              )}
            >
              {isActive ? (
                <div className="flex flex-col items-center gap-0.5">
                  <motion.div
                    layoutId="activeNavBubble"
                    className="w-10 h-8 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-violet-500/25"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  >
                    <Icon className="w-4 h-4 stroke-[2.4]" />
                  </motion.div>
                  <span className="text-[10px] font-bold text-violet-700 mt-0.5">
                    {item.label}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 py-1">
                  <Icon className="w-5 h-5 text-slate-500 group-hover:text-slate-800 group-hover:scale-105 transition-all stroke-[1.8]" />
                  <span className="text-[10px] font-medium text-slate-500 group-hover:text-slate-800 transition-colors">
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
