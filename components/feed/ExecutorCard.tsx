"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Star, CheckCircle2, ShieldCheck, MessageCircle, Briefcase, Zap } from "lucide-react";

interface Executor {
  id: string;
  first_name: string;
  username?: string;
  avatar_url: string | null;
  executor_profiles: {
    skills: string[];
    bio: string;
    rating: number;
    completed_orders: number;
    hourly_rate?: number;
    min_project_budget?: number;
  };
}

interface ExecutorCardProps {
  executor: Executor;
}

export function ExecutorCard({ executor }: ExecutorCardProps) {
  const router = useRouter();
  const profile = executor.executor_profiles || {
    skills: [],
    bio: "",
    rating: 5.0,
    completed_orders: 0,
  };

  const displayName = executor.first_name || "Специалист";

  const handleOpenChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/chats?name=${encodeURIComponent(displayName)}`);
  };

  return (
    <motion.div
      whileTap={{ scale: 0.985 }}
      onClick={handleOpenChat}
      className="cursor-pointer bg-white rounded-3xl p-4.5 space-y-3 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_25px_rgba(124,58,237,0.06)] hover:border-purple-200/80 transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            {executor.avatar_url ? (
              <div className="w-12 h-12 rounded-2xl overflow-hidden border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={executor.avatar_url} alt={displayName} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-base shadow-sm">
                {displayName[0] || "С"}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-slate-900 text-sm truncate">
                {displayName}
              </h3>
              <ShieldCheck className="w-4 h-4 text-violet-600 shrink-0" />
            </div>

            <div className="flex items-center gap-2 mt-1 text-xs">
              <div className="badge-yellow text-[11px] font-bold py-0.5 px-2 rounded-lg flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-600 fill-amber-500" />
                <span>{Number(profile.rating || 5.0).toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-1 text-slate-500 text-[11px] font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{profile.completed_orders || 12} кейсов</span>
              </div>
            </div>
          </div>
        </div>

        <span className="badge-blue text-[10px] font-bold py-1 px-2.5 rounded-xl shrink-0 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          Свободен
        </span>
      </div>

      {profile.bio && (
        <p className="text-slate-700 text-xs leading-relaxed line-clamp-2 font-medium">
          {profile.bio}
        </p>
      )}

      {profile.skills && profile.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {profile.skills.slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="badge-violet text-[11px] font-bold py-0.5 px-2.5 rounded-lg"
            >
              {skill}
            </span>
          ))}
          {profile.skills.length > 4 && (
            <span className="text-[11px] text-slate-400 font-medium px-1 py-0.5">
              +{profile.skills.length - 4}
            </span>
          )}
        </div>
      )}

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="text-[11px] text-slate-500 font-medium">
          <span className="font-bold text-slate-900 text-xs">от 1 500 ₽</span> / час
        </div>

        <button
          type="button"
          onClick={handleOpenChat}
          className="btn-primary py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-violet shrink-0 transition-transform active:scale-95"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>Написать в чат</span>
        </button>
      </div>
    </motion.div>
  );
}
