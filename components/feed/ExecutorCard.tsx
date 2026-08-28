"use client";

import { motion } from "framer-motion";
import { Star, CheckCircle, Briefcase } from "lucide-react";

interface Executor {
  id: string;
  first_name: string;
  username: string;
  avatar_url: string | null;
  executor_profiles: {
    skills: string[];
    bio: string;
    rating: number;
    completed_orders: number;
  };
}

interface ExecutorCardProps {
  executor: Executor;
}

export function ExecutorCard({ executor }: ExecutorCardProps) {
  const profile = executor.executor_profiles;

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className="card-violet p-4 space-y-3"
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-primary to-violet-accent flex items-center justify-center text-white font-bold text-lg">
          {executor.first_name?.[0] || "?"}
        </div>
        <div className="flex-1">
          <h3 className="font-bold">{executor.first_name || `@${executor.username}`}</h3>
          <div className="flex items-center gap-2 text-sm text-violet-300">
            <div className="flex items-center gap-0.5">
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              <span>{profile.rating}</span>
            </div>
            <span>·</span>
            <div className="flex items-center gap-0.5">
              <CheckCircle className="w-3.5 h-3.5 text-green-400" />
              <span>{profile.completed_orders} заказов</span>
            </div>
          </div>
        </div>
      </div>

      {profile.bio && (
        <p className="text-violet-200 text-sm line-clamp-2">{profile.bio}</p>
      )}

      {profile.skills && profile.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {profile.skills.slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="text-xs bg-violet-primary/20 text-violet-accent px-2 py-1 rounded-full"
            >
              {skill}
            </span>
          ))}
          {profile.skills.length > 4 && (
            <span className="text-xs text-violet-300 px-2 py-1">
              +{profile.skills.length - 4}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
